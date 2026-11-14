"""Observation validation, immutable persistence and serialisation."""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from .. import audit, catalogue, security
from ..errors import (
    DUPLICATE_OBSERVATION,
    ID_REUSE_MISMATCH,
    IDEMPOTENCY_KEY_REUSED,
    INVALID_SOURCE_DEVICE,
    INVALID_TIMESTAMP,
    INVALID_VALUE,
    MISSION_ACCESS_MISMATCH,
    UNKNOWN_CATALOGUE_VERSION,
    UNKNOWN_MEASUREMENT,
    UNSUPPORTED_SOURCE_TYPE,
    UNSUPPORTED_UNIT,
    ApiError,
)
from ..feed import append_change
from ..models import (
    Device,
    MeasurementCatalogueVersion,
    MeasurementDefinition,
    Observation,
)
from ..schemas import ObservationIn
from ..units import UnitConversionError, canonical_value_for_snapshot
from ..util import ensure_aware, iso, utc_now

QUALITY_ALIASES = {"unreviewed": "unknown"}
QUALITY_STATUSES = {"valid", "questionable", "invalid", "unknown"}
CLOCK_STATUSES = {"good", "degraded", "unknown"}


def _aware(value: datetime, field: str) -> datetime:
    try:
        converted = ensure_aware(value, field)
    except ValueError as exc:
        raise ApiError(422, INVALID_TIMESTAMP, str(exc), {"field": field}) from exc
    assert converted is not None
    return converted


def catalogue_version(
    db: Session, mission_id: uuid.UUID, version: str
) -> MeasurementCatalogueVersion | None:
    return db.execute(
        select(MeasurementCatalogueVersion).where(
            MeasurementCatalogueVersion.mission_id == mission_id,
            MeasurementCatalogueVersion.version == version,
        )
    ).scalar_one_or_none()


def definition_id(db: Session, code: str) -> uuid.UUID | None:
    return db.scalar(select(MeasurementDefinition.id).where(MeasurementDefinition.code == code))


def _snapshot_definition(version_row: MeasurementCatalogueVersion, code: str) -> dict[str, Any] | None:
    definitions = catalogue.definitions_from_snapshot(version_row.definitions_snapshot)
    if definitions:
        return definitions.get(code)
    return catalogue.definition_by_code(code)


def _validate_value(definition: dict[str, Any], value: Any) -> dict[str, Any]:
    value_type = definition.get("value_type")
    if value is None:
        raise ApiError(422, INVALID_VALUE, "A measurement value is required.")
    if value_type in {"numeric", "integer"}:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ApiError(
                422,
                INVALID_VALUE,
                "Numeric measurements require a JSON number, not numeric-looking text.",
            )
        numeric = float(value)
        if not math.isfinite(numeric):
            raise ApiError(422, INVALID_VALUE, "Numeric measurements must be finite.")
        if value_type == "integer" and not float(numeric).is_integer():
            raise ApiError(422, INVALID_VALUE, "Integer measurements require a whole number.")
        return {"value_numeric": numeric}
    if value_type == "text":
        if not isinstance(value, str):
            raise ApiError(422, INVALID_VALUE, "Text measurements require a JSON string.")
        return {"value_text": value}
    if value_type == "boolean":
        if not isinstance(value, bool):
            raise ApiError(422, INVALID_VALUE, "Boolean measurements require true or false.")
        return {"value_boolean": value}
    if value_type == "object":
        if not isinstance(value, dict):
            raise ApiError(422, INVALID_VALUE, "Object measurements require a JSON object.")
        return {"value_json": value}
    raise ApiError(422, INVALID_VALUE, "The catalogue definition has an unsupported value type.")


def _normalise_quality(quality) -> tuple[str, float | None, dict[str, Any]]:
    status = (quality.status or "unknown").strip().lower()
    details = dict(quality.details or {})
    if status in QUALITY_ALIASES:
        details = {**details, "original_status": quality.status}
        status = QUALITY_ALIASES[status]
    if status not in QUALITY_STATUSES:
        raise ApiError(
            422,
            INVALID_VALUE,
            "Quality status must be one of valid, questionable, invalid or unknown.",
            {"quality_status": status},
        )
    score = float(quality.score) if quality.score is not None else None
    return status, score, details


