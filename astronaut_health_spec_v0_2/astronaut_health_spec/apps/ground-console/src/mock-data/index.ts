// Ground Health Console — Synthetic Demonstration Dataset
// All records are explicitly synthetic demonstration fixtures.
// Strictly compliant with Data Dictionary v0.3.

import {
  Astronaut,
  AstronautSummary,
  Mission,
  MissionSummary,
  Observation,
  BaselineReference,
  ModuleAssessment,
  Alert,
  FollowUpAction,
  CommunicationStatus,
  SyncBatch,
  Message,
  EnvironmentalReading,
  RadiationReading,
  ActivityItem,
  AttentionItem,
  DashboardSummary
} from '../types';

export const DEMO_ASTRONAUT_ID = '11111111-1111-1111-1111-111111111111';
export const SECOND_ASTRONAUT_ID = '44444444-4444-4444-4444-444444444444';
export const DEMO_MISSION_ID = '22222222-2222-2222-2222-222222222222';
export const DEMO_CLIENT_ID = '33333333-3333-3333-3333-333333333333';

// Fixed base anchor time for reproducible synthetic data
const NOW = '2026-11-14T18:30:00Z';
const T_MINUS_1H = '2026-11-14T17:30:00Z';
const T_MINUS_2H = '2026-11-14T16:30:00Z';
const T_MINUS_3H = '2026-11-14T15:30:00Z';
const T_MINUS_4H = '2026-11-14T14:30:00Z';
const T_MINUS_6H = '2026-11-14T12:30:00Z';
const T_MINUS_8H = '2026-11-14T10:30:00Z';
const T_MINUS_12H = '2026-11-14T06:30:00Z';
const T_MINUS_1D = '2026-11-13T18:30:00Z';
const T_MINUS_2D = '2026-11-12T18:30:00Z';
const T_MINUS_3D = '2026-11-11T18:30:00Z';
const T_MINUS_4D = '2026-11-10T18:30:00Z';
const T_MINUS_5D = '2026-11-09T18:30:00Z';
const T_MINUS_6D = '2026-11-08T18:30:00Z';
const T_MINUS_7D = '2026-11-07T18:30:00Z';

export const mockMission: Mission = {
  mission_id: DEMO_MISSION_ID,
  code: 'ART-VII',
  name: 'Artemis VII — Mars Transit Demonstration',
  description: 'Extended deep-space transit simulation monitoring crew physiology and cabin biosphere in orbital proving ground.',
  target_body: 'Deep Space Transit Proving Ground',
  launch_timestamp: '2026-06-25T12:00:00Z',
  flight_day: 142,
  status: 'active',
  astronaut_ids: [DEMO_ASTRONAUT_ID, SECOND_ASTRONAUT_ID],
  created_at: '2026-06-01T00:00:00Z',
  last_sync_timestamp: T_MINUS_1H
};

export const mockMissionSummary: MissionSummary = {
  mission_id: DEMO_MISSION_ID,
  code: 'ART-VII',
  name: 'Artemis VII — Mars Transit Demonstration',
  flight_day: 142,
  target_body: 'Deep Space Transit Proving Ground',
  status: 'ACTIVE EXPEDITION',
  astronaut_count: 2,
  last_sync: T_MINUS_1H,
  communication_state: 'LIVE'
};

export const mockAstronauts: Astronaut[] = [
  {
    astronaut_id: DEMO_ASTRONAUT_ID,
    name: 'Cmdr. Elena Vasquez',
    callsign: 'Vanguard',
    role_in_crew: 'Mission Commander / Pilot',
    agency: 'ESA / International Partner',
    birth_year: 1988,
    biological_sex: 'female',
    mission_ids: [DEMO_MISSION_ID],
    status: 'active',
    created_at: '2026-01-10T00:00:00Z'
  },
  {
    astronaut_id: SECOND_ASTRONAUT_ID,
    name: 'Dr. James Chen',
    callsign: 'Apex',
    role_in_crew: 'Flight Engineer / Medical Specialist',
    agency: 'NASA',
    birth_year: 1985,
    biological_sex: 'male',
    mission_ids: [DEMO_MISSION_ID],
    status: 'active',
    created_at: '2026-01-10T00:00:00Z'
  }
];

export const mockCrewSummary: AstronautSummary[] = [
  {
    astronaut_id: DEMO_ASTRONAUT_ID,
    name: 'Cmdr. Elena Vasquez',
    callsign: 'Vanguard',
    role_in_crew: 'Mission Commander',
    mission_id: DEMO_MISSION_ID,
    last_health_update: T_MINUS_1H,
    latest_measurement_at: T_MINUS_1H,
    pending_assessments: 2,
    open_actions: 1,
    data_freshness: 'current',
    communication_status: 'LIVE'
  },
  {
    astronaut_id: SECOND_ASTRONAUT_ID,
    name: 'Dr. James Chen',
    callsign: 'Apex',
    role_in_crew: 'Flight Engineer / Medical Specialist',
    mission_id: DEMO_MISSION_ID,
    last_health_update: T_MINUS_4H,
    latest_measurement_at: T_MINUS_4H,
    pending_assessments: 0,
    open_actions: 0,
    data_freshness: 'recent',
    communication_status: 'LIVE'
  }
];

export const mockBaselines: BaselineReference[] = [
  {
    baseline_id: 'b-hr-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'heart_rate',
    baseline_type: 'personal',
    value_mean: 62.0,
    value_std: 4.5,
    range_min: 52.0,
    range_max: 76.0,
    unit: 'bpm',
    sample_count: 320,
    established_at: '2026-06-20T00:00:00Z',
    valid_from: '2026-06-25T00:00:00Z'
  },
  {
    baseline_id: 'b-rhr-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'resting_heart_rate',
    baseline_type: 'personal',
    value_mean: 54.0,
    value_std: 3.0,
    range_min: 48.0,
    range_max: 60.0,
    unit: 'bpm',
    sample_count: 140,
    established_at: '2026-06-20T00:00:00Z',
    valid_from: '2026-06-25T00:00:00Z'
  },
  {
    baseline_id: 'b-hrv-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'hrv_rmssd',
    baseline_type: 'personal',
    value_mean: 48.0,
    value_std: 6.2,
    range_min: 36.0,
    range_max: 62.0,
    unit: 'ms',
    sample_count: 140,
    established_at: '2026-06-20T00:00:00Z',
    valid_from: '2026-06-25T00:00:00Z'
  },
  {
    baseline_id: 'b-bp-sys-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'systolic_bp',
    baseline_type: 'personal',
    value_mean: 116.0,
    value_std: 5.0,
    range_min: 106.0,
    range_max: 126.0,
    unit: 'mmHg',
    sample_count: 90,
    established_at: '2026-06-20T00:00:00Z',
    valid_from: '2026-06-25T00:00:00Z'
  },
  {
    baseline_id: 'b-bp-dia-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'diastolic_bp',
    baseline_type: 'personal',
    value_mean: 74.0,
    value_std: 4.0,
    range_min: 66.0,
    range_max: 82.0,
    unit: 'mmHg',
    sample_count: 90,
    established_at: '2026-06-20T00:00:00Z',
    valid_from: '2026-06-25T00:00:00Z'
  },
  {
    baseline_id: 'b-sleep-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'sleep_duration',
    baseline_type: 'personal',
    value_mean: 7.2,
    value_std: 0.6,
    range_min: 6.5,
    range_max: 8.5,
    unit: 'h',
    sample_count: 140,
    established_at: '2026-06-20T00:00:00Z',
    valid_from: '2026-06-25T00:00:00Z'
  },
  {
    baseline_id: 'b-pvt-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'pvt_mean_reaction_time',
    baseline_type: 'personal',
    value_mean: 235.0,
    value_std: 14.0,
    range_min: 210.0,
    range_max: 265.0,
    unit: 'ms',
    sample_count: 80,
    established_at: '2026-06-20T00:00:00Z',
    valid_from: '2026-06-25T00:00:00Z'
  }
];

