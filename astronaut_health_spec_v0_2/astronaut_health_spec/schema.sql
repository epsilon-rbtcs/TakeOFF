-- Astronaut Health Monitoring & Decision-Support System
-- Ground PostgreSQL schema v0.3 — dual-client hackathon foundation
-- This DDL models data and provenance; clinical/mission rules remain in versioned application configuration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE astronauts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_code TEXT NOT NULL UNIQUE,
    mission_name TEXT NOT NULL,
    mission_type TEXT NOT NULL DEFAULT 'exploration',
    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    start_at TIMESTAMPTZ,
    expected_end_at TIMESTAMPTZ,
    mission_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expected_end_at IS NULL OR start_at IS NULL OR expected_end_at > start_at),
    change_seq BIGINT NOT NULL DEFAULT 0 CHECK (change_seq >= 0)
);

CREATE TABLE astronaut_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE RESTRICT,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT 'crew_member',
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (astronaut_id, mission_id),
    CHECK (left_at IS NULL OR joined_at IS NULL OR left_at >= joined_at)
);

-- Hackathon-only local identities. Replace with an approved identity provider
-- before any operational use; bearer signing keys remain deployment secrets.
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('crew_member','medical_officer','administrator')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_mission_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    astronaut_id UUID,
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX uq_user_mission_scope_astronaut
    ON user_mission_scopes(user_id, mission_id, astronaut_id) WHERE astronaut_id IS NOT NULL;
CREATE UNIQUE INDEX uq_user_mission_scope_mission
    ON user_mission_scopes(user_id, mission_id) WHERE astronaut_id IS NULL;

