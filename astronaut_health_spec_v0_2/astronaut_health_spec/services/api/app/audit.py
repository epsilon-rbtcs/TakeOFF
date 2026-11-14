"""Append-only audit recording.

Audit details must never contain message bodies, observation values, credentials
or database keys.  Callers pass identifiers, codes and lifecycle metadata only.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .errors import current_request_id
from .models import Astronaut, AstronautMission, AuditEvent, Mission
from .util import utc_now


def _scope_references(
    db: Session, mission_id: uuid.UUID | None, astronaut_id: uuid.UUID | None
) -> tuple[uuid.UUID | None, uuid.UUID | None]:
    """Keep audit scope inside rows that actually exist.

    ``audit_events`` references ``missions``, ``astronauts`` and the composite
    ``(astronaut_id, mission_id)`` assignment.  Denied requests legitimately
    carry identifiers the caller invented or that the caller cannot see, and an
    audit write must still succeed in that case.  Unresolvable references are
    dropped from the indexed columns (callers re-add them to ``details``) so the
    append-only record never fails on a foreign key.
    """
    if mission_id is not None:
        exists = db.execute(select(Mission.id).where(Mission.id == mission_id)).first()
        if exists is None:
            mission_id = None
    if astronaut_id is not None:
        exists = db.execute(select(Astronaut.id).where(Astronaut.id == astronaut_id)).first()
        if exists is None:
            astronaut_id = None
    if mission_id is not None and astronaut_id is not None:
        assigned = db.execute(
            select(AstronautMission.id).where(
                AstronautMission.astronaut_id == astronaut_id,
                AstronautMission.mission_id == mission_id,
            )
        ).first()
        if assigned is None:
            mission_id = None
            astronaut_id = None
    return mission_id, astronaut_id


def record(
    db: Session,
    *,
    actor_id: str,
    actor_role: str,
    action: str,
    entity_type: str,
    outcome: str,
    mission_id: uuid.UUID | None = None,
    astronaut_id: uuid.UUID | None = None,
    entity_id: str | uuid.UUID | None = None,
    details: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> AuditEvent:
    details = dict(details or {})
    safe_mission_id, safe_astronaut_id = _scope_references(db, mission_id, astronaut_id)
    if mission_id is not None and safe_mission_id is None:
        details.setdefault("attempted_mission_id", str(mission_id))
    if astronaut_id is not None and safe_astronaut_id is None:
        details.setdefault("attempted_astronaut_id", str(astronaut_id))

    event = AuditEvent(
        id=uuid.uuid4(),
        occurred_at=occurred_at or utc_now(),
        recorded_at=utc_now(),
        actor_id=actor_id,
        actor_role=actor_role,
        mission_id=safe_mission_id,
        astronaut_id=safe_astronaut_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        request_id=current_request_id() or None,
        outcome=outcome,
        details=details,
    )
    db.add(event)
    return event


def record_and_commit(db: Session, **kwargs) -> AuditEvent:
    event = record(db, **kwargs)
    db.commit()
    return event
