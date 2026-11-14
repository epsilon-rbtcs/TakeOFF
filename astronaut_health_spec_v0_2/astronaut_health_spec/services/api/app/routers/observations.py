"""Observation ingestion and query routes.

``POST /observations/batch`` returns one result per submitted item so a client
can retry only the rejected records.  Individual failures never abort the rest
of the batch and never overwrite already-accepted immutable content.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..errors import INVALID_TIMESTAMP, ApiError
from ..models import MeasurementDefinition, Observation
from ..schemas import ObservationBatchIn, ObservationIn
from ..services import observations as observation_service
from ..util import decode_cursor, encode_cursor, ensure_aware, iso

router = APIRouter(tags=["observations"])


def _aware(value: datetime | None, field: str) -> datetime | None:
    try:
        return ensure_aware(value, field)
    except ValueError as exc:
        raise ApiError(422, INVALID_TIMESTAMP, str(exc), {"field": field}) from exc


def _observation_cursor(row: Observation) -> str:
    return encode_cursor(
        {
            "v": 1,
            "measured_at": iso(row.measured_at),
            "observation_id": str(row.id),
        }
    )


@router.post("/observations")
def create_observation(
    body: ObservationIn,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    row, created = observation_service.ingest_observation(
        db,
        principal=principal,
        body=body,
        idempotency_key=idempotency_key,
    )
    response.status_code = 201 if created else 200
    return observation_service.observation_out(db, row)


@router.get("/observations")
def list_observations(
    astronaut_id: uuid.UUID = Query(...),
    mission_id: uuid.UUID = Query(...),
    measurement_code: str | None = Query(default=None),
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    cursor: str | None = Query(default=None),
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="observation.list",
        astronaut_id=astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, mission_id, astronaut_id)

    query = (
        select(Observation)
        .join(
            MeasurementDefinition,
            MeasurementDefinition.id == Observation.measurement_definition_id,
        )
        .where(
            Observation.astronaut_id == astronaut_id,
            Observation.mission_id == mission_id,
        )
    )
    if measurement_code:
        query = query.where(MeasurementDefinition.code == measurement_code)
    start = _aware(from_, "from")
    end = _aware(to, "to")
    if start is not None:
        query = query.where(Observation.measured_at >= start)
    if end is not None:
        query = query.where(Observation.measured_at <= end)

    if cursor:
        try:
            decoded = decode_cursor(cursor)
            cursor_at = datetime.fromisoformat(str(decoded["measured_at"]))
            cursor_id = uuid.UUID(str(decoded["observation_id"]))
        except (KeyError, ValueError, TypeError) as exc:
            raise ApiError(409, "INVALID_CURSOR", "The observation cursor is invalid.") from exc
        # Keyset pagination over (measured_at DESC, id DESC) keeps replay stable.
        query = query.where(
            (Observation.measured_at < cursor_at)
            | ((Observation.measured_at == cursor_at) & (Observation.id < cursor_id))
        )

    rows = db.execute(
        query.order_by(Observation.measured_at.desc(), Observation.id.desc()).limit(limit + 1)
    ).scalars().all()
    page = rows[:limit]
    return {
        "items": [observation_service.observation_out(db, row) for row in page],
        "next_cursor": _observation_cursor(page[-1]) if len(rows) > limit else None,
    }


@router.post("/observations/batch")
def create_observation_batch(
    body: ObservationBatchIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    security.check_mission_scope(
        db,
        principal,
        body.mission_id,
        action="observation.batch",
        astronaut_id=body.astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, body.mission_id, body.astronaut_id)

    results: list[dict[str, Any]] = []
    accepted = 0
    rejected = 0
    duplicate = 0
    for index, item in enumerate(body.observations):
        payload = item.model_dump()
        payload["astronaut_id"] = item.astronaut_id or body.astronaut_id
        payload["mission_id"] = item.mission_id or body.mission_id
        try:
            observation = ObservationIn.model_validate(payload)
        except Exception:
            rejected += 1
            results.append(
                {
                    "index": index,
                    "status": "rejected",
                    "observation_id": str(item.observation_id),
                    "error_code": "INVALID_VALUE",
                    "message": "The observation item did not satisfy the documented contract.",
                }
            )
            continue
        if (
            observation.astronaut_id != body.astronaut_id
            or observation.mission_id != body.mission_id
        ):
            rejected += 1
            results.append(
                {
                    "index": index,
                    "status": "rejected",
                    "observation_id": str(item.observation_id),
                    "error_code": "MISSION_ACCESS_MISMATCH",
                    "message": "The observation is outside the batch crew/mission scope.",
                }
            )
            continue
        try:
            with db.begin_nested():
                row, created = observation_service.ingest_observation(
                    db,
                    principal=principal,
                    body=observation,
                    action="observation.batch_item",
                )
        except ApiError as exc:
            rejected += 1
            results.append(
                {
                    "index": index,
                    "status": "rejected",
                    "observation_id": str(item.observation_id),
                    "error_code": exc.code,
                    "message": exc.message,
                }
            )
        else:
            if created:
                accepted += 1
            else:
                duplicate += 1
            results.append(
                {
                    "index": index,
                    "status": "accepted" if created else "duplicate",
                    "observation_id": str(row.id),
                    "error_code": None,
                    "message": None,
                }
            )
    return {
        "accepted_count": accepted,
        "rejected_count": rejected,
        "duplicate_count": duplicate,
        "results": results,
    }