export const mockObservations: Observation[] = [
  // --- Elena Vasquez: Cardiovascular (Heart Rate Longitudinal) ---
  {
    observation_id: 'obs-hr-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 64,
    unit: 'bpm',
    measured_at: T_MINUS_7D,
    created_at: T_MINUS_7D,
    received_at: '2026-11-07T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hr-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 62,
    unit: 'bpm',
    measured_at: T_MINUS_6D,
    created_at: T_MINUS_6D,
    received_at: '2026-11-08T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hr-03',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 66,
    unit: 'bpm',
    measured_at: T_MINUS_5D,
    created_at: T_MINUS_5D,
    received_at: '2026-11-09T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hr-04',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 68,
    unit: 'bpm',
    measured_at: T_MINUS_4D,
    created_at: T_MINUS_4D,
    received_at: '2026-11-10T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hr-05',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 71,
    unit: 'bpm',
    measured_at: T_MINUS_3D,
    created_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hr-06',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 74,
    unit: 'bpm',
    measured_at: T_MINUS_2D,
    created_at: T_MINUS_2D,
    received_at: '2026-11-12T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hr-07',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 76,
    unit: 'bpm',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hr-08',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 75,
    unit: 'bpm',
    measured_at: T_MINUS_1H,
    created_at: T_MINUS_1H,
    received_at: NOW,
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },

  // Resting Heart Rate
  {
    observation_id: 'obs-rhr-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'resting_heart_rate',
    value: 53,
    unit: 'bpm',
    measured_at: T_MINUS_3D,
    created_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-rhr-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'resting_heart_rate',
    value: 57,
    unit: 'bpm',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-rhr-03',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'resting_heart_rate',
    value: 58,
    unit: 'bpm',
    measured_at: T_MINUS_8H,
    created_at: T_MINUS_8H,
    received_at: NOW,
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },

  // HRV-RMSSD
  {
    observation_id: 'obs-hrv-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'hrv_rmssd',
    value: 52,
    unit: 'ms',
    measured_at: T_MINUS_5D,
    created_at: T_MINUS_5D,
    received_at: '2026-11-09T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hrv-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'hrv_rmssd',
    value: 46,
    unit: 'ms',
    measured_at: T_MINUS_3D,
    created_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hrv-03',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'hrv_rmssd',
    value: 39,
    unit: 'ms',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-hrv-04',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'hrv_rmssd',
    value: 36,
    unit: 'ms',
    measured_at: T_MINUS_8H,
    created_at: T_MINUS_8H,
    received_at: NOW,
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },

  // Blood Pressure
  {
    observation_id: 'obs-bp-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'systolic_bp',
    value: 116,
    unit: 'mmHg',
    measured_at: T_MINUS_3D,
    created_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    source: 'medical_device',
    source_device_id: 'dev-bp-cuff-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-bp-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'diastolic_bp',
    value: 74,
    unit: 'mmHg',
    measured_at: T_MINUS_3D,
    created_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    source: 'medical_device',
    source_device_id: 'dev-bp-cuff-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-bp-03',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'systolic_bp',
    value: 122,
    unit: 'mmHg',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'medical_device',
    source_device_id: 'dev-bp-cuff-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-bp-04',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'diastolic_bp',
    value: 78,
    unit: 'mmHg',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'medical_device',
    source_device_id: 'dev-bp-cuff-01',
    quality: 'valid',
    is_synthetic: true
  },

  // Peripheral Oxygen Saturation (SpO2)
  {
    observation_id: 'obs-spo2-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'spo2',
    value: 98,
    unit: '%',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-spo2-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'spo2',
    value: 97,
    unit: '%',
    measured_at: T_MINUS_1H,
    created_at: T_MINUS_1H,
    received_at: NOW,
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },

  // Body Temperature
  {
    observation_id: 'obs-temp-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'body_temperature',
    value: 36.7,
    unit: 'degC',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'medical_device',
    source_device_id: 'dev-ir-thermometer-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-temp-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'body_temperature',
    value: 36.9,
    unit: 'degC',
    measured_at: T_MINUS_2H,
    created_at: T_MINUS_2H,
    received_at: NOW,
    source: 'medical_device',
    source_device_id: 'dev-ir-thermometer-01',
    quality: 'valid',
    is_synthetic: true
  },

  // Sleep Duration & Architecture
  {
    observation_id: 'obs-sleep-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'sleep_duration',
    value: 7.4,
    unit: 'h',
    measured_at: T_MINUS_5D,
    created_at: T_MINUS_5D,
    received_at: '2026-11-09T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-sleep-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'sleep_duration',
    value: 6.8,
    unit: 'h',
    measured_at: T_MINUS_4D,
    created_at: T_MINUS_4D,
    received_at: '2026-11-10T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-sleep-03',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'sleep_duration',
    value: 6.1,
    unit: 'h',
    measured_at: T_MINUS_3D,
    created_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-sleep-04',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'sleep_duration',
    value: 5.6,
    unit: 'h',
    measured_at: T_MINUS_2D,
    created_at: T_MINUS_2D,
    received_at: '2026-11-12T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-sleep-05',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'sleep_duration',
    value: 5.4,
    unit: 'h',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-01',
    quality: 'valid',
    is_synthetic: true
  },

  // Behavioural Self-Reports
  {
    observation_id: 'obs-mood-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'mood_score',
    value: 8,
    unit: 'score_0_10',
    measured_at: T_MINUS_4D,
    created_at: T_MINUS_4D,
    received_at: '2026-11-10T19:00:00Z',
    source: 'manual',
    quality: 'valid',
    is_synthetic: true,
    context: { instrument: 'Visual Analogue Mood Scale v1.0', anchor_0: 'extremely depressed', anchor_10: 'optimal positive' }
  },
  {
    observation_id: 'obs-mood-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'mood_score',
    value: 6,
    unit: 'score_0_10',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'manual',
    quality: 'valid',
    is_synthetic: true,
    context: { instrument: 'Visual Analogue Mood Scale v1.0' }
  },
  {
    observation_id: 'obs-stress-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'stress_score',
    value: 3,
    unit: 'score_0_10',
    measured_at: T_MINUS_4D,
    created_at: T_MINUS_4D,
    received_at: '2026-11-10T19:00:00Z',
    source: 'manual',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-stress-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'stress_score',
    value: 6,
    unit: 'score_0_10',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'manual',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-fatigue-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'fatigue_score',
    value: 3,
    unit: 'score_0_10',
    measured_at: T_MINUS_4D,
    created_at: T_MINUS_4D,
    received_at: '2026-11-10T19:00:00Z',
    source: 'manual',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-fatigue-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'fatigue_score',
    value: 7,
    unit: 'score_0_10',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'manual',
    quality: 'valid',
    is_synthetic: true
  },

  // Cognitive / PVT (Psychomotor Vigilance Task)
  {
    observation_id: 'obs-pvt-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'pvt_mean_reaction_time',
    value: 232,
    unit: 'ms',
    measured_at: T_MINUS_4D,
    created_at: T_MINUS_4D,
    received_at: '2026-11-10T19:00:00Z',
    source: 'cognitive_task',
    source_device_id: 'dev-pvt-tablet-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-pvt-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'pvt_mean_reaction_time',
    value: 284,
    unit: 'ms',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'cognitive_task',
    source_device_id: 'dev-pvt-tablet-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-pvt-lapse-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'pvt_lapses',
    value: 0,
    unit: 'count',
    measured_at: T_MINUS_4D,
    created_at: T_MINUS_4D,
    received_at: '2026-11-10T19:00:00Z',
    source: 'cognitive_task',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-pvt-lapse-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'pvt_lapses',
    value: 3,
    unit: 'count',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'cognitive_task',
    quality: 'valid',
    is_synthetic: true
  },

  // Musculoskeletal Adherence & Function
  {
    observation_id: 'obs-ex-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'resistance_exercise_minutes',
    value: 60,
    unit: 'min',
    measured_at: T_MINUS_3D,
    created_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    source: 'wearable',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-ex-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'resistance_exercise_minutes',
    value: 45,
    unit: 'min',
    measured_at: T_MINUS_2D,
    created_at: T_MINUS_2D,
    received_at: '2026-11-12T19:00:00Z',
    source: 'wearable',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-grip-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'grip_strength',
    value: 44.5,
    unit: 'kgf',
    measured_at: T_MINUS_2D,
    created_at: T_MINUS_2D,
    received_at: '2026-11-12T19:00:00Z',
    source: 'medical_device',
    quality: 'valid',
    is_synthetic: true
  },

  // Musculoskeletal Periodic Biomarkers (Direct Laboratory Measurements)
  {
    observation_id: 'obs-bone-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'ctx_bone_resorption',
    value: 0.58,
    unit: 'ng/mL',
    measured_at: T_MINUS_7D,
    created_at: T_MINUS_7D,
    received_at: '2026-11-07T19:00:00Z',
    source: 'laboratory',
    quality: 'valid',
    is_synthetic: true,
    context: { assay_platform: 'ECLIA automated analyzer', specimen: 'fasting morning serum' }
  },
  {
    observation_id: 'obs-bone-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'p1np_bone_formation',
    value: 46.2,
    unit: 'ng/mL',
    measured_at: T_MINUS_7D,
    created_at: T_MINUS_7D,
    received_at: '2026-11-07T19:00:00Z',
    source: 'laboratory',
    quality: 'valid',
    is_synthetic: true,
    context: { assay_platform: 'ECLIA automated analyzer', specimen: 'fasting morning serum' }
  },

  // Personal Dosimeter Radiation Readings (Elena Vasquez)
  {
    observation_id: 'obs-rad-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'dose_rate',
    value: 28.5,
    unit: 'uSv/h',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'dosimeter',
    source_device_id: 'dev-personal-dosimeter-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-rad-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'dose_rate',
    value: 31.2,
    unit: 'uSv/h',
    measured_at: T_MINUS_2H,
    created_at: T_MINUS_2H,
    received_at: NOW,
    source: 'dosimeter',
    source_device_id: 'dev-personal-dosimeter-01',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-rad-03',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'dose_equivalent',
    value: 0.68,
    unit: 'mSv',
    measured_at: T_MINUS_1D,
    created_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    source: 'dosimeter',
    source_device_id: 'dev-personal-dosimeter-01',
    quality: 'valid',
    is_synthetic: true
  },

  // --- James Chen: Selected Measurements ---
  {
    observation_id: 'obs-chen-hr-01',
    astronaut_id: SECOND_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'heart_rate',
    value: 58,
    unit: 'bpm',
    measured_at: T_MINUS_4H,
    created_at: T_MINUS_4H,
    received_at: NOW,
    source: 'wearable',
    source_device_id: 'dev-biosensor-ring-02',
    quality: 'valid',
    is_synthetic: true
  },
  {
    observation_id: 'obs-chen-spo2-01',
    astronaut_id: SECOND_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    measurement_code: 'spo2',
    value: 99,
    unit: '%',
    measured_at: T_MINUS_4H,
    created_at: T_MINUS_4H,
    received_at: NOW,
    source: 'wearable',
    quality: 'valid',
    is_synthetic: true
  }
];

