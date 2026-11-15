// Ground Health Console — Backend DTOs
// Mirrors the FastAPI payloads in services/api/app. Field names are intentionally
// snake_case because these describe the wire contract, not the view model.

export type BackendRole = 'medical_officer' | 'administrator' | 'crew_member';

export interface ApiFailure {
  status: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
  requestId: string | null;
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiFailure | null;
  status: number;
}

// --- Authentication & service health -------------------------------------

export interface AuthTokenDto {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: BackendRole;
  mission_ids: string[];
  astronaut_id: string | null;
}

export interface HealthDto {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  database: string;
  schema: string;
  demo_authentication: boolean;
  simulated_communications: boolean;
  medical_certification: boolean;
}

// --- Mission & crew -------------------------------------------------------

export interface MissionDto {
  mission_id: string;
  mission_code: string;
  mission_name: string;
  mission_type: string;
  status: string;
  start_at: string | null;
  expected_end_at: string | null;
  created_at: string | null;
  simulated: boolean;
}

export interface AstronautDto {
  astronaut_id: string;
  astronaut_code: string;
  display_name: string;
  mission_ids: string[];
  created_at: string | null;
  updated_at: string | null;
  simulated: boolean;
}

// --- Measurement catalogue ------------------------------------------------

export interface MeasurementDefinitionDto {
  code: string;
  display_name: string;
  domain_code: string;
  value_type: 'numeric' | 'integer' | 'text' | 'boolean' | 'object';
  canonical_unit: string | null;
  allowed_units: string[];
  allowed_source_types: string[];
  description: string;
  sampling_guidance: string | null;
  context_schema: Record<string, unknown>;
  active: boolean;
  compatibility: boolean;
}

export interface CatalogueDto {
  catalogue_version: string;
  effective_at: string;
  items: MeasurementDefinitionDto[];
}

// --- Observations ---------------------------------------------------------

export type ObservationValue = number | string | boolean | Record<string, unknown> | null;

export interface ObservationSourceDto {
  type: string;
  device_id: string | null;
  external_id: string | null;
}

export interface ObservationDto {
  observation_id: string;
  astronaut_id: string;
  mission_id: string;
  measurement_code: string;
  catalogue_version: string;
  value: ObservationValue;
  unit: string;
  canonical_value: ObservationValue;
  canonical_unit: string | null;
  measured_at: string;
  received_at: string | null;
  created_at: string | null;
  source: ObservationSourceDto;
  sync_status: string;
  quality_status: string;
  quality_score: number | null;
  simulated: boolean;
}

export interface ObservationPageDto {
  items: ObservationDto[];
  next_cursor: string | null;
}

// --- Dashboard ------------------------------------------------------------

export interface DashboardDomainStateDto {
  module_code: string;
  status: string;
  summary: string;
}

export interface DashboardDataQualityDto {
  status: 'good' | 'partial' | 'insufficient';
  observation_count: number;
  invalid_measurement_count: number;
  questionable_measurement_count: number;
  stale_measurement_count: number;
  latest_measured_at: string | null;
  latest_received_at: string | null;
}

export interface DashboardCommunicationDto {
  state: string | null;
  observed_at: string | null;
  last_successful_contact_at: string | null;
  queued_event_count: number;
  estimated_delay_seconds: number | null;
}

export interface DashboardDto {
  astronaut_id: string;
  mission_id: string;
  mission_day: number | null;
  integrated_status: string;
  assessed_at: string | null;
  domains: DashboardDomainStateDto[];
  open_alert_count: number;
  pending_action_count: number;
  data_quality: DashboardDataQualityDto;
  simulated: boolean;
  adapter_state: string | null;
  adapter_state_observed_at: string | null;
  contact_recency: string;
  latest_measured_at: string | null;
  latest_received_at: string | null;
  freshness: string;
  generated_at: string;
}

// --- Assessments ----------------------------------------------------------

export interface AssessmentSummaryDto {
  assessment_id: string;
  assessment_type: 'module' | 'integrated';
  module_code?: string;
  status: string;
  assessed_at: string | null;
  summary: string;
  simulated: boolean;
  algorithm_version: string;
  rule_set_version: string;
}

export interface AssessmentFindingDto {
  finding_code: string;
  measurement_code: string | null;
  severity: string;
  direction: string | null;
  current_value: number | null;
  baseline_value: number | null;
  delta_value: number | null;
  unit: string | null;
  explanation: string;
  evidence_observation_ids: string[];
}

export interface AssessmentBaselineVersionDto {
  baseline_id: string;
  measurement_code: string | null;
  version: string | number;
}

export interface AssessmentDetailDto extends AssessmentSummaryDto {
  data_sufficiency?: string;
  evidence_observation_ids?: string[];
  baseline_versions?: AssessmentBaselineVersionDto[];
  findings?: AssessmentFindingDto[];
  limitations?: string[];
  analysis_run_id?: string | null;
  component_assessment_ids?: string[];
  uncertainty_notes?: string[];
}

// --- Analysis provenance --------------------------------------------------

export interface AnalysisRunDto {
  run_id: string;
  astronaut_id: string;
  mission_id: string;
  requested_by: string;
  status: string;
  execution_location: string;
  algorithm_version: string;
  rule_set_version: string;
  implementation_build: string | null;
  input_snapshot_hash: string | null;
  output_hash: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_code: string | null;
}

