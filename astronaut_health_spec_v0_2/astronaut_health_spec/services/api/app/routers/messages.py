"""Ground-to-crew messages and lifecycle events."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import INVALID_TIMESTAMP, VALIDATION_ERROR, ApiError
from ..schemas import MessageEventIn, MessageIn
from ..services import messages as message_service
from ..util import ensure_aware

router = APIRouter(tags=["messages"])


def _aware(value: datetime | None, field: str) -> datetime | None:
    try:
        return ensure_aware(value, field)
    except ValueError as exc:
        raise ApiError(422, INVALID_TIMESTAMP, str(exc), {"field": field}) from exc


def _idempotency_key(value: str) -> str:
    key = value.strip()
    if not key or len(key) > 200:
        raise ApiError(
            422,
            VALIDATION_ERROR,
            "The Idempotency-Key header must contain between 1 and 200 characters.",
        )
    return key


@router.get("/messages")
def list_messages(
    mission_id: uuid.UUID | None = Query(default=None),
    astronaut_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    items = message_service.list_messages(
        db,
        principal,
        limit=limit,
        mission_id=mission_id,
        astronaut_id=astronaut_id,
    )
    return {"items": items}


@router.post("/messages", status_code=201)
def create_message(
    body: MessageIn,
    idempotency_key: str = Header(alias="Idempotency-Key"),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    body.expires_at = _aware(body.expires_at, "expires_at")
    row, _created = message_service.create_message(
        db,
        principal,
        body,
        _idempotency_key(idempotency_key),
    )
    return message_service.message_out(db, row, events=[])


@router.get("/messages/{message_id}")
def get_message(
    message_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row = message_service.get_message(db, principal, message_id)
    return message_service.message_out(db, row)


@router.post("/messages/{message_id}/events", status_code=201)
def create_message_event(
    message_id: uuid.UUID,
    body: MessageEventIn,
    idempotency_key: str = Header(alias="Idempotency-Key"),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    client_created_at = _aware(body.client_created_at, "client_created_at")
    event, _created = message_service.create_message_event(
        db,
        principal,
        message_id,
        body.event_type,
        client_created_at,
        _idempotency_key(idempotency_key),
    )
    row = message_service.get_message(db, principal, message_id)
    payload = message_service.message_event_out(event)
    payload["message_status"] = message_service.message_out(db, row)["status"]
    return payload
