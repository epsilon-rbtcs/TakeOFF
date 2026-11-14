"""Crew store-and-forward synchronization: idempotent push and ordered pull."""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, catalogue, security
from ..config import settings
from ..errors import (
    BATCH_ID_MISMATCH,
    BLOCKED_EVENT_SCHEMA,
    CLIENT_SCOPE_MISMATCH,
    ID_REUSE_MISMATCH,
    INVALID_CURSOR,
    MISSION_ACCESS_MISMATCH,
    NOT_FOUND,
    UNSUPPORTED_ENTITY_TYPE,
    UNSUPPORTED_OPERATION,
    UNSUPPORTED_SCHEMA_VERSION,
    ApiError,
)
from ..errors import PAYLOAD_HASH_MISMATCH
from ..feed import feed_item
from ..models import (
    AnalysisRun,
    AssessmentBaseline,
    AssessmentFinding,
    AssessmentInput,
    ChangeFeed,
    ClientDevice,
    Device,
    HealthBaseline,
    IntegratedAssessment,
    IntegratedAssessmentComponent,
    MeasurementDefinition,
    Message,
    ModuleAssessment,
    Observation,
    SyncBatch,
    SyncCursor,
    SyncEvent,
)
from ..schemas import ObservationIn, SyncEventIn, SyncPushIn
from . import actions as action_service
from . import alerts as alert_service
from . import communications as communication_service
from . import messages as message_service
from . import observations as observation_service
from ..util import canonical_hash, encode_cursor, ensure_aware, iso, jsonable, utc_now

SUPPORTED_SCHEMA_VERSIONS = {1}
CREW_ENTITY_TYPES = {
    "observation",
    "device_registration",
    "baseline_revision",
    "analysis_run",
    "module_assessment",
    "integrated_assessment",
    "alert_event",
    "action_event",
    "crew_message",
    "message_lifecycle_event",
    "communication_status",
}
SUPPORTED_OPERATIONS = {"upsert", "append_event", "revoke"}
MAX_FEED_PAGE = 500


def _event_document(event: SyncEventIn) -> dict[str, Any]:
    document = event.model_dump(mode="json")
    document.pop("payload_hash", None)
    if document.get("server_sequence") is None:
        document.pop("server_sequence", None)
    return document


def event_hash(event: SyncEventIn) -> str:
    return canonical_hash(_event_document(event))


def batch_hash(events: list[SyncEventIn]) -> str:
    return canonical_hash([_event_document(event) for event in events])


def _parse_dt(value: Any, field: str) -> datetime:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ApiError(422, "INVALID_TIMESTAMP", f"{field} must be an ISO-8601 timestamp.") from exc
    if not isinstance(value, datetime):
        raise ApiError(422, "INVALID_TIMESTAMP", f"{field} must be an ISO-8601 timestamp.")
    try:
        converted = ensure_aware(value, field)
    except ValueError as exc:
        raise ApiError(422, "INVALID_TIMESTAMP", str(exc)) from exc
    assert converted is not None
    return converted


