"""Communication state and health-data freshness.

``GET /communications/status`` is documented with ``astronaut_id``.  The
additive ``client_id`` query accepts the ground console's device-scoped call
without changing the documented astronaut-scoped behaviour.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import VALIDATION_ERROR, ApiError
from ..services import communications as communication_service

router = APIRouter(tags=["communications"])


@router.get("/communications/status")
def get_communication_status(
    astronaut_id: uuid.UUID | None = Query(default=None),
    client_id: uuid.UUID | None = Query(default=None),
    mission_id: uuid.UUID | None = Query(default=None),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    if client_id is not None:
        client = communication_service.client_for_principal(
            db, principal, mission_id=mission_id, client_id=client_id
        )
        payload = communication_service.communication_status_for_client(db, client)
        return payload

    resolved_astronaut = astronaut_id or principal.astronaut_id
    if resolved_astronaut is None:
        raise ApiError(
            422,
            VALIDATION_ERROR,
            "astronaut_id or client_id is required.",
        )
    resolved_mission = mission_id or security.infer_mission(
        principal, astronaut_id=resolved_astronaut
    )
    payload = communication_service.communication_status_for_astronaut(
        db, principal, resolved_astronaut, resolved_mission
    )
    payload["astronaut_id"] = str(resolved_astronaut)
    payload["mission_id"] = str(resolved_mission)
    return payload
