// Ground Health Console — Authoritative TypeScript Definitions
// Aligned with Specification v0.3, openapi.yaml, and schema.sql

// --- Authentication & Identity ---
export type UserRole = 'medical_officer' | 'administrator' | 'crew_member';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: UserRole;
  mission_ids: string[];
  astronaut_id: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  mission_scopes: string[];
  agency?: string;
}

// --- Mission Model ---
export interface Mission {
  mission_id: string;
  code: string;
  name: string;
  description: string;
  target_body: string;
  launch_timestamp: string;
  flight_day: number;
  status: 'active' | 'completed' | 'planned';
  astronaut_ids: string[];
  created_at: string;
  last_sync_timestamp?: string;
}

export interface MissionSummary {
  mission_id: string;
  code: string;
  name: string;
  flight_day: number;
  target_body: string;
  status: string;
  astronaut_count: number;
  last_sync: string;
  communication_state: CommunicationState;
}

// --- Astronaut Model ---
export interface Astronaut {
  astronaut_id: string;
  name: string;
  callsign: string;
  role_in_crew: string;
  agency: string;
  birth_year?: number;
  biological_sex?: string;
  mission_ids: string[];
  status: 'active' | 'inactive';
  created_at: string;
}

export interface AstronautSummary {
  astronaut_id: string;
  name: string;
  callsign: string;
  role_in_crew: string;
  mission_id: string;
  last_health_update: string;
  latest_measurement_at: string;
  pending_assessments: number;
  open_actions: number;
  data_freshness: DataFreshness;
  communication_status: CommunicationState;
}

// --- Health Vocabulary & Observations ---
export type HealthDomain =
  | 'cardiovascular'
  | 'behavioural_cognitive'
  | 'immune'
  | 'musculoskeletal'
  | 'radiation'
  | 'environmental'
  | 'data_quality';

export type ObservationSource =
  | 'wearable'
  | 'medical_device'
  | 'manual'
  | 'cognitive_task'
  | 'laboratory'
  | 'environmental_sensor'
  | 'dosimeter'
  | 'import'
  | 'simulation';

export type DataQuality = 'valid' | 'suspect' | 'invalid' | 'missing' | 'unknown';
export type DataFreshness = 'current' | 'recent' | 'stale' | 'unavailable' | 'unknown';

export interface Observation {
  observation_id: string;
  astronaut_id: string;
  mission_id: string;
  measurement_code: string;
  value: number;
  unit: string;
  measured_at: string;        // Timestamp recorded on device
  created_at: string;         // Timestamp client enveloped record
  received_at: string;        // Timestamp server ingested record
  source: ObservationSource;
  source_device_id?: string;
  quality: DataQuality;
  is_synthetic: boolean;
  context?: Record<string, any>;
}

// --- Baselines ---
export interface BaselineReference {
  baseline_id: string;
  astronaut_id: string;
  measurement_code: string;
  baseline_type: 'personal' | 'population_reference';
  value_mean: number;
  value_std?: number;
  range_min?: number;
  range_max?: number;
  unit: string;
  sample_count?: number;
  established_at: string;
  valid_from: string;
}

// --- Health Assessments ---
export type AssessmentStatus =
  | 'normal'
  | 'monitor'
  | 'attention'
  | 'urgent'
  | 'insufficient_data'
  | 'data_quality_issue';

export interface AssessmentFinding {
  finding_id: string;
  description: string;
  severity: AlertSeverity;
  evidence: string[];
  recommendation?: string;
}

export interface AssessmentInput {
  observation_id: string;
  measurement_code: string;
  value: number;
  unit: string;
  measured_at: string;
}

export interface ModuleAssessment {
  assessment_id: string;
  astronaut_id: string;
  mission_id: string;
  health_domain: HealthDomain;
  status: AssessmentStatus;
  summary: string;
  findings: AssessmentFinding[];
  inputs: AssessmentInput[];
  baselines_used: BaselineReference[];
  algorithm_version: string;
  assessed_at: string;
  data_sufficiency: 'sufficient' | 'partial' | 'insufficient';
  data_quality_summary: string;
  recommended_actions: string[];
  is_synthetic: boolean;
}

// --- Alerts & Actions ---
export type AlertSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';
export type AlertLifecycle = 'open' | 'acknowledged' | 'monitoring' | 'resolved' | 'escalated';

export interface AlertEvent {
  event_id: string;
  alert_id: string;
  action: string;
  actor: string;
  note?: string;
  timestamp: string;
}