def _uuid(value: Any, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ApiError(422, "INVALID_VALUE", f"{field} must be a UUID.") from exc


def resolve_client(
    db: Session,
    principal: security.Principal,
    *,
    mission_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
) -> ClientDevice:
    return communication_service.client_for_principal(
        db, principal, mission_id=mission_id, client_id=client_id
    )


def _envelope_error(
    event: SyncEventIn, client: ClientDevice
) -> tuple[str, str] | None:
    if event.schema_version not in SUPPORTED_SCHEMA_VERSIONS:
        return UNSUPPORTED_SCHEMA_VERSION, "Unsupported event schema version."
    if event.entity_type not in CREW_ENTITY_TYPES:
        return UNSUPPORTED_ENTITY_TYPE, "Unsupported crew event entity type."
    if event.operation not in SUPPORTED_OPERATIONS:
        return UNSUPPORTED_OPERATION, "Unsupported sync operation."
    if event.operation == "revoke":
        return UNSUPPORTED_OPERATION, "No v0.3 entity supports a physical/revoke operation; use a lifecycle event."
    if event.origin not in (None, "crew_client"):
        return CLIENT_SCOPE_MISMATCH, "Crew pushes must originate from a crew client."
    if event.mission_id != client.mission_id:
        return MISSION_ACCESS_MISMATCH, "The event mission does not match the authenticated client."
    if event.client_id is not None and event.client_id != client.id:
        return CLIENT_SCOPE_MISMATCH, "The event client_id does not match the authenticated client."
    if event.payload_hash is not None and event.payload_hash != event_hash(event):
        return PAYLOAD_HASH_MISMATCH, "The supplied payload hash does not match the canonical event."
    return None


def push_events(
    db: Session,
    principal: security.Principal,
    body: SyncPushIn,
    idempotency_key: str,
) -> dict[str, Any]:
    if principal.role != "crew_member":
        raise ApiError(403, "ROLE_FORBIDDEN", "Only crew clients may push sync events.")
    if idempotency_key.strip() != str(body.batch_id):
        raise ApiError(
            422,
            BATCH_ID_MISMATCH,
            "The Idempotency-Key header must equal the batch_id.",
            {"batch_id": str(body.batch_id)},
        )

    # Resolve the client from the authenticated crew identity only.  A batch may
    # carry a forged or stale ``client_id`` on its events; that is reported as a
    # per-event scope rejection instead of silently redirecting the whole batch.
    client = resolve_client(db, principal)
    if client.astronaut_id != principal.astronaut_id and principal.astronaut_id is not None:
        raise ApiError(403, CLIENT_SCOPE_MISMATCH, "The client is not scoped to this crew member.")

    computed_batch_hash = batch_hash(body.events)
    existing_batch = db.get(SyncBatch, (client.id, body.batch_id))
    if existing_batch is not None:
        if existing_batch.payload_hash == computed_batch_hash:
            return jsonable(existing_batch.response_json)
        audit.record_and_commit(
            db,
            actor_id=principal.actor_id,
            actor_role=principal.role,
            action="sync.batch_reuse_mismatch",
            entity_type="sync_batch",
            entity_id=body.batch_id,
            outcome="conflict",
            mission_id=client.mission_id,
            astronaut_id=client.astronaut_id,
            details={"batch_id": str(body.batch_id), "reason": ID_REUSE_MISMATCH},
        )
        raise ApiError(
            409,
            ID_REUSE_MISMATCH,
            "The batch ID was reused with a different canonical payload.",
            {"batch_id": str(body.batch_id)},
        )

    batch = SyncBatch(
        client_id=client.id,
        batch_id=body.batch_id,
        payload_hash=computed_batch_hash,
        response_json={},
        received_at=utc_now(),
    )
    db.add(batch)
    db.flush()

    results: list[dict[str, Any]] = []
    accepted = duplicate = rejected = conflict = 0
    for event in body.events:
        reason = _envelope_error(event, client)
        if reason is not None:
            code, message = reason
            result = _record_rejected(db, body.batch_id, event, client, principal, code, message)
        else:
            existing = db.get(SyncEvent, event.event_id)
            if existing is not None:
                if (
                    existing.payload_hash == event_hash(event)
                    and existing.client_id == client.id
                    and existing.mission_id == event.mission_id
                ):
                    result = {
                        "event_id": str(existing.event_id),
                        "status": "duplicate",
                        "reason": None,
                        "received_at": iso(existing.received_at),
                    }
                    duplicate += 1
                else:
                    audit.record(
                        db,
                        actor_id=principal.actor_id,
                        actor_role=principal.role,
                        action="sync.event_reuse_mismatch",
                        entity_type="sync_event",
                        entity_id=event.event_id,
                        outcome="conflict",
                        mission_id=client.mission_id,
                        astronaut_id=client.astronaut_id,
                        details={"event_id": str(event.event_id), "reason": ID_REUSE_MISMATCH},
                    )
                    result = {
                        "event_id": str(event.event_id),
                        "status": "conflict",
                        "reason": ID_REUSE_MISMATCH,
                        "received_at": iso(existing.received_at),
                    }
                    conflict += 1
            else:
                try:
                    with db.begin_nested():
                        _materialise(db, principal, client, event)
                        db.flush()
                except ApiError as exc:
                    status_value = "conflict" if exc.status_code == 409 else "rejected"
                    result = _record_rejected(
                        db,
                        body.batch_id,
                        event,
                        client,
                        principal,
                        exc.code,
                        exc.message,
                        status=status_value,
                    )
                    if status_value == "conflict":
                        conflict += 1
                    else:
                        rejected += 1
                except ValidationError:
                    result = _record_rejected(
                        db,
                        body.batch_id,
                        event,
                        client,
                        principal,
                        "INVALID_VALUE",
                        "The event payload did not satisfy the entity contract.",
                    )
                    rejected += 1
                except Exception:
                    result = _record_rejected(
                        db,
                        body.batch_id,
                        event,
                        client,
                        principal,
                        "INTERNAL_ERROR",
                        "The event could not be applied.",
                    )
                    rejected += 1
                else:
                    row = SyncEvent(
                        event_id=event.event_id,
                        batch_id=body.batch_id,
                        client_id=client.id,
                        mission_id=event.mission_id,
                        actor_id=principal.actor_id,
                        origin="crew_client",
                        entity_type=event.entity_type,
                        entity_id=event.entity_id,
                        operation=event.operation,
                        schema_version=event.schema_version,
                        created_at=_parse_dt(event.created_at, "created_at"),
                        received_at=utc_now(),
                        expected_revision=event.expected_revision,
                        payload=jsonable(event.payload),
                        payload_hash=event_hash(event),
                        result_status="accepted",
                        result_reason=None,
                    )
                    db.add(row)
                    result = {
                        "event_id": str(event.event_id),
                        "status": "accepted",
                        "reason": None,
                        "received_at": iso(row.received_at),
                    }
                    accepted += 1
        results.append(result)

    now = utc_now()
    client.last_contact_at = now
    response = {
        "batch_id": str(body.batch_id),
        "acknowledged_at": iso(now),
        "results": results,
        "summary": {
            "accepted": accepted,
            "duplicate": duplicate,
            "rejected": rejected,
            "conflict": conflict,
        },
    }
    batch.response_json = response
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="sync.batch_received",
        entity_type="sync_batch",
        entity_id=body.batch_id,
        outcome="success",
        mission_id=client.mission_id,
        astronaut_id=client.astronaut_id,
        details={
            "event_count": len(body.events),
            "accepted": accepted,
            "duplicate": duplicate,
            "rejected": rejected,
            "conflict": conflict,
        },
    )
    return response