def _same_content(
    row: Observation, body: ObservationIn, definition_row_id: uuid.UUID
) -> bool:
    if row.measurement_definition_id != definition_row_id:
        return False
    if row.measured_at != body.measured_at:
        return False
    if row.value_numeric is not None:
        return body.value is not None and isinstance(body.value, (int, float)) and float(row.value_numeric) == float(body.value)
    if row.value_text is not None:
        return row.value_text == body.value
    if row.value_boolean is not None:
        return row.value_boolean == body.value
    return row.value_json == body.value


def ingest_observation(
    db: Session,
    *,
    principal: security.Principal,
    body: ObservationIn,
    idempotency_key: str | None = None,
    origin: str | None = None,
    append_to_feed: bool = True,
    action: str = "observation.create",
) -> tuple[Observation, bool]:
    """Validate and persist one immutable observation.

    Returns ``(row, created)``.  A repeated idempotency key or identical
    observation ID returns the existing row instead of creating a duplicate.
    """
    security.check_mission_scope(
        db,
        principal,
        body.mission_id,
        action=action,
        astronaut_id=body.astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, body.mission_id, body.astronaut_id)

    version_row = catalogue_version(db, body.mission_id, body.catalogue_version)
    if version_row is None:
        raise ApiError(
            422,
            UNKNOWN_CATALOGUE_VERSION,
            "The named measurement catalogue version is not published for this mission.",
            {"catalogue_version": body.catalogue_version},
        )
    snapshot_definition = _snapshot_definition(version_row, body.measurement_code)
    if snapshot_definition is None:
        raise ApiError(
            422,
            UNKNOWN_MEASUREMENT,
            f"Unknown measurement code '{body.measurement_code}'.",
            {"measurement_code": body.measurement_code},
        )
    definition_row_id = definition_id(db, body.measurement_code)
    if definition_row_id is None:
        raise ApiError(
            422,
            UNKNOWN_MEASUREMENT,
            f"Measurement '{body.measurement_code}' has no catalogue definition row.",
            {"measurement_code": body.measurement_code},
        )

    measured_at = _aware(body.measured_at, "measured_at")
    created_at = _aware(body.created_at, "created_at")
    body.measured_at = measured_at
    body.created_at = created_at
    if body.clock_quality.reference_at is not None:
        body.clock_quality.reference_at = _aware(body.clock_quality.reference_at, "clock_quality.reference_at")

    source_type = body.source.type
    if source_type not in catalogue.SOURCE_TYPES:
        raise ApiError(
            422,
            UNSUPPORTED_SOURCE_TYPE,
            "Source type is not supported.",
            {"source_type": source_type, "supported_source_types": list(catalogue.SOURCE_TYPES)},
        )
    allowed_sources = snapshot_definition.get("allowed_source_types") or []
    if allowed_sources and source_type not in allowed_sources:
        raise ApiError(
            422,
            UNSUPPORTED_SOURCE_TYPE,
            f"Source type '{source_type}' is not allowed for measurement '{body.measurement_code}'.",
            {"measurement_code": body.measurement_code, "allowed_source_types": allowed_sources},
        )

    if body.source.device_id is not None:
        device = db.get(Device, body.source.device_id)
        if device is None:
            raise ApiError(422, INVALID_SOURCE_DEVICE, "The referenced device is not registered.")
        if device.astronaut_id is not None and device.astronaut_id != body.astronaut_id:
            raise ApiError(422, INVALID_SOURCE_DEVICE, "The referenced device belongs to another astronaut.")
        if not device.active:
            raise ApiError(422, INVALID_SOURCE_DEVICE, "The referenced device is inactive.")

    value_columns = _validate_value(snapshot_definition, body.value)
    canonical_value: float | None = None
    canonical_unit: str | None = None
    if "value_numeric" in value_columns:
        try:
            canonical_value, canonical_unit = canonical_value_for_snapshot(
                snapshot_definition, value_columns["value_numeric"], body.unit
            )
        except UnitConversionError as exc:
            raise ApiError(
                422,
                UNSUPPORTED_UNIT,
                str(exc),
                {
                    "measurement_code": body.measurement_code,
                    "supported_units": snapshot_definition.get("allowed_units") or [],
                },
            ) from exc

    quality_status, quality_score, quality_details = _normalise_quality(body.quality)

    key = (idempotency_key or body.idempotency_key or "").strip() or None
    if key:
        existing = db.execute(
            select(Observation).where(
                Observation.astronaut_id == body.astronaut_id,
                Observation.source_type == source_type,
                Observation.idempotency_key == key,
            )
        ).scalar_one_or_none()
        if existing is not None:
            if _same_content(existing, body, definition_row_id):
                return existing, False
            raise ApiError(
                409,
                IDEMPOTENCY_KEY_REUSED,
                "This idempotency key was already used for a different observation.",
                {"observation_id": str(existing.id)},
            )

    existing_id = db.get(Observation, body.observation_id)
    if existing_id is not None:
        if _same_content(existing_id, body, definition_row_id):
            return existing_id, False
        raise ApiError(
            409,
            ID_REUSE_MISMATCH,
            "The observation ID is already bound to different immutable content.",
            {"observation_id": str(body.observation_id)},
        )

    clock_quality = body.clock_quality.model_dump()
    if clock_quality.get("status") not in CLOCK_STATUSES:
        clock_quality["status"] = "unknown"
    clock_quality = {key: value for key, value in clock_quality.items() if value is not None}

    row = Observation(
        id=body.observation_id,
        astronaut_id=body.astronaut_id,
        mission_id=body.mission_id,
        measurement_definition_id=definition_row_id,
        catalogue_version=body.catalogue_version,
        measured_at=measured_at,
        device_time_raw=body.device_time_raw,
        clock_quality=clock_quality,
        client_created_at=created_at,
        received_at=utc_now(),
        original_unit=body.unit,
        canonical_value_numeric=canonical_value,
        canonical_unit=canonical_unit,
        source_type=source_type,
        device_id=body.source.device_id,
        source_external_id=body.source.external_id,
        quality_status=quality_status,
        quality_score=quality_score,
        quality_details=quality_details,
        context=body.context or {},
        simulated=body.simulated,
        idempotency_key=key,
        **value_columns,
    )
    db.add(row)
    db.flush()

    origin_value = origin or ("crew_client" if principal.role == "crew_member" else "ground_console")
    if append_to_feed:
        append_change(
            db,
            mission_id=body.mission_id,
            entity_type="observation",
            entity_id=row.id,
            operation="upsert",
            actor_id=principal.actor_id,
            origin=origin_value,
            client_id=principal.client_id,
            payload=observation_out(db, row),
        )

    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action=action,
        entity_type="observation",
        entity_id=row.id,
        outcome="success",
        mission_id=body.mission_id,
        astronaut_id=body.astronaut_id,
        details={
            "measurement_code": body.measurement_code,
            "source_type": source_type,
            "quality_status": quality_status,
            "simulated": body.simulated,
        },
    )
    return row, True


