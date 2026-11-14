"""Ground dashboard summary."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..services import dashboard as dashboard_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary")
def get_dashboard_summary(
    astronaut_id: uuid.UUID = Query(...),
    mission_id: uuid.UUID = Query(...),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    return dashboard_service.dashboard_summary(db, principal, astronaut_id, mission_id)
