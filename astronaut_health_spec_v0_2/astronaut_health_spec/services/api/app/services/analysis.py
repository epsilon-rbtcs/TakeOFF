"""Synchronous ground analysis with explicit provenance.

The demonstration rule is transparent and versioned: compare the latest valid
observation in the requested window with the crew member's own active or
provisional baseline.  A robust z-like statistic (median/MAD, falling back to
mean/standard deviation) marks deviations for review.  No clinical threshold,
diagnosis, or probability is produced, and no ``urgent`` state is emitted
because no approved escalation rule is configured in this build.
"""
from __future__ import annotations

import math
import uuid
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, catalogue, security
from ..errors import (
    ALGORITHM_VERSION_UNAVAILABLE,
    INVALID_TIMESTAMP,
    RULE_SET_VERSION_UNAVAILABLE,
    UNSUPPORTED_ENTITY_TYPE,
    ApiError,
)
from ..feed import append_change
from ..models import (
    Alert,
    AnalysisRun,
    AssessmentBaseline,
    AssessmentFinding,
    AssessmentInput,
    HealthBaseline,
    IntegratedAssessment,
    IntegratedAssessmentComponent,
    MeasurementDefinition,
    ModuleAssessment,
    Observation,
    RecommendedAction,
)
from ..schemas import AnalysisRunIn
from .baselines import baseline_for_measurement
from ..util import canonical_hash, ensure_aware, iso, utc_now

ALGORITHM_VERSION = "demo-rules-0.3.0"
RULE_SET_VERSION = "demo-config-0.3.0"
IMPLEMENTATION_BUILD = "ground-demo-build-0.3.0"

MODULE_LABELS = {
    "cardiovascular": "Cardiovascular",
    "behavioural_cognitive": "Behavioural and cognitive",
    "immune": "Immune",
    "musculoskeletal": "Musculoskeletal",
    "radiation": "Radiation",
    "environmental": "Environmental",
}

USABLE_QUALITY = {"valid", "questionable"}
STATUS_ORDER = {"normal": 0, "monitor": 1, "attention": 2, "urgent": 3}

IdFactory = Callable[[], uuid.UUID]


def _measurement_code(db: Session, definition_id: uuid.UUID) -> str | None:
    return db.scalar(
        select(MeasurementDefinition.code).where(MeasurementDefinition.id == definition_id)
    )


def _observation_value(row: Observation) -> float | None:
    if row.canonical_value_numeric is not None:
        return float(row.canonical_value_numeric)
    if row.value_numeric is not None:
        return float(row.value_numeric)
    return None


def _window_observations(
    db: Session,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
    start,
    end,
    codes: tuple[str, ...],
) -> list[Observation]:
    if not codes:
        return []
    return db.execute(
        select(Observation)
        .join(
            MeasurementDefinition,
            MeasurementDefinition.id == Observation.measurement_definition_id,
        )
        .where(
            Observation.astronaut_id == astronaut_id,
            Observation.mission_id == mission_id,
            Observation.measured_at >= start,
            Observation.measured_at <= end,
            MeasurementDefinition.code.in_(codes),
        )
        .order_by(Observation.measured_at.desc())
    ).scalars().all()


