"""Recommended-action lifecycle with append-only events."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, security
from ..errors import CONFLICT, MESSAGE_STATE_INVALID, NOT_FOUND, REVISION_CONFLICT, ApiError
from ..feed import append_change
from ..models import (
    ActionEvent,
    Alert,
    ModuleAssessment,
    Protocol,
    RecommendedAction,
)
from ..schemas import ActionCreateIn, ActionUpdateIn
from ..util import iso, utc_now

EVENT_TO_STATUS = {
    "started": "in_progress",
    "completed": "completed",
    "skipped": "skipped",
    "deferred": "deferred",
    "cancelled": "cancelled",
}
STATUS_TO_EVENT = {
    "in_progress": "started",
    "completed": "completed",
    "skipped": "skipped",
    "deferred": "deferred",
    "cancelled": "cancelled",
}


def action_out(row: RecommendedAction) -> dict[str, Any]:
    return {
        "action_id": str(row.id),
        "astronaut_id": str(row.astronaut_id),
        "mission_id": str(row.mission_id),
        "alert_id": str(row.alert_id) if row.alert_id else None,
        "module_assessment_id": str(row.module_assessment_id) if row.module_assessment_id else None,
        "protocol_id": str(row.protocol_id) if row.protocol_id else None,
        "action_type": row.action_type,
        "priority": row.priority,
        "title": row.title,
        "description": row.description,
        "due_at": iso(row.due_at),
        "status": row.status,
        "demo_only": row.demo_only,
        "created_at": iso(row.created_at),
        "revision": row.revision,
    }


def action_event_out(row: ActionEvent) -> dict[str, Any]:
    return {
        "event_id": str(row.event_id),
        "action_id": str(row.action_id),
        "actor_code": row.actor_code,
        "event_type": row.event_type,
        "note": row.note,
        "client_created_at": iso(row.client_created_at),
        "expected_revision": row.expected_revision,
        "result_revision": row.result_revision,
        "created_at": iso(row.created_at),
    }


def list_actions(
    db: Session,
    principal: security.Principal,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
    status: str | None = None,
    limit: int = 200,
) -> list[RecommendedAction]:
    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="action.list",
        astronaut_id=astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, mission_id, astronaut_id)
    query = select(RecommendedAction).where(
        RecommendedAction.astronaut_id == astronaut_id,
        RecommendedAction.mission_id == mission_id,
    )
    if status:
        query = query.where(RecommendedAction.status == status)
    return db.execute(
        query.order_by(RecommendedAction.created_at.desc()).limit(limit)
    ).scalars().all()


def get_action(
    db: Session, principal: security.Principal, action_id: uuid.UUID
) -> tuple[RecommendedAction, list[ActionEvent]]:
    row = db.get(RecommendedAction, action_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Recommended action not found.")
    security.check_mission_scope(
        db,
        principal,
        row.mission_id,
        action="action.read",
        astronaut_id=row.astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    events = db.execute(
        select(ActionEvent)
        .where(ActionEvent.action_id == action_id)
        .order_by(ActionEvent.created_at)
    ).scalars().all()
    return row, list(events)


def _check_revision(
    db: Session,
    principal: security.Principal,
    row: RecommendedAction,
    expected_revision: int,
) -> None:
    if expected_revision == row.revision:
        return
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="action.revision_conflict",
        entity_type="recommended_action",
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
        "The action revision changed before this update.",
        {"current_revision": row.revision, "current_status": row.status},
    )


def _validate_links(
    db: Session,
    mission_id: uuid.UUID,
    astronaut_id: uuid.UUID,
    *,
    alert_id: uuid.UUID | None,
    assessment_id: uuid.UUID | None,
    protocol_id: uuid.UUID | None,
) -> None:
    if alert_id is not None:
        alert = db.get(Alert, alert_id)
        if alert is None or alert.mission_id != mission_id or alert.astronaut_id != astronaut_id:
            raise ApiError(422, "INVALID_VALUE", "The linked alert is outside this crew/mission scope.")
    if assessment_id is not None:
        assessment = db.get(ModuleAssessment, assessment_id)
        if (
            assessment is None
            or assessment.mission_id != mission_id
            or assessment.astronaut_id != astronaut_id
        ):
            raise ApiError(
                422, "INVALID_VALUE", "The linked assessment is outside this crew/mission scope."
            )
    if protocol_id is not None:
        protocol = db.get(Protocol, protocol_id)
        if protocol is None or protocol.mission_id != mission_id:
            raise ApiError(422, "INVALID_VALUE", "The linked protocol is outside this mission.")


def create_action(
    db: Session,
    principal: security.Principal,
    body: ActionCreateIn,
) -> RecommendedAction:
    security.check_mission_scope(
        db,
        principal,
        body.mission_id,
        action="action.create",
        astronaut_id=body.astronaut_id,
        require_health_access=True,
        allowed_roles={"medical_officer"},
    )
    security.ensure_astronaut_assignment(db, body.mission_id, body.astronaut_id)
    _validate_links(
        db,
        body.mission_id,
        body.astronaut_id,
        alert_id=body.alert_id,
        assessment_id=body.module_assessment_id,
        protocol_id=body.protocol_id,
    )
    row = RecommendedAction(
        id=uuid.uuid4(),
        astronaut_id=body.astronaut_id,
        mission_id=body.mission_id,
        alert_id=body.alert_id,
        module_assessment_id=body.module_assessment_id,
        protocol_id=body.protocol_id,
        action_type=body.action_type,
        priority=body.priority,
        title=body.title,
        description=body.description,
        due_at=body.due_at,
        status="pending",
        demo_only=body.demo_only,
        revision=1,
    )
    db.add(row)
    db.flush()
    append_change(
        db,
        mission_id=row.mission_id,
        entity_type="action_event",
        entity_id=row.id,
        operation="upsert",
        actor_id=principal.actor_id,
        origin="ground_console",
        payload={"action": action_out(row)},
    )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="action.create",
        entity_type="recommended_action",
        entity_id=row.id,
        outcome="success",
        mission_id=row.mission_id,
        astronaut_id=row.astronaut_id,
        details={"action_type": row.action_type, "priority": row.priority},
    )
    return row


def apply_action_event(
    db: Session,
    *,
    principal: security.Principal,
    action_id: uuid.UUID,
    event_type: str,
    expected_revision: int,
    note: str | None = None,
    client_created_at=None,
) -> tuple[RecommendedAction, ActionEvent]:
    row = db.get(RecommendedAction, action_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Recommended action not found.")
    security.check_mission_scope(
        db,
        principal,
        row.mission_id,
        action=f"action.{event_type}",
        astronaut_id=row.astronaut_id,
        require_health_access=True,
        allowed_roles={"medical_officer", "crew_member"},
    )
    if row.status in {"completed", "cancelled"}:
        raise ApiError(
            409,
            MESSAGE_STATE_INVALID,
            "The action lifecycle is already closed.",
            {"current_revision": row.revision, "current_status": row.status},
        )
    _check_revision(db, principal, row, expected_revision)

    if event_type in EVENT_TO_STATUS:
        row.status = EVENT_TO_STATUS[event_type]
    elif event_type != "note_added":
        raise ApiError(422, "INVALID_VALUE", "Unsupported action event type.")
    row.revision = row.revision + 1

    now = utc_now()
    event = ActionEvent(
        id=uuid.uuid4(),
        event_id=uuid.uuid4(),
        action_id=row.id,
        actor_code=principal.actor_id,
        event_type=event_type,
        note=note,
        client_created_at=client_created_at,
        expected_revision=expected_revision,
        result_revision=row.revision,
        created_at=now,
    )
    db.add(event)
    db.flush()
    append_change(
        db,
        mission_id=row.mission_id,
        entity_type="action_event",
        entity_id=row.id,
        operation="append_event",
        actor_id=principal.actor_id,
        origin="ground_console" if principal.role != "crew_member" else "crew_client",
        expected_revision=expected_revision,
        payload={"action": action_out(row), "event": action_event_out(event)},
    )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action=f"action.{event_type}",
        entity_type="recommended_action",
        entity_id=row.id,
        outcome="success",
        mission_id=row.mission_id,
        astronaut_id=row.astronaut_id,
        details={"expected_revision": expected_revision, "result_revision": row.revision},
    )
    return row, event


def update_action(
    db: Session,
    principal: security.Principal,
    action_id: uuid.UUID,
    body: ActionUpdateIn,
) -> tuple[RecommendedAction, ActionEvent]:
    row = db.get(RecommendedAction, action_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Recommended action not found.")
    security.check_mission_scope(
        db,
        principal,
        row.mission_id,
        action="action.update",
        astronaut_id=row.astronaut_id,
        require_health_access=True,
        allowed_roles={"medical_officer"},
    )
    _check_revision(db, principal, row, body.expected_revision)
    if row.status in {"completed", "cancelled"}:
        raise ApiError(
            409,
            MESSAGE_STATE_INVALID,
            "The action lifecycle is already closed.",
            {"current_revision": row.revision, "current_status": row.status},
        )

    event_type = "note_added"
    if body.status is not None and body.status != row.status:
        if body.status == "pending":
            event_type = "note_added"
        else:
            event_type = STATUS_TO_EVENT.get(body.status, "note_added")
        row.status = body.status
    if body.title is not None:
        row.title = body.title
    if body.description is not None:
        row.description = body.description
    if body.priority is not None:
        row.priority = body.priority
    if body.due_at is not None:
        row.due_at = body.due_at

    row.revision = row.revision + 1
    now = utc_now()
    event = ActionEvent(
        id=uuid.uuid4(),
        event_id=uuid.uuid4(),
        action_id=row.id,
        actor_code=principal.actor_id,
        event_type=event_type,
        note=body.note,
        client_created_at=None,
        expected_revision=body.expected_revision,
        result_revision=row.revision,
        created_at=now,
    )
    db.add(event)
    db.flush()
    append_change(
        db,
        mission_id=row.mission_id,
        entity_type="action_event",
        entity_id=row.id,
        operation="append_event",
        actor_id=principal.actor_id,
        origin="ground_console",
        expected_revision=body.expected_revision,
        payload={"action": action_out(row), "event": action_event_out(event)},
    )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="action.update",
        entity_type="recommended_action",
        entity_id=row.id,
        outcome="success",
        mission_id=row.mission_id,
        astronaut_id=row.astronaut_id,
        details={"expected_revision": body.expected_revision, "result_revision": row.revision},
    )
    return row, event
