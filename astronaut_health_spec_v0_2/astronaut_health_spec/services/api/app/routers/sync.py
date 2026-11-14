"""Crew store-and-forward synchronization."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import ROLE_FORBIDDEN, VALIDATION_ERROR, ApiError
from ..schemas import SyncPushIn
from ..services import communications as communication_service
from ..services import sync as sync_service

router = APIRouter(tags=["sync"])


@router.post("/sync/push")
def push_sync_events(
    body: SyncPushIn,
    idempotency_key: str = Header(alias="Idempotency-Key"),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    key = idempotency_key.strip()
    if not key or len(key) > 200:
        raise ApiError(
            422,
            VALIDATION_ERROR,
            "The Idempotency-Key header must contain between 1 and 200 characters.",
        )
    return sync_service.push_events(db, principal, body, key)


@router.get("/sync/pull")
def pull_sync_changes(
    mission_id: uuid.UUID = Query(...),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    return sync_service.pull_changes(
        db,
        principal,
        mission_id=mission_id,
        cursor=cursor,
        limit=limit,
    )


@router.get("/sync/status")
def get_sync_status(
    mission_id: uuid.UUID | None = Query(default=None),
    client_id: uuid.UUID | None = Query(default=None),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    if principal.role == "crew_member":
        if client_id is None and mission_id is None:
            return sync_service.sync_status(db, principal)
        client = communication_service.client_for_principal(
            db, principal, mission_id=mission_id, client_id=client_id
        )
        return communication_service.communication_status_for_client(db, client)

    # Additive read-only ground view: a medical officer may inspect the status
    # of an explicit client inside their mission scope.  A request never
    # manufactures contact or a LIVE state.
    if principal.role != "medical_officer":
        raise ApiError(
            403,
            ROLE_FORBIDDEN,
            "Only crew clients and scoped medical officers have a synchronization status.",
        )
    if client_id is None:
        raise ApiError(
            422,
            VALIDATION_ERROR,
            "client_id is required when a medical officer reads synchronization status.",
        )
    client = communication_service.client_for_principal(
        db, principal, mission_id=mission_id, client_id=client_id
    )
    return communication_service.communication_status_for_client(db, client)