CREATE TABLE measurement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    domain_code TEXT NOT NULL CHECK (domain_code IN (
        'cardiovascular', 'behavioural_cognitive', 'immune',
        'musculoskeletal', 'radiation', 'environmental', 'data_quality'
    )),
    value_type TEXT NOT NULL CHECK (value_type IN ('numeric', 'integer', 'text', 'boolean', 'object')),
    canonical_unit TEXT,
    allowed_units TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    allowed_source_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    description TEXT,
    sampling_guidance TEXT,
    context_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE measurement_catalogue_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    version TEXT NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    change_reason TEXT NOT NULL,
    definitions_snapshot JSONB NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (mission_id, version)
);

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID REFERENCES astronauts(id) ON DELETE RESTRICT,
    device_code TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL CHECK (device_type IN (
        'wearable', 'medical_device', 'environmental_sensor', 'dosimeter', 'other'
    )),
    manufacturer TEXT,
    model TEXT,
    firmware_version TEXT,
    device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    measurement_definition_id UUID NOT NULL REFERENCES measurement_definitions(id) ON DELETE RESTRICT,
    catalogue_version TEXT NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    device_time_raw TEXT,
    clock_quality JSONB NOT NULL DEFAULT '{"status":"unknown"}'::jsonb,
    client_created_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    value_numeric DOUBLE PRECISION,
    value_text TEXT,
    value_boolean BOOLEAN,
    value_json JSONB,
    original_unit TEXT,
    canonical_value_numeric DOUBLE PRECISION,
    canonical_unit TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'wearable', 'medical_device', 'laboratory', 'manual',
        'environmental_sensor', 'dosimeter', 'cognitive_task', 'import', 'simulation'
    )),
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    source_external_id TEXT,
    quality_status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (quality_status IN ('valid', 'questionable', 'invalid', 'unknown')),
    quality_score NUMERIC(5,4) CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    quality_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    simulated BOOLEAN NOT NULL DEFAULT FALSE,
    idempotency_key TEXT,
    correction_of UUID REFERENCES observations(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Exactly one representation of the observed value should be populated.
    CHECK (num_nonnulls(value_numeric, value_text, value_boolean, value_json) = 1),
    UNIQUE (astronaut_id, source_type, idempotency_key)
    ,UNIQUE (id, astronaut_id, mission_id)
    ,FOREIGN KEY (mission_id, catalogue_version) REFERENCES measurement_catalogue_versions(mission_id, version) ON DELETE RESTRICT
    ,FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE INDEX idx_observations_astronaut_measurement_time
    ON observations (astronaut_id, measurement_definition_id, measured_at DESC);
CREATE INDEX idx_observations_mission_time
    ON observations (mission_id, measured_at DESC);
CREATE INDEX idx_observations_quality_time
    ON observations (quality_status, measured_at DESC);
CREATE INDEX idx_observations_context_gin ON observations USING GIN (context);

CREATE TABLE health_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE RESTRICT,
    mission_id UUID REFERENCES missions(id) ON DELETE RESTRICT,
    measurement_definition_id UUID NOT NULL REFERENCES measurement_definitions(id) ON DELETE RESTRICT,
    baseline_scope TEXT NOT NULL DEFAULT 'preflight'
        CHECK (baseline_scope IN ('preflight', 'inflight', 'reference')),
    status TEXT NOT NULL DEFAULT 'provisional'
        CHECK (status IN ('provisional', 'active', 'retired')),
    method TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    sample_count INTEGER NOT NULL CHECK (sample_count >= 0),
    mean DOUBLE PRECISION,
    standard_deviation DOUBLE PRECISION CHECK (standard_deviation IS NULL OR standard_deviation >= 0),
    median DOUBLE PRECISION,
    mad DOUBLE PRECISION CHECK (mad IS NULL OR mad >= 0),
    minimum DOUBLE PRECISION,
    maximum DOUBLE PRECISION,
    canonical_unit TEXT,
    version INTEGER NOT NULL CHECK (version > 0),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at TIMESTAMPTZ,
    source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (period_end >= period_start),
    CHECK (minimum IS NULL OR maximum IS NULL OR minimum <= maximum),
    UNIQUE (astronaut_id, mission_id, measurement_definition_id, baseline_scope, version)
    ,UNIQUE (id, astronaut_id, measurement_definition_id, version)
    ,FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE INDEX idx_baselines_active
    ON health_baselines (astronaut_id, measurement_definition_id, status)
    WHERE status = 'active';

CREATE TABLE protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    protocol_code TEXT NOT NULL,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    approval_status TEXT NOT NULL DEFAULT 'demo_only'
        CHECK (approval_status IN ('draft', 'demo_only', 'approved', 'retired')),
    source_reference TEXT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    change_reason TEXT NOT NULL DEFAULT 'seeded demo configuration',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (mission_id, protocol_code, version),
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE TABLE module_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    module_code TEXT NOT NULL CHECK (module_code IN (
        'cardiovascular', 'behavioural_cognitive', 'immune',
        'musculoskeletal', 'radiation', 'environmental', 'data_quality'
    )),
    status TEXT NOT NULL CHECK (status IN (
        'normal', 'monitor', 'attention', 'urgent', 'insufficient_data', 'data_quality_issue'
    )),
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,
    algorithm_version TEXT NOT NULL,
    rule_set_version TEXT NOT NULL,
    protocol_id UUID REFERENCES protocols(id) ON DELETE RESTRICT,
    data_sufficiency TEXT NOT NULL DEFAULT 'unknown'
        CHECK (data_sufficiency IN ('sufficient', 'partial', 'insufficient', 'unknown')),
    summary TEXT NOT NULL,
    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
    simulated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (window_end IS NULL OR window_start IS NULL OR window_end >= window_start),
    UNIQUE (id, astronaut_id, mission_id),
    UNIQUE (id, algorithm_version, rule_set_version),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE INDEX idx_module_assessments_latest
    ON module_assessments (astronaut_id, mission_id, module_code, assessed_at DESC);

CREATE TABLE assessment_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_assessment_id UUID NOT NULL REFERENCES module_assessments(id) ON DELETE CASCADE,
    measurement_definition_id UUID REFERENCES measurement_definitions(id) ON DELETE RESTRICT,
    finding_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'moderate', 'high', 'critical')),
    direction TEXT CHECK (direction IN ('increasing', 'decreasing', 'variable', 'unchanged', 'not_applicable')),
    current_value DOUBLE PRECISION,
    baseline_value DOUBLE PRECISION,
    delta_value DOUBLE PRECISION,
    unit TEXT,
    explanation TEXT NOT NULL,
    evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assessment_inputs (
    module_assessment_id UUID NOT NULL,
    observation_id UUID NOT NULL,
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    input_role TEXT NOT NULL DEFAULT 'evidence'
        CHECK (input_role IN ('evidence', 'context', 'excluded_quality')),
    PRIMARY KEY (module_assessment_id, observation_id),
    FOREIGN KEY (module_assessment_id, astronaut_id, mission_id)
        REFERENCES module_assessments(id, astronaut_id, mission_id) ON DELETE CASCADE,
    FOREIGN KEY (observation_id, astronaut_id, mission_id)
        REFERENCES observations(id, astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE TABLE assessment_baselines (
    module_assessment_id UUID NOT NULL,
    baseline_id UUID NOT NULL,
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    measurement_definition_id UUID NOT NULL REFERENCES measurement_definitions(id) ON DELETE RESTRICT,
    baseline_version INTEGER NOT NULL,
    PRIMARY KEY (module_assessment_id, baseline_id),
    FOREIGN KEY (module_assessment_id, astronaut_id, mission_id)
        REFERENCES module_assessments(id, astronaut_id, mission_id) ON DELETE CASCADE,
    FOREIGN KEY (baseline_id, astronaut_id, measurement_definition_id, baseline_version)
        REFERENCES health_baselines(id, astronaut_id, measurement_definition_id, version) ON DELETE RESTRICT
);

CREATE TABLE integrated_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'normal', 'monitor', 'attention', 'urgent', 'insufficient_data', 'data_quality_issue'
    )),
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    algorithm_version TEXT NOT NULL,
    summary TEXT NOT NULL,
    uncertainty_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    rule_set_version TEXT NOT NULL,
    simulated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    ,UNIQUE (id, astronaut_id, mission_id)
    ,UNIQUE (id, algorithm_version, rule_set_version)
    ,FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE INDEX idx_integrated_assessments_latest
    ON integrated_assessments (astronaut_id, mission_id, assessed_at DESC);