def _module_result(
    db: Session,
    *,
    astronaut_id: uuid.UUID,
    mission_id: uuid.UUID,
    module_code: str,
    observations: list[Observation],
) -> dict[str, Any]:
    label = MODULE_LABELS[module_code]
    usable = [row for row in observations if row.quality_status in USABLE_QUALITY]
    excluded = [row for row in observations if row.quality_status not in USABLE_QUALITY]
    missing_baselines: list[str] = []
    evaluated = 0
    findings: list[dict[str, Any]] = []
    baselines_used: list[tuple[HealthBaseline, str]] = []
    evidence_ids: set[uuid.UUID] = set()

    by_code: dict[str, list[Observation]] = {}
    for row in usable:
        code = _measurement_code(db, row.measurement_definition_id)
        if code:
            by_code.setdefault(code, []).append(row)

    for code, rows in by_code.items():
        rows.sort(key=lambda item: item.measured_at, reverse=True)
        baseline = baseline_for_measurement(db, astronaut_id, mission_id, rows[0].measurement_definition_id)
        if baseline is None:
            missing_baselines.append(code)
            continue
        center = baseline.median if baseline.median is not None else baseline.mean
        scale = None
        if baseline.mad is not None and baseline.mad > 0:
            scale = 1.4826 * baseline.mad
        elif baseline.standard_deviation is not None and baseline.standard_deviation > 0:
            scale = baseline.standard_deviation
        current = _observation_value(rows[0])
        if center is None or scale is None or current is None or scale <= 0:
            missing_baselines.append(code)
            continue
        evaluated += 1
        baselines_used.append((baseline, code))
        deviation = (current - center) / scale
        if abs(deviation) >= 3:
            severity = "high"
            module_status = "attention"
        elif abs(deviation) >= 2:
            severity = "moderate"
            module_status = "monitor"
        else:
            continue
        observation_ids = [str(row.id) for row in rows]
        evidence_ids.update(row.id for row in rows)
        findings.append(
            {
                "finding_code": f"{code}_{'above' if deviation > 0 else 'below'}_baseline",
                "measurement_definition_id": rows[0].measurement_definition_id,
                "measurement_code": code,
                "severity": severity,
                "direction": "increasing" if deviation > 0 else "decreasing",
                "current_value": current,
                "baseline_value": center,
                "delta_value": current - center,
                "unit": baseline.canonical_unit or rows[0].canonical_unit,
                "explanation": (
                    f"Recent valid {code.replace('_', ' ')} readings differ from this crew "
                    "member's personal baseline. This is a statistical monitoring signal, not a diagnosis."
                ),
                "observation_ids": observation_ids,
                "module_status": module_status,
            }
        )

    if not usable:
        if excluded:
            status = "data_quality_issue"
            summary = f"{label} observations were present but their quality is inadequate for assessment."
            sufficiency = "insufficient"
        else:
            status = "insufficient_data"
            summary = f"No sufficiently recent {label.lower()} measurement is available."
            sufficiency = "insufficient"
    elif evaluated == 0:
        status = "insufficient_data"
        summary = (
            f"{label} data is present but no usable personal baseline exists for the available "
            "measurements."
        )
        sufficiency = "insufficient"
    else:
        statuses = [finding["module_status"] for finding in findings]
        if "attention" in statuses:
            status = "attention"
        elif "monitor" in statuses:
            status = "monitor"
        else:
            status = "normal"
        if status == "normal":
            summary = (
                f"Available {label.lower()} measurements are within the configured demonstration "
                "limits relative to this crew member's personal baseline."
            )
        else:
            summary = (
                f"Selected {label.lower()} measurements changed relative to this crew member's "
                "personal baseline."
            )
        sufficiency = "partial" if missing_baselines or excluded else "sufficient"

    limitations = [
        "Monitoring signal only; not a diagnosis or medical clearance.",
        "Demonstration statistical rule; no clinical threshold is applied.",
    ]
    if missing_baselines:
        limitations.append(
            "No usable personal baseline for: " + ", ".join(sorted(set(missing_baselines))) + "."
        )
    if excluded:
        limitations.append(
            f"{len(excluded)} observation(s) were excluded because their quality was not usable."
        )

    return {
        "module_code": module_code,
        "status": status,
        "summary": summary,
        "data_sufficiency": sufficiency,
        "findings": findings,
        "baselines_used": baselines_used,
        "evidence_ids": evidence_ids,
        "observations": observations,
        "limitations": limitations,
        "simulated": any(row.simulated for row in observations),
    }


def _integrated_result(module_results: list[dict[str, Any]]) -> dict[str, Any]:
    statuses = {item["module_code"]: item["status"] for item in module_results}
    values = list(statuses.values())
    if "urgent" in values:
        status = "urgent"
        summary = "A configured escalation state is present; review the affected domain immediately."
    elif "attention" in values:
        status = "attention"
        summary = "One or more domains warrant follow-up review."
    elif "monitor" in values:
        status = "monitor"
        summary = "One or more domains suggest monitoring or a repeat measurement."
    elif all(value in {"insufficient_data", "data_quality_issue"} for value in values):
        if all(value == "data_quality_issue" for value in values):
            status = "data_quality_issue"
            summary = "Available data quality is inadequate for an integrated assessment."
        else:
            status = "insufficient_data"
            summary = "Insufficient data is available for an integrated assessment."
    elif "data_quality_issue" in values and "normal" not in values:
        status = "data_quality_issue"
        summary = "Data quality issues prevent a complete integrated assessment."
    else:
        status = "normal"
        summary = (
            "Available domains are within the configured demonstration limits; missing domains "
            "remain explicitly unassessed."
        )

    unassessed = [
        f"{MODULE_LABELS[code]} was not assessable ({status_value})."
        for code, status_value in statuses.items()
        if status_value in {"insufficient_data", "data_quality_issue"}
    ]
    uncertainty_notes = [
        "This prototype does not provide medical clearance.",
        "No disease probability or causal inference is produced.",
    ]
    if unassessed:
        uncertainty_notes.append("Unassessed domains: " + " ".join(unassessed))
    return {"status": status, "summary": summary, "uncertainty_notes": uncertainty_notes}