def _record_rejected(
    db: Session,
    batch_id: uuid.UUID,
    event: SyncEventIn,
    client: ClientDevice,
    principal: security.Principal,
    code: str,
    message: str,
    status: str = "rejected",
) -> dict[str, Any]:
    now = utc_now()
    row = SyncEvent(
        event_id=event.event_id,
        batch_id=batch_id,
        client_id=client.id,
        mission_id=client.mission_id,
        actor_id=principal.actor_id,
        origin="crew_client",
        entity_type=event.entity_type if event.entity_type in CREW_ENTITY_TYPES else "observation",
        entity_id=event.entity_id,
        operation=event.operation if event.operation in SUPPORTED_OPERATIONS else "upsert",
        schema_version=event.schema_version if event.schema_version > 0 else 1,
        created_at=_safe_dt(event.created_at),
        received_at=now,
        expected_revision=event.expected_revision,
        payload=jsonable(event.payload),
        payload_hash=event_hash(event),
        result_status=status,
        result_reason=code,
    )
    db.add(row)
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="sync.event_rejected",
        entity_type="sync_event",
        entity_id=event.event_id,
        outcome="conflict" if status == "conflict" else "failure",
        mission_id=client.mission_id,
        astronaut_id=client.astronaut_id,
        details={"event_id": str(event.event_id), "reason": code},
    )
    return {
        "event_id": str(event.event_id),
        "status": status,
        "reason": code,
        "received_at": iso(now),
    }


def _safe_dt(value: Any) -> datetime:
    try:
        return _parse_dt(value, "created_at")
    except ApiError:
        return utc_now()


