-- Crew Health Client SQLite schema v0.3.
-- Logical entities and JSON wire payloads match README.md / openapi.yaml.
-- Configure SQLCipher (or an equivalent encrypted SQLite build) before opening this file.
-- Keep the encryption key in the operating-system protected credential store, never beside this DB.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS local_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS astronauts (
    id TEXT PRIMARY KEY,
    astronaut_code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    profile_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    mission_code TEXT NOT NULL UNIQUE,
    mission_name TEXT NOT NULL,
    status TEXT NOT NULL,
    mission_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS astronaut_missions (
    astronaut_id TEXT NOT NULL REFERENCES astronauts(id),
    mission_id TEXT NOT NULL REFERENCES missions(id),
    mission_role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (astronaut_id, mission_id)
);

CREATE TABLE IF NOT EXISTS measurement_definitions (
    code TEXT PRIMARY KEY,
    definition_json TEXT NOT NULL,
    version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS measurement_catalogue_versions (
    mission_id TEXT NOT NULL REFERENCES missions(id),
    version TEXT NOT NULL,
    effective_at TEXT NOT NULL,
    change_reason TEXT NOT NULL,
    definitions_snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (mission_id, version)
);

CREATE TABLE IF NOT EXISTS protocol_versions (
    mission_id TEXT NOT NULL REFERENCES missions(id),
    protocol_code TEXT NOT NULL,
    version TEXT NOT NULL,
    approval_status TEXT NOT NULL CHECK (approval_status IN ('demo_only','approved','retired')),
    effective_at TEXT NOT NULL,
    content_json TEXT NOT NULL,
    change_reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (mission_id, protocol_code, version)
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    device_code TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL,
    device_json TEXT NOT NULL DEFAULT '{}',
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY, -- client-generated stable UUID; shared as observation_id
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    measurement_code TEXT NOT NULL REFERENCES measurement_definitions(code),
    catalogue_version TEXT NOT NULL,
    measured_at TEXT NOT NULL,
    device_time_raw TEXT,
    clock_quality_json TEXT NOT NULL DEFAULT '{"status":"unknown"}',
    created_at TEXT NOT NULL,
    value_json TEXT NOT NULL,
    original_unit TEXT,
    canonical_value REAL,
    canonical_unit TEXT,
    source_json TEXT NOT NULL,
    quality_json TEXT NOT NULL,
    context_json TEXT NOT NULL DEFAULT '{}',
    simulated INTEGER NOT NULL DEFAULT 0,
    correction_of TEXT REFERENCES observations(id),
    sync_status TEXT NOT NULL DEFAULT 'local_only'
        CHECK (sync_status IN ('local_only','queued','in_flight','synced','rejected','conflict')),
    received_at TEXT,
    last_sync_error TEXT,
    UNIQUE (id, astronaut_id, mission_id),
    FOREIGN KEY (mission_id, catalogue_version) REFERENCES measurement_catalogue_versions(mission_id, version),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id)
);
CREATE INDEX IF NOT EXISTS idx_local_observation_time
    ON observations(astronaut_id, measurement_code, measured_at DESC);

CREATE TABLE IF NOT EXISTS health_baselines (
    id TEXT PRIMARY KEY,
    astronaut_id TEXT NOT NULL REFERENCES astronauts(id),
    mission_id TEXT REFERENCES missions(id),
    measurement_code TEXT NOT NULL REFERENCES measurement_definitions(code),
    version INTEGER NOT NULL,
    baseline_json TEXT NOT NULL,
    UNIQUE (astronaut_id, mission_id, measurement_code, version),
    UNIQUE (id, astronaut_id, measurement_code, version),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id)
);

CREATE TABLE IF NOT EXISTS analysis_runs (
    id TEXT PRIMARY KEY,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    execution_location TEXT NOT NULL CHECK (execution_location IN ('crew_local','ground_backend')),
    algorithm_version TEXT NOT NULL,
    rule_set_version TEXT NOT NULL,
    input_snapshot_hash TEXT NOT NULL,
    implementation_build TEXT NOT NULL,
    output_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('completed','failed')),
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    UNIQUE (id, astronaut_id, mission_id),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id)
);

CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('module','integrated')),
    module_code TEXT,
    status TEXT NOT NULL,
    assessed_at TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    rule_set_version TEXT NOT NULL,
    protocol_code TEXT,
    protocol_version TEXT,
    analysis_run_id TEXT,
    data_sufficiency TEXT,
    assessment_json TEXT NOT NULL,
    simulated INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'local_only',
    UNIQUE (id, astronaut_id, mission_id),
    UNIQUE (id, algorithm_version, rule_set_version),
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id),
    FOREIGN KEY (analysis_run_id, astronaut_id, mission_id) REFERENCES analysis_runs(id, astronaut_id, mission_id),
    FOREIGN KEY (mission_id, protocol_code, protocol_version)
        REFERENCES protocol_versions(mission_id, protocol_code, version),
    CHECK ((assessment_type = 'module' AND module_code IS NOT NULL) OR
           (assessment_type = 'integrated' AND module_code IS NULL))
);

