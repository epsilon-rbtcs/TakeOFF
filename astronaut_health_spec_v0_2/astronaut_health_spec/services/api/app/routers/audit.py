"""Append-only audit retrieval (additive documented extension).

The published v0.3 contract requires audit *recording* but does not define a
retrieval route.  This read-only extension lets an authorized administrator or
medical officer inspect their own mission scope; it never mutates audit rows.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import ASTRONAUT_SCOPE_MISMATCH, ApiError
from ..models import AuditEvent
from ..util import iso, jsonable

router = APIRouter(tags=["audit"])


def _audit_out(row: AuditEvent) -> dict:
    return {
        "audit_event_id": str(row.id),
        "occurred_at": iso(row.occurred_at),
        "recorded_at": iso(row.recorded_at),
        "actor_id": row.actor_id,
        "actor_role": row.actor_role,
        "mission_id": str(row.mission_id) if row.mission_id else None,
        "astronaut_id": str(row.astronaut_id) if row.astronaut_id else None,
        "action": row.action,
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "request_id": row.request_id,
        "outcome": row.outcome,
        "details": jsonable(row.details or {}),
    }


@router.get("/audit/events")
def list_audit_events(
    mission_id: uuid.UUID | None = Query(default=None),
    astronaut_id: uuid.UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    outcome: str | None = Query(default=None),
    occurred_from: datetime | None = Query(default=None),
    occurred_to: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    if mission_id is not None:
        security.check_mission_scope(
            db,
            principal,
            mission_id,
            action="audit.read",
            require_health_access=False,
            allowed_roles={"medical_officer", "administrator"},
        )
        mission_ids = [mission_id]
    else:
        if principal.role not in {"medical_officer", "administrator"}:
            security.check_role(
                db,
                principal,
                {"medical_officer", "administrator"},
                action="audit.read",
            )
        mission_ids = principal.mission_ids

    query = select(AuditEvent)
    if mission_ids:
        query = query.where(
            or_(AuditEvent.mission_id.in_(mission_ids), AuditEvent.mission_id.is_(None))
        )
    else:
        query = query.where(AuditEvent.mission_id.is_(None))

    scoped_astronauts = [
        scope.astronaut_id
        for scope in principal.mission_scopes
        if scope.astronaut_id is not None
    ]
    if astronaut_id is not None:
        if scoped_astronauts and astronaut_id not in scoped_astronauts:
            raise ApiError(
                403,
                ASTRONAUT_SCOPE_MISMATCH,
                "The authenticated actor is not scoped to this astronaut.",
            )
        query = query.where(AuditEvent.astronaut_id == astronaut_id)
    elif scoped_astronauts:
        query = query.where(
            or_(
                AuditEvent.astronaut_id.in_(scoped_astronauts),
                AuditEvent.astronaut_id.is_(None),
            )
        )
    if action:
        query = query.where(AuditEvent.action == action)
    if entity_type:
        query = query.where(AuditEvent.entity_type == entity_type)
    if outcome:
        query = query.where(AuditEvent.outcome == outcome)
    if occurred_from is not None:
        query = query.where(AuditEvent.occurred_at >= occurred_from)
    if occurred_to is not None:
        query = query.where(AuditEvent.occurred_at <= occurred_to)

    rows = db.execute(
        query.order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
    return {
        "items": [_audit_out(row) for row in rows],
        "limit": limit,
        "offset": offset,
    }
