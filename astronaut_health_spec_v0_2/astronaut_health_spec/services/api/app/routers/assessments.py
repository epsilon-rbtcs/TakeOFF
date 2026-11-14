"""Assessment retrieval routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..services import assessments as assessment_service

router = APIRouter(tags=["assessments"])


@router.get("/assessments")
def list_assessments(
    astronaut_id: uuid.UUID = Query(...),
    mission_id: uuid.UUID = Query(...),
    module_code: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    items = assessment_service.list_assessments(
        db, principal, astronaut_id, mission_id, module_code=module_code, limit=limit
    )
    return {"items": items}


@router.get("/assessments/{assessment_id}")
def get_assessment(
    assessment_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    return assessment_service.get_assessment(db, principal, assessment_id)
