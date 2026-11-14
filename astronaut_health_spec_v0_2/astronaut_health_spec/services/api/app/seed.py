"""Deterministic synthetic demo data.

Everything created here is explicitly marked ``simulated``.  The data is
synthetic: it is not a real astronaut record, not a clinical dataset, and not
evidence of medical validity.  Seeding is idempotent so it can run at startup
or from the CLI without duplicating records or resetting passwords.
"""
from __future__ import annotations

import math
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import catalogue, feed, security
from .models import (
    AnalysisRun,
    AppUser,
    Astronaut,
    AstronautMission,
    ClientDevice,
    CommunicationSession,
    Device,
    HealthBaseline,
    MeasurementCatalogueVersion,
    MeasurementDefinition,
    Message,
    MessageEvent,
    Mission,
    Observation,
    Protocol,
    UserMissionScope,
)
from .schemas import AnalysisRunIn
from .services import analysis as analysis_service
from .units import canonical_value_for_snapshot
from .util import utc_now

SEED_NAMESPACE = uuid.UUID("a3f1d6e2-6c1b-4b8f-9a5e-2f7c9d0e4b11")

MISSION_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
ASTRONAUT_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
CLIENT_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
CREW_USER_ID = uuid.UUID("44444444-4444-4444-4444-444444444444")
MEDICAL_USER_ID = uuid.UUID("55555555-5555-5555-5555-555555555555")
ADMIN_USER_ID = uuid.UUID("66666666-6666-6666-6666-666666666666")
ASSIGNMENT_ID = uuid.UUID("77777777-7777-7777-7777-777777777777")
CATALOGUE_VERSION_ID = uuid.UUID("88888888-8888-8888-8888-888888888888")
DEVICE_ID = uuid.UUID("99999999-9999-9999-9999-999999999999")

CATALOGUE_VERSION = "demo-catalog-0.3.0"
PROTOCOL_CODE = "demo-baseline-monitoring"
RULE_SET_VERSION = "demo-config-0.3.0"
DEMO_MISSION_CODE = "DEMO-LEO-01"
DEMO_ASTRONAUT_CODE = "DEMO-AST-01"


def _seed_id(*parts: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, ":".join(parts))


BASELINE_STATS: dict[str, dict[str, float]] = {
    "resting_heart_rate": {
        "mean": 58.0, "standard_deviation": 3.1, "median": 58.0, "mad": 2.0,
        "minimum": 52.0, "maximum": 64.0,
    },
    "hrv_rmssd": {
        "mean": 52.0, "standard_deviation": 10.0, "median": 52.0, "mad": 7.0,
        "minimum": 34.0, "maximum": 72.0,
    },
    "sleep_duration": {
        "mean": 7.2, "standard_deviation": 0.6, "median": 7.2, "mad": 0.4,
        "minimum": 6.0, "maximum": 8.2,
    },
    "sleep_efficiency": {
        "mean": 89.0, "standard_deviation": 3.0, "median": 89.0, "mad": 2.0,
        "minimum": 82.0, "maximum": 95.0,
    },
    "mood_score": {
        "mean": 6.8, "standard_deviation": 1.0, "median": 6.8, "mad": 0.7,
        "minimum": 4.0, "maximum": 9.0,
    },
    "stress_score": {
        "mean": 3.2, "standard_deviation": 1.1, "median": 3.2, "mad": 0.8,
        "minimum": 1.0, "maximum": 6.0,
    },
    "fatigue_score": {
        "mean": 3.5, "standard_deviation": 1.2, "median": 3.5, "mad": 0.9,
        "minimum": 1.0, "maximum": 7.0,
    },
    "pvt_mean_reaction_time": {
        "mean": 265.0, "standard_deviation": 22.0, "median": 265.0, "mad": 16.0,
        "minimum": 220.0, "maximum": 320.0,
    },
    "grip_strength": {
        "mean": 42.0, "standard_deviation": 4.0, "median": 42.0, "mad": 3.0,
        "minimum": 34.0, "maximum": 50.0,
    },
    "dose_rate": {
        "mean": 0.42, "standard_deviation": 0.08, "median": 0.42, "mad": 0.05,
        "minimum": 0.25, "maximum": 0.62,
    },
    "cabin_co2": {
        "mean": 900.0, "standard_deviation": 120.0, "median": 900.0, "mad": 90.0,
        "minimum": 650.0, "maximum": 1300.0,
    },
    "body_temperature": {
        "mean": 36.6, "standard_deviation": 0.25, "median": 36.6, "mad": 0.18,
        "minimum": 36.1, "maximum": 37.2,
    },
}

