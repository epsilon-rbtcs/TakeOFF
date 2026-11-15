// Ground Health Console — Utilities
// Formats timestamps with provenance, maps medical units and domain metadata

import { HealthDomain, AssessmentStatus, AlertSeverity, CommunicationState, DataFreshness, Observation } from '../types';

/**
 * Format timestamp with specific representation
 */
export function formatTimestamp(
  iso?: string | null,
  options: 'full' | 'date' | 'time' | 'relative' = 'full'
): string {
  if (!iso) return 'Not recorded';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    if (options === 'relative') {
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return `${Math.max(0, diffSec)}s ago`;
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${diffDays}d ago`;
    }

    if (options === 'date') {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) + ' UTC';
    }

    if (options === 'time') {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
    }

    // Default 'full'
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
    return `${dateStr} ${timeStr}`;
  } catch {
    return iso;
  }
}

/**
 * Formats duration in hours/minutes
 */
export function formatDuration(hours: number): string {
  if (isNaN(hours)) return '—';
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formats measurement value and unit correctly according to spec
 */
export function formatValue(value: number | undefined | null, unit: string, precision?: number): string {
  if (value === undefined || value === null || isNaN(value)) return '—';

  let formattedVal = precision !== undefined ? value.toFixed(precision) : value.toString();

  // Unit symbol mapping
  const unitMap: Record<string, string> = {
    bpm: 'bpm',
    mmHg: 'mmHg',
    ms: 'ms',
    '%': '%',
    degC: '°C',
    h: 'h',
    min: 'min',
    score_0_10: '/10',
    ppm: 'ppm',
    kPa: 'kPa',
    mSv: 'mSv',
    mGy: 'mGy',
    'uSv/h': 'µSv/h',
    'mSv/h': 'mSv/h',
    mL: 'mL',
    assay_specific: 'assay-specific',
    count: '',
    kgf: 'kgf',
    'g/cm2': 'g/cm²',
    '10^9/L': '×10⁹/L',
    'mg/L': 'mg/L',
    'ng/mL': 'ng/mL',
    'mg/dL': 'mg/dL',
    'keV/um': 'keV/µm'
  };

  const displayUnit = unitMap[unit] ?? unit;
  return displayUnit ? `${formattedVal} ${displayUnit}` : formattedVal;
}

/**
 * Map measurement code to human-readable clinical label
 */
export function getMeasurementLabel(code: string): string {
  const map: Record<string, string> = {
    heart_rate: 'Heart Rate',
    resting_heart_rate: 'Resting Heart Rate',
    hrv_rmssd: 'HRV (RMSSD)',
    systolic_bp: 'Systolic Blood Pressure',
    diastolic_bp: 'Diastolic Blood Pressure',
    spo2: 'SpO₂ Oxygen Saturation',
    body_temperature: 'Body Temperature',
    heart_rate_recovery_60s: 'HR Recovery (60s)',
    sleep_duration: 'Sleep Duration',
    sleep_efficiency: 'Sleep Efficiency',
    wake_after_sleep_onset: 'Wake After Sleep Onset (WASO)',
    sleep_interruptions: 'Sleep Interruptions',
    mood_score: 'Self-Reported Mood',
    stress_score: 'Self-Reported Stress',
    fatigue_score: 'Self-Reported Fatigue',
    pain_score: 'Self-Reported Pain',
    pvt_mean_reaction_time: 'PVT Reaction Time',
    pvt_lapses: 'PVT Lapses',
    pvt_false_starts: 'PVT False Starts',
    physical_activity_minutes: 'Physical Activity',
    resistance_exercise_minutes: 'Resistance Exercise',
    grip_strength: 'Grip Strength',
    ctx_bone_resorption: 'Bone Marker (CTX)',
    p1np_bone_formation: 'Bone Marker (P1NP)',
    serum_calcium: 'Serum Calcium',
    '25oh_vitamin_d': '25-OH Vitamin D',
    bone_mineral_density: 'Bone Mineral Density',
    wbc_count: 'White Blood Cell Count',
    lymphocyte_count: 'Lymphocyte Count',
    neutrophil_count: 'Neutrophil Count',
    crp: 'C-Reactive Protein (CRP)',
    cytokine_result: 'Cytokine Assay',
    infection_symptom_flag: 'Infection Symptoms',
    dose_rate: 'Radiation Dose Rate',
    dose_equivalent: 'Dose Equivalent',
    absorbed_dose: 'Absorbed Dose',
    linear_energy_transfer: 'Linear Energy Transfer (LET)',
    cabin_co2: 'Cabin Carbon Dioxide (CO₂)',
    cabin_temperature: 'Cabin Temperature',
    relative_humidity: 'Relative Humidity',
    cabin_pressure: 'Cabin Pressure',
    // Crew-client compatibility codes (published by the measurement catalogue).
    sleep_quality: 'Sleep Quality',
    fatigue: 'Fatigue',
    recovery: 'Perceived Recovery',
    mood: 'Mood',
    stress: 'Stress',
    isolation: 'Isolation Self-Report',
    motivation: 'Motivation',
    reaction_time_median: 'Median Reaction Time',
    premature_responses: 'Premature Responses',
    exercise_minutes: 'Exercise Duration',
    exercise_duration: 'Exercise Duration',
    resistance_training: 'Resistance Training',
    muscle_soreness: 'Muscle Soreness',
    physical_function: 'Physical Function',
    bone_density: 'Bone Density',
    headache: 'Headache',
    dizziness: 'Dizziness',
    nausea: 'Nausea',
    laboratory_biomarker: 'Laboratory Biomarker',
    personal_dose_rate: 'Personal Dose Rate',
    personal_cumulative_dose: 'Personal Cumulative Dose',
    humidity: 'Relative Humidity',
    environmental_radiation: 'Environmental Radiation',
    fluid_intake: 'Fluid Intake',
    meals: 'Meals',
    appetite: 'Appetite',
    nutrition_observations: 'Nutrition Observations'
  };
  return map[code] ?? code.replace(/_/g, ' ').toUpperCase();
}

/**
 * Data freshness label
 */
export function getDataFreshnessLabel(freshness: DataFreshness): string {
  switch (freshness) {
    case 'current':
      return 'CURRENT (<1h)';
    case 'delayed':
      return 'DELAYED (WITHIN THRESHOLD)';
    case 'recent':
      return 'RECENT (1–4h)';
    case 'stale':
      return 'STALE (>4h)';
    case 'unavailable':
      return 'NO DATA RECORDED';
    case 'unknown':
    default:
      return 'FRESHNESS UNCONFIRMED';
  }
}

/**
 * Communication state text & explanations
 */
export function getCommunicationStateLabel(state: CommunicationState): string {
  switch (state) {
    case 'LIVE':
      return 'LIVE LINK';
    case 'DELAYED':
      return 'DELAYED / STORE & FORWARD';
    case 'BLACKOUT':
      return 'COMMUNICATION BLACKOUT';
    case 'UNKNOWN':
    default:
      return 'UNKNOWN STATE';
  }
}

export function getCommunicationStateDescription(state: CommunicationState): string {
  switch (state) {
    case 'LIVE':
      return 'Direct downlink verified. Bidirectional store-and-forward batch queue clear.';
    case 'DELAYED':
      return 'Orbital latency or relay buffer active. Messages and data queues are staging.';
    case 'BLACKOUT':
      return 'No active link route reported. Ground station cannot determine current state until contact resumes.';
    case 'UNKNOWN':
    default:
      return 'Ground server has no confirmed communication state envelope from crew client.';
  }
}

/**
 * Assessment status label
 */
export function getAssessmentStatusLabel(status: AssessmentStatus): string {
  switch (status) {
    case 'normal':
      return 'NOMINAL';
    case 'monitor':
      return 'MONITOR TREND';
    case 'attention':
      return 'ATTENTION REQUIRED';
    case 'urgent':
      return 'URGENT PROTOCOL';
    case 'insufficient_data':
      return 'INSUFFICIENT DATA';
    case 'data_quality_issue':
      return 'DATA QUALITY ISSUE';
    default:
      return (status as string).toUpperCase();
  }
}

/**
 * Alert severity label
 */
export function getAlertSeverityLabel(severity: AlertSeverity): string {
  return severity.toUpperCase();
}

/**
 * Health domain display name
 */
export function getHealthDomainLabel(domain: HealthDomain): string {
  switch (domain) {
    case 'cardiovascular':
      return 'Cardiovascular';
    case 'behavioural_cognitive':
      return 'Behavioural & Cognitive';
    case 'sleep_cognition' as any:
    case 'behavioural' as any:
      return 'Sleep & Cognition';
    case 'musculoskeletal':
      return 'Musculoskeletal & Bone';
    case 'immune':
      return 'Immune & Clinical Laboratory';
    case 'radiation':
      return 'Personal Radiation';
    case 'environmental':
      return 'Cabin Environment';
    case 'data_quality':
      return 'Data Provenance & Quality';
    default:
      return domain;
  }
}

/**
 * High-precision minimalist text symbol for health domains
 */
export function getHealthDomainIcon(domain: HealthDomain): string {
  switch (domain) {
    case 'cardiovascular':
      return '♥';
    case 'behavioural_cognitive':
      return '🧠';
    case 'musculoskeletal':
      return '🦴';
    case 'immune':
      return '🛡';
    case 'radiation':
      return '☢';
    case 'environmental':
      return '⬡';
    case 'data_quality':
      return '✓';
    default:
      return '●';
  }
}

/**
 * Calculate age/elapsed time breakdown
 */
export function calculateTimeSince(isoTimestamp?: string | null): { value: number; unit: string; label: string } {
  if (!isoTimestamp) return { value: 0, unit: 'none', label: 'Never' };
  const d = new Date(isoTimestamp);
  if (isNaN(d.getTime())) return { value: 0, unit: 'none', label: 'Invalid' };

  const diffMs = Math.max(0, Date.now() - d.getTime());
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const days = Math.floor(hr / 24);

  if (min < 60) return { value: min, unit: 'minutes', label: `${min}m ago` };
  if (hr < 24) return { value: hr, unit: 'hours', label: `${hr}h ago` };
  return { value: days, unit: 'days', label: `${days}d ago` };
}

/**
 * Group observations by measurement_code
 */
export function groupObservationsByCode(observations: Observation[]): Record<string, Observation[]> {
  const groups: Record<string, Observation[]> = {};
  for (const obs of observations) {
    if (!groups[obs.measurement_code]) {
      groups[obs.measurement_code] = [];
    }
    groups[obs.measurement_code].push(obs);
  }
  // Sort each group by measured_at ascending
  for (const code in groups) {
    groups[code].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  }
  return groups;
}

/**
 * Safe classnames combiner
 */
export function classNames(...args: (string | undefined | null | false | Record<string, boolean>)[]): string {
  const classes: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') {
      classes.push(arg);
    } else if (typeof arg === 'object') {
      for (const [key, val] of Object.entries(arg)) {
        if (val) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}

// --- Backend vocabulary mapping ------------------------------------------
// The API reports `current | delayed | stale | unknown` data freshness and a
// nullable adapter state. These helpers normalise those strings for display
// without ever upgrading an unknown value to a nominal one.

export function normaliseFreshness(value: string | null | undefined): DataFreshness {
  if (value === 'current' || value === 'delayed' || value === 'stale' || value === 'unknown') {
    return value;
  }
  if (value === 'recent') return 'delayed';
  if (value === 'unavailable') return 'unavailable';
  return 'unknown';
}

export function normaliseCommunicationState(value: string | null | undefined): CommunicationState {
  if (value === 'LIVE' || value === 'DELAYED' || value === 'BLACKOUT') return value;
  return 'UNKNOWN';
}

export function getAlertStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'OPEN';
    case 'acknowledged':
      return 'ACKNOWLEDGED';
    case 'monitoring':
      return 'MONITORING';
    case 'resolved':
      return 'RESOLVED';
    case 'dismissed':
      return 'DISMISSED';
    default:
      return status.replace(/_/g, ' ').toUpperCase();
  }
}

export function getActionStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'in_progress':
      return 'IN PROGRESS';
    case 'completed':
      return 'COMPLETED';
    case 'deferred':
      return 'DEFERRED';
    case 'skipped':
      return 'SKIPPED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return status.replace(/_/g, ' ').toUpperCase();
  }
}

export function getActionTypeLabel(actionType: string): string {
  const map: Record<string, string> = {
    repeat_measurement: 'Repeat measurement',
    complete_assessment: 'Complete assessment',
    review_protocol: 'Review protocol',
    contact_medical_officer: 'Contact medical officer',
    scheduled_test: 'Scheduled test',
    informational: 'Informational'
  };
  return map[actionType] ?? actionType.replace(/_/g, ' ');
}

export function getPriorityLabel(priority: string): string {
  return priority.replace(/_/g, ' ').toUpperCase();
}

export function getSourceTypeLabel(sourceType: string): string {
  const map: Record<string, string> = {
    wearable: 'Wearable',
    medical_device: 'Medical device',
    laboratory: 'Laboratory',
    manual: 'Manual entry',
    environmental_sensor: 'Environmental sensor',
    dosimeter: 'Dosimeter',
    cognitive_task: 'Cognitive task',
    import: 'Import',
    simulation: 'Simulation'
  };
  return map[sourceType] ?? sourceType.replace(/_/g, ' ');
}

export function formatSecondsDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function isNumericValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Coerce a backend status string into the console's badge vocabulary. */
export function toAssessmentStatus(value: string | null | undefined): AssessmentStatus {
  switch (value) {
    case 'normal':
    case 'monitor':
    case 'attention':
    case 'urgent':
    case 'insufficient_data':
    case 'data_quality_issue':
      return value;
    default:
      return 'insufficient_data';
  }
}
