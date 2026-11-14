"""Recommended-action routes.

``GET /actions`` and ``POST /actions/{action_id}/events`` are documented.
Creating and editing actions is an additive extension used by the ground
console; every mutation still requires mission/astronaut scope and an
``expected_revision``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import INVALID_TIMESTAMP, ApiError
from ..schemas import ActionCreateIn, ActionEventIn, ActionUpdateIn
from ..services import actions as action_service
from ..util import ensure_aware

router = APIRouter(tags=["actions"])


def _aware(value: datetime | None, field: str) -> datetime | None:
    try:
        return ensure_aware(value, field)
    except ValueError as exc:
        raise ApiError(422, INVALID_TIMESTAMP, str(exc), {"field": field}) from exc


@router.get("/actions")
def list_actions(
    astronaut_id: uuid.UUID = Query(...),
    mission_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    resolved_mission = mission_id or security.infer_mission(
        principal, astronaut_id=astronaut_id
    )
    rows = action_service.list_actions(
        db,
        principal,
        astronaut_id=astronaut_id,
        mission_id=resolved_mission,
        status=status,
        limit=limit,
    )
    return {"items": [action_service.action_out(row) for row in rows]}


@router.post("/actions", status_code=201)
def create_action(
    body: ActionCreateIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row = action_service.create_action(db, principal, body)
    return action_service.action_out(row)


@router.get("/actions/{action_id}")
def get_action(
    action_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row, events = action_service.get_action(db, principal, action_id)
    payload = action_service.action_out(row)
    payload["history"] = [action_service.action_event_out(event) for event in events]
    return payload


@router.get("/actions/{action_id}/history")
def get_action_history(
    action_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    _, events = action_service.get_action(db, principal, action_id)
    return {"items": [action_service.action_event_out(event) for event in events]}


@router.patch("/actions/{action_id}")
def update_action(
    action_id: uuid.UUID,
    body: ActionUpdateIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row, _ = action_service.update_action(db, principal, action_id, body)
    return action_service.action_out(row)


@router.post("/actions/{action_id}/events", status_code=201)
def create_action_event(
    action_id: uuid.UUID,
    body: ActionEventIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row, event = action_service.apply_action_event(
        db,
        principal=principal,
        action_id=action_id,
        event_type=body.event_type,
        expected_revision=body.expected_revision,
        note=body.note,
        client_created_at=_aware(body.client_created_at, "client_created_at"),
    )
    payload = action_service.action_event_out(event)
    payload["action"] = action_service.action_out(row)
    return payload