DAILY_MEASUREMENTS: tuple[str, ...] = (
    "resting_heart_rate",
    "hrv_rmssd",
    "sleep_duration",
    "sleep_efficiency",
    "stress_score",
    "fatigue_score",
    "mood_score",
    "body_temperature",
    "cabin_co2",
    "dose_rate",
)

WEEKLY_MEASUREMENTS: tuple[str, ...] = ("grip_strength", "pvt_mean_reaction_time")


def _get_or_create_user(
    db: Session,
    *,
    user_id: uuid.UUID,
    username: str,
    password: str,
    role: str,
) -> AppUser:
    user = db.execute(select(AppUser).where(AppUser.username == username)).scalar_one_or_none()
    if user is not None:
        return user
    user = AppUser(
        id=user_id,
        username=username,
        password_hash=security.hash_password(password),
        role=role,
        active=True,
    )
    db.add(user)
    db.flush()
    return user


def _ensure_scope(
    db: Session, user_id: uuid.UUID, mission_id: uuid.UUID, astronaut_id: uuid.UUID | None
) -> None:
    existing = db.execute(
        select(UserMissionScope).where(
            UserMissionScope.user_id == user_id,
            UserMissionScope.mission_id == mission_id,
        )
    ).scalar_one_or_none()
    if existing is None:
        db.add(
            UserMissionScope(
                id=_seed_id("scope", str(user_id), str(mission_id)),
                user_id=user_id,
                mission_id=mission_id,
                astronaut_id=astronaut_id,
            )
        )
        db.flush()


def _upsert_definitions(db: Session) -> dict[str, MeasurementDefinition]:
    rows: dict[str, MeasurementDefinition] = {}
    for item in catalogue.MEASUREMENT_DEFINITIONS:
        row = db.execute(
            select(MeasurementDefinition).where(MeasurementDefinition.code == item["code"])
        ).scalar_one_or_none()
        if row is None:
            row = MeasurementDefinition(
                id=_seed_id("definition", item["code"]),
                code=item["code"],
                display_name=item["display_name"],
                domain_code=item["domain_code"],
                value_type=item["value_type"],
                canonical_unit=item["canonical_unit"],
                allowed_units=item["allowed_units"],
                allowed_source_types=item["allowed_source_types"],
                description=item["description"],
                sampling_guidance=item["sampling_guidance"],
                context_schema=item["context_schema"],
                active=True,
            )
            db.add(row)
        rows[item["code"]] = row
    db.flush()
    return rows


def _ensure_baselines(
    db: Session,
    definitions: dict[str, MeasurementDefinition],
    period_start: datetime,
    period_end: datetime,
) -> None:
    for code, stats in BASELINE_STATS.items():
        definition = definitions[code]
        existing = db.execute(
            select(HealthBaseline).where(
                HealthBaseline.astronaut_id == ASTRONAUT_ID,
                HealthBaseline.mission_id == MISSION_ID,
                HealthBaseline.measurement_definition_id == definition.id,
                HealthBaseline.baseline_scope == "preflight",
                HealthBaseline.version == 1,
            )
        ).scalar_one_or_none()
        if existing is not None:
            continue
        db.add(
            HealthBaseline(
                id=_seed_id("baseline", code, "1"),
                astronaut_id=ASTRONAUT_ID,
                mission_id=MISSION_ID,
                measurement_definition_id=definition.id,
                baseline_scope="preflight",
                status="active",
                method="demo_deterministic_summary",
                period_start=period_start,
                period_end=period_end,
                sample_count=14,
                mean=stats["mean"],
                standard_deviation=stats["standard_deviation"],
                median=stats["median"],
                mad=stats["mad"],
                minimum=stats["minimum"],
                maximum=stats["maximum"],
                canonical_unit=definition.canonical_unit,
                version=1,
                calculated_at=period_end,
                activated_at=period_end,
                source_metadata={
                    "simulated": True,
                    "note": "Synthetic summary statistics for the demonstration mission.",
                },
            )
        )
    db.flush()