CREATE TABLE integrated_assessment_components (
    integrated_assessment_id UUID NOT NULL,
    module_assessment_id UUID NOT NULL,
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    algorithm_version TEXT NOT NULL,
    rule_set_version TEXT NOT NULL,
    contribution_role TEXT NOT NULL DEFAULT 'context'
        CHECK (contribution_role IN ('contributing', 'context', 'independent_escalation', 'insufficient_data')),
    PRIMARY KEY (integrated_assessment_id, module_assessment_id),
    FOREIGN KEY (integrated_assessment_id, astronaut_id, mission_id)
        REFERENCES integrated_assessments(id, astronaut_id, mission_id) ON DELETE CASCADE,
    FOREIGN KEY (module_assessment_id, astronaut_id, mission_id)
        REFERENCES module_assessments(id, astronaut_id, mission_id) ON DELETE RESTRICT,
    FOREIGN KEY (integrated_assessment_id, algorithm_version, rule_set_version)
        REFERENCES integrated_assessments(id, algorithm_version, rule_set_version) ON DELETE CASCADE,
    FOREIGN KEY (module_assessment_id, algorithm_version, rule_set_version)
        REFERENCES module_assessments(id, algorithm_version, rule_set_version) ON DELETE RESTRICT
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    integrated_assessment_id UUID REFERENCES integrated_assessments(id) ON DELETE RESTRICT,
    module_assessment_id UUID REFERENCES module_assessments(id) ON DELETE RESTRICT,
    alert_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'moderate', 'high', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    resolved_at TIMESTAMPTZ,
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    CHECK (integrated_assessment_id IS NOT NULL OR module_assessment_id IS NOT NULL),
    UNIQUE (id, astronaut_id, mission_id),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT,
    FOREIGN KEY (integrated_assessment_id, astronaut_id, mission_id)
        REFERENCES integrated_assessments(id, astronaut_id, mission_id) ON DELETE RESTRICT,
    FOREIGN KEY (module_assessment_id, astronaut_id, mission_id)
        REFERENCES module_assessments(id, astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE INDEX idx_alerts_open_by_astronaut
    ON alerts (astronaut_id, created_at DESC)
    WHERE status IN ('open', 'acknowledged');

CREATE TABLE recommended_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    alert_id UUID REFERENCES alerts(id) ON DELETE RESTRICT,
    module_assessment_id UUID REFERENCES module_assessments(id) ON DELETE RESTRICT,
    protocol_id UUID REFERENCES protocols(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'repeat_measurement', 'complete_assessment', 'review_protocol',
        'contact_medical_officer', 'scheduled_test', 'informational'
    )),
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred', 'skipped', 'cancelled')),
    demo_only BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT,
    FOREIGN KEY (alert_id, astronaut_id, mission_id) REFERENCES alerts(id, astronaut_id, mission_id) ON DELETE RESTRICT,
    FOREIGN KEY (module_assessment_id, astronaut_id, mission_id)
        REFERENCES module_assessments(id, astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE INDEX idx_actions_pending_by_astronaut
    ON recommended_actions (astronaut_id, due_at)
    WHERE status IN ('pending', 'in_progress', 'deferred');

CREATE TABLE action_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE,
    action_id UUID NOT NULL REFERENCES recommended_actions(id) ON DELETE RESTRICT,
    actor_code TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'started', 'completed', 'skipped', 'deferred', 'cancelled', 'note_added'
    )),
    note TEXT,
    client_created_at TIMESTAMPTZ,
    expected_revision INTEGER NOT NULL CHECK (expected_revision > 0),
    result_revision INTEGER NOT NULL CHECK (result_revision > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE,
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('acknowledged','resolved','dismissed')),
    note TEXT,
    client_created_at TIMESTAMPTZ,
    expected_revision INTEGER NOT NULL CHECK (expected_revision > 0),
    result_revision INTEGER NOT NULL CHECK (result_revision > 0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    requested_by TEXT NOT NULL,
    execution_location TEXT NOT NULL CHECK (execution_location IN ('crew_local','ground_backend')),
    algorithm_version TEXT NOT NULL,
    rule_set_version TEXT NOT NULL,
    input_snapshot_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed','failed')),
    implementation_build TEXT NOT NULL,
    output_hash TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    error_code TEXT,
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT,
    UNIQUE (id, astronaut_id, mission_id),
    CHECK (completed_at >= started_at)
);

