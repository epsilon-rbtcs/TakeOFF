"""Mission context routes."""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import MISSION_ACCESS_MISMATCH, NOT_FOUND, ApiError
from ..models import Mission
from ..util import iso

router = APIRouter(tags=["missions"])


def mission_out(row: Mission) -> dict[str, Any]:
    return {
        "mission_id": str(row.id),
        "mission_code": row.mission_code,
        "mission_name": row.mission_name,
        "mission_type": row.mission_type,
        "status": row.status,
        "start_at": iso(row.start_at),
        "expected_end_at": iso(row.expected_end_at),
        "created_at": iso(row.created_at),
        "simulated": True,
    }


def _require_mission_scope(
    db: Session, principal: security.Principal, mission_id: uuid.UUID
) -> None:
    if not principal.has_mission(mission_id):
        raise security.deny(
            db,
            principal,
            status_code=403,
            code=MISSION_ACCESS_MISMATCH,
            message="The authenticated actor is not scoped to this mission.",
            action="mission.read",
            mission_id=mission_id,
        )


@router.get("/missions/{mission_id}")
def get_mission(
    mission_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(Mission, mission_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Mission not found.")
    _require_mission_scope(db, principal, mission_id)
    return mission_out(row)


@router.get("/missions")
def list_missions(
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    rows = db.execute(
        select(Mission).where(Mission.id.in_(principal.mission_ids)).order_by(Mission.mission_name)
    ).scalars().all()
    return {"items": [mission_out(row) for row in rows]}