def _materialise(
    db: Session,
    principal: security.Principal,
    client: ClientDevice,
    event: SyncEventIn,
) -> None:
    dtype = event.entity_type
    payload = event.payload or {}
    if dtype == "observation":
        try:
            body = ObservationIn.model_validate(payload)
        except ValidationError as exc:
            raise ApiError(422, "INVALID_VALUE", "The observation payload is invalid.") from exc
        if body.observation_id != event.entity_id:
            raise ApiError(409, ID_REUSE_MISMATCH, "The observation payload ID differs from entity_id.")
        if body.mission_id != client.mission_id or body.astronaut_id != client.astronaut_id:
            raise ApiError(403, MISSION_ACCESS_MISMATCH, "The observation is outside the client scope.")
        observation_service.ingest_observation(
            db,
            principal=principal,
            body=body,
            origin="crew_client",
            append_to_feed=False,
            action="sync.observation",
        )
        return
    if dtype == "module_assessment":
        _materialise_module_assessment(db, principal, client, event)
        return
    if dtype == "integrated_assessment":
        _materialise_integrated_assessment(db, principal, client, event)
        return
    if dtype == "communication_status":
        communication_service.record_communication_status(
            db, client=client, actor_id=principal.actor_id, payload=payload
        )
        return
    if dtype == "device_registration":
        _materialise_device(db, client, event)
        return
    if dtype == "baseline_revision":
        _materialise_baseline(db, client, event)
        return
    if dtype == "analysis_run":
        _materialise_analysis_run(db, client, event)
        return
    if dtype == "crew_message":
        _materialise_crew_message(db, principal, client, event)
        return
    if dtype == "message_lifecycle_event":
        message_id = _uuid(payload.get("message_id") or event.entity_id, "message_id")
        event_type = payload.get("event_type")
        if event_type not in {"received_by_crew", "read", "withdrawn"}:
            raise ApiError(403, "ROLE_FORBIDDEN", "Crew clients may only report crew-side lifecycle events.")
        client_created = _parse_dt(
            payload.get("client_created_at") or event.created_at, "client_created_at"
        )
        message_service.create_message_event(
            db,
            principal,
            message_id,
            event_type,
            client_created,
            str(event.event_id),
            append_to_feed=False,
        )
        return
    if dtype == "action_event":
        action_id = _uuid(payload.get("action_id") or event.entity_id, "action_id")
        event_type = payload.get("event_type")
        expected_revision = event.expected_revision or payload.get("expected_revision")
        if event_type is None or expected_revision is None:
            raise ApiError(422, "INVALID_VALUE", "Action events require event_type and expected_revision.")
        action_service.apply_action_event(
            db,
            principal=principal,
            action_id=action_id,
            event_type=event_type,
            expected_revision=int(expected_revision),
            note=payload.get("note"),
            client_created_at=_parse_dt(event.created_at, "created_at"),
        )
        return
    if dtype == "alert_event":
        # Acknowledgements are a ground medical-officer workflow; a crew push may
        # report the event but cannot mutate alert state in this demonstration.
        raise ApiError(403, "ROLE_FORBIDDEN", "Crew clients may not mutate alert lifecycle state.")
    raise ApiError(422, UNSUPPORTED_ENTITY_TYPE, "Unsupported crew event entity type.")