def _snapshot_hash(
    *,
    window_start,
    window_end,
    modules: list[str],
    observations: list[Observation],
    baselines: list[HealthBaseline],
    algorithm_version: str,
    rule_set_version: str,
) -> str:
    document = {
        "window_start": iso(window_start),
        "window_end": iso(window_end),
        "modules": modules,
        "algorithm_version": algorithm_version,
        "rule_set_version": rule_set_version,
        "observations": [
            {
                "observation_id": str(row.id),
                "measurement_definition_id": str(row.measurement_definition_id),
                "measured_at": iso(row.measured_at),
                "value_numeric": row.value_numeric,
                "value_text": row.value_text,
                "value_boolean": row.value_boolean,
                "value_json": row.value_json,
                "canonical_value_numeric": row.canonical_value_numeric,
                "canonical_unit": row.canonical_unit,
                "quality_status": row.quality_status,
            }
            for row in sorted(observations, key=lambda item: (item.measured_at, str(item.id)))
        ],
        "baselines": [
            {
                "baseline_id": str(row.id),
                "version": row.version,
                "method": row.method,
                "sample_count": row.sample_count,
                "status": row.status,
            }
            for row in sorted(baselines, key=lambda item: str(item.id))
        ],
    }
    return canonical_hash(document)


def run_analysis(
    db: Session,
    principal: security.Principal,
    body: AnalysisRunIn,
    *,
    id_factory: IdFactory = uuid.uuid4,
) -> dict[str, Any]:
    security.check_mission_scope(
        db,
        principal,
        body.mission_id,
        action="analysis.run",
        astronaut_id=body.astronaut_id,
        require_health_access=True,
        allowed_roles={"crew_member", "medical_officer"},
    )
    security.ensure_astronaut_assignment(db, body.mission_id, body.astronaut_id)

    if body.algorithm_version != ALGORITHM_VERSION:
        raise ApiError(
            409,
            ALGORITHM_VERSION_UNAVAILABLE,
            "The requested algorithm version is not available in this build.",
            {"algorithm_version": body.algorithm_version, "available": [ALGORITHM_VERSION]},
        )
    if body.rule_set_version != RULE_SET_VERSION:
        raise ApiError(
            409,
            RULE_SET_VERSION_UNAVAILABLE,
            "The requested rule-set version is not available in this build.",
            {"rule_set_version": body.rule_set_version, "available": [RULE_SET_VERSION]},
        )

    modules: list[str] = []
    for module in body.modules:
        if module not in catalogue.ANALYSIS_MODULES:
            raise ApiError(
                422,
                UNSUPPORTED_ENTITY_TYPE,
                f"Unsupported analysis module '{module}'.",
                {"supported_modules": list(catalogue.ANALYSIS_MODULES)},
            )
        if module not in modules:
            modules.append(module)

    try:
        window_start = ensure_aware(body.window_start, "window_start")
        window_end = ensure_aware(body.window_end, "window_end")
    except ValueError as exc:
        raise ApiError(422, INVALID_TIMESTAMP, str(exc)) from exc
    assert window_start is not None and window_end is not None
    if window_end < window_start:
        raise ApiError(422, INVALID_TIMESTAMP, "window_end must not precede window_start.")

    started_at = utc_now()
    all_observations: list[Observation] = []
    module_results: list[dict[str, Any]] = []
    all_baselines: list[HealthBaseline] = []
    for module in modules:
        rows = _window_observations(
            db,
            body.astronaut_id,
            body.mission_id,
            window_start,
            window_end,
            catalogue.MODULE_MEASUREMENTS[module],
        )
        all_observations.extend(rows)
        result = _module_result(
            db,
            astronaut_id=body.astronaut_id,
            mission_id=body.mission_id,
            module_code=module,
            observations=rows,
        )
        module_results.append(result)
        for baseline, _ in result["baselines_used"]:
            if baseline not in all_baselines:
                all_baselines.append(baseline)

    input_hash = _snapshot_hash(
        window_start=window_start,
        window_end=window_end,
        modules=modules,
        observations=all_observations,
        baselines=all_baselines,
        algorithm_version=body.algorithm_version,
        rule_set_version=body.rule_set_version,
    )

    run_id = id_factory()
    completed_at = utc_now()
    run = AnalysisRun(
        id=run_id,
        astronaut_id=body.astronaut_id,
        mission_id=body.mission_id,
        requested_by=principal.actor_id,
        execution_location="ground_backend",
        algorithm_version=body.algorithm_version,
        rule_set_version=body.rule_set_version,
        input_snapshot_hash=input_hash,
        status="completed",
        implementation_build=IMPLEMENTATION_BUILD,
        output_hash=None,
        started_at=started_at,
        completed_at=completed_at,
        error_code=None,
    )
    db.add(run)
    db.flush()

    module_ids: dict[str, uuid.UUID] = {}
    for result in module_results:
        assessment_id = id_factory()
        module_ids[result["module_code"]] = assessment_id
        simulated = any(row.simulated for row in result["observations"])
        assessment = ModuleAssessment(
            id=assessment_id,
            astronaut_id=body.astronaut_id,
            mission_id=body.mission_id,
            module_code=result["module_code"],
            status=result["status"],
            assessed_at=completed_at,
            window_start=window_start,
            window_end=window_end,
            algorithm_version=body.algorithm_version,
            rule_set_version=body.rule_set_version,
            protocol_id=None,
            data_sufficiency=result["data_sufficiency"],
            summary=result["summary"],
            limitations=result["limitations"],
            simulated=simulated,
            analysis_run_id=run_id,
        )
        db.add(assessment)
        db.flush()

        used_ids: set[uuid.UUID] = set()
        for finding in result["findings"]:
            for observation_id in finding["observation_ids"]:
                used_ids.add(uuid.UUID(observation_id))
            db.add(
                AssessmentFinding(
                    id=id_factory(),
                    module_assessment_id=assessment_id,
                    measurement_definition_id=finding["measurement_definition_id"],
                    finding_code=finding["finding_code"],
                    severity=finding["severity"],
                    direction=finding["direction"],
                    current_value=finding["current_value"],
                    baseline_value=finding["baseline_value"],
                    delta_value=finding["delta_value"],
                    unit=finding["unit"],
                    explanation=finding["explanation"],
                    evidence_metadata={"observation_ids": finding["observation_ids"]},
                )
            )
        for observation in result["observations"]:
            role = "evidence" if observation.id in used_ids else (
                "excluded_quality" if observation.quality_status not in USABLE_QUALITY else "evidence"
            )
            db.add(
                AssessmentInput(
                    module_assessment_id=assessment_id,
                    observation_id=observation.id,
                    astronaut_id=body.astronaut_id,
                    mission_id=body.mission_id,
                    input_role=role,
                )
            )
        for baseline, _code in result["baselines_used"]:
            db.add(
                AssessmentBaseline(
                    module_assessment_id=assessment_id,
                    baseline_id=baseline.id,
                    astronaut_id=body.astronaut_id,
                    mission_id=body.mission_id,
                    measurement_definition_id=baseline.measurement_definition_id,
                    baseline_version=baseline.version,
                )
            )
        db.flush()
        append_change(
            db,
            mission_id=body.mission_id,
            entity_type="module_assessment",
            entity_id=assessment_id,
            operation="upsert",
            actor_id=principal.actor_id,
            origin="backend",
            payload={
                "assessment_id": str(assessment_id),
                "assessment_type": "module",
                "module_code": result["module_code"],
                "status": result["status"],
                "assessed_at": iso(completed_at),
                "summary": result["summary"],
                "simulated": simulated,
                "algorithm_version": body.algorithm_version,
                "rule_set_version": body.rule_set_version,
                "analysis_run_id": str(run_id),
            },
        )

    integrated_id: uuid.UUID | None = None
    if body.include_integrated_assessment and module_results:
        integrated_id = id_factory()
        integrated_result = _integrated_result(module_results)
        integrated = IntegratedAssessment(
            id=integrated_id,
            astronaut_id=body.astronaut_id,
            mission_id=body.mission_id,
            status=integrated_result["status"],
            assessed_at=completed_at,
            algorithm_version=body.algorithm_version,
            summary=integrated_result["summary"],
            uncertainty_notes=integrated_result["uncertainty_notes"],
            rule_set_version=body.rule_set_version,
            simulated=any(item["simulated"] for item in module_results),
            analysis_run_id=run_id,
        )
        db.add(integrated)
        db.flush()
        for result in module_results:
            role = (
                "contributing"
                if result["status"] in {"monitor", "attention", "urgent"}
                else "insufficient_data"
                if result["status"] == "insufficient_data"
                else "context"
            )
            db.add(
                IntegratedAssessmentComponent(
                    integrated_assessment_id=integrated_id,
                    module_assessment_id=module_ids[result["module_code"]],
                    astronaut_id=body.astronaut_id,
                    mission_id=body.mission_id,
                    algorithm_version=body.algorithm_version,
                    rule_set_version=body.rule_set_version,
                    contribution_role=role,
                )
            )
        db.flush()
        append_change(
            db,
            mission_id=body.mission_id,
            entity_type="integrated_assessment",
            entity_id=integrated_id,
            operation="upsert",
            actor_id=principal.actor_id,
            origin="backend",
            payload={
                "assessment_id": str(integrated_id),
                "assessment_type": "integrated",
                "status": integrated_result["status"],
                "assessed_at": iso(completed_at),
                "summary": integrated_result["summary"],
                "simulated": integrated.simulated,
                "algorithm_version": body.algorithm_version,
                "rule_set_version": body.rule_set_version,
                "analysis_run_id": str(run_id),
                "component_assessment_ids": [str(value) for value in module_ids.values()],
            },
        )

    # Generate controlled demonstration follow-up only for deviations that need review.
    for result in module_results:
        if result["status"] not in {"attention", "urgent"}:
            continue
        module_assessment_id = module_ids[result["module_code"]]
        worst = max(
            result["findings"],
            key=lambda item: abs((item["current_value"] or 0) - (item["baseline_value"] or 0)),
            default=None,
        )
        alert_id = id_factory()
        alert = Alert(
            id=alert_id,
            astronaut_id=body.astronaut_id,
            mission_id=body.mission_id,
            integrated_assessment_id=None,
            module_assessment_id=module_assessment_id,
            alert_code=f"demo_{result['module_code']}_baseline_deviation",
            severity=_alert_severity(result["status"], worst),
            title=f"{MODULE_LABELS[result['module_code']]} baseline deviation",
            message=result["summary"],
            status="open",
            created_at=completed_at,
            provenance={
                "analysis_run_id": str(run_id),
                "algorithm_version": body.algorithm_version,
                "rule_set_version": body.rule_set_version,
                "finding_code": worst["finding_code"] if worst else None,
                "demo_only": True,
            },
            revision=1,
        )
        db.add(alert)
        db.flush()
        append_change(
            db,
            mission_id=body.mission_id,
            entity_type="alert_event",
            entity_id=alert_id,
            operation="upsert",
            actor_id=principal.actor_id,
            origin="backend",
            payload={
                "alert_id": str(alert_id),
                "alert_code": alert.alert_code,
                "severity": alert.severity,
                "status": alert.status,
                "revision": alert.revision,
            },
        )
        action_id = id_factory()
        action = RecommendedAction(
            id=action_id,
            astronaut_id=body.astronaut_id,
            mission_id=body.mission_id,
            alert_id=alert_id,
            module_assessment_id=module_assessment_id,
            protocol_id=None,
            action_type="repeat_measurement",
            priority="high" if result["status"] == "urgent" else "normal",
            title=f"Repeat {worst['measurement_code'].replace('_', ' ') if worst else 'measurement'}",
            description=(
                "Repeat the measurement using a documented protocol and record a new observation. "
                "This is a demonstration suggestion, not clinical advice."
            ),
            due_at=None,
            status="pending",
            demo_only=True,
            revision=1,
        )
        db.add(action)
        db.flush()
        append_change(
            db,
            mission_id=body.mission_id,
            entity_type="action_event",
            entity_id=action_id,
            operation="upsert",
            actor_id=principal.actor_id,
            origin="backend",
            payload={"action_id": str(action_id), "status": action.status, "revision": action.revision},
        )

    output_hash = canonical_hash(
        {
            "module_assessments": [
                {"module_code": result["module_code"], "status": result["status"]}
                for result in module_results
            ],
            "integrated_assessment": (
                _integrated_result(module_results)["status"] if integrated_id else None
            ),
            "algorithm_version": body.algorithm_version,
            "rule_set_version": body.rule_set_version,
        }
    )
    run.output_hash = output_hash
    db.flush()

    append_change(
        db,
        mission_id=body.mission_id,
        entity_type="analysis_run",
        entity_id=run_id,
        operation="upsert",
        actor_id=principal.actor_id,
        origin="backend",
        payload={
            "run_id": str(run_id),
            "status": "completed",
            "execution_location": "ground_backend",
            "algorithm_version": body.algorithm_version,
            "rule_set_version": body.rule_set_version,
            "implementation_build": IMPLEMENTATION_BUILD,
            "input_snapshot_hash": input_hash,
            "output_hash": output_hash,
            "completed_at": iso(completed_at),
            "module_assessment_ids": [str(value) for value in module_ids.values()],
            "integrated_assessment_id": str(integrated_id) if integrated_id else None,
        },
    )

    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="analysis.run",
        entity_type="analysis_run",
        entity_id=run_id,
        outcome="success",
        mission_id=body.mission_id,
        astronaut_id=body.astronaut_id,
        details={
            "algorithm_version": body.algorithm_version,
            "rule_set_version": body.rule_set_version,
            "modules": modules,
            "input_snapshot_hash": input_hash,
        },
    )

    return {
        "run_id": str(run_id),
        "status": "completed",
        "execution_location": "ground_backend",
        "algorithm_version": body.algorithm_version,
        "rule_set_version": body.rule_set_version,
        "implementation_build": IMPLEMENTATION_BUILD,
        "input_snapshot_hash": input_hash,
        "output_hash": output_hash,
        "completed_at": iso(completed_at),
        "module_assessment_ids": [str(value) for value in module_ids.values()],
        "integrated_assessment_id": str(integrated_id) if integrated_id else None,
    }