def _source_type(definition: dict[str, Any]) -> str:
    allowed = definition.get("allowed_source_types") or []
    if "simulation" in allowed:
        return "simulation"
    return allowed[0] if allowed else "manual"


def _add_observation(
    db: Session,
    *,
    code: str,
    value: float,
    measured_at: datetime,
    definition_row: MeasurementDefinition,
    context: dict[str, Any] | None = None,
) -> None:
    observation_id = _seed_id(
        "observation", code, measured_at.astimezone(timezone.utc).isoformat()
    )
    if db.get(Observation, observation_id) is not None:
        return
    definition = catalogue.BY_CODE[code]
    canonical_value, canonical_unit = canonical_value_for_snapshot(
        definition, float(value), definition.get("canonical_unit")
    )
    db.add(
        Observation(
            id=observation_id,
            astronaut_id=ASTRONAUT_ID,
            mission_id=MISSION_ID,
            measurement_definition_id=definition_row.id,
            catalogue_version=CATALOGUE_VERSION,
            measured_at=measured_at,
            clock_quality={"status": "good", "method": "synthetic_seed"},
            client_created_at=measured_at,
            received_at=measured_at + timedelta(minutes=3),
            value_numeric=float(value),
            original_unit=definition.get("canonical_unit"),
            canonical_value_numeric=canonical_value,
            canonical_unit=canonical_unit,
            source_type=_source_type(definition),
            device_id=DEVICE_ID if _source_type(definition) != "simulation" else None,
            source_external_id="seed-generator",
            quality_status="valid",
            quality_score=0.95,
            quality_details={"simulated": True, "generator": "demo-seed-0.3.0"},
            context={
                "synthetic": True,
                "generator": "demo-seed-0.3.0",
                **(context or {}),
            },
            simulated=True,
        )
    )


def _value_for(code: str, day_index: int, *, latest: bool) -> float:
    base = BASELINE_STATS[code]["median"]
    wave = math.sin(day_index / 2.1) * 0.35 + math.cos(day_index / 3.7) * 0.2
    if code == "resting_heart_rate":
        return 70.0 if latest else round(base + wave * 2.2, 1)
    if code == "hrv_rmssd":
        return 31.0 if latest else round(base + wave * 5.0, 1)
    if code == "sleep_duration":
        return 5.6 if latest else round(base + wave * 0.35, 2)
    if code == "sleep_efficiency":
        return 80.0 if latest else round(base + wave * 2.0, 1)
    if code == "stress_score":
        return 6.5 if latest else round(max(0.5, base + wave * 0.7), 1)
    if code == "fatigue_score":
        return 6.0 if latest else round(max(0.5, base + wave * 0.8), 1)
    if code == "mood_score":
        return 4.5 if latest else round(min(10.0, base + wave * 0.6), 1)
    if code == "body_temperature":
        return 36.8 if latest else round(base + wave * 0.12, 2)
    if code == "cabin_co2":
        return 1120.0 if latest else round(base + wave * 80.0, 0)
    if code == "dose_rate":
        return 0.48 if latest else round(base + wave * 0.04, 3)
    if code == "grip_strength":
        return round(base + wave * 2.0, 1)
    if code == "pvt_mean_reaction_time":
        return round(base + wave * 9.0, 1)
    return round(base + wave, 2)


