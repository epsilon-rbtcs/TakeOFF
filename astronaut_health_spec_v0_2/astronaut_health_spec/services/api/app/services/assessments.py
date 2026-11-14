"""Assessment serialisation in the documented discriminated shapes."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import security
from ..errors import NOT_FOUND, ApiError
from ..models import (
    AssessmentBaseline,
    AssessmentFinding,
    AssessmentInput,
    IntegratedAssessment,
    IntegratedAssessmentComponent,
    MeasurementDefinition,
    ModuleAssessment,
)
from ..util import iso, jsonable


def module_summary(row: ModuleAssessment) -> dict[str, Any]:
    return {
        "assessment_id": str(row.id),
        "assessment_type": "module",
        "module_code": row.module_code,
        "status": row.status,
        "assessed_at": iso(row.assessed_at),
        "summary": row.summary,
        "simulated": row.simulated,
        "algorithm_version": row.algorithm_version,
        "rule_set_version": row.rule_set_version,
    }


def integrated_summary(row: IntegratedAssessment) -> dict[str, Any]:
    return {
        "assessment_id": str(row.id),
        "assessment_type": "integrated",
        "status": row.status,
        "assessed_at": iso(row.assessed_at),
        "summary": row.summary,
        "simulated": row.simulated,
        "algorithm_version": row.algorithm_version,
        "rule_set_version": row.rule_set_version,
    }


def _finding_out(db: Session, row: AssessmentFinding) -> dict[str, Any]:
    code = None
    if row.measurement_definition_id is not None:
        code = db.scalar(
            select(MeasurementDefinition.code).where(
                MeasurementDefinition.id == row.measurement_definition_id
            )
        )
    evidence = (row.evidence_metadata or {}).get("observation_ids", [])
    return {
        "finding_code": row.finding_code,
        "measurement_code": code,
        "severity": row.severity,
        "direction": row.direction,
        "current_value": row.current_value,
        "baseline_value": row.baseline_value,
        "delta_value": row.delta_value,
        "unit": row.unit,
        "explanation": row.explanation,
        "evidence_observation_ids": [str(item) for item in evidence],
    }


def module_detail(db: Session, row: ModuleAssessment) -> dict[str, Any]:
    payload = module_summary(row)
    inputs = db.execute(
        select(AssessmentInput).where(AssessmentInput.module_assessment_id == row.id)
    ).scalars().all()
    baselines = db.execute(
        select(AssessmentBaseline).where(AssessmentBaseline.module_assessment_id == row.id)
    ).scalars().all()
    findings = db.execute(
        select(AssessmentFinding)
        .where(AssessmentFinding.module_assessment_id == row.id)
        .order_by(AssessmentFinding.created_at)
    ).scalars().all()
    baseline_versions = []
    for baseline in baselines:
        code = db.scalar(
            select(MeasurementDefinition.code).where(
                MeasurementDefinition.id == baseline.measurement_definition_id
            )
        )
        baseline_versions.append(
            {
                "baseline_id": str(baseline.baseline_id),
                "measurement_code": code,
                "version": baseline.baseline_version,
            }
        )
    payload.update(
        {
            "data_sufficiency": row.data_sufficiency,
            "evidence_observation_ids": [str(item.observation_id) for item in inputs],
            "baseline_versions": baseline_versions,
            "findings": [_finding_out(db, finding) for finding in findings],
            "limitations": jsonable(row.limitations or []),
            "analysis_run_id": str(row.analysis_run_id) if row.analysis_run_id else None,
        }
    )
    return payload


def integrated_detail(db: Session, row: IntegratedAssessment) -> dict[str, Any]:
    payload = integrated_summary(row)
    components = db.execute(
        select(IntegratedAssessmentComponent).where(
            IntegratedAssessmentComponent.integrated_assessment_id == row.id
        )
    ).scalars().all()
    payload.update(
        {
            "component_assessment_ids": [str(item.module_assessment_id) for item in components],
            "uncertainty_notes": jsonable(row.uncertainty_notes or []),
            "analysis_run_id": str(row.analysis_run_id) if row.analysis_run_id else None,
        }
    )
    return payload


def list_assessments(
    db: Session,
    principal: security.Principal,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
    module_code: str | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    security.check_mission_scope(
        db,
        principal,
        mission_id,
        action="assessment.list",
        astronaut_id=astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, mission_id, astronaut_id)

    module_query = select(ModuleAssessment).where(
        ModuleAssessment.astronaut_id == astronaut_id,
        ModuleAssessment.mission_id == mission_id,
    )
    if module_code:
        module_query = module_query.where(ModuleAssessment.module_code == module_code)

    items: list[tuple[Any, dict[str, Any]]] = []
    for row in db.execute(module_query).scalars().all():
        items.append((row.assessed_at, module_summary(row)))
    if not module_code:
        integrated_query = select(IntegratedAssessment).where(
            IntegratedAssessment.astronaut_id == astronaut_id,
            IntegratedAssessment.mission_id == mission_id,
        )
        for row in db.execute(integrated_query).scalars().all():
            items.append((row.assessed_at, integrated_summary(row)))
    items.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in items[:limit]]


def get_assessment(
    db: Session,
    principal: security.Principal,
    assessment_id: uuid.UUID,
) -> dict[str, Any]:
    module = db.get(ModuleAssessment, assessment_id)
    if module is not None:
        security.check_mission_scope(
            db,
            principal,
            module.mission_id,
            action="assessment.read",
            astronaut_id=module.astronaut_id,
            require_health_access=True,
            allowed_roles={"crew_member", "medical_officer"},
        )
        return module_detail(db, module)
    integrated = db.get(IntegratedAssessment, assessment_id)
    if integrated is not None:
        security.check_mission_scope(
            db,
            principal,
            integrated.mission_id,
            action="assessment.read",
            astronaut_id=integrated.astronaut_id,
            require_health_access=True,
            allowed_roles={"crew_member", "medical_officer"},
        )
        return integrated_detail(db, integrated)
    raise ApiError(404, NOT_FOUND, "Assessment not found.")
