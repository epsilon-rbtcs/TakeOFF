"""Personal baseline routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..services import baselines as baseline_service

router = APIRouter(tags=["baselines"])


@router.get("/astronauts/{astronaut_id}/baselines")
def list_baselines(
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID | None = Query(default=None),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    rows = baseline_service.list_baselines(db, principal, astronaut_id, mission_id)
    return {
        "items": [baseline_service.baseline_out(db, row) for row in rows],
    }
