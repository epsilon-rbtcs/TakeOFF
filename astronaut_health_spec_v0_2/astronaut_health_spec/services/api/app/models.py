"""SQLAlchemy mappings for the ground PostgreSQL schema (v0.3).

The DDL in ``schema.sql`` is the source of truth.  These mappings exist for
typed queries and inserts; database constraints (including the composite
mission/astronaut foreign keys) are enforced by PostgreSQL itself.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .util import utc_now

UUIDType = UUID(as_uuid=True)


class Astronaut(Base):
    __tablename__ = "astronauts"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    profile_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    mission_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    mission_name: Mapped[str] = mapped_column(Text, nullable=False)
    mission_type: Mapped[str] = mapped_column(Text, nullable=False, default="exploration")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="planned")
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mission_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    change_seq: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)


class AstronautMission(Base):
    __tablename__ = "astronaut_missions"
    __table_args__ = (UniqueConstraint("astronaut_id", "mission_id", name="uq_astronaut_mission"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("astronauts.id", ondelete="RESTRICT"), nullable=False
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("missions.id", ondelete="RESTRICT"), nullable=False
    )
    role: Mapped[str] = mapped_column(Text, nullable=False, default="crew_member")
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class UserMissionScope(Base):
    __tablename__ = "user_mission_scopes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_user_scope_assignment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("missions.id", ondelete="RESTRICT"), nullable=False
    )
    astronaut_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)


class MeasurementDefinition(Base):
    __tablename__ = "measurement_definitions"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    domain_code: Mapped[str] = mapped_column(Text, nullable=False)
    value_type: Mapped[str] = mapped_column(Text, nullable=False)
    canonical_unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    allowed_units: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    allowed_source_types: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sampling_guidance: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_schema: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class MeasurementCatalogueVersion(Base):
    __tablename__ = "measurement_catalogue_versions"
    __table_args__ = (UniqueConstraint("mission_id", "version", name="uq_catalogue_version"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("missions.id", ondelete="RESTRICT"), nullable=False
    )
    version: Mapped[str] = mapped_column(Text, nullable=False)
    effective_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    change_reason: Mapped[str] = mapped_column(Text, nullable=False)
    definitions_snapshot: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_by: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("astronauts.id", ondelete="RESTRICT"), nullable=True
    )
    device_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    device_type: Mapped[str] = mapped_column(Text, nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(Text, nullable=True)
    firmware_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        UniqueConstraint("astronaut_id", "source_type", "idempotency_key", name="uq_observation_idempotency"),
        UniqueConstraint("id", "astronaut_id", "mission_id", name="uq_observation_scope"),
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_observation_assignment",
        ),
        ForeignKeyConstraint(
            ["mission_id", "catalogue_version"],
            ["measurement_catalogue_versions.mission_id", "measurement_catalogue_versions.version"],
            ondelete="RESTRICT",
            name="fk_observation_catalogue",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    measurement_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("measurement_definitions.id", ondelete="RESTRICT"), nullable=False
    )
    catalogue_version: Mapped[str] = mapped_column(Text, nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    device_time_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    clock_quality: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    client_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    value_numeric: Mapped[float | None] = mapped_column(nullable=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    value_json: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    original_unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    canonical_value_numeric: Mapped[float | None] = mapped_column(nullable=True)
    canonical_unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True
    )
    source_external_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_status: Mapped[str] = mapped_column(Text, nullable=False, default="unknown")
    quality_score: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    quality_details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    context: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    idempotency_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    correction_of: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("observations.id", ondelete="RESTRICT"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class HealthBaseline(Base):
    __tablename__ = "health_baselines"
    __table_args__ = (
        UniqueConstraint(
            "astronaut_id", "mission_id", "measurement_definition_id", "baseline_scope", "version",
            name="uq_baseline_version_scope",
        ),
        UniqueConstraint(
            "id", "astronaut_id", "measurement_definition_id", "version", name="uq_baseline_identity"
        ),
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_baseline_assignment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    measurement_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("measurement_definitions.id", ondelete="RESTRICT"), nullable=False
    )
    baseline_scope: Mapped[str] = mapped_column(Text, nullable=False, default="preflight")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="provisional")
    method: Mapped[str] = mapped_column(Text, nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False)
    mean: Mapped[float | None] = mapped_column(nullable=True)
    standard_deviation: Mapped[float | None] = mapped_column(nullable=True)
    median: Mapped[float | None] = mapped_column(nullable=True)
    mad: Mapped[float | None] = mapped_column(nullable=True)
    minimum: Mapped[float | None] = mapped_column(nullable=True)
    maximum: Mapped[float | None] = mapped_column(nullable=True)
    canonical_unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class Protocol(Base):
    __tablename__ = "protocols"
    __table_args__ = (UniqueConstraint("mission_id", "protocol_code", "version", name="uq_protocol_version"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("missions.id", ondelete="RESTRICT"), nullable=False
    )
    protocol_code: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[str] = mapped_column(Text, nullable=False, default="demo_only")
    source_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    configuration: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    change_reason: Mapped[str] = mapped_column(Text, nullable=False, default="seeded demo configuration")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_analysis_run_assignment",
        ),
        UniqueConstraint("id", "astronaut_id", "mission_id", name="uq_analysis_run_scope"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    requested_by: Mapped[str] = mapped_column(Text, nullable=False)
    execution_location: Mapped[str] = mapped_column(Text, nullable=False)
    algorithm_version: Mapped[str] = mapped_column(Text, nullable=False)
    rule_set_version: Mapped[str] = mapped_column(Text, nullable=False)
    input_snapshot_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    implementation_build: Mapped[str] = mapped_column(Text, nullable=False)
    output_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    error_code: Mapped[str | None] = mapped_column(Text, nullable=True)


class ModuleAssessment(Base):
    __tablename__ = "module_assessments"
    __table_args__ = (
        UniqueConstraint("id", "astronaut_id", "mission_id", name="uq_module_assessment_scope"),
        UniqueConstraint("id", "algorithm_version", "rule_set_version", name="uq_module_assessment_versions"),
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_module_assessment_assignment",
        ),
        ForeignKeyConstraint(
            ["analysis_run_id", "astronaut_id", "mission_id"],
            ["analysis_runs.id", "analysis_runs.astronaut_id", "analysis_runs.mission_id"],
            ondelete="RESTRICT",
            name="fk_module_run_scope",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    module_code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    window_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    algorithm_version: Mapped[str] = mapped_column(Text, nullable=False)
    rule_set_version: Mapped[str] = mapped_column(Text, nullable=False)
    protocol_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("protocols.id", ondelete="RESTRICT"), nullable=True
    )
    data_sufficiency: Mapped[str] = mapped_column(Text, nullable=False, default="unknown")
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    limitations: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    analysis_run_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)


class AssessmentFinding(Base):
    __tablename__ = "assessment_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    module_assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("module_assessments.id", ondelete="CASCADE"), nullable=False
    )
    measurement_definition_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("measurement_definitions.id", ondelete="RESTRICT"), nullable=True
    )
    finding_code: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    direction: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_value: Mapped[float | None] = mapped_column(nullable=True)
    baseline_value: Mapped[float | None] = mapped_column(nullable=True)
    delta_value: Mapped[float | None] = mapped_column(nullable=True)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class AssessmentInput(Base):
    __tablename__ = "assessment_inputs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["module_assessment_id", "astronaut_id", "mission_id"],
            ["module_assessments.id", "module_assessments.astronaut_id", "module_assessments.mission_id"],
            ondelete="CASCADE",
            name="fk_assessment_input_module",
        ),
        ForeignKeyConstraint(
            ["observation_id", "astronaut_id", "mission_id"],
            ["observations.id", "observations.astronaut_id", "observations.mission_id"],
            ondelete="RESTRICT",
            name="fk_assessment_input_observation",
        ),
    )

    module_assessment_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    observation_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    input_role: Mapped[str] = mapped_column(Text, nullable=False, default="evidence")


class AssessmentBaseline(Base):
    __tablename__ = "assessment_baselines"
    __table_args__ = (
        ForeignKeyConstraint(
            ["module_assessment_id", "astronaut_id", "mission_id"],
            ["module_assessments.id", "module_assessments.astronaut_id", "module_assessments.mission_id"],
            ondelete="CASCADE",
            name="fk_assessment_baseline_module",
        ),
        ForeignKeyConstraint(
            ["baseline_id", "astronaut_id", "measurement_definition_id", "baseline_version"],
            [
                "health_baselines.id",
                "health_baselines.astronaut_id",
                "health_baselines.measurement_definition_id",
                "health_baselines.version",
            ],
            ondelete="RESTRICT",
            name="fk_assessment_baseline_version",
        ),
    )

    module_assessment_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    baseline_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    measurement_definition_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    baseline_version: Mapped[int] = mapped_column(Integer, nullable=False)


class IntegratedAssessment(Base):
    __tablename__ = "integrated_assessments"
    __table_args__ = (
        UniqueConstraint("id", "astronaut_id", "mission_id", name="uq_integrated_assessment_scope"),
        UniqueConstraint("id", "algorithm_version", "rule_set_version", name="uq_integrated_assessment_versions"),
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_integrated_assessment_assignment",
        ),
        ForeignKeyConstraint(
            ["analysis_run_id", "astronaut_id", "mission_id"],
            ["analysis_runs.id", "analysis_runs.astronaut_id", "analysis_runs.mission_id"],
            ondelete="RESTRICT",
            name="fk_integrated_run_scope",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    algorithm_version: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    uncertainty_notes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    rule_set_version: Mapped[str] = mapped_column(Text, nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    analysis_run_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)


class IntegratedAssessmentComponent(Base):
    __tablename__ = "integrated_assessment_components"
    __table_args__ = (
        ForeignKeyConstraint(
            ["integrated_assessment_id", "astronaut_id", "mission_id"],
            ["integrated_assessments.id", "integrated_assessments.astronaut_id", "integrated_assessments.mission_id"],
            ondelete="CASCADE",
            name="fk_component_integrated",
        ),
        ForeignKeyConstraint(
            ["module_assessment_id", "astronaut_id", "mission_id"],
            ["module_assessments.id", "module_assessments.astronaut_id", "module_assessments.mission_id"],
            ondelete="RESTRICT",
            name="fk_component_module",
        ),
        ForeignKeyConstraint(
            ["integrated_assessment_id", "algorithm_version", "rule_set_version"],
            [
                "integrated_assessments.id",
                "integrated_assessments.algorithm_version",
                "integrated_assessments.rule_set_version",
            ],
            ondelete="CASCADE",
            name="fk_component_integrated_versions",
        ),
        ForeignKeyConstraint(
            ["module_assessment_id", "algorithm_version", "rule_set_version"],
            ["module_assessments.id", "module_assessments.algorithm_version", "module_assessments.rule_set_version"],
            ondelete="RESTRICT",
            name="fk_component_module_versions",
        ),
    )

    integrated_assessment_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    module_assessment_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    algorithm_version: Mapped[str] = mapped_column(Text, nullable=False)
    rule_set_version: Mapped[str] = mapped_column(Text, nullable=False)
    contribution_role: Mapped[str] = mapped_column(Text, nullable=False, default="context")


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        UniqueConstraint("id", "astronaut_id", "mission_id", name="uq_alert_scope"),
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_alert_assignment",
        ),
        ForeignKeyConstraint(
            ["integrated_assessment_id", "astronaut_id", "mission_id"],
            ["integrated_assessments.id", "integrated_assessments.astronaut_id", "integrated_assessments.mission_id"],
            ondelete="RESTRICT",
            name="fk_alert_integrated",
        ),
        ForeignKeyConstraint(
            ["module_assessment_id", "astronaut_id", "mission_id"],
            ["module_assessments.id", "module_assessments.astronaut_id", "module_assessments.mission_id"],
            ondelete="RESTRICT",
            name="fk_alert_module",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    integrated_assessment_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    module_assessment_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    alert_code: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    provenance: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class RecommendedAction(Base):
    __tablename__ = "recommended_actions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_action_assignment",
        ),
        ForeignKeyConstraint(
            ["alert_id", "astronaut_id", "mission_id"],
            ["alerts.id", "alerts.astronaut_id", "alerts.mission_id"],
            ondelete="RESTRICT",
            name="fk_action_alert",
        ),
        ForeignKeyConstraint(
            ["module_assessment_id", "astronaut_id", "mission_id"],
            ["module_assessments.id", "module_assessments.astronaut_id", "module_assessments.mission_id"],
            ondelete="RESTRICT",
            name="fk_action_module",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    alert_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    module_assessment_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    protocol_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("protocols.id", ondelete="RESTRICT"), nullable=True
    )
    action_type: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(Text, nullable=False, default="normal")
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    demo_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class ActionEvent(Base):
    __tablename__ = "action_events"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUIDType, unique=True, nullable=False)
    action_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("recommended_actions.id", ondelete="RESTRICT"), nullable=False
    )
    actor_code: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    result_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUIDType, unique=True, nullable=False)
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("alerts.id", ondelete="RESTRICT"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    result_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_audit_assignment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    actor_id: Mapped[str] = mapped_column(Text, nullable=False)
    actor_role: Mapped[str] = mapped_column(Text, nullable=False)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    astronaut_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class ChangeFeed(Base):
    __tablename__ = "change_feed"
    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id"], ["client_devices.id"], ondelete="RESTRICT", name="fk_change_feed_client"
        ),
    )

    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    sequence: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    event_id: Mapped[uuid.UUID] = mapped_column(UUIDType, unique=True, nullable=False)
    client_id: Mapped[uuid.UUID | None] = mapped_column(UUIDType, nullable=True)
    actor_id: Mapped[str] = mapped_column(Text, nullable=False)
    origin: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    operation: Mapped[str] = mapped_column(Text, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    server_received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    payload_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expected_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)


class ClientDevice(Base):
    __tablename__ = "client_devices"
    __table_args__ = (
        UniqueConstraint("id", "mission_id", name="uq_client_device_mission"),
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_client_device_assignment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("astronauts.id", ondelete="RESTRICT"), nullable=False
    )
    mission_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("missions.id", ondelete="RESTRICT"), nullable=False
    )
    client_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    last_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)


class SyncBatch(Base):
    __tablename__ = "sync_batches"

    client_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    payload_hash: Mapped[str] = mapped_column(Text, nullable=False)
    response_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class SyncEvent(Base):
    __tablename__ = "sync_events"
    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id", "mission_id"],
            ["client_devices.id", "client_devices.mission_id"],
            ondelete="RESTRICT",
            name="fk_sync_event_device",
        ),
        ForeignKeyConstraint(
            ["client_id", "batch_id"],
            ["sync_batches.client_id", "sync_batches.batch_id"],
            ondelete="RESTRICT",
            name="fk_sync_event_batch",
        ),
    )

    event_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    actor_id: Mapped[str] = mapped_column(Text, nullable=False)
    origin: Mapped[str] = mapped_column(Text, nullable=False, default="crew_client")
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    operation: Mapped[str] = mapped_column(Text, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    expected_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    payload_hash: Mapped[str] = mapped_column(Text, nullable=False)
    result_status: Mapped[str] = mapped_column(Text, nullable=False)
    result_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class SyncCursor(Base):
    __tablename__ = "sync_cursors"
    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id", "mission_id"],
            ["client_devices.id", "client_devices.mission_id"],
            ondelete="CASCADE",
            name="fk_sync_cursor_device",
        ),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True)
    last_sequence: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


class CommunicationSession(Base):
    __tablename__ = "communication_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("client_devices.id", ondelete="RESTRICT"), nullable=False
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    last_successful_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_push_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_pull_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    queued_event_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_delay_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        ForeignKeyConstraint(
            ["astronaut_id", "mission_id"],
            ["astronaut_missions.astronaut_id", "astronaut_missions.mission_id"],
            ondelete="RESTRICT",
            name="fk_message_assignment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    mission_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    astronaut_id: Mapped[uuid.UUID] = mapped_column(UUIDType, nullable=False)
    sender_user_id: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class MessageEvent(Base):
    __tablename__ = "message_events"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUIDType, unique=True, nullable=False)
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("messages.id", ondelete="RESTRICT"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    client_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
