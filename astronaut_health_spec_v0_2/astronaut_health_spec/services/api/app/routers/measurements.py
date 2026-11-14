"""Measurement catalogue routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import catalogue, security
from ..db import get_db
from ..errors import NOT_FOUND, ApiError
from ..schemas import MeasurementCatalogueVersionIn
from ..services import configuration

router = APIRouter(tags=["measurements"])


@router.get("/measurements/catalog")
def list_measurements(
    mission_id: uuid.UUID,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="catalogue.list",
        require_health_access=False,
    )
    version = configuration.latest_catalogue_version(db, mission_id)
    if version is None:
        raise ApiError(
            404,
            NOT_FOUND,
            "No measurement catalogue version is published for this mission.",
            {"mission_id": str(mission_id)},
        )
    definitions = catalogue.definitions_from_snapshot(version.definitions_snapshot)
    items = [definitions[item["code"]] for item in catalogue.MEASUREMENT_DEFINITIONS if item["code"] in definitions]
    extras = [item for code, item in sorted(definitions.items()) if code not in catalogue.MEASUREMENT_CODES]
    return {
        "catalogue_version": version.version,
        "effective_at": version.effective_at.isoformat(),
        "items": items + extras,
    }


@router.post("/measurements/catalog/versions", status_code=201)
def publish_measurement_catalogue_version(
    body: MeasurementCatalogueVersionIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    return configuration.publish_catalogue_version(db, principal, body)
