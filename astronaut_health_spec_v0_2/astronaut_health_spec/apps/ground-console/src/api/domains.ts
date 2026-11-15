// Ground Health Console — Health-domain metadata
// All domain structure is derived from the backend measurement catalogue.
// Codes listed here only describe which catalogue entries belong to each
// console workspace; they do not introduce thresholds, diagnoses or values.

import type { MeasurementDefinitionDto } from './types';

export interface DomainDescriptor {
  key: string;
  route: string;
  label: string;
  shortLabel: string;
  moduleCode: string;
  measurementCodes: string[];
  description: string;
  scopeNote: string;
}

export const DOMAINS: DomainDescriptor[] = [
  {
    key: 'cardiovascular',
    route: '/domains/cardiovascular',
    label: 'Cardiovascular',
    shortLabel: 'Cardio',
    moduleCode: 'cardiovascular',
    measurementCodes: [
      'heart_rate',
      'resting_heart_rate',
      'hrv_rmssd',
      'systolic_bp',
      'diastolic_bp',
      'spo2',
      'body_temperature',
      'heart_rate_recovery_60s'
    ],
    description:
      'Heart rate, heart-rate variability, blood pressure, oxygen saturation, temperature and recovery.',
    scopeNote:
      'Measurements are shown as recorded. The console displays no diagnostic interpretation and no clinical threshold.'
  },
  {
    key: 'behavioural',
    route: '/domains/behavioural',
    label: 'Behavioural Health',
    shortLabel: 'Behavioural',
    moduleCode: 'behavioural_cognitive',
    measurementCodes: [
      'mood_score',
      'stress_score',
      'fatigue_score',
      'pain_score',
      'physical_activity_minutes',
      'sleep_quality',
      'fatigue',
      'recovery',
      'mood',
      'stress',
      'isolation',
      'motivation',
      'fluid_intake',
      'meals',
      'appetite',
      'nutrition_observations'
    ],
    description:
      'Self-reported mood, stress, fatigue, pain, activity and crew-client compatibility self-reports.',
    scopeNote:
      'Self-report scores are presented verbatim on their recorded scale. No mood or fatigue diagnosis is inferred.'
  },
  {
    key: 'sleep',
    route: '/domains/sleep',
    label: 'Sleep & Cognition',
    shortLabel: 'Sleep',
    moduleCode: 'behavioural_cognitive',
    measurementCodes: [
      'sleep_duration',
      'sleep_efficiency',
      'wake_after_sleep_onset',
      'sleep_interruptions',
      'pvt_mean_reaction_time',
      'pvt_lapses',
      'pvt_false_starts',
      'reaction_time_median',
      'premature_responses'
    ],
    description:
      'Sleep duration, efficiency, awakenings and psychomotor vigilance task results.',
    scopeNote:
      'The behavioural/cognitive module covers both this workspace and Behavioural Health. Task results are not a fitness-for-duty determination.'
  },
  {
    key: 'musculoskeletal',
    route: '/domains/musculoskeletal',
    label: 'Musculoskeletal',
    shortLabel: 'MSK',
    moduleCode: 'musculoskeletal',
    measurementCodes: [
      'ctx_bone_resorption',
      'p1np_bone_formation',
      'serum_calcium',
      '25oh_vitamin_d',
      'grip_strength',
      'bone_mineral_density',
      'resistance_exercise_minutes',
      'exercise_minutes',
      'exercise_duration',
      'resistance_training',
      'muscle_soreness',
      'physical_function',
      'bone_density'
    ],
    description:
      'Bone-turnover markers, vitamin D, grip strength, bone density and exercise adherence.',
    scopeNote:
      'Laboratory biomarkers and exercise-adherence measures are kept visibly distinct. No fracture or bone-loss diagnosis is generated.'
  },
  {
    key: 'immune',
    route: '/domains/immune',
    label: 'Immune Health',
    shortLabel: 'Immune',
    moduleCode: 'immune',
    measurementCodes: [
      'wbc_count',
      'lymphocyte_count',
      'neutrophil_count',
      'crp',
      'cytokine_result',
      'infection_symptom_flag',
      'headache',
      'dizziness',
      'nausea',
      'laboratory_biomarker'
    ],
    description:
      'White-cell differential, inflammatory markers, cytokine assays and symptom self-reports.',
    scopeNote:
      'An absence of laboratory measurements is reported as insufficient data, never as a nominal result.'
  },
  {
    key: 'radiation',
    route: '/domains/radiation',
    label: 'Radiation',
    shortLabel: 'Radiation',
    moduleCode: 'radiation',
    measurementCodes: [
      'absorbed_dose',
      'dose_equivalent',
      'dose_rate',
      'linear_energy_transfer',
      'personal_dose_rate',
      'personal_cumulative_dose'
    ],
    description:
      'Personal dosimetry: absorbed dose, dose equivalent, dose rate and linear energy transfer.',
    scopeNote:
      'Only personal dosimeter observations are shown here. Habitat area-monitor readings, when present, appear under Environment.'
  },
  {
    key: 'environmental',
    route: '/domains/environmental',
    label: 'Environment',
    shortLabel: 'Environment',
    moduleCode: 'environmental',
    measurementCodes: [
      'cabin_co2',
      'cabin_temperature',
      'relative_humidity',
      'cabin_pressure',
      'humidity',
      'environmental_radiation'
    ],
    description:
      'Cabin carbon dioxide, temperature, relative humidity, pressure and environmental radiation.',
    scopeNote:
      'Cabin sensors are mission-scoped observations. Habitat environmental readings are never attributed to an astronaut dosimeter record.'
  }
];

