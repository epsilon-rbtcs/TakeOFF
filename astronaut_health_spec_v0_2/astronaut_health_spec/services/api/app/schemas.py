"""Pydantic request/response models mirroring ``openapi.yaml``.

Response payloads are returned as plain dictionaries so that additive,
documented fields can be included without breaking the published contract.
Request models validate structure; domain-specific checks (assignment,
catalogue version, units, revisions) live in the service layer so they can
return the stable error codes required by the specification.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["crew_member", "medical_officer", "administrator"]
MessageType = Literal["message", "update", "notification"]
MessageEventType = Literal[
    "transmitted", "received_by_ground", "received_by_crew", "read", "withdrawn", "expired"
]
ActionEventType = Literal[
    "started", "completed", "skipped", "deferred", "cancelled", "note_added"
]
AlertStatus = Literal["open", "acknowledged", "resolved", "dismissed"]
ActionStatus = Literal[
    "pending", "in_progress", "completed", "deferred", "skipped", "cancelled"
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class DemoTokenIn(StrictModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=256)


class DemoTokenOut(StrictModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    role: Role
    mission_ids: list[uuid.UUID]
    astronaut_id: uuid.UUID | None


class ClockQuality(StrictModel):
    status: Literal["good", "degraded", "unknown"] = "unknown"
    offset_estimate_ms: float | None = None
    uncertainty_ms: float | None = Field(default=None, ge=0)
    reference_at: datetime | None = None
    method: str | None = None


class SourceIn(StrictModel):
    type: str
    device_id: uuid.UUID | None = None
    external_id: str | None = Field(default=None, max_length=500)


class QualityIn(StrictModel):
    status: str = "unknown"
    score: float | None = Field(default=None, ge=0, le=1)
    details: dict[str, Any] = Field(default_factory=dict)


class ObservationIn(StrictModel):
    observation_id: uuid.UUID
    astronaut_id: uuid.UUID
    mission_id: uuid.UUID
    measurement_code: str = Field(min_length=1, max_length=120)
    catalogue_version: str = Field(min_length=1, max_length=120)
    value: Any
    unit: str | None = Field(default=None, max_length=80)
    measured_at: datetime
    created_at: datetime
    device_time_raw: str | None = Field(default=None, max_length=500)
    clock_quality: ClockQuality = Field(default_factory=ClockQuality)
    source: SourceIn
    quality: QualityIn = Field(default_factory=QualityIn)
    context: dict[str, Any] = Field(default_factory=dict)
    simulated: bool = False
    idempotency_key: str | None = Field(default=None, max_length=200)


class ObservationBatchItem(StrictModel):
    observation_id: uuid.UUID
    astronaut_id: uuid.UUID | None = None
    mission_id: uuid.UUID | None = None
    measurement_code: str
    catalogue_version: str
    value: Any
    unit: str | None = None
    measured_at: datetime
    created_at: datetime
    device_time_raw: str | None = None
    clock_quality: ClockQuality = Field(default_factory=ClockQuality)
    source: SourceIn
    quality: QualityIn = Field(default_factory=QualityIn)
    context: dict[str, Any] = Field(default_factory=dict)
    simulated: bool = False
    idempotency_key: str | None = Field(default=None, max_length=200)


class ObservationBatchIn(StrictModel):
    astronaut_id: uuid.UUID
    mission_id: uuid.UUID
    observations: list[ObservationBatchItem] = Field(min_length=1, max_length=500)


class MeasurementDefinitionIn(StrictModel):
    code: str
    display_name: str
    domain_code: str
    value_type: Literal["numeric", "integer", "text", "boolean", "object"]
    canonical_unit: str | None = None
    allowed_units: list[str] = Field(default_factory=list)
    allowed_source_types: list[str] = Field(default_factory=list)
    description: str | None = None
    sampling_guidance: str | None = None
    context_schema: dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class MeasurementCatalogueVersionIn(StrictModel):
    mission_id: uuid.UUID
    version: str = Field(min_length=1, max_length=120)
    effective_at: datetime
    changes: list[MeasurementDefinitionIn] = Field(min_length=1)
    change_reason: str = Field(min_length=1, max_length=2000)


class ProtocolVersionIn(StrictModel):
    mission_id: uuid.UUID
    protocol_code: str = Field(min_length=1, max_length=120)
    version: str = Field(min_length=1, max_length=120)
    approval_status: Literal["demo_only", "approved", "retired"]
    source_reference: str | None = None
    effective_at: datetime
    content: dict[str, Any]
    change_reason: str = Field(min_length=1, max_length=2000)


class SyncEventIn(StrictModel):
    event_id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    operation: str = "upsert"
    schema_version: int = Field(ge=1)
    client_id: uuid.UUID | None = None
    mission_id: uuid.UUID
    actor_id: str | None = None
    origin: str | None = None
    created_at: datetime
    server_sequence: int | None = None
    payload_hash: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    expected_revision: int | None = Field(default=None, ge=1)
    payload: dict[str, Any] = Field(default_factory=dict)


class SyncPushIn(StrictModel):
    batch_id: uuid.UUID
    events: list[SyncEventIn] = Field(min_length=1, max_length=500)


class MessageIn(StrictModel):
    mission_id: uuid.UUID
    astronaut_id: uuid.UUID
    message_type: MessageType
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    version: str | None = Field(default=None, max_length=120)
    expires_at: datetime | None = None


class MessageEventIn(StrictModel):
    event_type: MessageEventType
    client_created_at: datetime


class AlertAcknowledgementIn(StrictModel):
    note: str | None = Field(default=None, max_length=2000)
    expected_revision: int = Field(ge=1)


class ActionCreateIn(StrictModel):
    mission_id: uuid.UUID
    astronaut_id: uuid.UUID
    alert_id: uuid.UUID | None = None
    module_assessment_id: uuid.UUID | None = None
    protocol_id: uuid.UUID | None = None
    action_type: Literal[
        "repeat_measurement", "complete_assessment", "review_protocol",
        "contact_medical_officer", "scheduled_test", "informational",
    ]
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    due_at: datetime | None = None
    demo_only: bool = True


class ActionUpdateIn(StrictModel):
    expected_revision: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    priority: Literal["low", "normal", "high", "urgent"] | None = None
    due_at: datetime | None = None
    status: ActionStatus | None = None
    note: str | None = Field(default=None, max_length=2000)


class ActionEventIn(StrictModel):
    event_type: ActionEventType
    note: str | None = Field(default=None, max_length=2000)
    expected_revision: int = Field(ge=1)
    client_created_at: datetime | None = None


class AnalysisRunIn(StrictModel):
    astronaut_id: uuid.UUID
    mission_id: uuid.UUID
    window_start: datetime
    window_end: datetime
    modules: list[str] = Field(min_length=1)
    include_integrated_assessment: bool = True
    algorithm_version: str
    rule_set_version: str


class AlertEventIn(StrictModel):
    """Additive documented extension for explicit resolve/dismiss history."""

    event_type: Literal["acknowledged", "resolved", "dismissed"]
    note: str | None = Field(default=None, max_length=2000)
    expected_revision: int = Field(ge=1)
    client_created_at: datetime | None = None