def _seed_observations(
    db: Session,
    definitions: dict[str, MeasurementDefinition],
    mission_start: datetime,
) -> None:
    for day_index in range(15):
        measured_at = mission_start + timedelta(days=day_index, hours=6)
        for code in DAILY_MEASUREMENTS:
            _add_observation(
                db,
                code=code,
                value=_value_for(code, day_index, latest=False),
                measured_at=measured_at,
                definition_row=definitions[code],
                context={"mission_day": day_index + 1},
            )
        if day_index % 7 == 0:
            for code in WEEKLY_MEASUREMENTS:
                _add_observation(
                    db,
                    code=code,
                    value=_value_for(code, day_index, latest=False),
                    measured_at=measured_at + timedelta(minutes=30),
                    definition_row=definitions[code],
                    context={"mission_day": day_index + 1, "cadence": "weekly"},
                )

    # A recent, explicitly synthetic set so the dashboard is visibly current
    # when the seed is first applied.  Identical content is never rewritten.
    latest_at = utc_now() - timedelta(hours=2)
    for code in DAILY_MEASUREMENTS:
        _add_observation(
            db,
            code=code,
            value=_value_for(code, 0, latest=True),
            measured_at=latest_at,
            definition_row=definitions[code],
            context={"mission_day": 15, "recent_synthetic_sample": True},
        )
    db.flush()


def _ensure_protocol(db: Session, effective_at: datetime) -> Protocol:
    row = db.execute(
        select(Protocol).where(
            Protocol.mission_id == MISSION_ID,
            Protocol.protocol_code == PROTOCOL_CODE,
            Protocol.version == RULE_SET_VERSION,
        )
    ).scalar_one_or_none()
    if row is not None:
        return row
    row = Protocol(
        id=_seed_id("protocol", PROTOCOL_CODE, RULE_SET_VERSION),
        mission_id=MISSION_ID,
        protocol_code=PROTOCOL_CODE,
        version=RULE_SET_VERSION,
        title="Demonstration baseline-monitoring configuration",
        description=(
            "Transparent demonstration rule configuration. Not clinical guidance and "
            "not an approved medical protocol."
        ),
        approval_status="demo_only",
        source_reference="Internal demonstration configuration; no external clinical source.",
        effective_from=effective_at,
        effective_to=None,
        configuration={
            "simulated": True,
            "purpose": "demo_only_baseline_deviation_monitoring",
            "modules": list(catalogue.ANALYSIS_MODULES),
            "rule": {
                "name": "robust_deviation_from_own_baseline",
                "center": "median_if_available_else_mean",
                "scale": "1.4826_mad_else_standard_deviation",
                "review_threshold": 2.0,
                "attention_threshold": 3.0,
                "produces_diagnosis": False,
                "uses_clinical_thresholds": False,
            },
            "limitations": [
                "Demonstration statistics only.",
                "No diagnosis, probability, or medical clearance is produced.",
            ],
        },
        change_reason="Seeded demonstration configuration for the synthetic mission.",
        created_at=effective_at,
    )
    db.add(row)
    db.flush()
    return row


def _ensure_message(db: Session, created_at: datetime) -> None:
    message_id = _seed_id("message", "daily-check-in")
    if db.get(Message, message_id) is not None:
        return
    message = Message(
        id=message_id,
        mission_id=MISSION_ID,
        astronaut_id=ASTRONAUT_ID,
        sender_user_id="medical",
        message_type="message",
        title="Demo mission: daily health check-in",
        body=(
            "This is a synthetic demonstration message, not real medical advice. "
            "Please complete the daily self-report and confirm the scheduled check-in."
        ),
        version="1",
        created_at=created_at,
        expires_at=created_at + timedelta(days=7),
        idempotency_key="seed:demo-message:daily-check-in",
        simulated=True,
    )
    db.add(message)
    db.flush()

    events = (
        ("transmitted", created_at + timedelta(minutes=1), "medical"),
        ("received_by_crew", created_at + timedelta(minutes=8), "astronaut"),
    )
    for event_type, occurred_at, actor in events:
        event_id = _seed_id("message-event", "daily-check-in", event_type)
        if db.get(MessageEvent, event_id) is not None:
            continue
        db.add(
            MessageEvent(
                id=_seed_id("message-event-row", event_type),
                event_id=event_id,
                message_id=message.id,
                actor_id=actor,
                event_type=event_type,
                client_created_at=occurred_at,
                occurred_at=occurred_at,
                recorded_at=occurred_at,
                metadata_={
                    "simulated": True,
                    "note": "Synthetic lifecycle event seeded for the demonstration.",
                },
            )
        )
    db.flush()

    feed.append_change(
        db,
        mission_id=MISSION_ID,
        entity_type="ground_message",
        entity_id=message.id,
        operation="upsert",
        actor_id="medical",
        origin="ground_console",
        payload={
            "message_id": str(message.id),
            "message_type": message.message_type,
            "title": message.title,
            "version": message.version,
            "created_at": message.created_at.isoformat(),
            "simulated": True,
        },
    )


