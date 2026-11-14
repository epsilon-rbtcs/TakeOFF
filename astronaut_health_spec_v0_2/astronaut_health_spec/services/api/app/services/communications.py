"""Communication state and data-freshness reporting.

A successful request is evidence of contact, never proof of ``LIVE``.  The
adapter's last reported state is surfaced verbatim with its observation time;
contact recency and health-data freshness are calculated independently.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import audit
from ..config import settings
from ..errors import NOT_FOUND, ApiError
from ..models import (
    ClientDevice,
    CommunicationSession,
    Observation,
    SyncBatch,
    SyncCursor,
)
from ..util import ensure_aware, iso, utc_now

COMMUNICATION_STATES = {"LIVE", "DELAYED", "BLACKOUT"}


def contact_recency(last_contact_at: datetime | None) -> str:
    if last_contact_at is None:
        return "unknown"
    now = utc_now()
    age = (now - last_contact_at).total_seconds()
    if age <= settings.contact_recent_seconds:
        return "recent"
    return "stale"


def freshness_status(measured_at: datetime | None, received_at: datetime | None) -> str:
    if measured_at is None and received_at is None:
        return "unknown"
    now = utc_now()
    measured_age = (now - measured_at).total_seconds() if measured_at else None
    received_age = (now - received_at).total_seconds() if received_at else None
    if measured_age is None:
        measured_age = received_age
    if measured_age is not None and measured_age <= settings.freshness_current_seconds:
        if received_age is None or received_age <= settings.freshness_delayed_seconds:
            return "current"
    if measured_age is not None and measured_age <= settings.freshness_delayed_seconds:
        return "delayed"
    return "stale"


def latest_session(db: Session, client_id: uuid.UUID) -> CommunicationSession | None:
    return db.execute(
        select(CommunicationSession)
        .where(CommunicationSession.client_id == client_id)
        .order_by(CommunicationSession.observed_at.desc())
        .limit(1)
    ).scalars().first()


def client_for_principal(
    db: Session,
    principal,
    *,
    mission_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
) -> ClientDevice:
    candidate = client_id or principal.client_id
    if candidate is not None:
        device = db.get(ClientDevice, candidate)
        if device is None:
            raise ApiError(404, NOT_FOUND, "Crew client device not found.")
        if mission_id is not None and device.mission_id != mission_id:
            raise ApiError(403, "CLIENT_SCOPE_MISMATCH", "The client is not scoped to this mission.")
        if principal.role == "crew_member" and principal.astronaut_id not in (None, device.astronaut_id):
            raise ApiError(403, "ASTRONAUT_SCOPE_MISMATCH", "The client belongs to another astronaut.")
        if not principal.has_mission(device.mission_id):
            raise ApiError(403, "MISSION_ACCESS_MISMATCH", "The client is outside the actor's mission scope.")
        return device

    query = select(ClientDevice).where(ClientDevice.active.is_(True))
    if mission_id is not None:
        query = query.where(ClientDevice.mission_id == mission_id)
    else:
        query = query.where(ClientDevice.mission_id.in_(principal.mission_ids or [uuid.uuid4()]))
    if principal.role == "crew_member":
        if principal.astronaut_id is None:
            raise ApiError(403, "ASTRONAUT_SCOPE_MISMATCH", "The crew identity has no astronaut scope.")
        query = query.where(ClientDevice.astronaut_id == principal.astronaut_id)
    device = db.execute(query.order_by(ClientDevice.enrolled_at).limit(1)).scalars().first()
    if device is None:
        raise ApiError(404, NOT_FOUND, "No enrolled crew client device is available for this scope.")
    return device


def _client_times(db: Session, client_id: uuid.UUID) -> tuple[datetime | None, datetime | None]:
    last_push = db.scalar(
        select(func.max(SyncBatch.received_at)).where(SyncBatch.client_id == client_id)
    )
    last_pull = db.scalar(
        select(func.max(SyncCursor.updated_at)).where(SyncCursor.client_id == client_id)
    )
    return last_push, last_pull


def freshness_entry(
    db: Session, mission_id: uuid.UUID, astronaut_id: uuid.UUID
) -> dict[str, Any]:
    measured_at, received_at = db.execute(
        select(func.max(Observation.measured_at), func.max(Observation.received_at)).where(
            Observation.mission_id == mission_id,
            Observation.astronaut_id == astronaut_id,
        )
    ).one()
    now = utc_now()
    age = int((now - measured_at).total_seconds()) if measured_at else None
    return {
        "astronaut_id": str(astronaut_id),
        "latest_measured_at": iso(measured_at),
        "latest_received_at": iso(received_at),
        "age_seconds": max(age, 0) if age is not None else None,
        "status": freshness_status(measured_at, received_at),
    }


def communication_status_for_client(
    db: Session,
    client: ClientDevice,
) -> dict[str, Any]:
    session = latest_session(db, client.id)
    last_push, last_pull = _client_times(db, client.id)
    last_contact = client.last_contact_at
    if session is not None and session.last_successful_contact_at is not None:
        if last_contact is None or session.last_successful_contact_at > last_contact:
            last_contact = session.last_successful_contact_at
    if last_push is not None and (last_contact is None or last_push > last_contact):
        last_contact = last_push
    return {
        "client_id": str(client.id),
        "astronaut_id": str(client.astronaut_id),
        "mission_id": str(client.mission_id),
        "state": session.state if session else None,
        "observed_at": iso(session.observed_at) if session else None,
        "contact_recency": contact_recency(last_contact),
        "last_successful_contact_at": iso(last_contact),
        "last_push_at": iso(session.last_push_at if session and session.last_push_at else last_push),
        "last_pull_at": iso(session.last_pull_at if session and session.last_pull_at else last_pull),
        "queued_event_count": session.queued_event_count if session else 0,
        "queued_event_count_reported": session is not None,
        "estimated_delay_seconds": session.estimated_delay_seconds if session else None,
        "details": session.details if session else {},
        "freshness": [freshness_entry(db, client.mission_id, client.astronaut_id)],
    }


def communication_status_for_astronaut(
    db: Session,
    principal,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
) -> dict[str, Any]:
    from .. import security

    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="communication.read",
        astronaut_id=astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, mission_id, astronaut_id)
    clients = db.execute(
        select(ClientDevice).where(
            ClientDevice.mission_id == mission_id,
            ClientDevice.astronaut_id == astronaut_id,
            ClientDevice.active.is_(True),
        )
    ).scalars().all()
    if not clients:
        return {
            "state": None,
            "observed_at": None,
            "contact_recency": "unknown",
            "last_successful_contact_at": None,
            "last_push_at": None,
            "last_pull_at": None,
            "queued_event_count": 0,
            "queued_event_count_reported": False,
            "estimated_delay_seconds": None,
            "freshness": [freshness_entry(db, mission_id, astronaut_id)],
        }
    statuses = [communication_status_for_client(db, client) for client in clients]
    # Latest reported state wins; a request never manufactures a state.
    reported = [item for item in statuses if item["state"] is not None]
    reported.sort(key=lambda item: item["observed_at"] or "", reverse=True)
    latest = reported[0] if reported else statuses[0]
    contact_values = [item["last_successful_contact_at"] for item in statuses if item["last_successful_contact_at"]]
    push_values = [item["last_push_at"] for item in statuses if item["last_push_at"]]
    pull_values = [item["last_pull_at"] for item in statuses if item["last_pull_at"]]
    latest_contact = max(contact_values) if contact_values else None
    return {
        "state": latest["state"],
        "observed_at": latest["observed_at"],
        "contact_recency": contact_recency(_parse(latest_contact)),
        "last_successful_contact_at": latest_contact,
        "last_push_at": max(push_values) if push_values else None,
        "last_pull_at": max(pull_values) if pull_values else None,
        "queued_event_count": sum(item["queued_event_count"] for item in statuses),
        "queued_event_count_reported": any(item["queued_event_count_reported"] for item in statuses),
        "estimated_delay_seconds": latest.get("estimated_delay_seconds"),
        "details": latest.get("details", {}),
        "freshness": [freshness_entry(db, mission_id, astronaut_id)],
    }


def _parse(value: str | None) -> datetime | None:
    from datetime import datetime

    if not value:
        return None
    return datetime.fromisoformat(value)


def record_communication_status(
    db: Session,
    *,
    client: ClientDevice,
    actor_id: str,
    payload: dict[str, Any],
) -> CommunicationSession:
    state = str(payload.get("state", "")).upper()
    if state not in COMMUNICATION_STATES:
        raise ApiError(422, "INVALID_VALUE", "Communication state must be LIVE, DELAYED or BLACKOUT.")
    observed_at = payload.get("observed_at")
    if isinstance(observed_at, str):
        try:
            observed_at = datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ApiError(422, "INVALID_TIMESTAMP", "observed_at must be an ISO-8601 timestamp.") from exc
    if not isinstance(observed_at, datetime):
        raise ApiError(422, "INVALID_TIMESTAMP", "observed_at must be an ISO-8601 timestamp.")
    try:
        observed_at = ensure_aware(observed_at, "observed_at")
    except ValueError as exc:
        raise ApiError(422, "INVALID_TIMESTAMP", str(exc)) from exc
    assert observed_at is not None

    details = dict(payload.get("details") or {})
    details.setdefault("simulated", True)
    session = CommunicationSession(
        id=uuid.uuid4(),
        client_id=client.id,
        observed_at=observed_at,
        state=state,
        last_successful_contact_at=_optional_dt(payload.get("last_successful_contact_at")),
        last_push_at=_optional_dt(payload.get("last_push_at")),
        last_pull_at=_optional_dt(payload.get("last_pull_at")),
        queued_event_count=max(int(payload.get("queued_event_count") or 0), 0),
        estimated_delay_seconds=payload.get("estimated_delay_seconds"),
        details=details,
    )
    db.add(session)
    contact = session.last_successful_contact_at or observed_at
    if client.last_contact_at is None or contact > client.last_contact_at:
        client.last_contact_at = contact
    audit.record(
        db,
        actor_id=actor_id,
        actor_role="crew_member",
        action="communication.state_report",
        entity_type="communication_status",
        entity_id=client.id,
        outcome="success",
        mission_id=client.mission_id,
        astronaut_id=client.astronaut_id,
        details={"state": state, "queued_event_count": session.queued_event_count},
    )
    return session


def _optional_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ApiError(422, "INVALID_TIMESTAMP", "Communication timestamps must be ISO-8601 values.") from exc
    if not isinstance(value, datetime):
        raise ApiError(422, "INVALID_TIMESTAMP", "Communication timestamps must be ISO-8601 values.")
    try:
        return ensure_aware(value, "communication timestamp")
    except ValueError as exc:
        raise ApiError(422, "INVALID_TIMESTAMP", str(exc)) from exc
