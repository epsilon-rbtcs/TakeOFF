"""Astronaut profile routes.

``GET /astronauts/{astronaut_id}`` is the documented route.  ``GET /astronauts``
is an additive listing convenience for choosing a crew member; it returns only
astronauts inside the authenticated actor's mission scope.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import (
    ASTRONAUT_SCOPE_MISMATCH,
    MISSION_ACCESS_MISMATCH,
    NOT_FOUND,
    ApiError,
)
from ..models import Astronaut, AstronautMission
from ..util import iso

router = APIRouter(tags=["astronauts"])


def astronaut_out(row: Astronaut, mission_ids: list[uuid.UUID] | None = None) -> dict[str, Any]:
    return {
        "astronaut_id": str(row.id),
        "astronaut_code": row.astronaut_code,
        "display_name": row.display_name,
        "mission_ids": [str(item) for item in (mission_ids or [])],
        "created_at": iso(row.created_at),
        "updated_at": iso(row.updated_at),
        "simulated": True,
    }


def _assignments(db: Session, principal: security.Principal, astronaut_id: uuid.UUID) -> list[AstronautMission]:
    mission_ids = principal.mission_ids
    if not mission_ids:
        return []
    return list(
        db.execute(
            select(AstronautMission).where(
                AstronautMission.astronaut_id == astronaut_id,
                AstronautMission.mission_id.in_(mission_ids),
            )
        ).scalars().all()
    )


@router.get("/astronauts/{astronaut_id}")
def get_astronaut(
    astronaut_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(Astronaut, astronaut_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Astronaut not found.")
    if principal.role == "crew_member" and principal.astronaut_id not in (None, astronaut_id):
        raise security.deny(
            db,
            principal,
            status_code=403,
            code=ASTRONAUT_SCOPE_MISMATCH,
            message="Crew members may only access their own crew record.",
            action="astronaut.read",
            astronaut_id=astronaut_id,
        )
    security.require_health_role(db, principal, action="astronaut.read", astronaut_id=astronaut_id)
    assignments = _assignments(db, principal, astronaut_id)
    if not assignments:
        raise security.deny(
            db,
            principal,
            status_code=403,
            code=MISSION_ACCESS_MISMATCH,
            message="The astronaut is outside the authenticated actor's mission scope.",
            action="astronaut.read",
            astronaut_id=astronaut_id,
        )
    scoped = principal.scope_for(assignments[0].mission_id)
    if scoped is not None and scoped.astronaut_id not in (None, astronaut_id):
        raise security.deny(
            db,
            principal,
            status_code=403,
            code=ASTRONAUT_SCOPE_MISMATCH,
            message="The authenticated actor is not scoped to this astronaut.",
            action="astronaut.read",
            astronaut_id=astronaut_id,
        )
    return astronaut_out(row, [item.mission_id for item in assignments])


@router.get("/astronauts")
def list_astronauts(
    mission_id: uuid.UUID | None = Query(default=None),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    mission_ids = principal.mission_ids
    if mission_id is not None:
        security.check_mission_scope(
            db,
            principal,
            mission_id,
            action="astronaut.list",
            require_health_access=False,
        )
        mission_ids = [mission_id]
    if not mission_ids:
        return {"items": []}
    query = (
        select(Astronaut, AstronautMission.mission_id)
        .join(AstronautMission, AstronautMission.astronaut_id == Astronaut.id)
        .where(AstronautMission.mission_id.in_(mission_ids))
        .order_by(Astronaut.display_name)
    )
    if principal.role == "crew_member":
        if principal.astronaut_id is None:
            return {"items": []}
        query = query.where(Astronaut.id == principal.astronaut_id)
    else:
        security.require_health_role(db, principal, action="astronaut.list")
        scoped_astronauts = {
            scope.astronaut_id for scope in principal.mission_scopes if scope.astronaut_id is not None
        }
        if scoped_astronauts:
            query = query.where(Astronaut.id.in_(scoped_astronauts))
    rows = db.execute(query).all()
    grouped: dict[uuid.UUID, tuple[Astronaut, list[uuid.UUID]]] = {}
    for astronaut, assigned_mission in rows:
        if astronaut.id not in grouped:
            grouped[astronaut.id] = (astronaut, [])
        grouped[astronaut.id][1].append(assigned_mission)
    return {
        "items": [astronaut_out(row, missions) for row, missions in grouped.values()],
    }