export const mockAssessments: ModuleAssessment[] = [
  {
    assessment_id: 'asm-cv-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'cardiovascular',
    status: 'monitor',
    summary: 'Mild elevation in resting heart rate (+4 bpm above personal baseline) with slight reduction in HRV-RMSSD over past 72 hours.',
    findings: [
      {
        finding_id: 'find-cv-01',
        description: 'HRV-RMSSD trending downward from 52 ms to 36 ms over 4 observation windows.',
        severity: 'low',
        evidence: [
          'HRV-RMSSD measured 36 ms at T-8h (personal baseline mean: 48 ms, range: 36-62 ms).',
          'Resting heart rate measured 58 bpm at T-8h (personal baseline mean: 54 bpm).'
        ],
        recommendation: 'Correlate with sleep architecture logs and physical workload schedule. Recheck resting vitals upon waking.'
      }
    ],
    inputs: [
      { observation_id: 'obs-hr-08', measurement_code: 'heart_rate', value: 75, unit: 'bpm', measured_at: T_MINUS_1H },
      { observation_id: 'obs-rhr-03', measurement_code: 'resting_heart_rate', value: 58, unit: 'bpm', measured_at: T_MINUS_8H },
      { observation_id: 'obs-hrv-04', measurement_code: 'hrv_rmssd', value: 36, unit: 'ms', measured_at: T_MINUS_8H }
    ],
    baselines_used: [
      mockBaselines[0], // heart_rate
      mockBaselines[1], // resting_heart_rate
      mockBaselines[2]  // hrv_rmssd
    ],
    algorithm_version: 'cv-assess-v0.3.2-deterministic',
    assessed_at: T_MINUS_1H,
    data_sufficiency: 'sufficient',
    data_quality_summary: 'Full continuous biometric telemetry stream available. Zero dropped packets.',
    recommended_actions: [
      'Schedule passive autonomous HRV night-trace review on Flight Day 143.',
      'Check hydration and electrolyte balance.'
    ],
    is_synthetic: true
  },
  {
    assessment_id: 'asm-sleep-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'behavioural_cognitive',
    status: 'attention',
    summary: 'Progressive cumulative sleep debt observed: sleep duration decreased from 7.4h to 5.4h over 5 consecutive cycles. Coincides with increased PVT reaction time.',
    findings: [
      {
        finding_id: 'find-sleep-01',
        description: 'Sleep duration significantly reduced below personal baseline minimum (5.4h vs 6.5h threshold).',
        severity: 'moderate',
        evidence: [
          'Cycle 141 sleep duration: 5.4h (baseline: 7.2 ± 0.6h).',
          'Cycle 140 sleep duration: 5.6h.'
        ],
        recommendation: 'Evaluate cabin lighting phase shifts and EVA preparation workload schedule.'
      },
      {
        finding_id: 'find-cog-01',
        description: 'Psychomotor vigilance task mean reaction time lengthened by 49 ms with 3 lapses recorded.',
        severity: 'moderate',
        evidence: [
          'PVT mean reaction time: 284 ms vs baseline 235 ms.',
          'PVT lapses recorded: 3 (baseline threshold: 0 lapses).'
        ],
        recommendation: 'Recommend crew sleep hygiene protocol and avoid critical teleoperation tasks prior to rest cycle.'
      }
    ],
    inputs: [
      { observation_id: 'obs-sleep-05', measurement_code: 'sleep_duration', value: 5.4, unit: 'h', measured_at: T_MINUS_1D },
      { observation_id: 'obs-pvt-02', measurement_code: 'pvt_mean_reaction_time', value: 284, unit: 'ms', measured_at: T_MINUS_1D },
      { observation_id: 'obs-pvt-lapse-02', measurement_code: 'pvt_lapses', value: 3, unit: 'count', measured_at: T_MINUS_1D }
    ],
    baselines_used: [
      mockBaselines[5], // sleep_duration
      mockBaselines[6]  // pvt
    ],
    algorithm_version: 'neuro-sleep-cog-v0.3.0',
    assessed_at: T_MINUS_2H,
    data_sufficiency: 'sufficient',
    data_quality_summary: 'Self-reported ratings and objective PVT telemetry matched.',
    recommended_actions: [
      'Crew Medical Officer review of sleep schedule protocol MED-S-12.',
      'Adjust cabin circadian lighting spectrum.'
    ],
    is_synthetic: true
  },
  {
    assessment_id: 'asm-env-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'environmental',
    status: 'attention',
    summary: 'Cabin CO₂ level transiently spiked to 4,200 ppm during high-activity cycle, triggering environmental alert threshold (3,800 ppm limit).',
    findings: [
      {
        finding_id: 'find-co2-01',
        description: 'Cabin atmospheric CO₂ concentration elevated in Sleep Quarter 1.',
        severity: 'high',
        evidence: [
          'Cabin sensor sens-co2-sq1 reported 4,200 ppm at 14:15 UTC.',
          'Scrubber bed A cycling rate operating at 88% nominal capacity.'
        ],
        recommendation: 'Verify CDRA (Carbon Dioxide Removal Assembly) valve selector and swap scrubber canister beds.'
      }
    ],
    inputs: [
      { observation_id: 'env-co2-03', measurement_code: 'cabin_co2', value: 4200, unit: 'ppm', measured_at: T_MINUS_4H }
    ],
    baselines_used: [],
    algorithm_version: 'env-biosphere-v0.2.8',
    assessed_at: T_MINUS_4H,
    data_sufficiency: 'sufficient',
    data_quality_summary: 'Verified via dual redundant infrared gas analyzers.',
    recommended_actions: [
      'ECLSS flight controller notification dispatched.',
      'Astronaut cabin ventilation flow increased to max fan setting.'
    ],
    is_synthetic: true
  },
  {
    assessment_id: 'asm-msk-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'musculoskeletal',
    status: 'normal',
    summary: 'Resistance exercise regimen adherence remains 92% of target volume. Grip strength and bone resorption biochemical markers within expected flight tolerances.',
    findings: [],
    inputs: [
      { observation_id: 'obs-ex-02', measurement_code: 'resistance_exercise_minutes', value: 45, unit: 'min', measured_at: T_MINUS_2D },
      { observation_id: 'obs-grip-01', measurement_code: 'grip_strength', value: 44.5, unit: 'kgf', measured_at: T_MINUS_2D },
      { observation_id: 'obs-bone-01', measurement_code: 'ctx_bone_resorption', value: 0.58, unit: 'ng/mL', measured_at: T_MINUS_7D }
    ],
    baselines_used: [],
    algorithm_version: 'bone-muscle-v0.2.1',
    assessed_at: T_MINUS_1D,
    data_sufficiency: 'sufficient',
    data_quality_summary: 'Direct laboratory serum marker paired with ARED telemetry.',
    recommended_actions: ['Maintain prescribed 60 min/day countermeasure loading.'],
    is_synthetic: true
  },
  {
    assessment_id: 'asm-imm-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'immune',
    status: 'insufficient_data',
    summary: 'Insufficient data to evaluate immune status. Periodic flight laboratory blood draw is scheduled for Flight Day 145.',
    findings: [
      {
        finding_id: 'find-imm-01',
        description: 'No complete blood count (CBC) or inflammatory cytokine panel received within the last 14 days.',
        severity: 'info',
        evidence: [
          'Last recorded lab draw: Flight Day 128.',
          'Current mission flight day: Flight Day 142.'
        ],
        recommendation: 'Do not infer immune suppression or competency from symptom absence alone. Await planned on-board mini-PCR/CBC assay.'
      }
    ],
    inputs: [],
    baselines_used: [],
    algorithm_version: 'immune-surveillance-v0.1.9',
    assessed_at: T_MINUS_1D,
    data_sufficiency: 'insufficient',
    data_quality_summary: 'Missing required laboratory panel inputs. Domain evaluation held.',
    recommended_actions: ['Confirm consumable inventory for Flight Day 145 sample run.'],
    is_synthetic: true
  },
  {
    assessment_id: 'asm-rad-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'radiation',
    status: 'normal',
    summary: 'Personal radiation cumulative exposure within nominal galactic cosmic ray (GCR) background expectations. No solar particle event (SPE) detected.',
    findings: [],
    inputs: [
      { observation_id: 'obs-rad-02', measurement_code: 'dose_rate', value: 31.2, unit: 'uSv/h', measured_at: T_MINUS_2H }
    ],
    baselines_used: [],
    algorithm_version: 'rad-dosimetry-v0.3.0',
    assessed_at: T_MINUS_2H,
    data_sufficiency: 'sufficient',
    data_quality_summary: 'Personal silicon dosimeter sensor self-test passed.',
    recommended_actions: ['Continue passive integration.'],
    is_synthetic: true
  },
  {
    assessment_id: 'asm-dq-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'data_quality',
    status: 'normal',
    summary: 'Data synchronization checksums and cryptographic hashes verified. Clock drift measured at +0.12s across dual clients.',
    findings: [],
    inputs: [],
    baselines_used: [],
    algorithm_version: 'audit-sync-v0.2.0',
    assessed_at: T_MINUS_1H,
    data_sufficiency: 'sufficient',
    data_quality_summary: '100% hash match on 42 recent synchronized envelopes.',
    recommended_actions: [],
    is_synthetic: true
  }
];