def _materialise_module_assessment(
    db: Session, principal: security.Principal, client: ClientDevice, event: SyncEventIn
) -> None:
    payload = event.payload or {}
    assessment_id = _uuid(payload.get("assessment_id") or event.entity_id, "assessment_id")
    if assessment_id != event.entity_id:
        raise ApiError(409, ID_REUSE_MISMATCH, "The assessment payload ID differs from entity_id.")
    existing = db.get(ModuleAssessment, assessment_id)
    if existing is not None:
        if (
            existing.module_code == payload.get("module_code")
            and existing.status == payload.get("status")
            and existing.summary == payload.get("summary")
            and existing.algorithm_version == payload.get("algorithm_version")
            and existing.rule_set_version == payload.get("rule_set_version")
        ):
            return
        raise ApiError(409, ID_REUSE_MISMATCH, "The assessment ID is bound to different content.")
    module_code = payload.get("module_code")
    status = payload.get("status")
    allowed_modules = set(catalogue.DOMAIN_CODES)
    allowed_status = {
        "normal", "monitor", "attention", "urgent", "insufficient_data", "data_quality_issue",
    }
    if module_code not in allowed_modules or status not in allowed_status:
        raise ApiError(422, "INVALID_VALUE", "The module assessment code or status is invalid.")
    summary = payload.get("summary")
    algorithm_version = payload.get("algorithm_version")
    rule_set_version = payload.get("rule_set_version")
    if not isinstance(summary, str) or not algorithm_version or not rule_set_version:
        raise ApiError(422, "INVALID_VALUE", "Assessment provenance fields are required.")
    assessed_at = _parse_dt(payload.get("assessed_at") or event.created_at, "assessed_at")
    sufficiency = payload.get("data_sufficiency", "unknown")
    if sufficiency not in {"sufficient", "partial", "insufficient", "unknown"}:
        sufficiency = "unknown"
    row = ModuleAssessment(
        id=assessment_id,
        astronaut_id=client.astronaut_id,
        mission_id=client.mission_id,
        module_code=module_code,
        status=status,
        assessed_at=assessed_at,
        window_start=(
            _parse_dt(payload.get("window_start"), "window_start")
            if payload.get("window_start")
            else None
        ),
        window_end=(
            _parse_dt(payload.get("window_end"), "window_end") if payload.get("window_end") else None
        ),
        algorithm_version=str(algorithm_version),
        rule_set_version=str(rule_set_version),
        protocol_id=None,
        data_sufficiency=sufficiency,
        summary=summary,
        limitations=payload.get("limitations") or [],
        simulated=bool(payload.get("simulated", True)),
        analysis_run_id=None,
    )
    db.add(row)
    db.flush()
    seen_observations: set[uuid.UUID] = set()
    for observation_id in payload.get("evidence_observation_ids") or []:
        try:
            parsed = uuid.UUID(str(observation_id))
        except ValueError:
            continue
        if parsed in seen_observations:
            continue
        observation = db.get(Observation, parsed)
        if observation is None or observation.astronaut_id != client.astronaut_id:
            continue
        seen_observations.add(parsed)
        db.add(
            AssessmentInput(
                module_assessment_id=assessment_id,
                observation_id=observation.id,
                astronaut_id=client.astronaut_id,
                mission_id=client.mission_id,
                input_role="evidence",
            )
        )
    seen_baselines: set[uuid.UUID] = set()
    for baseline in payload.get("baseline_versions") or []:
        if not isinstance(baseline, dict):
            continue
        try:
            baseline_id = uuid.UUID(str(baseline.get("baseline_id")))
            version = int(baseline.get("version"))
        except (ValueError, TypeError):
            continue
        if baseline_id in seen_baselines:
            continue
        stored = db.get(HealthBaseline, baseline_id)
        if (
            stored is None
            or stored.version != version
            or stored.astronaut_id != client.astronaut_id
        ):
            continue
        seen_baselines.add(baseline_id)
        db.add(
            AssessmentBaseline(
                module_assessment_id=assessment_id,
                baseline_id=stored.id,
                astronaut_id=client.astronaut_id,
                mission_id=client.mission_id,
                measurement_definition_id=stored.measurement_definition_id,
                baseline_version=stored.version,
            )
        )
    db.flush()