CREATE TABLE IF NOT EXISTS assessment_inputs (
    assessment_id TEXT NOT NULL,
    observation_id TEXT NOT NULL,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    input_role TEXT NOT NULL CHECK (input_role IN ('evidence','context','excluded_quality')),
    PRIMARY KEY (assessment_id, observation_id),
    FOREIGN KEY (assessment_id, astronaut_id, mission_id)
        REFERENCES assessments(id, astronaut_id, mission_id),
    FOREIGN KEY (observation_id, astronaut_id, mission_id)
        REFERENCES observations(id, astronaut_id, mission_id)
);

CREATE TABLE IF NOT EXISTS assessment_baselines (
    assessment_id TEXT NOT NULL,
    baseline_id TEXT NOT NULL,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    measurement_code TEXT NOT NULL,
    baseline_version INTEGER NOT NULL,
    PRIMARY KEY (assessment_id, baseline_id),
    FOREIGN KEY (assessment_id, astronaut_id, mission_id) REFERENCES assessments(id, astronaut_id, mission_id),
    FOREIGN KEY (baseline_id, astronaut_id, measurement_code, baseline_version)
        REFERENCES health_baselines(id, astronaut_id, measurement_code, version)
);

CREATE TABLE IF NOT EXISTS assessment_components (
    integrated_assessment_id TEXT NOT NULL,
    module_assessment_id TEXT NOT NULL,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    rule_set_version TEXT NOT NULL,
    PRIMARY KEY (integrated_assessment_id, module_assessment_id),
    FOREIGN KEY (integrated_assessment_id, astronaut_id, mission_id)
        REFERENCES assessments(id, astronaut_id, mission_id),
    FOREIGN KEY (module_assessment_id, astronaut_id, mission_id)
        REFERENCES assessments(id, astronaut_id, mission_id),
    FOREIGN KEY (integrated_assessment_id, algorithm_version, rule_set_version)
        REFERENCES assessments(id, algorithm_version, rule_set_version),
    FOREIGN KEY (module_assessment_id, algorithm_version, rule_set_version)
        REFERENCES assessments(id, algorithm_version, rule_set_version),
    CHECK (integrated_assessment_id <> module_assessment_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    mission_id TEXT,
    astronaut_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('success','denied','conflict','failure')),
    details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS action_events (
    event_id TEXT PRIMARY KEY,
    action_id TEXT NOT NULL REFERENCES recommended_actions(id),
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('started','completed','skipped','deferred','cancelled')),
    expected_revision INTEGER NOT NULL,
    result_revision INTEGER NOT NULL,
    client_created_at TEXT NOT NULL,
    note TEXT
);

CREATE TABLE IF NOT EXISTS alert_events (
    event_id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL REFERENCES alerts(id),
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('acknowledged','resolved','dismissed')),
    expected_revision INTEGER NOT NULL,
    result_revision INTEGER NOT NULL,
    client_created_at TEXT NOT NULL,
    note TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    alert_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only',
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id)
);

CREATE TABLE IF NOT EXISTS recommended_actions (
    id TEXT PRIMARY KEY,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    action_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only',
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id)
);

-- Immutable outbox. Acknowledgement updates local delivery metadata, never payload identity.
CREATE TABLE IF NOT EXISTS sync_outbox (
    event_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'observation','baseline_revision','module_assessment','integrated_assessment',
        'analysis_run','alert_event','action_event','crew_message','message_lifecycle_event',
        'communication_status','device_registration'
    )),
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('upsert','append_event','revoke')),
    schema_version INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'queued'
        CHECK (state IN ('queued','in_flight','accepted','duplicate','rejected','conflict')),
    attempts INTEGER NOT NULL DEFAULT 0,
    acknowledged_at TEXT,
    error_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON sync_outbox(state, created_at);

CREATE TABLE IF NOT EXISTS sync_inbox (
    event_id TEXT PRIMARY KEY,
    server_cursor TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    received_at TEXT NOT NULL,
    applied_at TEXT
);

-- Persist the opaque pull cursor even when a page contains no events.
-- Applying inbox rows and advancing this cursor happen in one SQLite transaction.
CREATE TABLE IF NOT EXISTS sync_state (
    client_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    pull_cursor TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (client_id, mission_id)
);

CREATE TABLE IF NOT EXISTS sync_batches (
    batch_id TEXT PRIMARY KEY,
    payload_hash TEXT NOT NULL,
    response_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    astronaut_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    message_json TEXT NOT NULL,
    received_at TEXT,
    read_at TEXT,
    FOREIGN KEY (astronaut_id, mission_id) REFERENCES astronaut_missions(astronaut_id, mission_id)
);

CREATE TABLE IF NOT EXISTS message_events (
    event_id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('transmitted','received_by_ground','received_by_crew','read','withdrawn','expired')),
    actor_id TEXT NOT NULL,
    client_created_at TEXT NOT NULL,
    recorded_at TEXT,
    event_json TEXT NOT NULL DEFAULT '{}',
    sync_status TEXT NOT NULL DEFAULT 'local_only'
);

CREATE TABLE IF NOT EXISTS communication_state (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    state TEXT NOT NULL CHECK (state IN ('LIVE','DELAYED','BLACKOUT')),
    observed_at TEXT NOT NULL,
    contact_recency TEXT NOT NULL CHECK (contact_recency IN ('recent','stale','unknown')),
    last_successful_contact_at TEXT,
    last_push_at TEXT,
    last_pull_at TEXT,
    queued_event_count INTEGER NOT NULL DEFAULT 0,
    details_json TEXT NOT NULL DEFAULT '{}'
);
