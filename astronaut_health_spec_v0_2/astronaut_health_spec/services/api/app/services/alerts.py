"""Alert lifecycle with optimistic concurrency and append-only history."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, security
from ..errors import CONFLICT, MESSAGE_STATE_INVALID, NOT_FOUND, REVISION_CONFLICT, ApiError
from ..feed import append_change
from ..models import Alert, AlertEvent
from ..util import iso, jsonable, utc_now


def alert_out(row: Alert) -> dict[str, Any]:
    return {
        "alert_id": str(row.id),
        "alert_code": row.alert_code,
        "severity": row.severity,
        "title": row.title,
        "message": row.message,
        "status": row.status,
        "created_at": iso(row.created_at),
        "acknowledged_at": iso(row.acknowledged_at),
        "acknowledged_by": row.acknowledged_by,
        "resolved_at": iso(row.resolved_at),
        "revision": row.revision,
        "provenance": jsonable(row.provenance or {}),
    }


def alert_event_out(row: AlertEvent) -> dict[str, Any]:
    return {
        "event_id": str(row.event_id),
        "alert_id": str(row.alert_id),
        "actor_id": row.actor_id,
        "event_type": row.event_type,
        "note": row.note,
        "client_created_at": iso(row.client_created_at),
        "expected_revision": row.expected_revision,
        "result_revision": row.result_revision,
        "recorded_at": iso(row.recorded_at),
    }


def list_alerts(
    db: Session,
    principal: security.Principal,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
    status: str | None = None,
    limit: int = 200,
) -> list[Alert]:
    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="alert.list",
        astronaut_id=astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, mission_id, astronaut_id)
    query = select(Alert).where(
        Alert.astronaut_id == astronaut_id,
        Alert.mission_id == mission_id,
    )
    if status:
        query = query.where(Alert.status == status)
    return db.execute(
        query.order_by(Alert.created_at.desc()).limit(limit)
    ).scalars().all()


def get_alert(
    db: Session, principal: security.Principal, alert_id: uuid.UUID
) -> tuple[Alert, list[AlertEvent]]:
    row = db.get(Alert, alert_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Alert not found.")
    security.check_mission_scope(
        db,
        principal,
        row.mission_id,
        action="alert.read",
        astronaut_id=row.astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    events = db.execute(
        select(AlertEvent)
        .where(AlertEvent.alert_id == alert_id)
        .order_by(AlertEvent.recorded_at)
    ).scalars().all()
    return row, list(events)


def apply_alert_event(
    db: Session,
    *,
    principal: security.Principal,
    alert_id: uuid.UUID,
    event_type: str,
    expected_revision: int,
    note: str | None = None,
    client_created_at=None,
) -> tuple[Alert, AlertEvent]:
    row = db.get(Alert, alert_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Alert not found.")
    security.check_mission_scope(
        db,
        principal,
        row.mission_id,
        action=f"alert.{event_type}",
        astronaut_id=row.astronaut_id,
        require_health_access=True,
        allowed_roles={"medical_officer"},
    )
    if row.status in {"resolved", "dismissed"}:
        raise ApiError(
            409,
            MESSAGE_STATE_INVALID,
            "The alert lifecycle is already closed.",
            {"current_revision": row.revision, "current_status": row.status},
        )
    if expected_revision != row.revision:
        conflict_for_revision(db, principal, row, expected_revision)

    now = utc_now()
    row.revision = row.revision + 1
    if event_type == "acknowledged":
        row.status = "acknowledged"
        row.acknowledged_at = now
        row.acknowledged_by = principal.actor_id
    elif event_type == "resolved":
        row.status = "resolved"
        row.resolved_at = now
    elif event_type == "dismissed":
        row.status = "dismissed"
        row.resolved_at = now
    else:  # pragma: no cover - enforced by the request schema
        raise ApiError(422, "INVALID_VALUE", "Unsupported alert event type.")

    event = AlertEvent(
        id=uuid.uuid4(),
        event_id=uuid.uuid4(),
        alert_id=row.id,
        actor_id=principal.actor_id,
        event_type=event_type,
        note=note,
        client_created_at=client_created_at,
        expected_revision=expected_revision,
        result_revision=row.revision,
        recorded_at=now,
    )
    db.add(event)
    db.flush()

    append_change(
        db,
        mission_id=row.mission_id,
        entity_type="alert_event",
        entity_id=row.id,
        operation="append_event",
        actor_id=principal.actor_id,
        origin="ground_console",
        expected_revision=expected_revision,
        payload={"alert": alert_out(row), "event": alert_event_out(event)},
    )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action=f"alert.{event_type}",
        entity_type="alert",
        entity_id=row.id,
        outcome="success",
        mission_id=row.mission_id,
        astronaut_id=row.astronaut_id,
        details={"expected_revision": expected_revision, "result_revision": row.revision},
    )
    return row, event


def conflict_for_revision(
    db: Session,
    principal: security.Principal,
    row: Alert,
    expected_revision: int,
) -> None:
    """Record an immutable conflict audit entry before raising ``ApiError``."""
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="alert.revision_conflict",
        entity_type="alert",
        entity_id=row.id,
        outcome="conflict",
        mission_id=row.mission_id,
        astronaut_id=row.astronaut_id,
        details={"expected_revision": expected_revision, "current_revision": row.revision},
    )
    db.commit()
    raise ApiError(
        409,
        REVISION_CONFLICT,
        "The alert revision changed before this update.",
        {"current_revision": row.revision, "current_status": row.status},
    )