export const mockAlerts: Alert[] = [
  {
    alert_id: 'alt-co2-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'environmental',
    severity: 'high',
    title: 'Cabin CO₂ Exceeds Operational Upper Limit (4,200 ppm)',
    description: 'Autonomous environmental sensor reported carbon dioxide concentration reaching 4,200 ppm in Sleep Quarter 1, exceeding the 3,800 ppm flight rule limit.',
    evidence_summary: 'Reading confirmed by dual infrared sensors; duration above threshold > 45 minutes.',
    assessment_id: 'asm-env-01',
    assigned_to: 'Dr. Sarah Connor (Flight Surgeon / ECLSS Console)',
    status: 'open',
    created_at: T_MINUS_4H,
    follow_up_deadline: '2026-11-14T20:00:00Z',
    events: [
      {
        event_id: 'ae-01',
        alert_id: 'alt-co2-01',
        action: 'Alert generated by automated environmental rule-set',
        actor: 'system',
        timestamp: T_MINUS_4H
      }
    ],
    is_synthetic: true
  },
  {
    alert_id: 'alt-sleep-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'behavioural_cognitive',
    severity: 'moderate',
    title: 'Progressive Cumulative Sleep Debt & PVT Reaction Degradation',
    description: 'Longitudinal analysis detected 5 consecutive rest cycles below baseline minimum, paired with 49 ms reaction latency increase on PVT.',
    evidence_summary: 'Sleep duration: 5.4h (Cycle 141), PVT reaction time: 284 ms (+20.8% vs personal baseline), 3 lapses.',
    assessment_id: 'asm-sleep-01',
    assigned_to: 'Dr. Marcus Vance (Behavioral Health Lead)',
    status: 'acknowledged',
    created_at: T_MINUS_2H,
    follow_up_deadline: '2026-11-15T12:00:00Z',
    events: [
      {
        event_id: 'ae-02',
        alert_id: 'alt-sleep-01',
        action: 'Alert generated by neuro-cognitive module',
        actor: 'system',
        timestamp: T_MINUS_2H
      },
      {
        event_id: 'ae-03',
        alert_id: 'alt-sleep-01',
        action: 'Acknowledged finding; flagged for crew telecon discussion',
        actor: 'Dr. Marcus Vance',
        note: 'Reviewing EVA workload shift. Will coordinate with Flight Director to reschedule high-demand robotic arm training.',
        timestamp: T_MINUS_1H
      }
    ],
    is_synthetic: true
  },
  {
    alert_id: 'alt-ex-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'musculoskeletal',
    severity: 'low',
    title: 'Shortened Resistance Countermeasure Session (Flight Day 140)',
    description: 'Astronaut completed 45 minutes of scheduled 60-minute resistance training workout on ARED apparatus.',
    evidence_summary: 'Session logged 45 min; astronaut noted minor wrist soreness from cargo repositioning.',
    assessment_id: 'asm-msk-01',
    assigned_to: 'Dr. Elena Rostova (ASCR Lead)',
    status: 'resolved',
    created_at: T_MINUS_2D,
    follow_up_deadline: T_MINUS_1D,
    events: [
      {
        event_id: 'ae-04',
        alert_id: 'alt-ex-01',
        action: 'Alert generated',
        actor: 'system',
        timestamp: T_MINUS_2D
      },
      {
        event_id: 'ae-05',
        alert_id: 'alt-ex-01',
        action: 'Wrist wrap protocol verified; compensatory volume added to Cycle 142 schedule.',
        actor: 'Dr. Elena Rostova',
        note: 'Follow-up confirmed wrist pain resolved with neutral grip bar adaptation.',
        timestamp: T_MINUS_1D
      }
    ],
    is_synthetic: true
  },
  {
    alert_id: 'alt-base-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    health_domain: 'cardiovascular',
    severity: 'info',
    title: 'Routine 90-Day Baseline Window Recalibration Due',
    description: 'Personal baseline window is scheduled for periodic review and recalibration to account for microgravity cardiovascular adaptation.',
    evidence_summary: 'Current baseline established at Flight Day 0; protocol recommends 90-day adaptive evaluation.',
    assigned_to: 'Dr. Sarah Connor',
    status: 'open',
    created_at: T_MINUS_1D,
    follow_up_deadline: '2026-11-20T00:00:00Z',
    events: [
      {
        event_id: 'ae-06',
        alert_id: 'alt-base-01',
        action: 'Scheduled recalibration notification created',
        actor: 'system',
        timestamp: T_MINUS_1D
      }
    ],
    is_synthetic: true
  }
];