def _materialise_integrated_assessment(
    db: Session, principal: security.Principal, client: ClientDevice, event: SyncEventIn
) -> None:
    payload = event.payload or {}
    assessment_id = _uuid(payload.get("assessment_id") or event.entity_id, "assessment_id")
    if assessment_id != event.entity_id:
        raise ApiError(409, ID_REUSE_MISMATCH, "The assessment payload ID differs from entity_id.")
    existing = db.get(IntegratedAssessment, assessment_id)
    if existing is not None:
        if (
            existing.status == payload.get("status")
            and existing.summary == payload.get("summary")
            and existing.algorithm_version == payload.get("algorithm_version")
            and existing.rule_set_version == payload.get("rule_set_version")
        ):
            return
        raise ApiError(409, ID_REUSE_MISMATCH, "The assessment ID is bound to different content.")
    status = payload.get("status")
    algorithm_version = payload.get("algorithm_version")
    rule_set_version = payload.get("rule_set_version")
    summary = payload.get("summary")
    allowed_status = {
        "normal", "monitor", "attention", "urgent", "insufficient_data", "data_quality_issue",
    }
    if (
        status not in allowed_status
        or not isinstance(summary, str)
        or not algorithm_version
        or not rule_set_version
    ):
        raise ApiError(422, "INVALID_VALUE", "The integrated assessment payload is invalid.")
    row = IntegratedAssessment(
        id=assessment_id,
        astronaut_id=client.astronaut_id,
        mission_id=client.mission_id,
        status=status,
        assessed_at=_parse_dt(payload.get("assessed_at") or event.created_at, "assessed_at"),
        algorithm_version=str(algorithm_version),
        summary=summary,
        uncertainty_notes=payload.get("uncertainty_notes") or [],
        rule_set_version=str(rule_set_version),
        simulated=bool(payload.get("simulated", True)),
        analysis_run_id=None,
    )
    db.add(row)
    db.flush()
    seen_components: set[uuid.UUID] = set()
    for component_id in payload.get("component_assessment_ids") or []:
        try:
            parsed = uuid.UUID(str(component_id))
        except ValueError:
            continue
        if parsed in seen_components:
            continue
        module = db.get(ModuleAssessment, parsed)
        if (
            module is None
            or module.astronaut_id != client.astronaut_id
            or module.algorithm_version != row.algorithm_version
            or module.rule_set_version != row.rule_set_version
        ):
            continue
        seen_components.add(parsed)
        db.add(
            IntegratedAssessmentComponent(
                integrated_assessment_id=row.id,
                module_assessment_id=module.id,
                astronaut_id=client.astronaut_id,
                mission_id=client.mission_id,
                algorithm_version=row.algorithm_version,
                rule_set_version=row.rule_set_version,
                contribution_role="context",
            )
        )
    db.flush()


def _materialise_device(db: Session, client: ClientDevice, event: SyncEventIn) -> None:
    payload = event.payload or {}
    existing = db.get(Device, event.entity_id)
    code = payload.get("device_code") or payload.get("code")
    if existing is not None:
        if existing.device_code != code:
            raise ApiError(409, ID_REUSE_MISMATCH, "The device ID is bound to a different device code.")
        return
    if not isinstance(code, str):
        raise ApiError(422, "INVALID_VALUE", "device_code is required.")
    device_type = payload.get("device_type", "other")
    if device_type not in {"wearable", "medical_device", "environmental_sensor", "dosimeter", "other"}:
        raise ApiError(422, "INVALID_VALUE", "Unsupported device_type.")
    db.add(
        Device(
            id=event.entity_id,
            astronaut_id=client.astronaut_id,
            device_code=code,
            device_type=device_type,
            manufacturer=payload.get("manufacturer"),
            model=payload.get("model"),
            firmware_version=payload.get("firmware_version"),
            device_metadata=payload.get("metadata") or {},
            active=bool(payload.get("active", True)),
        )
    )
    db.flush()


def _materialise_baseline(db: Session, client: ClientDevice, event: SyncEventIn) -> None:
    payload = event.payload or {}
    existing = db.get(HealthBaseline, event.entity_id)
    if existing is not None:
        if existing.version == payload.get("version") and existing.method == payload.get("method"):
            return
        raise ApiError(409, ID_REUSE_MISMATCH, "The baseline ID is bound to different content.")
    measurement_code = payload.get("measurement_code")
    definition_id = observation_service.definition_id(db, measurement_code) if measurement_code else None
    if definition_id is None:
        raise ApiError(422, "UNKNOWN_MEASUREMENT", "The baseline measurement code is unknown.")
    version = int(payload.get("version") or 1)
    scope = payload.get("baseline_scope", "preflight")
    if scope not in {"preflight", "inflight", "reference"}:
        scope = "preflight"
    status = payload.get("status", "provisional")
    if status not in {"provisional", "active", "retired"}:
        status = "provisional"
    db.add(
        HealthBaseline(
            id=event.entity_id,
            astronaut_id=client.astronaut_id,
            mission_id=client.mission_id,
            measurement_definition_id=definition_id,
            baseline_scope=scope,
            status=status,
            method=str(payload.get("method") or "crew_local_unknown"),
            period_start=_parse_dt(payload.get("period_start"), "period_start"),
            period_end=_parse_dt(payload.get("period_end"), "period_end"),
            sample_count=int(payload.get("sample_count") or 0),
            mean=payload.get("mean"),
            standard_deviation=payload.get("standard_deviation"),
            median=payload.get("median"),
            mad=payload.get("mad"),
            minimum=payload.get("minimum"),
            maximum=payload.get("maximum"),
            canonical_unit=payload.get("unit") or payload.get("canonical_unit"),
            version=version,
            activated_at=(
                _parse_dt(payload.get("activated_at"), "activated_at")
                if payload.get("activated_at")
                else None
            ),
            source_metadata={"source": "crew_client", "simulated": payload.get("simulated", True)},
        )
    )
    db.flush()