def observation_out(db: Session, row: Observation) -> dict[str, Any]:
    if row.value_numeric is not None:
        value: Any = row.value_numeric
        if isinstance(value, float) and value.is_integer():
            value = int(value)
    elif row.value_text is not None:
        value = row.value_text
    elif row.value_boolean is not None:
        value = row.value_boolean
    else:
        value = row.value_json
    code = db.scalar(
        select(MeasurementDefinition.code).where(
            MeasurementDefinition.id == row.measurement_definition_id
        )
    )
    canonical_value = row.canonical_value_numeric
    if isinstance(canonical_value, float) and canonical_value.is_integer():
        canonical_value = int(canonical_value)
    return {
        "observation_id": str(row.id),
        "astronaut_id": str(row.astronaut_id),
        "mission_id": str(row.mission_id),
        "measurement_code": code,
        "catalogue_version": row.catalogue_version,
        "value": value,
        "unit": row.original_unit,
        "canonical_value": canonical_value,
        "canonical_unit": row.canonical_unit,
        "measured_at": iso(row.measured_at),
        "received_at": iso(row.received_at),
        "created_at": iso(row.client_created_at),
        "source": {
            "type": row.source_type,
            "device_id": str(row.device_id) if row.device_id else None,
            "external_id": row.source_external_id,
        },
        "sync_status": "synced",
        "quality_status": row.quality_status,
        "quality_score": float(row.quality_score) if row.quality_score is not None else None,
        "simulated": row.simulated,
    }


def latest_observation_times(
    db: Session, mission_id: uuid.UUID, astronaut_id: uuid.UUID
) -> tuple[datetime | None, datetime | None]:
    from sqlalchemy import func

    row = db.execute(
        select(func.max(Observation.measured_at), func.max(Observation.received_at)).where(
            Observation.mission_id == mission_id,
            Observation.astronaut_id == astronaut_id,
        )
    ).one()
    return row[0], row[1]