ALTER TABLE module_assessments ADD COLUMN analysis_run_id UUID;
ALTER TABLE module_assessments ADD CONSTRAINT fk_module_run_scope
    FOREIGN KEY (analysis_run_id, astronaut_id, mission_id)
    REFERENCES analysis_runs(id, astronaut_id, mission_id) ON DELETE RESTRICT;
ALTER TABLE integrated_assessments ADD COLUMN analysis_run_id UUID;
ALTER TABLE integrated_assessments ADD CONSTRAINT fk_integrated_run_scope
    FOREIGN KEY (analysis_run_id, astronaut_id, mission_id)
    REFERENCES analysis_runs(id, astronaut_id, mission_id) ON DELETE RESTRICT;

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    mission_id UUID REFERENCES missions(id) ON DELETE RESTRICT,
    astronaut_id UUID REFERENCES astronauts(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    request_id TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('success','denied','conflict','failure')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);
CREATE INDEX idx_audit_scope_time ON audit_events(mission_id, recorded_at DESC);

-- One ordered, per-mission feed. Writers increment missions.change_seq inside
-- the same transaction before appending; the row lock serializes sequence and commit order.
CREATE TABLE change_feed (
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    sequence BIGINT NOT NULL,
    event_id UUID NOT NULL,
    client_id UUID,
    actor_id TEXT NOT NULL,
    origin TEXT NOT NULL CHECK (origin IN ('crew_client','ground_console','backend')),
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'observation','device_registration','baseline_revision','analysis_run',
        'module_assessment','integrated_assessment','alert_event','action_event',
        'crew_message','message_lifecycle_event','ground_message','crew_update',
        'protocol_version','measurement_catalogue_version','communication_status'
    )),
    entity_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('upsert','append_event','revoke')),
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    server_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload_hash TEXT NOT NULL,
    expected_revision INTEGER CHECK (expected_revision IS NULL OR expected_revision > 0),
    payload JSONB NOT NULL,
    PRIMARY KEY (mission_id, sequence),
    UNIQUE (event_id)
);