def _ensure_analysis(db: Session, medical_user: AppUser) -> None:
    existing = db.execute(
        select(AnalysisRun).where(
            AnalysisRun.astronaut_id == ASTRONAUT_ID,
            AnalysisRun.mission_id == MISSION_ID,
        )
    ).scalars().first()
    if existing is not None:
        return
    principal = security.Principal(
        user_id=medical_user.id,
        username=medical_user.username,
        role=medical_user.role,
        mission_scopes=[security.MissionScope(MISSION_ID, None)],
        astronaut_id=None,
    )
    now = utc_now()
    body = AnalysisRunIn(
        astronaut_id=ASTRONAUT_ID,
        mission_id=MISSION_ID,
        window_start=now - timedelta(days=16),
        window_end=now + timedelta(days=1),
        modules=list(catalogue.ANALYSIS_MODULES),
        include_integrated_assessment=True,
        algorithm_version=analysis_service.ALGORITHM_VERSION,
        rule_set_version=analysis_service.RULE_SET_VERSION,
    )
    analysis_service.run_analysis(db, principal, body)


def seed_demo_data(db: Session, *, include_analysis: bool = True) -> dict[str, Any]:
    """Ensure the deterministic synthetic demo dataset exists.

    Safe to call repeatedly.  Passwords are only hashed for identities that do
    not exist yet, so reruns never rotate demo credentials silently.
    """
    if os.getenv("APP_ENV", "development").lower() in {"production", "prod"}:
        raise RuntimeError("Demo data must never be seeded into a production environment.")

    now = utc_now()

    mission = db.get(Mission, MISSION_ID)
    if mission is None:
        mission = Mission(
            id=MISSION_ID,
            mission_code=DEMO_MISSION_CODE,
            mission_name="Demo Low Earth Orbit Mission",
            mission_type="simulated_leo",
            status="active",
            start_at=now - timedelta(days=15),
            expected_end_at=now + timedelta(days=15),
            mission_metadata={
                "simulated": True,
                "purpose": "Hackathon demonstration mission; no real crew or operations.",
            },
            created_at=now - timedelta(days=20),
            change_seq=0,
        )
        db.add(mission)
        db.flush()

    astronaut = db.get(Astronaut, ASTRONAUT_ID)
    if astronaut is None:
        astronaut = Astronaut(
            id=ASTRONAUT_ID,
            astronaut_code=DEMO_ASTRONAUT_CODE,
            display_name="Demo Astronaut (Synthetic)",
            profile_metadata={
                "simulated": True,
                "note": "Synthetic crew profile for the demonstration mission.",
            },
            created_at=now - timedelta(days=20),
            updated_at=now - timedelta(days=20),
        )
        db.add(astronaut)
        db.flush()

    assignment = db.get(AstronautMission, ASSIGNMENT_ID)
    if assignment is None:
        existing_assignment = db.execute(
            select(AstronautMission).where(
                AstronautMission.astronaut_id == ASTRONAUT_ID,
                AstronautMission.mission_id == MISSION_ID,
            )
        ).scalar_one_or_none()
        if existing_assignment is None:
            db.add(
                AstronautMission(
                    id=ASSIGNMENT_ID,
                    astronaut_id=ASTRONAUT_ID,
                    mission_id=MISSION_ID,
                    role="crew_member",
                    joined_at=mission.start_at,
                    created_at=now - timedelta(days=20),
                )
            )
            db.flush()

    crew_user = _get_or_create_user(
        db, user_id=CREW_USER_ID, username="astronaut", password="crew-demo", role="crew_member"
    )
    medical_user = _get_or_create_user(
        db, user_id=MEDICAL_USER_ID, username="medical", password="ground-demo",
        role="medical_officer",
    )
    admin_user = _get_or_create_user(
        db, user_id=ADMIN_USER_ID, username="admin", password="admin-demo",
        role="administrator",
    )
    _ensure_scope(db, crew_user.id, MISSION_ID, ASTRONAUT_ID)
    _ensure_scope(db, medical_user.id, MISSION_ID, None)
    _ensure_scope(db, admin_user.id, MISSION_ID, None)

    definitions = _upsert_definitions(db)

    version = db.get(MeasurementCatalogueVersion, CATALOGUE_VERSION_ID)
    if version is None:
        version = db.execute(
            select(MeasurementCatalogueVersion).where(
                MeasurementCatalogueVersion.mission_id == MISSION_ID,
                MeasurementCatalogueVersion.version == CATALOGUE_VERSION,
            )
        ).scalar_one_or_none()
    if version is None:
        db.add(
            MeasurementCatalogueVersion(
                id=CATALOGUE_VERSION_ID,
                mission_id=MISSION_ID,
                version=CATALOGUE_VERSION,
                effective_at=now - timedelta(days=30),
                change_reason=(
                    "Seeded demonstration catalogue including the README catalogue and "
                    "explicit crew-client compatibility codes."
                ),
                definitions_snapshot=catalogue.snapshot(),
                created_by="admin",
                created_at=now - timedelta(days=30),
            )
        )
        db.flush()

    _ensure_protocol(db, now - timedelta(days=30))

    device = db.get(Device, DEVICE_ID)
    if device is None:
        db.add(
            Device(
                id=DEVICE_ID,
                astronaut_id=ASTRONAUT_ID,
                device_code="DEMO-DEVICE-001",
                device_type="wearable",
                manufacturer="Synthetic Instruments",
                model="DEMO-1",
                firmware_version="0.3.0-demo",
                device_metadata={"simulated": True},
                active=True,
                registered_at=now - timedelta(days=25),
            )
        )
        db.flush()

    client = db.get(ClientDevice, CLIENT_ID)
    if client is None:
        db.add(
            ClientDevice(
                id=CLIENT_ID,
                astronaut_id=ASTRONAUT_ID,
                mission_id=MISSION_ID,
                client_code="DEMO-CREW-CLIENT-01",
                enrolled_at=now - timedelta(days=20),
                last_contact_at=now - timedelta(minutes=5),
                active=True,
                metadata_={"simulated": True, "platform": "demo_desktop"},
            )
        )
        db.flush()

    _ensure_baselines(
        db,
        definitions,
        period_start=now - timedelta(days=45),
        period_end=now - timedelta(days=16),
    )
    _seed_observations(db, definitions, mission.start_at or now - timedelta(days=15))

    session_exists = db.execute(
        select(CommunicationSession).where(CommunicationSession.client_id == CLIENT_ID)
    ).scalars().first()
    if session_exists is None:
        db.add(
            CommunicationSession(
                id=_seed_id("communication-session", "initial"),
                client_id=CLIENT_ID,
                observed_at=now - timedelta(minutes=5),
                state="DELAYED",
                last_successful_contact_at=now - timedelta(minutes=5),
                last_push_at=now - timedelta(minutes=12),
                last_pull_at=now - timedelta(minutes=5),
                queued_event_count=2,
                estimated_delay_seconds=480,
                details={
                    "simulated": True,
                    "note": "Synthetic adapter state reported by the demo crew client.",
                    "source": "demo-seed-0.3.0",
                },
            )
        )
        db.flush()

    _ensure_message(db, now - timedelta(hours=3))

    if include_analysis:
        _ensure_analysis(db, medical_user)

    db.commit()
    return {
        "mission_id": str(MISSION_ID),
        "astronaut_id": str(ASTRONAUT_ID),
        "client_id": str(CLIENT_ID),
        "catalogue_version": CATALOGUE_VERSION,
        "protocol_version": RULE_SET_VERSION,
        "simulated": True,
    }
