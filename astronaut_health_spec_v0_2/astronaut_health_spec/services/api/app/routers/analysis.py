"""Synchronous ground analysis and run provenance.

Only the documented ``POST /analysis/runs`` route is required.  The additive
``GET`` routes expose the persisted ``analysis_runs`` provenance record without
re-running any analysis.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db, SessionLocal
from ..errors import INTERNAL_ERROR, NOT_FOUND, ApiError
from ..models import AnalysisRun
from ..schemas import AnalysisRunIn
from ..services import analysis as analysis_service
from ..util import iso

logger = logging.getLogger("crew_health.api")

router = APIRouter(tags=["analysis"])


def _run_out(row: AnalysisRun) -> dict:
    return {
        "run_id": str(row.id),
        "astronaut_id": str(row.astronaut_id),
        "mission_id": str(row.mission_id),
        "requested_by": row.requested_by,
        "status": row.status,
        "execution_location": row.execution_location,
        "algorithm_version": row.algorithm_version,
        "rule_set_version": row.rule_set_version,
        "implementation_build": row.implementation_build,
        "input_snapshot_hash": row.input_snapshot_hash,
        "output_hash": row.output_hash,
        "started_at": iso(row.started_at),
        "completed_at": iso(row.completed_at),
        "error_code": row.error_code,
    }


@router.post("/analysis/runs")
def run_analysis(
    body: AnalysisRunIn,
    response: Response,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
):
    try:
        return analysis_service.run_analysis(db, principal, body)
    except ApiError:
        # Documented 409 for unavailable algorithm/rule-set versions and 4xx for
        # invalid requests; no assessment is returned in those cases.
        raise
    except Exception as exc:  # pragma: no cover - defensive failure path
        logger.error("Analysis execution failed: %s", type(exc).__name__)
        # Persist an explicit failed run through a clean session so the failure
        # provenance survives the rolled-back request transaction.
        failure_db = SessionLocal()
        try:
            failure = analysis_service.persist_failed_run(
                failure_db, principal, body, INTERNAL_ERROR
            )
        finally:
            failure_db.close()
        response.status_code = 500
        return JSONResponse(status_code=500, content=failure)


@router.get("/analysis/runs/{run_id}")
def get_analysis_run(
    run_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(AnalysisRun, run_id)
    if row is None:
        raise ApiError(404, NOT_FOUND, "Analysis run not found.")
    security.check_mission_scope(
        db,
        principal,
        row.mission_id,
        action="analysis.read",
        astronaut_id=row.astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    return _run_out(row)


@router.get("/analysis/runs")
def list_analysis_runs(
    astronaut_id: uuid.UUID = Query(...),
    mission_id: uuid.UUID = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="analysis.list",
        astronaut_id=astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    rows = db.execute(
        select(AnalysisRun)
        .where(
            AnalysisRun.astronaut_id == astronaut_id,
            AnalysisRun.mission_id == mission_id,
        )
        .order_by(AnalysisRun.started_at.desc())
        .limit(limit)
    ).scalars().all()
    return {"items": [_run_out(row) for row in rows]}