export const mockActions: FollowUpAction[] = [
  {
    action_id: 'act-01',
    alert_id: 'alt-co2-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    protocol_reference: 'ECLSS-FD-142-CO2-SCRUB',
    description: 'Verify Carbon Dioxide Removal Assembly (CDRA) valve cycle rate and instruct crew to inspect SQ-1 air diffuser vents.',
    assigned_to: 'Dr. Sarah Connor',
    status: 'in_progress',
    deadline: '2026-11-14T21:00:00Z',
    events: [
      {
        event_id: 'act-e-01',
        action_id: 'act-01',
        action_type: 'Action Created',
        actor: 'Dr. Sarah Connor',
        note: 'ECLSS console confirmed Scrubber A duty cycle increased to 100%. Waiting for confirmation telemetry.',
        timestamp: T_MINUS_3H
      }
    ],
    created_at: T_MINUS_3H,
    is_synthetic: true
  },
  {
    action_id: 'act-02',
    alert_id: 'alt-sleep-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    protocol_reference: 'MED-BEH-CIRC-04',
    description: 'Implement melatonin 0.5mg countermeasure protocol and shift cabin light spectrum to 2700K 60 minutes prior to sleep onset.',
    assigned_to: 'Dr. Marcus Vance',
    status: 'pending',
    deadline: '2026-11-15T08:00:00Z',
    events: [],
    created_at: T_MINUS_1H,
    is_synthetic: true
  },
  {
    action_id: 'act-03',
    alert_id: 'alt-ex-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    mission_id: DEMO_MISSION_ID,
    protocol_reference: 'ASCR-ARED-WRIST-02',
    description: 'Inspect neutral grip handle attachment and adjust eccentric loading curve for wrist protection.',
    assigned_to: 'Dr. Elena Rostova',
    status: 'completed',
    deadline: T_MINUS_1D,
    events: [
      {
        event_id: 'act-e-02',
        action_id: 'act-03',
        action_type: 'Action Resolved',
        actor: 'Dr. Elena Rostova',
        note: 'Crew confirmed neutral grip bar installed and verified pain-free during today warmup.',
        timestamp: T_MINUS_1D
      }
    ],
    created_at: T_MINUS_2D,
    is_synthetic: true
  }
];

export const mockCommunicationStatus: CommunicationStatus = {
  client_id: DEMO_CLIENT_ID,
  state: 'LIVE',
  observed_at: NOW,
  last_successful_contact_at: T_MINUS_1H,
  queued_event_count: 0
};

