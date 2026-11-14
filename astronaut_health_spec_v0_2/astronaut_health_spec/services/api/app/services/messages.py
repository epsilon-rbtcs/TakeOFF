"""Ground-to-crew messages and append-only message lifecycle events."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, security
from ..errors import (
    IDEMPOTENCY_KEY_REUSED,
    MESSAGE_EXPIRED,
    MESSAGE_STATE_INVALID,
    NOT_FOUND,
    ROLE_FORBIDDEN,
    ApiError,
)
from ..feed import append_change
from ..models import Message, MessageEvent
from ..schemas import MessageIn
from ..util import iso, jsonable, utc_now

CREW_EVENTS = {"received_by_crew", "read", "withdrawn"}
GROUND_EVENTS = {"transmitted", "received_by_ground", "expired", "withdrawn"}


def _status_from_events(events: list[MessageEvent]) -> str:
    types = {event.event_type for event in events}
    if "expired" in types:
        return "expired"
    if "withdrawn" in types:
        return "withdrawn"
    if "read" in types:
        return "read"
    if "received_by_crew" in types or "received_by_ground" in types:
        return "received"
    if "transmitted" in types:
        return "transmitted"
    return "queued"


def message_out(db: Session, row: Message, events: list[MessageEvent] | None = None) -> dict[str, Any]:
    if events is None:
        events = db.execute(
            select(MessageEvent)
            .where(MessageEvent.message_id == row.id)
            .order_by(MessageEvent.occurred_at)
        ).scalars().all()
    lifecycle = [
        {
            "event_id": str(event.event_id),
            "event_type": event.event_type,
            "actor_id": event.actor_id,
            "client_created_at": iso(event.client_created_at),
            "occurred_at": iso(event.occurred_at),
            "recorded_at": iso(event.recorded_at),
        }
        for event in events
    ]
    return {
        "message_id": str(row.id),
        "mission_id": str(row.mission_id),
        "astronaut_id": str(row.astronaut_id),
        "sender_user_id": row.sender_user_id,
        "message_type": row.message_type,
        "title": row.title,
        "body": row.body,
        "version": row.version,
        "created_at": iso(row.created_at),
        "expires_at": iso(row.expires_at),
        "simulated": row.simulated,
        "status": _status_from_events(events),
        "lifecycle": lifecycle,
    }


def message_event_out(row: MessageEvent) -> dict[str, Any]:
    return {
        "event_id": str(row.event_id),
        "message_id": str(row.message_id),
        "event_type": row.event_type,
        "actor_id": row.actor_id,
        "client_created_at": iso(row.client_created_at),
        "occurred_at": iso(row.occurred_at),
        "recorded_at": iso(row.recorded_at),
        "metadata": jsonable(row.metadata_ or {}),
    }


def _message_scope(principal: security.Principal) -> tuple[list[uuid.UUID], list[uuid.UUID]]:
    mission_ids = principal.mission_ids
    astronaut_ids = [scope.astronaut_id for scope in principal.mission_scopes if scope.astronaut_id]
    if principal.role == "crew_member" and principal.astronaut_id is not None:
        astronaut_ids = [principal.astronaut_id]
    return mission_ids, astronaut_ids


def list_messages(
    db: Session,
    principal: security.Principal,
    limit: int = 200,
    *,
    mission_id: uuid.UUID | None = None,
    astronaut_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    if principal.role == "administrator":
        raise ApiError(403, ROLE_FORBIDDEN, "Administrator accounts do not receive message access by default.")
    mission_ids, astronaut_ids = _message_scope(principal)
    if mission_id is not None:
        if mission_id not in mission_ids:
            raise ApiError(
                403,
                "MISSION_ACCESS_MISMATCH",
                "The authenticated actor is not scoped to this mission.",
                {"mission_id": str(mission_id)},
            )
        mission_ids = [mission_id]
    if not mission_ids:
        return []
    query = select(Message).where(Message.mission_id.in_(mission_ids))
    if principal.role == "crew_member":
        if principal.astronaut_id is None:
            return []
        query = query.where(Message.astronaut_id == principal.astronaut_id)
        if astronaut_id is not None and astronaut_id != principal.astronaut_id:
            return []
    elif astronaut_ids:
        query = query.where(Message.astronaut_id.in_(astronaut_ids))
        if astronaut_id is not None and astronaut_id not in astronaut_ids:
            return []
    if astronaut_id is not None:
        query = query.where(Message.astronaut_id == astronaut_id)
    rows = db.execute(query.order_by(Message.created_at.desc()).limit(limit)).scalars().all()
    return [message_out(db, row) for row in rows]


def create_message(
    db: Session,
    principal: security.Principal,
    body: MessageIn,
    idempotency_key: str,
) -> tuple[Message, bool]:
    security.check_mission_scope(
        db,
        principal,
        body.mission_id,
        action="message.create",
        astronaut_id=body.astronaut_id,
        require_health_access=True,
        allowed_roles={"medical_officer"},
    )
    security.ensure_astronaut_assignment(db, body.mission_id, body.astronaut_id)

    existing = db.execute(
        select(Message).where(Message.idempotency_key == idempotency_key)
    ).scalar_one_or_none()
    if existing is not None:
        same = (
            existing.mission_id == body.mission_id
            and existing.astronaut_id == body.astronaut_id
            and existing.message_type == body.message_type
            and existing.title == body.title
            and existing.body == body.body
            and existing.version == body.version
        )
        if same:
            return existing, False
        raise ApiError(
            409,
            IDEMPOTENCY_KEY_REUSED,
            "This idempotency key was already used for a different message.",
            {"message_id": str(existing.id)},
        )

    row = Message(
        id=uuid.uuid4(),
        mission_id=body.mission_id,
        astronaut_id=body.astronaut_id,
        sender_user_id=principal.actor_id,
        message_type=body.message_type,
        title=body.title,
        body=body.body,
        version=body.version,
        created_at=utc_now(),
        expires_at=body.expires_at,
        idempotency_key=idempotency_key,
        simulated=True,
    )
    db.add(row)
    db.flush()
    entity_type = "crew_update" if body.message_type == "update" else "ground_message"
    append_change(
        db,
        mission_id=row.mission_id,
        entity_type=entity_type,
        entity_id=row.id,
        operation="upsert",
        actor_id=principal.actor_id,
        origin="ground_console",
        payload=message_out(db, row, events=[]),
    )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="message.create",
        entity_type="message",
        entity_id=row.id,
        outcome="success",
        mission_id=row.mission_id,
        astronaut_id=row.astronaut_id,
        details={"message_type": row.message_type, "version": row.version},
    )
    return row, True


def _load_message(
    db: Session, principal: security.Principal, message_id: uuid.UUID
) -> Message:
    row = db.get(Message, message_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Message not found.")
    security.check_mission_scope(
        db,
        principal,
        row.mission_id,
        action="message.read",
        astronaut_id=row.astronaut_id,
        require_health_access=principal.role != "administrator",
        allowed_roles={"crew_member", "medical_officer"},
    )
    return row


def get_message(
    db: Session, principal: security.Principal, message_id: uuid.UUID
) -> Message:
    """Authorization-checked message lookup used by HTTP routes."""
    return _load_message(db, principal, message_id)


def create_message_event(
    db: Session,
    principal: security.Principal,
    message_id: uuid.UUID,
    event_type: str,
    client_created_at,
    idempotency_key: str,
    *,
    append_to_feed: bool = True,
) -> tuple[MessageEvent, bool]:
    row = _load_message(db, principal, message_id)

    if principal.role == "crew_member" and event_type not in CREW_EVENTS:
        raise ApiError(403, ROLE_FORBIDDEN, "Crew members may only record crew-side message events.")
    if principal.role == "medical_officer" and event_type not in GROUND_EVENTS:
        raise ApiError(403, ROLE_FORBIDDEN, "Ground officers may only record ground-side message events.")

    now = utc_now()
    if row.expires_at is not None and now >= row.expires_at and event_type not in {"expired", "withdrawn"}:
        raise ApiError(
            409,
            MESSAGE_EXPIRED,
            "The message has expired.",
            {"message_id": str(row.id), "expires_at": iso(row.expires_at)},
        )
    events = db.execute(
        select(MessageEvent).where(MessageEvent.message_id == row.id)
    ).scalars().all()
    status = _status_from_events(events)
    if status in {"withdrawn", "expired"} and event_type != status:
        raise ApiError(
            409,
            MESSAGE_STATE_INVALID,
            "The message lifecycle is already closed.",
            {"message_id": str(row.id), "current_status": status},
        )

    event_id = uuid.uuid5(
        uuid.NAMESPACE_URL, f"crew-health:message-event:{row.id}:{idempotency_key}"
    )
    existing = db.execute(
        select(MessageEvent).where(MessageEvent.event_id == event_id)
    ).scalar_one_or_none()
    if existing is not None:
        if existing.event_type == event_type:
            return existing, False
        raise ApiError(
            409,
            IDEMPOTENCY_KEY_REUSED,
            "This message event idempotency key was reused with different content.",
            {"event_id": str(existing.event_id)},
        )

    event = MessageEvent(
        id=uuid.uuid4(),
        event_id=event_id,
        message_id=row.id,
        actor_id=principal.actor_id,
        event_type=event_type,
        client_created_at=client_created_at,
        occurred_at=client_created_at or now,
        recorded_at=now,
        metadata_={
            "idempotency_key": idempotency_key,
            "source": "ground_api",
            "simulated": row.simulated,
        },
    )
    db.add(event)
    db.flush()
    if append_to_feed:
        append_change(
            db,
            mission_id=row.mission_id,
            entity_type="message_lifecycle_event",
            entity_id=row.id,
            operation="append_event",
            actor_id=principal.actor_id,
            origin="crew_client" if principal.role == "crew_member" else "ground_console",
            payload={"message": message_out(db, row), "event": message_event_out(event)},
        )
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action=f"message.{event_type}",
        entity_type="message",
        entity_id=row.id,
        outcome="success",
        mission_id=row.mission_id,
        astronaut_id=row.astronaut_id,
        details={"event_id": str(event.event_id)},
    )
    return event, True
