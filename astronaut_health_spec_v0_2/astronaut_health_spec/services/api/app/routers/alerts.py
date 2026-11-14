"""Alert lifecycle routes.

The documented route is ``GET /alerts`` plus
``POST /alerts/{alert_id}/acknowledgements``.  ``GET /alerts/{alert_id}``,
``GET /alerts/{alert_id}/history`` and ``POST /alerts/{alert_id}/events`` are
additive, documented extensions used by the ground console to inspect history
and record explicit resolve/dismiss transitions.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import INVALID_TIMESTAMP, ApiError
from ..schemas import AlertAcknowledgementIn, AlertEventIn
from ..services import alerts as alert_service
from ..util import ensure_aware

router = APIRouter(tags=["alerts"])


def _aware(value: datetime | None, field: str) -> datetime | None:
    try:
        return ensure_aware(value, field)
    except ValueError as exc:
        raise ApiError(422, INVALID_TIMESTAMP, str(exc), {"field": field}) from exc


@router.get("/alerts")
def list_alerts(
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
    rows = alert_service.list_alerts(
        db,
        principal,
        astronaut_id=astronaut_id,
        mission_id=resolved_mission,
        status=status,
        limit=limit,
    )
    return {"items": [alert_service.alert_out(row) for row in rows]}


@router.get("/alerts/{alert_id}")
def get_alert(
    alert_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row, events = alert_service.get_alert(db, principal, alert_id)
    payload = alert_service.alert_out(row)
    payload["history"] = [alert_service.alert_event_out(event) for event in events]
    return payload


@router.get("/alerts/{alert_id}/history")
def get_alert_history(
    alert_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    _, events = alert_service.get_alert(db, principal, alert_id)
    return {"items": [alert_service.alert_event_out(event) for event in events]}


@router.post("/alerts/{alert_id}/acknowledgements")
def acknowledge_alert(
    alert_id: uuid.UUID,
    body: AlertAcknowledgementIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row, _ = alert_service.apply_alert_event(
        db,
        principal=principal,
        alert_id=alert_id,
        event_type="acknowledged",
        expected_revision=body.expected_revision,
        note=body.note,
    )
    return alert_service.alert_out(row)


@router.post("/alerts/{alert_id}/events")
def create_alert_event(
    alert_id: uuid.UUID,
    body: AlertEventIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row, event = alert_service.apply_alert_event(
        db,
        principal=principal,
        alert_id=alert_id,
        event_type=body.event_type,
        expected_revision=body.expected_revision,
        note=body.note,
        client_created_at=_aware(body.client_created_at, "client_created_at"),
    )
    payload = alert_service.alert_event_out(event)
    payload["alert"] = alert_service.alert_out(row)
    return payload