export const mockSyncBatches: SyncBatch[] = [
  {
    batch_id: 'batch-sync-142-05',
    direction: 'push',
    event_count: 8,
    created_at: T_MINUS_1H,
    received_at: NOW,
    acknowledged_at: NOW,
    status: 'accepted',
    retry_count: 0,
    events: [
      { event_id: 'ev-01', entity_type: 'observation', status: 'accepted', received_at: NOW },
      { event_id: 'ev-02', entity_type: 'observation', status: 'accepted', received_at: NOW },
      { event_id: 'ev-03', entity_type: 'module_assessment', status: 'accepted', received_at: NOW },
      { event_id: 'ev-04', entity_type: 'communication_status', status: 'accepted', received_at: NOW }
    ],
    notes: 'Nominal telemetry dump via orbital tracking relay.'
  },
  {
    batch_id: 'batch-sync-142-04',
    direction: 'push',
    event_count: 14,
    created_at: T_MINUS_4H,
    received_at: T_MINUS_3H,
    acknowledged_at: T_MINUS_3H,
    status: 'accepted',
    retry_count: 0,
    events: [
      { event_id: 'ev-05', entity_type: 'observation', status: 'accepted', received_at: T_MINUS_3H }
    ]
  },
  {
    batch_id: 'batch-sync-142-03',
    direction: 'pull',
    event_count: 3,
    created_at: T_MINUS_8H,
    received_at: T_MINUS_8H,
    acknowledged_at: T_MINUS_8H,
    status: 'accepted',
    retry_count: 0,
    events: [
      { event_id: 'ev-06', entity_type: 'message', status: 'accepted' }
    ],
    notes: 'Medical team downlink message batch delivery.'
  },
  {
    batch_id: 'batch-sync-142-02',
    direction: 'push',
    event_count: 6,
    created_at: T_MINUS_1D,
    received_at: T_MINUS_1D,
    acknowledged_at: T_MINUS_1D,
    status: 'accepted',
    retry_count: 1,
    events: [
      { event_id: 'ev-07', entity_type: 'observation', status: 'duplicate' }
    ],
    notes: 'Packet retry after antenna handover signal interruption.'
  },
  {
    batch_id: 'batch-sync-142-01',
    direction: 'push',
    event_count: 4,
    created_at: T_MINUS_2D,
    received_at: T_MINUS_2D,
    status: 'failed',
    retry_count: 3,
    events: [
      { event_id: 'ev-08', entity_type: 'sync_event', status: 'rejected' }
    ],
    notes: 'Payload hash verification mismatch on envelope 08; successfully resubmitted in batch 02.'
  }
];

export const mockMessages: Message[] = [
  {
    message_id: 'msg-01',
    mission_id: DEMO_MISSION_ID,
    astronaut_id: DEMO_ASTRONAUT_ID,
    sender_id: 'user-med-01',
    sender_role: 'medical_officer',
    sender_name: 'Dr. Sarah Connor (Ground Flight Surgeon)',
    recipient_id: DEMO_ASTRONAUT_ID,
    recipient_name: 'Cmdr. Elena Vasquez',
    subject: 'Sleep Quarter 1 Air Circulation & Diffuser Check',
    body: 'Elena, telemetry noted a transient CO₂ peak in SQ-1. Flight Director has requested checking the ventilation grill diffuser behind bunk 1 for any stowed items or obstruction. Please confirm clearance when convenient.',
    priority: 'priority',
    protocol_reference: 'ECLSS-VENT-INSPECT-01',
    status: 'read',
    created_at: T_MINUS_3H,
    delivered_at: T_MINUS_2H,
    read_at: T_MINUS_1H,
    events: [
      { event_id: 'me-01', message_id: 'msg-01', status: 'queued', timestamp: T_MINUS_3H },
      { event_id: 'me-02', message_id: 'msg-01', status: 'sent', timestamp: T_MINUS_3H },
      { event_id: 'me-03', message_id: 'msg-01', status: 'delivered', timestamp: T_MINUS_2H },
      { event_id: 'me-04', message_id: 'msg-01', status: 'read', timestamp: T_MINUS_1H }
    ],
    is_synthetic: true
  },
  {
    message_id: 'msg-02',
    mission_id: DEMO_MISSION_ID,
    astronaut_id: DEMO_ASTRONAUT_ID,
    sender_id: DEMO_ASTRONAUT_ID,
    sender_role: 'crew_member',
    sender_name: 'Cmdr. Elena Vasquez',
    recipient_id: 'user-med-01',
    recipient_name: 'Dr. Sarah Connor (Ground Flight Surgeon)',
    subject: 'RE: Sleep Quarter 1 Air Circulation & Diffuser Check',
    body: 'Copy Sarah. Inspected SQ-1 vent. A thermal jacket was partially draping over the return intake. Moved to locker 3. Vent clear now and fan audible.',
    priority: 'routine',
    status: 'delivered',
    created_at: T_MINUS_1H,
    delivered_at: NOW,
    events: [
      { event_id: 'me-05', message_id: 'msg-02', status: 'queued', timestamp: T_MINUS_1H },
      { event_id: 'me-06', message_id: 'msg-02', status: 'sent', timestamp: T_MINUS_1H },
      { event_id: 'me-07', message_id: 'msg-02', status: 'delivered', timestamp: NOW }
    ],
    is_synthetic: true
  },
  {
    message_id: 'msg-03',
    mission_id: DEMO_MISSION_ID,
    astronaut_id: DEMO_ASTRONAUT_ID,
    sender_id: 'user-med-02',
    sender_role: 'medical_officer',
    sender_name: 'Dr. Marcus Vance (Behavioral Health Lead)',
    recipient_id: DEMO_ASTRONAUT_ID,
    recipient_name: 'Cmdr. Elena Vasquez',
    subject: 'Circadian Light Adjustment Recommendation',
    body: 'Elena, we noticed sleep duration has been compressed over the last few nights. We are adjusting the evening cabin lighting preset to warm amber 45 minutes earlier tonight. Let us know how sleep quality feels tomorrow.',
    priority: 'routine',
    protocol_reference: 'MED-BEH-CIRC-04',
    status: 'acknowledged',
    created_at: T_MINUS_1D,
    delivered_at: T_MINUS_1D,
    read_at: T_MINUS_1D,
    acknowledged_at: T_MINUS_1D,
    events: [
      { event_id: 'me-08', message_id: 'msg-03', status: 'sent', timestamp: T_MINUS_1D },
      { event_id: 'me-09', message_id: 'msg-03', status: 'delivered', timestamp: T_MINUS_1D },
      { event_id: 'me-10', message_id: 'msg-03', status: 'read', timestamp: T_MINUS_1D },
      { event_id: 'me-11', message_id: 'msg-03', status: 'acknowledged', timestamp: T_MINUS_1D }
    ],
    is_synthetic: true
  },
  {
    message_id: 'msg-04',
    mission_id: DEMO_MISSION_ID,
    astronaut_id: SECOND_ASTRONAUT_ID,
    sender_id: 'user-med-01',
    sender_role: 'medical_officer',
    sender_name: 'Dr. Sarah Connor (Ground Flight Surgeon)',
    recipient_id: SECOND_ASTRONAUT_ID,
    recipient_name: 'Dr. James Chen',
    subject: 'Flight Day 145 Blood Draw & Mini-PCR Reagents Check',
    body: 'James, please confirm centrifuge tube availability and reagent cassette expiration dates for the FD145 immune surveillance protocol.',
    priority: 'routine',
    status: 'sent',
    created_at: T_MINUS_2H,
    events: [
      { event_id: 'me-12', message_id: 'msg-04', status: 'queued', timestamp: T_MINUS_2H },
      { event_id: 'me-13', message_id: 'msg-04', status: 'sent', timestamp: T_MINUS_2H }
    ],
    is_synthetic: true
  },
  {
    message_id: 'msg-05',
    mission_id: DEMO_MISSION_ID,
    sender_id: 'user-admin-01',
    sender_role: 'administrator',
    sender_name: 'Ground Operations Lead',
    recipient_name: 'All Crew',
    subject: 'Deep Space Optical Link Test Window',
    body: 'High-bandwidth optical laser terminal test window scheduled for Flight Day 143 at 08:00 UTC. Expect high data throughput for 45 minutes.',
    priority: 'routine',
    status: 'draft',
    created_at: T_MINUS_4H,
    events: [
      { event_id: 'me-14', message_id: 'msg-05', status: 'draft', timestamp: T_MINUS_4H }
    ],
    is_synthetic: true
  },
  {
    message_id: 'msg-06',
    mission_id: DEMO_MISSION_ID,
    astronaut_id: DEMO_ASTRONAUT_ID,
    sender_id: 'user-med-01',
    sender_role: 'medical_officer',
    sender_name: 'Dr. Sarah Connor',
    recipient_id: DEMO_ASTRONAUT_ID,
    recipient_name: 'Cmdr. Elena Vasquez',
    subject: 'Unacknowledged Medical Notice during Outpass (Simulation)',
    body: 'Simulated expired test dispatch message demonstrating timeout handling when orbital downlink window expires.',
    priority: 'routine',
    status: 'expired',
    created_at: T_MINUS_6D,
    expires_at: T_MINUS_5D,
    events: [
      { event_id: 'me-15', message_id: 'msg-06', status: 'expired', timestamp: T_MINUS_5D }
    ],
    is_synthetic: true
  }
];