export interface Alert {
  alert_id: string;
  astronaut_id: string;
  mission_id: string;
  health_domain: HealthDomain;
  severity: AlertSeverity;
  title: string;
  description: string;
  evidence_summary: string;
  assessment_id?: string;
  assigned_to?: string;
  status: AlertLifecycle;
  created_at: string;
  follow_up_deadline?: string;
  events: AlertEvent[];
  is_synthetic: boolean;
}

export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ActionEvent {
  event_id: string;
  action_id: string;
  action_type: string;
  actor: string;
  note?: string;
  timestamp: string;
}

export interface FollowUpAction {
  action_id: string;
  alert_id: string;
  astronaut_id: string;
  mission_id: string;
  protocol_reference?: string;
  description: string;
  assigned_to?: string;
  status: ActionStatus;
  deadline?: string;
  events: ActionEvent[];
  created_at: string;
  is_synthetic: boolean;
}

// --- Communication & Store-and-Forward Sync ---
export type CommunicationState = 'LIVE' | 'DELAYED' | 'BLACKOUT' | 'UNKNOWN';

export interface CommunicationStatus {
  client_id: string;
  state: CommunicationState;
  observed_at: string;
  last_successful_contact_at?: string;
  queued_event_count: number;
}

export interface SyncEventSummary {
  event_id: string;
  entity_type: string;
  status: 'accepted' | 'duplicate' | 'rejected' | 'conflict';
  received_at?: string;
}

export interface SyncBatch {
  batch_id: string;
  direction: 'push' | 'pull';
  event_count: number;
  created_at: string;
  received_at?: string;
  acknowledged_at?: string;
  status: 'pending' | 'accepted' | 'partial' | 'rejected' | 'failed';
  retry_count: number;
  events: SyncEventSummary[];
  notes?: string;
}

// --- Messaging ---
export type MessageStatus =
  | 'draft'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'acknowledged'
  | 'failed'
  | 'expired';

export interface MessageEvent {
  event_id: string;
  message_id: string;
  status: MessageStatus;
  timestamp: string;
  actor?: string;
  note?: string;
}

export interface Message {
  message_id: string;
  mission_id: string;
  astronaut_id?: string;
  sender_id: string;
  sender_role: UserRole;
  sender_name: string;
  recipient_id?: string;
  recipient_name: string;
  subject: string;
  body: string;
  priority: 'routine' | 'priority' | 'urgent';
  protocol_reference?: string;
  status: MessageStatus;
  created_at: string;
  delivered_at?: string;
  read_at?: string;
  acknowledged_at?: string;
  expires_at?: string;
  events: MessageEvent[];
  is_synthetic: boolean;
}

// --- Environmental & Radiation Readings ---
export interface EnvironmentalReading {
  reading_id: string;
  measurement_code: 'cabin_co2' | 'cabin_temperature' | 'relative_humidity' | 'cabin_pressure';
  value: number;
  unit: string;
  sensor_id: string;
  location?: string;
  measured_at: string;
  received_at: string;
  is_synthetic: boolean;
}

export interface RadiationReading {
  reading_id: string;
  astronaut_id?: string; // null indicates habitat/environmental sensor
  measurement_code: 'dose_rate' | 'dose_equivalent' | 'absorbed_dose' | 'linear_energy_transfer';
  value: number;
  unit: string;
  source_device: string;
  sensor_type: 'personal_dosimeter' | 'habitat_area_monitor';
  measured_at: string;
  received_at: string;
  cumulative_dose?: number;
  cumulative_unit?: string;
  is_synthetic: boolean;
}

// --- Dashboard & Activity ---
export interface ActivityItem {
  id: string;
  type: 'measurement' | 'assessment' | 'alert' | 'action' | 'message' | 'sync';
  description: string;
  astronaut_name?: string;
  astronaut_id?: string;
  timestamp: string;
}

export interface AttentionItem {
  id: string;
  type: 'unacknowledged_finding' | 'overdue_followup' | 'missing_assessment' | 'stale_data' | 'sync_failure';
  title: string;
  description: string;
  astronaut_name?: string;
  astronaut_id?: string;
  severity: AlertSeverity;
  created_at: string;
  action_route?: string;
}

export interface DashboardSummary {
  mission: MissionSummary;
  crew: AstronautSummary[];
  recent_activity: ActivityItem[];
  attention_items: AttentionItem[];
}

// --- System Mode ---
export type DataMode = 'mock' | 'api';
