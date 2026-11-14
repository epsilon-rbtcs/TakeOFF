"""Versioned personal baselines: querying and deterministic construction."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import security
from ..errors import NOT_FOUND, ApiError
from ..models import AstronautMission, HealthBaseline, MeasurementDefinition
from ..util import iso


def baseline_out(db: Session, row: HealthBaseline) -> dict[str, Any]:
    code = db.scalar(
        select(MeasurementDefinition.code).where(
            MeasurementDefinition.id == row.measurement_definition_id
        )
    )
    return {
        "baseline_id": str(row.id),
        "astronaut_id": str(row.astronaut_id),
        "mission_id": str(row.mission_id) if row.mission_id else None,
        "measurement_code": code,
        "baseline_scope": row.baseline_scope,
        "status": row.status,
        "method": row.method,
        "period_start": iso(row.period_start),
        "period_end": iso(row.period_end),
        "sample_count": row.sample_count,
        "mean": row.mean,
        "standard_deviation": row.standard_deviation,
        "median": row.median,
        "mad": row.mad,
        "minimum": row.minimum,
        "maximum": row.maximum,
        "unit": row.canonical_unit,
        "version": row.version,
        "calculated_at": iso(row.calculated_at),
        "activated_at": iso(row.activated_at),
    }


def list_baselines(
    db: Session,
    principal: security.Principal,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID | None,
) -> list[HealthBaseline]:
    if mission_id is not None:
        security.check_mission_scope(
            db,
            principal,
            mission_id,
            action="baseline.list",
            astronaut_id=astronaut_id,
            require_health_access=True,
            allowed_roles={"crew_member", "medical_officer"},
        )
        security.ensure_astronaut_assignment(db, mission_id, astronaut_id)
        mission_filter = or_(
            HealthBaseline.mission_id == mission_id, HealthBaseline.mission_id.is_(None)
        )
    else:
        # Mission is optional in the documented route; require that the actor
        # can reach this astronaut in at least one assigned mission.
        allowed_missions = principal.mission_ids
        if not allowed_missions:
            raise ApiError(403, "MISSION_ACCESS_MISMATCH", "No mission scope is available.")
        assignment = db.execute(
            select(AstronautMission).where(
                AstronautMission.astronaut_id == astronaut_id,
                AstronautMission.mission_id.in_(allowed_missions),
            )
        ).scalars().first()
        if assignment is None:
            raise ApiError(404, NOT_FOUND, "Astronaut not found in the authorized mission scope.")
        if principal.role == "crew_member" and principal.astronaut_id not in (None, astronaut_id):
            raise ApiError(403, "ASTRONAUT_SCOPE_MISMATCH", "Crew members may only access their own record.")
        security.require_health_role(db, principal, action="baseline.list", astronaut_id=astronaut_id)
        mission_filter = or_(
            HealthBaseline.mission_id.in_(allowed_missions), HealthBaseline.mission_id.is_(None)
        )

    rows = db.execute(
        select(HealthBaseline)
        .where(HealthBaseline.astronaut_id == astronaut_id, mission_filter)
        .order_by(
            HealthBaseline.measurement_definition_id,
            HealthBaseline.version.desc(),
        )
    ).scalars().all()
    return sorted(
        rows,
        key=lambda row: (row.status != "active", row.baseline_scope, -row.version),
    )


def baseline_for_measurement(
    db: Session,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
    measurement_definition_id: uuid.UUID,
    as_of: datetime | None = None,
) -> HealthBaseline | None:
    """Return the newest active/provisional baseline for analysis."""
    query = select(HealthBaseline).where(
        HealthBaseline.astronaut_id == astronaut_id,
        HealthBaseline.measurement_definition_id == measurement_definition_id,
        HealthBaseline.status.in_(("active", "provisional")),
        or_(HealthBaseline.mission_id == mission_id, HealthBaseline.mission_id.is_(None)),
    )
    if as_of is not None:
        query = query.where(HealthBaseline.calculated_at <= as_of)
    return db.execute(
        query.order_by(HealthBaseline.version.desc()).limit(1)
    ).scalars().first()