export const mockEnvironmentalReadings: EnvironmentalReading[] = [
  // Cabin CO2
  {
    reading_id: 'env-co2-01',
    measurement_code: 'cabin_co2',
    value: 3100,
    unit: 'ppm',
    sensor_id: 'sens-co2-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_12H,
    received_at: T_MINUS_8H,
    is_synthetic: true
  },
  {
    reading_id: 'env-co2-02',
    measurement_code: 'cabin_co2',
    value: 3600,
    unit: 'ppm',
    sensor_id: 'sens-co2-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_6H,
    received_at: T_MINUS_4H,
    is_synthetic: true
  },
  {
    reading_id: 'env-co2-03',
    measurement_code: 'cabin_co2',
    value: 4200,
    unit: 'ppm',
    sensor_id: 'sens-co2-sq1',
    location: 'Sleep Quarter 1',
    measured_at: T_MINUS_4H,
    received_at: T_MINUS_3H,
    is_synthetic: true
  },
  {
    reading_id: 'env-co2-04',
    measurement_code: 'cabin_co2',
    value: 3450,
    unit: 'ppm',
    sensor_id: 'sens-co2-sq1',
    location: 'Sleep Quarter 1 (Post-Ventilation)',
    measured_at: T_MINUS_1H,
    received_at: NOW,
    is_synthetic: true
  },

  // Cabin Temperature
  {
    reading_id: 'env-temp-01',
    measurement_code: 'cabin_temperature',
    value: 21.8,
    unit: 'degC',
    sensor_id: 'sens-temp-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_12H,
    received_at: T_MINUS_8H,
    is_synthetic: true
  },
  {
    reading_id: 'env-temp-02',
    measurement_code: 'cabin_temperature',
    value: 22.4,
    unit: 'degC',
    sensor_id: 'sens-temp-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_6H,
    received_at: T_MINUS_4H,
    is_synthetic: true
  },
  {
    reading_id: 'env-temp-03',
    measurement_code: 'cabin_temperature',
    value: 22.1,
    unit: 'degC',
    sensor_id: 'sens-temp-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_1H,
    received_at: NOW,
    is_synthetic: true
  },

  // Relative Humidity
  {
    reading_id: 'env-hum-01',
    measurement_code: 'relative_humidity',
    value: 44.5,
    unit: '%',
    sensor_id: 'sens-hum-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_12H,
    received_at: T_MINUS_8H,
    is_synthetic: true
  },
  {
    reading_id: 'env-hum-02',
    measurement_code: 'relative_humidity',
    value: 46.2,
    unit: '%',
    sensor_id: 'sens-hum-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_6H,
    received_at: T_MINUS_4H,
    is_synthetic: true
  },
  {
    reading_id: 'env-hum-03',
    measurement_code: 'relative_humidity',
    value: 45.0,
    unit: '%',
    sensor_id: 'sens-hum-hab-01',
    location: 'Central Habitat Core',
    measured_at: T_MINUS_1H,
    received_at: NOW,
    is_synthetic: true
  },

  // Cabin Pressure
  {
    reading_id: 'env-press-01',
    measurement_code: 'cabin_pressure',
    value: 101.3,
    unit: 'kPa',
    sensor_id: 'sens-baro-hab-01',
    location: 'Atmospheric Bulkhead Node 1',
    measured_at: T_MINUS_12H,
    received_at: T_MINUS_8H,
    is_synthetic: true
  },
  {
    reading_id: 'env-press-02',
    measurement_code: 'cabin_pressure',
    value: 101.2,
    unit: 'kPa',
    sensor_id: 'sens-baro-hab-01',
    location: 'Atmospheric Bulkhead Node 1',
    measured_at: T_MINUS_1H,
    received_at: NOW,
    is_synthetic: true
  }
];

export const mockRadiationReadings: RadiationReading[] = [
  // Personal dosimeter (Elena Vasquez)
  {
    reading_id: 'rad-pers-01',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'dose_rate',
    value: 26.4,
    unit: 'uSv/h',
    source_device: 'dev-personal-dosimeter-01',
    sensor_type: 'personal_dosimeter',
    measured_at: T_MINUS_3D,
    received_at: '2026-11-11T19:00:00Z',
    cumulative_dose: 18.2,
    cumulative_unit: 'mSv',
    is_synthetic: true
  },
  {
    reading_id: 'rad-pers-02',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'dose_rate',
    value: 28.5,
    unit: 'uSv/h',
    source_device: 'dev-personal-dosimeter-01',
    sensor_type: 'personal_dosimeter',
    measured_at: T_MINUS_1D,
    received_at: '2026-11-13T19:00:00Z',
    cumulative_dose: 18.9,
    cumulative_unit: 'mSv',
    is_synthetic: true
  },
  {
    reading_id: 'rad-pers-03',
    astronaut_id: DEMO_ASTRONAUT_ID,
    measurement_code: 'dose_rate',
    value: 31.2,
    unit: 'uSv/h',
    source_device: 'dev-personal-dosimeter-01',
    sensor_type: 'personal_dosimeter',
    measured_at: T_MINUS_2H,
    received_at: NOW,
    cumulative_dose: 19.1,
    cumulative_unit: 'mSv',
    is_synthetic: true
  },

  // Personal dosimeter (James Chen)
  {
    reading_id: 'rad-pers-04',
    astronaut_id: SECOND_ASTRONAUT_ID,
    measurement_code: 'dose_rate',
    value: 29.8,
    unit: 'uSv/h',
    source_device: 'dev-personal-dosimeter-02',
    sensor_type: 'personal_dosimeter',
    measured_at: T_MINUS_4H,
    received_at: NOW,
    cumulative_dose: 18.7,
    cumulative_unit: 'mSv',
    is_synthetic: true
  },

  // Habitat Area Monitors (Environmental Radiation — strictly separated from personal)
  {
    reading_id: 'rad-env-01',
    measurement_code: 'dose_rate',
    value: 22.1,
    unit: 'uSv/h',
    source_device: 'hab-rad-monitor-storm-shelter',
    sensor_type: 'habitat_area_monitor',
    measured_at: T_MINUS_12H,
    received_at: T_MINUS_8H,
    cumulative_dose: 14.2,
    cumulative_unit: 'mSv',
    is_synthetic: true
  },
  {
    reading_id: 'rad-env-02',
    measurement_code: 'dose_rate',
    value: 38.6,
    unit: 'uSv/h',
    source_device: 'hab-rad-monitor-unshielded-bay',
    sensor_type: 'habitat_area_monitor',
    measured_at: T_MINUS_12H,
    received_at: T_MINUS_8H,
    cumulative_dose: 25.4,
    cumulative_unit: 'mSv',
    is_synthetic: true
  },
  {
    reading_id: 'rad-env-03',
    measurement_code: 'dose_rate',
    value: 22.4,
    unit: 'uSv/h',
    source_device: 'hab-rad-monitor-storm-shelter',
    sensor_type: 'habitat_area_monitor',
    measured_at: T_MINUS_2H,
    received_at: NOW,
    cumulative_dose: 14.5,
    cumulative_unit: 'mSv',
    is_synthetic: true
  },
  {
    reading_id: 'rad-env-04',
    measurement_code: 'dose_rate',
    value: 39.1,
    unit: 'uSv/h',
    source_device: 'hab-rad-monitor-unshielded-bay',
    sensor_type: 'habitat_area_monitor',
    measured_at: T_MINUS_2H,
    received_at: NOW,
    cumulative_dose: 25.8,
    cumulative_unit: 'mSv',
    is_synthetic: true
  }
];