CREATE TABLE sync_batches (
    client_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    payload_hash TEXT NOT NULL,
    response_json JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, batch_id)
);

-- A client may supply its UUID before going offline; server-generated UUID remains a fallback
-- for ground-originated entities. event_id is the idempotency key across all retries.
CREATE TABLE client_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE RESTRICT,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    client_code TEXT NOT NULL UNIQUE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_contact_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (id, mission_id),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);

ALTER TABLE change_feed ADD CONSTRAINT fk_change_feed_client
    FOREIGN KEY (client_id) REFERENCES client_devices(id) ON DELETE RESTRICT;

ALTER TABLE sync_batches ADD CONSTRAINT fk_sync_batches_client
    FOREIGN KEY (client_id) REFERENCES client_devices(id) ON DELETE RESTRICT;

CREATE TABLE sync_events (
    event_id UUID PRIMARY KEY,
    batch_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES client_devices(id) ON DELETE RESTRICT,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
    actor_id TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'crew_client' CHECK (origin = 'crew_client'),
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'observation','device_registration','baseline_revision','analysis_run',
        'module_assessment','integrated_assessment','alert_event','action_event',
        'crew_message','message_lifecycle_event','communication_status'
    )),
    entity_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('upsert','append_event','revoke')),
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_revision INTEGER CHECK (expected_revision IS NULL OR expected_revision > 0),
    payload JSONB NOT NULL,
    payload_hash TEXT NOT NULL,
    result_status TEXT NOT NULL CHECK (result_status IN ('accepted','duplicate','rejected','conflict')),
    result_reason TEXT,
    FOREIGN KEY (client_id, mission_id) REFERENCES client_devices(id, mission_id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id, batch_id) REFERENCES sync_batches(client_id, batch_id) ON DELETE RESTRICT
);
CREATE INDEX idx_sync_events_client_received ON sync_events(client_id, received_at);

CREATE TABLE sync_cursors (
    client_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    last_sequence BIGINT NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, mission_id),
    FOREIGN KEY (client_id, mission_id) REFERENCES client_devices(id, mission_id) ON DELETE CASCADE
);

CREATE TABLE communication_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES client_devices(id) ON DELETE RESTRICT,
    observed_at TIMESTAMPTZ NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('LIVE','DELAYED','BLACKOUT')),
    last_successful_contact_at TIMESTAMPTZ,
    last_push_at TIMESTAMPTZ,
    last_pull_at TIMESTAMPTZ,
    queued_event_count INTEGER NOT NULL DEFAULT 0 CHECK (queued_event_count >= 0),
    estimated_delay_seconds INTEGER CHECK (estimated_delay_seconds IS NULL OR estimated_delay_seconds >= 0),
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL,
    astronaut_id UUID NOT NULL,
    sender_user_id TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('message','update','notification')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    idempotency_key TEXT NOT NULL UNIQUE,
    simulated BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id) ON DELETE RESTRICT
);