def _alert_severity(module_status: str, finding: dict[str, Any] | None) -> str:
    if module_status == "urgent":
        return "critical"
    if finding and finding["severity"] in {"high", "critical"}:
        return "high"
    return "moderate"


def persist_failed_run(
    db: Session,
    principal: security.Principal,
    body: AnalysisRunIn,
    error_code: str,
    *,
    id_factory: IdFactory = uuid.uuid4,
) -> dict[str, Any]:
    """Persist a failed run without assessments and return the failure shape."""
    db.rollback()
    started_at = utc_now()
    completed_at = utc_now()
    placeholder_hash = canonical_hash(
        {
            "astronaut_id": str(body.astronaut_id),
            "mission_id": str(body.mission_id),
            "window_start": iso(body.window_start),
            "window_end": iso(body.window_end),
            "modules": body.modules,
            "algorithm_version": body.algorithm_version,
            "rule_set_version": body.rule_set_version,
            "failure": error_code,
        }
    )
    run_id = id_factory()
    run = AnalysisRun(
        id=run_id,
        astronaut_id=body.astronaut_id,
        mission_id=body.mission_id,
        requested_by=principal.actor_id,
        execution_location="ground_backend",
        algorithm_version=body.algorithm_version,
        rule_set_version=body.rule_set_version,
        input_snapshot_hash=placeholder_hash,
        status="failed",
        implementation_build=IMPLEMENTATION_BUILD,
        output_hash=None,
        started_at=started_at,
        completed_at=completed_at,
        error_code=error_code,
    )
    db.add(run)
    audit.record(
        db,
        actor_id=principal.actor_id,
        actor_role=principal.role,
        action="analysis.run",
        entity_type="analysis_run",
        entity_id=run_id,
        outcome="failure",
        mission_id=body.mission_id,
        astronaut_id=body.astronaut_id,
        details={"error_code": error_code, "algorithm_version": body.algorithm_version},
    )
    db.commit()
    return {
        "run_id": str(run_id),
        "status": "failed",
        "execution_location": "ground_backend",
        "algorithm_version": body.algorithm_version,
        "rule_set_version": body.rule_set_version,
        "implementation_build": IMPLEMENTATION_BUILD,
        "input_snapshot_hash": placeholder_hash,
        "completed_at": iso(completed_at),
        "error_code": error_code,
    }