export const mockRecentActivity: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'sync',
    description: 'Sync batch 142-05 acknowledged: 8 health observation envelopes ingested.',
    timestamp: NOW
  },
  {
    id: 'act-2',
    type: 'message',
    description: 'New crew message received from Cmdr. Elena Vasquez regarding SQ-1 vent clearance.',
    astronaut_name: 'Cmdr. Elena Vasquez',
    astronaut_id: DEMO_ASTRONAUT_ID,
    timestamp: T_MINUS_1H
  },
  {
    id: 'act-3',
    type: 'assessment',
    description: 'Cardiovascular deterministic assessment updated (status: MONITOR).',
    astronaut_name: 'Cmdr. Elena Vasquez',
    astronaut_id: DEMO_ASTRONAUT_ID,
    timestamp: T_MINUS_1H
  },
  {
    id: 'act-4',
    type: 'alert',
    description: 'Behavioral sleep debt alert acknowledged by Dr. Marcus Vance.',
    astronaut_name: 'Cmdr. Elena Vasquez',
    astronaut_id: DEMO_ASTRONAUT_ID,
    timestamp: T_MINUS_1H
  },
  {
    id: 'act-5',
    type: 'assessment',
    description: 'Neuro-cognitive PVT evaluation generated: 284 ms reaction latency recorded.',
    astronaut_name: 'Cmdr. Elena Vasquez',
    astronaut_id: DEMO_ASTRONAUT_ID,
    timestamp: T_MINUS_2H
  },
  {
    id: 'act-6',
    type: 'alert',
    description: 'Cabin atmospheric CO₂ alert created (4,200 ppm exceeded upper limit).',
    timestamp: T_MINUS_4H
  },
  {
    id: 'act-7',
    type: 'measurement',
    description: 'Dr. James Chen biometric stream synced: HR 58 bpm, SpO₂ 99%.',
    astronaut_name: 'Dr. James Chen',
    astronaut_id: SECOND_ASTRONAUT_ID,
    timestamp: T_MINUS_4H
  },
  {
    id: 'act-8',
    type: 'action',
    description: 'Action ACT-03 marked COMPLETED: neutral grip bar adapter installed.',
    astronaut_name: 'Cmdr. Elena Vasquez',
    astronaut_id: DEMO_ASTRONAUT_ID,
    timestamp: T_MINUS_1D
  }
];

export const mockAttentionItems: AttentionItem[] = [
  {
    id: 'att-1',
    type: 'unacknowledged_finding',
    title: 'High Cabin CO₂ Spike (4,200 ppm)',
    description: 'Atmospheric CO₂ exceeded flight rule 3,800 ppm threshold. Scrubber duty cycle increased; awaiting confirmation telemetry.',
    severity: 'high',
    created_at: T_MINUS_4H,
    action_route: '/alerts'
  },
  {
    id: 'att-2',
    type: 'overdue_followup',
    title: 'Sleep Debt Mitigation Review (Cmdr. Vasquez)',
    description: 'Cumulative sleep debt continues over 5 cycles with PVT latency degradation. Protocol MED-BEH-CIRC-04 action pending.',
    astronaut_name: 'Cmdr. Elena Vasquez',
    astronaut_id: DEMO_ASTRONAUT_ID,
    severity: 'moderate',
    created_at: T_MINUS_2H,
    action_route: '/alerts'
  },
  {
    id: 'att-3',
    type: 'missing_assessment',
    title: 'Immune Surveillance Laboratory Panel Due',
    description: 'Flight Day 145 periodic blood draw required to evaluate immune suppression markers. Current status: INSUFFICIENT DATA.',
    astronaut_name: 'Cmdr. Elena Vasquez',
    astronaut_id: DEMO_ASTRONAUT_ID,
    severity: 'info',
    created_at: T_MINUS_1D,
    action_route: '/assessments'
  },
  {
    id: 'att-4',
    type: 'stale_data',
    title: 'Dr. James Chen Biometrics Age: 4 Hours',
    description: 'Last synchronized biometrics received at 14:30 UTC. Telemetry expected on next orbital downlink.',
    astronaut_name: 'Dr. James Chen',
    astronaut_id: SECOND_ASTRONAUT_ID,
    severity: 'low',
    created_at: T_MINUS_4H,
    action_route: '/crew/44444444-4444-4444-4444-444444444444'
  }
];

export function getMockDashboardSummary(): DashboardSummary {
  return {
    mission: mockMissionSummary,
    crew: mockCrewSummary,
    recent_activity: mockRecentActivity,
    attention_items: mockAttentionItems
  };
}

export function getMockObservationsForAstronaut(
  astronautId: string,
  measurementCode?: string
): Observation[] {
  return mockObservations.filter(
    (obs) => obs.astronaut_id === astronautId && (!measurementCode || obs.measurement_code === measurementCode)
  );
}

export function getMockAssessmentsForAstronaut(
  astronautId?: string,
  domain?: string
): ModuleAssessment[] {
  return mockAssessments.filter(
    (asm) => (!astronautId || asm.astronaut_id === astronautId) && (!domain || asm.health_domain === domain)
  );
}

export function getMockAlertsFiltered(filters?: {
  astronautId?: string;
  status?: string;
  severity?: string;
}): Alert[] {
  return mockAlerts.filter((alt) => {
    if (filters?.astronautId && alt.astronaut_id !== filters.astronautId) return false;
    if (filters?.status && filters.status !== 'all' && alt.status !== filters.status) return false;
    if (filters?.severity && filters.severity !== 'all' && alt.severity !== filters.severity) return false;
    return true;
  });
}

export function getMockMessagesFiltered(filters?: {
  astronautId?: string;
  status?: string;
}): Message[] {
  return mockMessages.filter((msg) => {
    if (filters?.astronautId && msg.astronaut_id !== filters.astronautId) return false;
    if (filters?.status && filters.status !== 'all' && msg.status !== filters.status) return false;
    return true;
  });
}