// --- Alerts ---------------------------------------------------------------

export interface AlertProvenanceDto {
  analysis_run_id?: string;
  algorithm_version?: string;
  rule_set_version?: string;
  finding_code?: string;
  module_code?: string;
  demo_only?: boolean;
  [key: string]: unknown;
}

export interface AlertDto {
  alert_id: string;
  alert_code: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  revision: number;
  provenance: AlertProvenanceDto;
}

export interface AlertEventDto {
  event_id: string;
  alert_id: string;
  actor_id: string;
  event_type: string;
  note: string | null;
  client_created_at: string | null;
  expected_revision: number | null;
  result_revision: number;
  recorded_at: string | null;
}

export interface AlertDetailDto extends AlertDto {
  history: AlertEventDto[];
}

// --- Recommended actions --------------------------------------------------

export interface ActionDto {
  action_id: string;
  astronaut_id: string;
  mission_id: string;
  alert_id: string | null;
  module_assessment_id: string | null;
  protocol_id: string | null;
  action_type: string;
  priority: string;
  title: string;
  description: string;
  due_at: string | null;
  status: string;
  demo_only: boolean;
  created_at: string;
  revision: number;
}

export interface ActionEventDto {
  event_id: string;
  action_id: string;
  actor_code: string;
  event_type: string;
  note: string | null;
  client_created_at: string | null;
  expected_revision: number | null;
  result_revision: number;
  created_at: string | null;
}

export interface ActionDetailDto extends ActionDto {
  history: ActionEventDto[];
}

export interface ActionCreateInput {
  mission_id: string;
  astronaut_id: string;
  alert_id?: string | null;
  module_assessment_id?: string | null;
  action_type:
    | 'repeat_measurement'
    | 'complete_assessment'
    | 'review_protocol'
    | 'contact_medical_officer'
    | 'scheduled_test'
    | 'informational';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  description: string;
  due_at?: string | null;
}

export interface ActionUpdateInput {
  expected_revision: number;
  title?: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  due_at?: string | null;
  status?: string;
  note?: string;
}

export interface ActionEventInput {
  event_type: 'started' | 'completed' | 'skipped' | 'deferred' | 'cancelled';
  note?: string;
  expected_revision: number;
  client_created_at?: string;
}

// --- Communications -------------------------------------------------------

export interface FreshnessEntryDto {
  astronaut_id: string;
  latest_measured_at: string | null;
  latest_received_at: string | null;
  age_seconds: number | null;
  status: string;
}

export interface CommunicationStatusDto {
  client_id?: string;
  astronaut_id?: string;
  mission_id?: string;
  state: string | null;
  observed_at: string | null;
  contact_recency: string;
  last_successful_contact_at: string | null;
  last_push_at: string | null;
  last_pull_at: string | null;
  queued_event_count: number;
  queued_event_count_reported: boolean;
  estimated_delay_seconds: number | null;
  details: Record<string, unknown>;
  freshness: FreshnessEntryDto[];
}

export interface SyncStatusDto {
  client_id?: string;
  astronaut_id?: string;
  mission_id?: string;
  state?: string | null;
  observed_at?: string | null;
  contact_recency?: string;
  last_successful_contact_at?: string | null;
  last_push_at?: string | null;
  last_pull_at?: string | null;
  queued_event_count?: number;
  pending_event_count?: number;
  [key: string]: unknown;
}

// --- Messages -------------------------------------------------------------

export type MessageTypeDto = 'message' | 'update' | 'notification';

export type MessageEventTypeDto =
  | 'transmitted'
  | 'received_by_ground'
  | 'received_by_crew'
  | 'read'
  | 'withdrawn'
  | 'expired';

export interface MessageEventDto {
  event_id: string;
  event_type: string;
  actor_id: string;
  client_created_at: string | null;
  occurred_at: string | null;
  recorded_at: string | null;
}

export interface MessageDto {
  message_id: string;
  mission_id: string;
  astronaut_id: string;
  sender_user_id: string;
  message_type: string;
  title: string;
  body: string;
  version: string | null;
  created_at: string | null;
  expires_at: string | null;
  simulated: boolean;
  status: string;
  lifecycle: MessageEventDto[];
}

// --- Audit ----------------------------------------------------------------

export interface AuditEventDto {
  audit_event_id: string;
  occurred_at: string;
  recorded_at: string;
  actor_id: string;
  actor_role: string;
  mission_id: string | null;
  astronaut_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  request_id: string | null;
  outcome: string;
  details: Record<string, unknown>;
}

export interface AuditPageDto {
  items: AuditEventDto[];
  limit: number;
  offset: number;
}

// --- Baselines ------------------------------------------------------------

export interface BaselineDto {
  baseline_id: string;
  astronaut_id: string;
  mission_id: string | null;
  measurement_code: string | null;
  baseline_scope: string;
  status: string;
  method: string;
  period_start: string | null;
  period_end: string | null;
  sample_count: number;
  mean: number | null;
  standard_deviation: number | null;
  median: number | null;
  mad: number | null;
  minimum: number | null;
  maximum: number | null;
  unit: string | null;
  version: number;
  calculated_at: string | null;
  activated_at: string | null;
}