def _materialise_analysis_run(db: Session, client: ClientDevice, event: SyncEventIn) -> None:
    payload = event.payload or {}
    existing = db.get(AnalysisRun, event.entity_id)
    if existing is not None:
        if existing.input_snapshot_hash == payload.get("input_snapshot_hash"):
            return
        raise ApiError(409, ID_REUSE_MISMATCH, "The analysis run ID is bound to different content.")
    required = ("algorithm_version", "rule_set_version", "input_snapshot_hash", "implementation_build")
    if any(not payload.get(field) for field in required):
        raise ApiError(422, "INVALID_VALUE", "Analysis run provenance fields are required.")
    status = payload.get("status", "completed")
    if status not in {"completed", "failed"}:
        status = "failed"
    db.add(
        AnalysisRun(
            id=event.entity_id,
            astronaut_id=client.astronaut_id,
            mission_id=client.mission_id,
            requested_by=str(payload.get("requested_by") or "crew_client"),
            execution_location=payload.get("execution_location", "crew_local")
            if payload.get("execution_location") in {"crew_local", "ground_backend"}
            else "crew_local",
            algorithm_version=str(payload["algorithm_version"]),
            rule_set_version=str(payload["rule_set_version"]),
            input_snapshot_hash=str(payload["input_snapshot_hash"]),
            status=status,
            implementation_build=str(payload["implementation_build"]),
            output_hash=payload.get("output_hash"),
            started_at=_parse_dt(payload.get("started_at") or event.created_at, "started_at"),
            completed_at=_parse_dt(payload.get("completed_at") or event.created_at, "completed_at"),
            error_code=payload.get("error_code"),
        )
    )
    db.flush()


def _materialise_crew_message(
    db: Session, principal: security.Principal, client: ClientDevice, event: SyncEventIn
) -> None:
    payload = event.payload or {}
    existing = db.get(Message, event.entity_id)
    if existing is not None:
        if existing.body == payload.get("body") and existing.title == payload.get("title"):
            return
        raise ApiError(409, ID_REUSE_MISMATCH, "The message ID is bound to different content.")
    message_type = payload.get("message_type", "message")
    if message_type not in {"message", "update", "notification"}:
        raise ApiError(422, "INVALID_VALUE", "Unsupported message_type.")
    title = payload.get("title")
    body = payload.get("body")
    if not isinstance(title, str) or not isinstance(body, str):
        raise ApiError(422, "INVALID_VALUE", "Message title and body are required.")
    db.add(
        Message(
            id=event.entity_id,
            mission_id=client.mission_id,
            astronaut_id=client.astronaut_id,
            sender_user_id=principal.actor_id,
            message_type=message_type,
            title=title,
            body=body,
            version=payload.get("version"),
            created_at=_parse_dt(payload.get("created_at") or event.created_at, "created_at"),
            expires_at=(
                _parse_dt(payload.get("expires_at"), "expires_at")
                if payload.get("expires_at")
                else None
            ),
            idempotency_key=f"sync:{event.event_id}",
            simulated=bool(payload.get("simulated", True)),
        )
    )
    db.flush()


