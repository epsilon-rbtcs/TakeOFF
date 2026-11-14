"""Ground dashboard aggregation with explicit freshness and communication state."""
from __future__ import annotations

import uuid
from datetime import timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import catalogue, security
from ..models import (
    Alert,
    ClientDevice,
    CommunicationSession,
    IntegratedAssessment,
    Mission,
    ModuleAssessment,
    Observation,
    RecommendedAction,
)
from . import assessments as assessment_service
from . import communications as communication_service
from . import observations as observation_service
from ..util import iso, utc_now


def _latest_modules(
    db: Session, astronaut_id: uuid.UUID, mission_id: uuid.UUID
) -> dict[str, ModuleAssessment]:
    rows = db.execute(
        select(ModuleAssessment)
        .where(
            ModuleAssessment.astronaut_id == astronaut_id,
            ModuleAssessment.mission_id == mission_id,
        )
        .order_by(ModuleAssessment.assessed_at.desc())
    ).scalars().all()
    latest: dict[str, ModuleAssessment] = {}
    for row in rows:
        latest.setdefault(row.module_code, row)
    return latest


def _latest_integrated(
    db: Session, astronaut_id: uuid.UUID, mission_id: uuid.UUID
) -> IntegratedAssessment | None:
    return db.execute(
        select(IntegratedAssessment)
        .where(
            IntegratedAssessment.astronaut_id == astronaut_id,
            IntegratedAssessment.mission_id == mission_id,
        )
        .order_by(IntegratedAssessment.assessed_at.desc())
        .limit(1)
    ).scalars().first()


def _data_quality(db: Session, astronaut_id: uuid.UUID, mission_id: uuid.UUID) -> dict[str, Any]:
    counts = db.execute(
        select(
            func.count(Observation.id),
            func.count(Observation.id).filter(Observation.quality_status == "invalid"),
            func.count(Observation.id).filter(Observation.quality_status == "questionable"),
        ).where(
            Observation.astronaut_id == astronaut_id,
            Observation.mission_id == mission_id,
        )
    ).one()
    total, invalid, questionable = (int(counts[0] or 0), int(counts[1] or 0), int(counts[2] or 0))
    latest_measured, latest_received = observation_service.latest_observation_times(
        db, mission_id, astronaut_id
    )
    stale = 0
    if latest_measured is not None:
        age = (utc_now() - latest_measured).total_seconds()
        from ..config import settings

        if age > settings.freshness_delayed_seconds:
            stale = total
    status = "insufficient" if total == 0 else ("partial" if (invalid or questionable or stale) else "good")
    return {
        "status": status,
        "observation_count": total,
        "invalid_measurement_count": invalid,
        "questionable_measurement_count": questionable,
        "stale_measurement_count": stale,
        "latest_measured_at": iso(latest_measured),
        "latest_received_at": iso(latest_received),
    }


def _reporting_client(
    db: Session, astronaut_id: uuid.UUID, mission_id: uuid.UUID
) -> tuple[ClientDevice | None, CommunicationSession | None]:
    client = db.execute(
        select(ClientDevice)
        .where(
            ClientDevice.astronaut_id == astronaut_id,
            ClientDevice.mission_id == mission_id,
            ClientDevice.active.is_(True),
        )
        .order_by(ClientDevice.enrolled_at)
        .limit(1)
    ).scalars().first()
    if client is None:
        return None, None
    session = db.execute(
        select(CommunicationSession)
        .where(CommunicationSession.client_id == client.id)
        .order_by(CommunicationSession.observed_at.desc())
        .limit(1)
    ).scalars().first()
    return client, session


def dashboard_summary(
    db: Session,
    principal: security.Principal,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
) -> dict[str, Any]:
    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="dashboard.read",
        astronaut_id=astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, mission_id, astronaut_id)
    mission = db.get(Mission, mission_id)

    modules = _latest_modules(db, astronaut_id, mission_id)
    integrated = _latest_integrated(db, astronaut_id, mission_id)
    latest_measured, latest_received = observation_service.latest_observation_times(
        db, mission_id, astronaut_id
    )
    domains = []
    for module_code in catalogue.ANALYSIS_MODULES:
        row = modules.get(module_code)
        domains.append(
            {
                "module_code": module_code,
                "status": row.status if row else "insufficient_data",
                "summary": row.summary if row else "No assessment is available for this domain.",
            }
        )

    open_alerts = db.scalar(
        select(func.count(Alert.id)).where(
            Alert.astronaut_id == astronaut_id,
            Alert.mission_id == mission_id,
            Alert.status == "open",
        )
    ) or 0
    pending_actions = db.scalar(
        select(func.count(RecommendedAction.id)).where(
            RecommendedAction.astronaut_id == astronaut_id,
            RecommendedAction.mission_id == mission_id,
            RecommendedAction.status.in_(("pending", "in_progress", "deferred")),
        )
    ) or 0

    client, session = _reporting_client(db, astronaut_id, mission_id)
    last_contact = client.last_contact_at if client else None
    if session is not None and session.last_successful_contact_at is not None:
        if last_contact is None or session.last_successful_contact_at > last_contact:
            last_contact = session.last_successful_contact_at
    freshness = communication_service.freshness_status(latest_measured, latest_received)

    # Legacy additive fields keep the existing Ground Console working.
    observation_rows = db.execute(
        select(Observation)
        .where(
            Observation.astronaut_id == astronaut_id,
            Observation.mission_id == mission_id,
        )
        .order_by(Observation.measured_at.desc())
        .limit(50)
    ).scalars().all()
    legacy_observations = [observation_service.observation_out(db, row) for row in observation_rows]

    module_rows = list(modules.values())
    legacy_assessments: list[dict[str, Any]] = [
        assessment_service.module_summary(row) for row in module_rows
    ]
    if integrated is not None:
        legacy_assessments.append(assessment_service.integrated_summary(integrated))
    legacy_assessments.sort(key=lambda item: item["assessed_at"] or "", reverse=True)

    simulated = (
        any(row.simulated for row in observation_rows)
        or any(row.simulated for row in module_rows)
        or bool(integrated and integrated.simulated)
    )

    mission_day = None
    if mission is not None and mission.start_at is not None:
        start = mission.start_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        mission_day = max((utc_now() - start).days + 1, 0)

    return {
        "astronaut_id": str(astronaut_id),
        "mission_id": str(mission_id),
        "mission_day": mission_day,
        "integrated_status": integrated.status if integrated else "insufficient_data",
        "assessed_at": iso(integrated.assessed_at) if integrated else None,
        "domains": domains,
        "open_alert_count": int(open_alerts),
        "pending_action_count": int(pending_actions),
        "data_quality": _data_quality(db, astronaut_id, mission_id),
        "simulated": simulated,
        "adapter_state": session.state if session else None,
        "adapter_state_observed_at": iso(session.observed_at) if session else None,
        "contact_recency": communication_service.contact_recency(last_contact),
        "latest_measured_at": iso(latest_measured),
        "latest_received_at": iso(latest_received),
        "freshness": freshness,
        "generated_at": iso(utc_now()),
        # Additive legacy aliases consumed by the unmodified Ground Console.
        "communication": (
            None
            if session is None
            else {
                "state": session.state,
                "observed_at": iso(session.observed_at),
                "last_successful_contact_at": iso(session.last_successful_contact_at),
                "queued_event_count": session.queued_event_count,
                "estimated_delay_seconds": session.estimated_delay_seconds,
            }
        ),
        "observations": legacy_observations,
        "assessments": legacy_assessments,
    }
