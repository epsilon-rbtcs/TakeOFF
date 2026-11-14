"""Authoritative measurement catalogue for the v0.3 demonstration.

The SQL file seeds only a small subset of the catalogue required by README.md.
This module is the application-level catalogue used to publish a versioned,
mission-scoped snapshot (``measurement_catalogue_versions``) and to validate
every observation against the snapshot it names.

Codes are stable API identifiers.  Units are proposed canonical units; all unit
conversions are explicit and listed in :mod:`app.units`.  No clinical threshold
is stored here.
"""
from __future__ import annotations

from typing import Any

# Source types from schema.sql / README.md.
SOURCE_TYPES: tuple[str, ...] = (
    "wearable",
    "medical_device",
    "laboratory",
    "manual",
    "environmental_sensor",
    "dosimeter",
    "cognitive_task",
    "import",
    "simulation",
)

DOMAIN_CODES: tuple[str, ...] = (
    "cardiovascular",
    "behavioural_cognitive",
    "immune",
    "musculoskeletal",
    "radiation",
    "environmental",
    "data_quality",
)

VALUE_TYPES: tuple[str, ...] = ("numeric", "integer", "text", "boolean", "object")


def _definition(
    code: str,
    display_name: str,
    domain_code: str,
    value_type: str,
    canonical_unit: str | None,
    allowed_units: list[str],
    allowed_source_types: list[str],
    description: str,
    sampling_guidance: str | None = None,
    context_schema: dict[str, Any] | None = None,
    compatibility: bool = False,
) -> dict[str, Any]:
    return {
        "code": code,
        "display_name": display_name,
        "domain_code": domain_code,
        "value_type": value_type,
        "canonical_unit": canonical_unit,
        "allowed_units": list(allowed_units),
        "allowed_source_types": list(allowed_source_types),
        "description": description,
        "sampling_guidance": sampling_guidance,
        "context_schema": context_schema or {},
        "active": True,
        "compatibility": compatibility,
    }