CREATE TABLE message_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE RESTRICT,
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('transmitted','received_by_ground','received_by_crew','read','withdrawn','expired')),
    client_created_at TIMESTAMPTZ,
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Example seed data: measurement catalogue. Extend with the remaining codes from README.md.
INSERT INTO measurement_definitions
(code, display_name, domain_code, value_type, canonical_unit, allowed_units, allowed_source_types, description)
VALUES
('heart_rate', 'Heart rate', 'cardiovascular', 'numeric', 'bpm', ARRAY['bpm'], ARRAY['wearable','medical_device','manual','simulation'], 'Instantaneous heart rate.'),
('resting_heart_rate', 'Resting heart rate', 'cardiovascular', 'numeric', 'bpm', ARRAY['bpm'], ARRAY['wearable','manual','simulation'], 'Resting heart rate under a documented resting protocol.'),
('hrv_rmssd', 'HRV (RMSSD)', 'cardiovascular', 'numeric', 'ms', ARRAY['ms'], ARRAY['wearable','medical_device','manual','simulation'], 'Root mean square of successive differences; do not mix with SDNN.'),
('systolic_bp', 'Systolic blood pressure', 'cardiovascular', 'numeric', 'mmHg', ARRAY['mmHg'], ARRAY['medical_device','manual','simulation'], 'Systolic blood pressure.'),
('diastolic_bp', 'Diastolic blood pressure', 'cardiovascular', 'numeric', 'mmHg', ARRAY['mmHg'], ARRAY['medical_device','manual','simulation'], 'Diastolic blood pressure.'),
('sleep_duration', 'Total sleep duration', 'behavioural_cognitive', 'numeric', 'h', ARRAY['h','min'], ARRAY['wearable','manual','simulation'], 'Total sleep duration; convert minutes to hours.'),
('mood_score', 'Self-reported mood', 'behavioural_cognitive', 'numeric', 'score_0_10', ARRAY['score_0_10'], ARRAY['manual'], 'Self-report; questionnaire anchors/version required in context.'),
('stress_score', 'Self-reported stress', 'behavioural_cognitive', 'numeric', 'score_0_10', ARRAY['score_0_10'], ARRAY['manual'], 'Self-report; questionnaire anchors/version required in context.'),
('fatigue_score', 'Self-reported fatigue', 'behavioural_cognitive', 'numeric', 'score_0_10', ARRAY['score_0_10'], ARRAY['manual'], 'Self-report; questionnaire anchors/version required in context.'),
('pvt_mean_reaction_time', 'PVT mean reaction time', 'behavioural_cognitive', 'numeric', 'ms', ARRAY['ms'], ARRAY['cognitive_task','simulation'], 'Mean reaction time from a specified PVT test version.'),
('pvt_lapses', 'PVT lapses', 'behavioural_cognitive', 'integer', 'count', ARRAY['count'], ARRAY['cognitive_task','simulation'], 'Lapse count from a specified PVT test version.'),
('dose_equivalent', 'Dose equivalent', 'radiation', 'numeric', 'mSv', ARRAY['mSv','uSv'], ARRAY['dosimeter','import','simulation'], 'Dose-equivalent quantity; retain instrument semantics.'),
('absorbed_dose', 'Absorbed radiation dose', 'radiation', 'numeric', 'mGy', ARRAY['mGy','uGy'], ARRAY['dosimeter','import','simulation'], 'Absorbed dose; not interchangeable with dose equivalent.'),
('dose_rate', 'Dose-equivalent rate', 'radiation', 'numeric', 'uSv/h', ARRAY['uSv/h','mSv/day'], ARRAY['dosimeter','import','simulation'], 'Dose-equivalent rate; check instrument definition before conversion.'),
('cabin_co2', 'Cabin carbon dioxide', 'environmental', 'numeric', 'ppm', ARRAY['ppm'], ARRAY['environmental_sensor','import','simulation'], 'Cabin carbon dioxide concentration.')
ON CONFLICT (code) DO NOTHING;