def pull_changes(
    db: Session,
    principal: security.Principal,
    *,
    mission_id: uuid.UUID,
    cursor: str | None,
    limit: int,
) -> dict[str, Any]:
    if principal.role != "crew_member":
        raise ApiError(403, "ROLE_FORBIDDEN", "Only crew clients may pull sync changes.")
    client = resolve_client(db, principal, mission_id=mission_id)
    last_sequence = 0
    if cursor:
        decoded = _decode_feed_cursor(cursor)
        if decoded["client_id"] != str(client.id) or decoded["mission_id"] != str(mission_id):
            raise ApiError(409, INVALID_CURSOR, "The cursor is scoped to another client or mission.")
        last_sequence = int(decoded["last_sequence"])

    rows = db.execute(
        select(ChangeFeed)
        .where(
            ChangeFeed.mission_id == mission_id,
            ChangeFeed.sequence > last_sequence,
        )
        .order_by(ChangeFeed.sequence)
        .limit(limit + 1)
    ).scalars().all()
    has_more = len(rows) > limit
    page = rows[:limit]
    for row in page:
        if row.schema_version not in SUPPORTED_SCHEMA_VERSIONS:
            raise ApiError(
                409,
                BLOCKED_EVENT_SCHEMA,
                "The next change uses an unsupported event schema; update the client before advancing.",
                {
                    "event_id": str(row.event_id),
                    "schema_version": row.schema_version,
                    "server_sequence": row.sequence,
                },
            )

    next_sequence = page[-1].sequence if page else last_sequence
    next_cursor = (
        _encode_feed_cursor(client.id, mission_id, next_sequence)
        if page
        else cursor
    )
    state = db.get(SyncCursor, (client.id, mission_id))
    if state is None:
        state = SyncCursor(
            client_id=client.id,
            mission_id=mission_id,
            last_sequence=next_sequence,
            updated_at=utc_now(),
        )
        db.add(state)
    else:
        state.last_sequence = max(state.last_sequence, next_sequence)
        state.updated_at = utc_now()
    client.last_contact_at = utc_now()
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="sync.pull",
        entity_type="change_feed",
        entity_id=client.id,
        outcome="success",
        mission_id=mission_id,
        astronaut_id=client.astronaut_id,
        details={"from_sequence": last_sequence, "to_sequence": next_sequence, "count": len(page)},
    )
    return {
        "changes": [feed_item(row) for row in page],
        "next_cursor": next_cursor,
        "has_more": has_more,
    }


def _cursor_secret() -> bytes:
    return settings.resolved_jwt_secret.encode("utf-8")


def _encode_feed_cursor(client_id: uuid.UUID, mission_id: uuid.UUID, last_sequence: int) -> str:
    body = encode_cursor(
        {
            "client_id": str(client_id),
            "mission_id": str(mission_id),
            "last_sequence": int(last_sequence),
            "v": 1,
        }
    )
    signature = hmac.new(_cursor_secret(), body.encode("ascii"), hashlib.sha256).hexdigest()[:32]
    return f"{body}.{signature}"


def _decode_feed_cursor(cursor: str) -> dict[str, Any]:
    try:
        body, signature = cursor.rsplit(".", 1)
    except ValueError as exc:
        raise ApiError(409, INVALID_CURSOR, "The cursor is invalid.") from exc
    expected = hmac.new(_cursor_secret(), body.encode("ascii"), hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(signature, expected):
        raise ApiError(409, INVALID_CURSOR, "The cursor is invalid or has been modified.")
    padded = body + "=" * (-len(body) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
        value = json.loads(raw.decode("utf-8"))
    except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
        raise ApiError(409, INVALID_CURSOR, "The cursor is invalid.") from exc
    if (
        not isinstance(value, dict)
        or value.get("v") != 1
        or not isinstance(value.get("last_sequence"), int)
        or not value.get("client_id")
        or not value.get("mission_id")
    ):
        raise ApiError(409, INVALID_CURSOR, "The cursor payload is invalid.")
    return value


def sync_status(
    db: Session,
    principal: security.Principal,
    mission_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    if principal.role != "crew_member":
        raise ApiError(403, "ROLE_FORBIDDEN", "Only crew clients have a synchronization status.")
    client = resolve_client(db, principal, mission_id=mission_id)
    return communication_service.communication_status_for_client(db, client)
