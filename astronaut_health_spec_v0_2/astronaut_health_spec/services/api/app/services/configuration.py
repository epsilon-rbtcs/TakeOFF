"""Administrator-controlled catalogue and protocol publication."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, catalogue, security
from ..errors import CONFLICT, ID_REUSE_MISMATCH, INVALID_TIMESTAMP, INVALID_VALUE, ApiError
from ..feed import append_change
from ..models import (
    MeasurementCatalogueVersion,
    MeasurementDefinition,
    Protocol,
)
from ..schemas import MeasurementCatalogueVersionIn, ProtocolVersionIn
from ..util import ensure_aware, iso, utc_now


def _aware(value: datetime, field: str) -> datetime:
    try:
        converted = ensure_aware(value, field)
    except ValueError as exc:
        raise ApiError(422, INVALID_TIMESTAMP, str(exc)) from exc
    assert converted is not None
    return converted


def _validate_definition(change: dict[str, Any]) -> None:
    if change["domain_code"] not in catalogue.DOMAIN_CODES:
        raise ApiError(
            422,
            INVALID_VALUE,
            "Unsupported measurement domain.",
            {"domain_code": change["domain_code"], "supported": list(catalogue.DOMAIN_CODES)},
        )
    if change["value_type"] not in catalogue.VALUE_TYPES:
        raise ApiError(422, INVALID_VALUE, "Unsupported measurement value type.")
    unknown_sources = set(change.get("allowed_source_types") or []) - set(catalogue.SOURCE_TYPES)
    if unknown_sources:
        raise ApiError(
            422,
            INVALID_VALUE,
            "Unsupported source type in the catalogue change.",
            {"unsupported": sorted(unknown_sources)},
        )
    canonical = change.get("canonical_unit")
    allowed = change.get("allowed_units") or []
    if canonical is not None and canonical not in allowed:
        raise ApiError(
            422,
            INVALID_VALUE,
            "The canonical unit must also appear in allowed_units.",
            {"canonical_unit": canonical, "allowed_units": allowed},
        )


def latest_catalogue_version(
    db: Session, mission_id: uuid.UUID
) -> MeasurementCatalogueVersion | None:
    return db.execute(
        select(MeasurementCatalogueVersion)
        .where(MeasurementCatalogueVersion.mission_id == mission_id)
        .order_by(
            MeasurementCatalogueVersion.effective_at.desc(),
            MeasurementCatalogueVersion.created_at.desc(),
        )
        .limit(1)
    ).scalars().first()


def _upsert_definition(db: Session, change: dict[str, Any]) -> MeasurementDefinition:
    row = db.execute(
        select(MeasurementDefinition).where(MeasurementDefinition.code == change["code"])
    ).scalar_one_or_none()
    if row is None:
        row = MeasurementDefinition(
            id=uuid.uuid4(),
            code=change["code"],
            display_name=change["display_name"],
            domain_code=change["domain_code"],
            value_type=change["value_type"],
            canonical_unit=change.get("canonical_unit"),
            allowed_units=change.get("allowed_units") or [],
            allowed_source_types=change.get("allowed_source_types") or [],
            description=change.get("description"),
            sampling_guidance=change.get("sampling_guidance"),
            context_schema=change.get("context_schema") or {},
            active=bool(change.get("active", True)),
            created_at=utc_now(),
        )
        db.add(row)
        return row
    row.display_name = change["display_name"]
    row.domain_code = change["domain_code"]
    row.value_type = change["value_type"]
    row.canonical_unit = change.get("canonical_unit")
    row.allowed_units = change.get("allowed_units") or []
    row.allowed_source_types = change.get("allowed_source_types") or []
    row.description = change.get("description")
    row.sampling_guidance = change.get("sampling_guidance")
    row.context_schema = change.get("context_schema") or {}
    row.active = bool(change.get("active", True))
    return row


def publish_catalogue_version(
    db: Session,
    principal: security.Principal,
    body: MeasurementCatalogueVersionIn,
) -> dict[str, Any]:
    security.check_mission_scope(
        db,
        principal,
        body.mission_id,
        action="catalogue.publish",
        require_health_access=False,
        allowed_roles={"administrator"},
    )
    effective_at = _aware(body.effective_at, "effective_at")
    changes = [change.model_dump() for change in body.changes]
    for change in changes:
        _validate_definition(change)

    existing = db.execute(
        select(MeasurementCatalogueVersion).where(
            MeasurementCatalogueVersion.mission_id == body.mission_id,
            MeasurementCatalogueVersion.version == body.version,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ApiError(
            409,
            ID_REUSE_MISMATCH,
            "This catalogue version is already published for the mission.",
            {"catalogue_version": body.version},
        )

    previous = latest_catalogue_version(db, body.mission_id)
    base = catalogue.definitions_from_snapshot(previous.definitions_snapshot) if previous else {
        item["code"]: dict(item) for item in catalogue.MEASUREMENT_DEFINITIONS
    }
    merged = {code: dict(item) for code, item in base.items()}
    for change in changes:
        merged[change["code"]] = {**merged.get(change["code"], {}), **change}
    ordered_codes = [item["code"] for item in catalogue.MEASUREMENT_DEFINITIONS if item["code"] in merged]
    ordered_codes.extend(sorted(code for code in merged if code not in ordered_codes))
    snapshot = [merged[code] for code in ordered_codes]

    for change in changes:
        _upsert_definition(db, change)
    db.flush()

    row = MeasurementCatalogueVersion(
        id=uuid.uuid4(),
        mission_id=body.mission_id,
        version=body.version,
        effective_at=effective_at,
        change_reason=body.change_reason,
        definitions_snapshot=snapshot,
        created_by=principal.actor_id,
        created_at=utc_now(),
    )
    db.add(row)
    db.flush()
    append_change(
        db,
        mission_id=body.mission_id,
        entity_type="measurement_catalogue_version",
        entity_id=row.id,
        operation="upsert",
        actor_id=principal.actor_id,
        origin="backend",
        payload={
            "catalogue_version": body.version,
            "effective_at": iso(effective_at),
            "change_reason": body.change_reason,
            "changed_codes": [change["code"] for change in changes],
            "created_by": principal.actor_id,
        },
    )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="catalogue.publish",
        entity_type="measurement_catalogue_version",
        entity_id=row.id,
        outcome="success",
        mission_id=body.mission_id,
        details={
            "catalogue_version": body.version,
            "changed_codes": [change["code"] for change in changes],
        },
    )
    return {
        "catalogue_version": body.version,
        "catalogue_version_id": str(row.id),
        "mission_id": str(body.mission_id),
        "effective_at": iso(effective_at),
        "change_reason": body.change_reason,
        "changed_codes": [change["code"] for change in changes],
        "definitions": snapshot,
    }


def publish_protocol_version(
    db: Session,
    principal: security.Principal,
    body: ProtocolVersionIn,
) -> dict[str, Any]:
    security.check_mission_scope(
        db,
        principal,
        body.mission_id,
        action="protocol.publish",
        require_health_access=False,
        allowed_roles={"administrator"},
    )
    effective_at = _aware(body.effective_at, "effective_at")
    existing = db.execute(
        select(Protocol).where(
            Protocol.mission_id == body.mission_id,
            Protocol.protocol_code == body.protocol_code,
            Protocol.version == body.version,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ApiError(
            409,
            ID_REUSE_MISMATCH,
            "This protocol version is already published for the mission.",
            {"protocol_code": body.protocol_code, "version": body.version},
        )
    row = Protocol(
        id=uuid.uuid4(),
        mission_id=body.mission_id,
        protocol_code=body.protocol_code,
        version=body.version,
        title=body.content.get("title") or body.protocol_code,
        description=body.content.get("description"),
        approval_status=body.approval_status,
        source_reference=body.source_reference,
        effective_from=effective_at,
        effective_to=None,
        configuration=body.content,
        change_reason=body.change_reason,
        created_at=utc_now(),
    )
    db.add(row)
    db.flush()
    append_change(
        db,
        mission_id=body.mission_id,
        entity_type="protocol_version",
        entity_id=row.id,
        operation="upsert",
        actor_id=principal.actor_id,
        origin="backend",
        payload={
            "protocol_id": str(row.id),
            "protocol_code": row.protocol_code,
            "version": row.version,
            "approval_status": row.approval_status,
            "source_reference": row.source_reference,
            "effective_from": iso(row.effective_from),
            "content": row.configuration,
            "change_reason": row.change_reason,
        },
    )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="protocol.publish",
        entity_type="protocol",
        entity_id=row.id,
        outcome="success",
        mission_id=body.mission_id,
        details={
            "protocol_code": row.protocol_code,
            "version": row.version,
            "approval_status": row.approval_status,
        },
    )
    return {
        "protocol_id": str(row.id),
        "mission_id": str(row.mission_id),
        "protocol_code": row.protocol_code,
        "version": row.version,
        "title": row.title,
        "approval_status": row.approval_status,
        "source_reference": row.source_reference,
        "effective_from": iso(row.effective_from),
        "content": row.configuration,
        "change_reason": row.change_reason,
        "created_at": iso(row.created_at),
    }