MEASUREMENT_DEFINITIONS: list[dict[str, Any]] = [
    # A. Cardiovascular -------------------------------------------------------
    _definition(
        "heart_rate", "Heart rate", "cardiovascular", "numeric", "bpm", ["bpm"],
        ["wearable", "medical_device", "manual", "simulation"],
        "Instantaneous heart rate.", "Record posture and activity context where known.",
        {"posture": "string", "activity": "string"},
    ),
    _definition(
        "resting_heart_rate", "Resting heart rate", "cardiovascular", "numeric", "bpm", ["bpm"],
        ["wearable", "manual", "simulation"],
        "Resting heart rate under a documented resting protocol.",
        "Use a documented rest period; store the rest duration in context.",
        {"posture": "string", "rest_period_minutes": "number"},
    ),
    _definition(
        "hrv_rmssd", "HRV (RMSSD)", "cardiovascular", "numeric", "ms", ["ms"],
        ["wearable", "medical_device", "manual", "simulation"],
        "Root mean square of successive differences; never mix with SDNN.",
        "Store the recording window and artifact handling in context.",
    ),
    _definition(
        "systolic_bp", "Systolic blood pressure", "cardiovascular", "numeric", "mmHg", ["mmHg"],
        ["medical_device", "manual", "simulation"], "Systolic blood pressure.",
    ),
    _definition(
        "diastolic_bp", "Diastolic blood pressure", "cardiovascular", "numeric", "mmHg", ["mmHg"],
        ["medical_device", "manual", "simulation"], "Diastolic blood pressure.",
    ),
    _definition(
        "spo2", "Peripheral oxygen saturation", "cardiovascular", "numeric", "%", ["%"],
        ["wearable", "medical_device", "manual", "simulation"],
        "Peripheral oxygen saturation from a specified instrument.",
    ),
    _definition(
        "body_temperature", "Body temperature", "cardiovascular", "numeric", "degC", ["degC"],
        ["medical_device", "manual", "simulation"],
        "Body temperature; record measurement site in context.",
        context_schema={"site": "string"},
    ),
    _definition(
        "heart_rate_recovery_60s", "Heart-rate recovery at 60 seconds",
        "cardiovascular", "numeric", "bpm", ["bpm"],
        ["wearable", "medical_device", "simulation"],
        "Heart-rate recovery measured 60 seconds after a documented exercise step.",
    ),
    # B. Behavioural, sleep and cognitive ------------------------------------
    _definition(
        "sleep_duration", "Total sleep duration", "behavioural_cognitive", "numeric", "h",
        ["h", "min"], ["wearable", "manual", "simulation"],
        "Total sleep duration. Minutes are converted to hours by an explicit rule.",
    ),
    _definition(
        "sleep_efficiency", "Sleep efficiency", "behavioural_cognitive", "numeric", "%", ["%"],
        ["wearable", "manual", "simulation"], "Sleep efficiency percentage.",
    ),
    _definition(
        "wake_after_sleep_onset", "Wake after sleep onset", "behavioural_cognitive", "numeric",
        "min", ["min"], ["wearable", "manual", "simulation"], "Wake after sleep onset in minutes.",
    ),
    _definition(
        "sleep_interruptions", "Sleep interruptions", "behavioural_cognitive", "integer",
        "count", ["count"], ["wearable", "manual", "simulation"],
        "Number of sleep interruptions.",
    ),
    _definition(
        "mood_score", "Self-reported mood", "behavioural_cognitive", "numeric", "score_0_10",
        ["score_0_10"], ["manual"],
        "Self-report scored 0-10. Questionnaire anchors and version are required in context.",
        context_schema={"questionnaire": "string", "version": "string"},
    ),
    _definition(
        "stress_score", "Self-reported stress", "behavioural_cognitive", "numeric", "score_0_10",
        ["score_0_10"], ["manual"],
        "Self-report scored 0-10. Questionnaire anchors and version are required in context.",
        context_schema={"questionnaire": "string", "version": "string"},
    ),
    _definition(
        "fatigue_score", "Self-reported fatigue", "behavioural_cognitive", "numeric", "score_0_10",
        ["score_0_10"], ["manual"],
        "Self-report scored 0-10. Questionnaire anchors and version are required in context.",
        context_schema={"questionnaire": "string", "version": "string"},
    ),
    _definition(
        "pain_score", "Self-reported pain", "behavioural_cognitive", "numeric", "score_0_10",
        ["score_0_10"], ["manual"],
        "Self-report scored 0-10. Questionnaire anchors and version are required in context.",
        context_schema={"questionnaire": "string", "version": "string"},
    ),
    _definition(
        "pvt_mean_reaction_time", "Psychomotor vigilance mean reaction time",
        "behavioural_cognitive", "numeric", "ms", ["ms"], ["cognitive_task", "simulation"],
        "Mean reaction time from a specified PVT test version.",
        context_schema={"test_version": "string"},
    ),
    _definition(
        "pvt_lapses", "Psychomotor vigilance lapses", "behavioural_cognitive", "integer",
        "count", ["count"], ["cognitive_task", "simulation"],
        "Lapse count from a specified PVT test version.",
    ),
    _definition(
        "pvt_false_starts", "Psychomotor vigilance false starts", "behavioural_cognitive",
        "integer", "count", ["count"], ["cognitive_task", "simulation"],
        "False-start count from a specified PVT test version.",
    ),
    _definition(
        "physical_activity_minutes", "Physical activity duration", "behavioural_cognitive",
        "numeric", "min", ["min"], ["wearable", "manual", "simulation"],
        "Physical activity duration in minutes.",
    ),
    # Compatibility code used by the existing Crew Health Client check-in form.
    # It is an explicit alias for physical activity duration, not a new quantity.
    _definition(
        "exercise_minutes", "Exercise duration (crew-client compatibility code)",
        "musculoskeletal", "numeric", "min", ["min"], ["manual", "wearable", "simulation"],
        "Exercise duration in minutes. Compatibility code used by the unmodified crew client; "
        "equivalent quantity to physical_activity_minutes.",
        compatibility=True,
    ),
    # ------------------------------------------------------------------
    # Crew-client compatibility vocabulary.
    #
    # The unmodified Crew Health Client stores local check-in fields whose
    # labels predate the published README catalogue.  Each code below is an
    # explicit, clearly marked compatibility definition so that an offline
    # client can synchronize without silently changing what the crew member
    # recorded.  Codes are not aliases for different clinical quantities and
    # do not add any threshold or diagnostic interpretation.
    # ------------------------------------------------------------------
    _definition(
        "sleep_quality", "Sleep quality (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual", "wearable", "simulation"],
        "Subjective sleep-quality self-report on the crew client's 0-10 scale. "
        "Anchors are client-defined and are not a clinical instrument.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "fatigue", "Fatigue (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective fatigue self-report on the crew client's 0-10 scale. "
        "Equivalent concept to fatigue_score; kept under the client's code for traceability.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "recovery", "Perceived recovery (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective perceived-recovery self-report on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "mood", "Mood (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective mood self-report on the crew client's 0-10 scale. "
        "Equivalent concept to mood_score; kept under the client's code for traceability.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "stress", "Stress (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective stress self-report on the crew client's 0-10 scale. "
        "Equivalent concept to stress_score; kept under the client's code for traceability.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "isolation", "Isolation self-report (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective isolation self-report on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "motivation", "Motivation (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective motivation self-report on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "reaction_time_median", "Median reaction time (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "ms", ["ms"], ["cognitive_task", "simulation"],
        "Median reaction time from the crew client's local reaction-time task. "
        "Equivalent concept to pvt_mean_reaction_time but not a validated PVT implementation.",
        context_schema={"test_version": "string"},
        compatibility=True,
    ),
    _definition(
        "premature_responses", "Premature responses (crew-client compatibility code)",
        "behavioural_cognitive", "integer", "count", ["count"], ["cognitive_task", "simulation"],
        "Premature-response count from the crew client's local reaction-time task. "
        "Equivalent concept to pvt_false_starts.",
        context_schema={"test_version": "string"},
        compatibility=True,
    ),
    _definition(
        "exercise_duration", "Exercise duration (crew-client compatibility code)",
        "musculoskeletal", "numeric", "min", ["min"], ["manual", "wearable", "simulation"],
        "Exercise duration in minutes. Compatibility code used by the unmodified crew client.",
        compatibility=True,
    ),
    _definition(
        "resistance_training", "Resistance training duration (crew-client compatibility code)",
        "musculoskeletal", "numeric", "min", ["min"], ["manual", "wearable", "simulation"],
        "Resistance-training duration in minutes. Compatibility code used by the unmodified crew client.",
        compatibility=True,
    ),
    _definition(
        "muscle_soreness", "Muscle soreness (crew-client compatibility code)",
        "musculoskeletal", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective muscle-soreness self-report on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "physical_function", "Physical function (crew-client compatibility code)",
        "musculoskeletal", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective physical-function self-report on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "bone_density", "Bone density (crew-client compatibility code)",
        "musculoskeletal", "numeric", "g/cm2", ["g/cm2"], ["medical_device", "import"],
        "Bone density from an appropriate measurement method. Compatibility code used by the "
        "unmodified crew client; equivalent quantity to bone_mineral_density.",
        compatibility=True,
    ),
    _definition(
        "headache", "Headache (crew-client compatibility code)",
        "immune", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective headache severity on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "dizziness", "Dizziness (crew-client compatibility code)",
        "immune", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective dizziness severity on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "nausea", "Nausea (crew-client compatibility code)",
        "immune", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective nausea severity on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "laboratory_biomarker", "Laboratory biomarker (crew-client compatibility code)",
        "immune", "numeric", "assay_specific", ["assay_specific"], ["laboratory", "import", "manual"],
        "Imported laboratory biomarker. Compatibility code used by the unmodified crew client; "
        "the specific analyte, assay and reported unit must be stored in context.",
        context_schema={"analyte": "string", "assay": "string", "specimen": "string", "reported_unit": "string"},
        compatibility=True,
    ),
    _definition(
        "personal_dose_rate", "Personal dose rate (crew-client compatibility code)",
        "radiation", "numeric", "mSv/h", ["mSv/h"], ["dosimeter", "import", "simulation"],
        "Dose-equivalent rate reported by the crew client in mSv/h. "
        "Kept separate from the canonical uSv/h dose_rate code.",
        compatibility=True,
    ),
    _definition(
        "personal_cumulative_dose", "Personal cumulative dose (crew-client compatibility code)",
        "radiation", "numeric", "mSv", ["mSv"], ["dosimeter", "import", "simulation"],
        "Cumulative dose-equivalent reading reported by the crew client. "
        "Do not add a cumulative value to a stream that already reports cumulative totals.",
        compatibility=True,
    ),
    _definition(
        "humidity", "Relative humidity (crew-client compatibility code)",
        "environmental", "numeric", "%", ["%"], ["environmental_sensor", "import", "simulation"],
        "Relative humidity. Compatibility code used by the unmodified crew client; "
        "equivalent quantity to relative_humidity.",
        compatibility=True,
    ),
    _definition(
        "environmental_radiation", "Environmental radiation (crew-client compatibility code)",
        "environmental", "numeric", "uSv/h", ["uSv/h"], ["environmental_sensor", "import", "simulation"],
        "Environmental dose-equivalent rate reported by the crew client. "
        "Equivalent quantity to dose_rate but retained under the client's code.",
        compatibility=True,
    ),
    _definition(
        "fluid_intake", "Fluid intake (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "mL", ["mL"], ["manual"],
        "Self-reported fluid intake in millilitres. Compatibility code used by the unmodified crew client.",
        compatibility=True,
    ),
    _definition(
        "meals", "Meals (crew-client compatibility code)",
        "behavioural_cognitive", "integer", "count", ["count"], ["manual"],
        "Self-reported meal count. Compatibility code used by the unmodified crew client.",
        compatibility=True,
    ),
    _definition(
        "appetite", "Appetite (crew-client compatibility code)",
        "behavioural_cognitive", "numeric", "score_0_10", ["score_0_10"], ["manual"],
        "Subjective appetite self-report on the crew client's 0-10 scale.",
        context_schema={"questionnaire": "string", "version": "string"},
        compatibility=True,
    ),
    _definition(
        "nutrition_observations", "Nutrition observations (crew-client compatibility code)",
        "behavioural_cognitive", "text", None, [], ["manual"],
        "Free-text nutrition observation. Compatibility code used by the unmodified crew client; "
        "text is stored as recorded and is not interpreted.",
        compatibility=True,
    ),
    # C. Immune / inflammation ------------------------------------------------
    _definition(
        "wbc_count", "White blood cell count", "immune", "numeric", "10^9/L", ["10^9/L"],
        ["laboratory", "manual", "import"], "White blood cell count.",
        context_schema={"analyte": "string", "assay": "string", "specimen": "string"},
    ),
    _definition(
        "lymphocyte_count", "Lymphocyte count", "immune", "numeric", "10^9/L", ["10^9/L"],
        ["laboratory", "manual", "import"], "Lymphocyte count.",
    ),
    _definition(
        "neutrophil_count", "Neutrophil count", "immune", "numeric", "10^9/L", ["10^9/L"],
        ["laboratory", "manual", "import"], "Neutrophil count.",
    ),
    _definition(
        "crp", "C-reactive protein", "immune", "numeric", "mg/L", ["mg/L"],
        ["laboratory", "manual", "import"],
        "C-reactive protein. An inflammation marker, not a diagnosis.",
    ),
    _definition(
        "cytokine_result", "Cytokine assay result", "immune", "numeric", "assay_specific",
        ["assay_specific"], ["laboratory", "manual", "import"],
        "Cytokine assay result. The specific analyte and assay must be stored in context.",
        context_schema={"analyte": "string", "assay": "string", "specimen": "string"},
    ),
    _definition(
        "infection_symptom_flag", "Infection-related symptom report", "immune", "object",
        None, [], ["manual"], "Structured symptom report; not a laboratory result.",
    ),
    # D. Musculoskeletal / bone / muscle -------------------------------------
    _definition(
        "ctx_bone_resorption", "CTX bone-resorption marker", "musculoskeletal", "numeric",
        "assay_specific", ["assay_specific"], ["laboratory", "manual", "import"],
        "CTX bone-resorption marker; assay platform and specimen belong in context.",
    ),
    _definition(
        "p1np_bone_formation", "P1NP bone-formation marker", "musculoskeletal", "numeric",
        "assay_specific", ["assay_specific"], ["laboratory", "manual", "import"],
        "P1NP bone-formation marker; assay platform and specimen belong in context.",
    ),
    _definition(
        "serum_calcium", "Serum calcium", "musculoskeletal", "numeric", "mg/dL", ["mg/dL"],
        ["laboratory", "manual", "import"], "Serum calcium.",
    ),
    _definition(
        "25oh_vitamin_d", "25-hydroxy vitamin D", "musculoskeletal", "numeric", "ng/mL",
        ["ng/mL"], ["laboratory", "manual", "import"], "25-hydroxy vitamin D.",
    ),
    _definition(
        "grip_strength", "Grip strength", "musculoskeletal", "numeric", "kgf", ["kgf"],
        ["medical_device", "manual", "simulation"], "Grip strength in kilogram-force.",
    ),
    _definition(
        "bone_mineral_density", "Bone mineral density", "musculoskeletal", "numeric",
        "g/cm2", ["g/cm2"], ["medical_device", "import"],
        "Bone mineral density from an appropriate imaging/measurement method.",
    ),
    _definition(
        "resistance_exercise_minutes", "Resistance exercise duration", "musculoskeletal",
        "numeric", "min", ["min"], ["manual", "wearable", "simulation"],
        "Resistance exercise duration in minutes.",
    ),
    # E. Radiation ------------------------------------------------------------
    _definition(
        "absorbed_dose", "Absorbed radiation dose", "radiation", "numeric", "mGy",
        ["mGy", "uGy"], ["dosimeter", "import", "simulation"],
        "Absorbed dose. Not interchangeable with dose equivalent (mSv).",
    ),
    _definition(
        "dose_equivalent", "Dose equivalent", "radiation", "numeric", "mSv",
        ["mSv", "uSv"], ["dosimeter", "import", "simulation"],
        "Dose-equivalent quantity. Retain instrument semantics.",
    ),
    _definition(
        "dose_rate", "Dose-equivalent rate", "radiation", "numeric", "uSv/h",
        ["uSv/h", "mSv/day"], ["dosimeter", "import", "simulation"],
        "Dose-equivalent rate. Check instrument definition before conversion.",
    ),
    _definition(
        "linear_energy_transfer", "Linear energy transfer", "radiation", "numeric",
        "keV/um", ["keV/um"], ["dosimeter", "import"],
        "Linear energy transfer.",
    ),
    # F. Environmental --------------------------------------------------------
    _definition(
        "cabin_co2", "Cabin carbon dioxide", "environmental", "numeric", "ppm", ["ppm"],
        ["environmental_sensor", "import", "simulation"],
        "Cabin carbon dioxide concentration in parts per million.",
    ),
    _definition(
        "cabin_temperature", "Cabin temperature", "environmental", "numeric", "degC", ["degC"],
        ["environmental_sensor", "import", "simulation"], "Cabin temperature.",
    ),
    _definition(
        "relative_humidity", "Relative humidity", "environmental", "numeric", "%", ["%"],
        ["environmental_sensor", "import", "simulation"], "Relative humidity.",
    ),
    _definition(
        "cabin_pressure", "Cabin pressure", "environmental", "numeric", "kPa", ["kPa"],
        ["environmental_sensor", "import", "simulation"], "Cabin pressure.",
    ),
]

BY_CODE: dict[str, dict[str, Any]] = {item["code"]: item for item in MEASUREMENT_DEFINITIONS}
MEASUREMENT_CODES: frozenset[str] = frozenset(BY_CODE)

MODULE_MEASUREMENTS: dict[str, tuple[str, ...]] = {
    "cardiovascular": (
        "heart_rate", "resting_heart_rate", "hrv_rmssd", "systolic_bp", "diastolic_bp",
        "spo2", "body_temperature", "heart_rate_recovery_60s",
    ),
    "behavioural_cognitive": (
        "sleep_duration", "sleep_efficiency", "wake_after_sleep_onset", "sleep_interruptions",
        "mood_score", "stress_score", "fatigue_score", "pain_score",
        "pvt_mean_reaction_time", "pvt_lapses", "pvt_false_starts", "physical_activity_minutes",
    ),
    "immune": (
        "wbc_count", "lymphocyte_count", "neutrophil_count", "crp", "cytokine_result",
        "infection_symptom_flag",
    ),
    "musculoskeletal": (
        "ctx_bone_resorption", "p1np_bone_formation", "serum_calcium", "25oh_vitamin_d",
        "grip_strength", "bone_mineral_density", "resistance_exercise_minutes", "exercise_minutes",
    ),
    "radiation": ("absorbed_dose", "dose_equivalent", "dose_rate", "linear_energy_transfer"),
    "environmental": ("cabin_co2", "cabin_temperature", "relative_humidity", "cabin_pressure"),
}

ANALYSIS_MODULES: tuple[str, ...] = tuple(MODULE_MEASUREMENTS)


def definition_by_code(code: str) -> dict[str, Any] | None:
    return BY_CODE.get(code)


def snapshot() -> list[dict[str, Any]]:
    """A JSON-safe catalogue snapshot for ``measurement_catalogue_versions``."""
    return [dict(item) for item in MEASUREMENT_DEFINITIONS]


def definitions_from_snapshot(value: Any) -> dict[str, dict[str, Any]]:
    """Accept the list snapshot written by this service (and older dict forms)."""
    if isinstance(value, dict):
        value = value.get("definitions") or value.get("items") or []
    if not isinstance(value, list):
        return {}
    result: dict[str, dict[str, Any]] = {}
    for item in value:
        if isinstance(item, dict) and isinstance(item.get("code"), str):
            result[item["code"]] = item
    return result


def merge_changes(changes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Apply partial catalogue changes to the current in-code catalogue."""
    merged = {item["code"]: dict(item) for item in MEASUREMENT_DEFINITIONS}
    for change in changes:
        code = change["code"]
        base = merged.get(code, {})
        candidate = {**base, **{key: value for key, value in change.items() if value is not None}}
        candidate.setdefault("active", True)
        candidate.setdefault("allowed_units", [])
        candidate.setdefault("allowed_source_types", [])
        candidate.setdefault("context_schema", {})
        candidate.setdefault("description", None)
        candidate.setdefault("sampling_guidance", None)
        merged[code] = candidate
    # Preserve catalogue order for known codes, then append new codes.
    ordered = [merged.pop(item["code"]) for item in MEASUREMENT_DEFINITIONS if item["code"] in merged]
    ordered.extend(item for _, item in sorted(merged.items()))
    return ordered