export const DOMAIN_BY_KEY: Record<string, DomainDescriptor> = Object.fromEntries(
  DOMAINS.map((domain) => [domain.key, domain])
);

export const DOMAIN_BY_ROUTE: Record<string, DomainDescriptor> = Object.fromEntries(
  DOMAINS.map((domain) => [domain.route, domain])
);

/** Primary front-end workspace for a backend analysis module. */
export function domainForModule(moduleCode: string): DomainDescriptor | null {
  return DOMAINS.find((domain) => domain.moduleCode === moduleCode) ?? null;
}

/**
 * Derive the originating module from an alert code. The analysis service emits
 * `demo_<module_code>_baseline_deviation`; other alert codes remain unmapped.
 */
export function moduleForAlertCode(alertCode: string): string | null {
  const match = /^demo_(.+)_baseline_deviation$/.exec(alertCode);
  return match ? match[1] : null;
}

export function domainForAlertCode(alertCode: string): DomainDescriptor | null {
  const moduleCode = moduleForAlertCode(alertCode);
  if (!moduleCode) return null;
  return (
    DOMAINS.find(
      (domain) => domain.moduleCode === moduleCode && domain.key !== 'sleep'
    ) ?? null
  );
}

/** Locate a front-end workspace from a catalogue code. */
export function domainForMeasurement(code: string): DomainDescriptor | null {
  return DOMAINS.find((domain) => domain.measurementCodes.includes(code)) ?? null;
}

/** Catalogue definitions that the current workspace can display. */
export function definitionsForDomain(
  definitions: MeasurementDefinitionDto[],
  domain: DomainDescriptor
): MeasurementDefinitionDto[] {
  const byCode = new Map(definitions.map((item) => [item.code, item]));
  const ordered: MeasurementDefinitionDto[] = [];
  for (const code of domain.measurementCodes) {
    const found = byCode.get(code);
    if (found) ordered.push(found);
  }
  return ordered;
}

/** Definitions the catalogue publishes for this module but no workspace lists. */
export function unlistedModuleDefinitions(
  definitions: MeasurementDefinitionDto[],
  moduleCode: string
): MeasurementDefinitionDto[] {
  return definitions.filter(
    (item) =>
      item.domain_code === moduleCode &&
      !DOMAINS.some((domain) => domain.measurementCodes.includes(item.code))
  );
}

export function isDefinitionInDomain(code: string, domain: DomainDescriptor): boolean {
  return domain.measurementCodes.includes(code);
}

export type { MeasurementDefinitionDto };
