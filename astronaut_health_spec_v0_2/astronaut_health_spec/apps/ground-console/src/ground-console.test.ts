// Ground Health Console — Comprehensive Test Suite
// Verifies data integrity, provenance preservation, unit formatting, and clinical rules

import { describe, it, expect } from 'vitest';
import {
  formatTimestamp,
  formatValue,
  formatDuration,
  getMeasurementLabel,
  getHealthDomainLabel,
  getDataFreshnessLabel,
  getCommunicationStateLabel,
  getAssessmentStatusLabel,
  groupObservationsByCode,
  calculateTimeSince
} from './utilities';
import {
  mockObservations,
  mockAssessments,
  mockBaselines,
  mockAstronauts,
  mockMissionSummary,
  getMockDashboardSummary,
  getMockObservationsForAstronaut,
  getMockAssessmentsForAstronaut,
  DEMO_ASTRONAUT_ID,
  DEMO_MISSION_ID
} from './mock-data';
import { Observation } from './types';

describe('Ground Health Console — Scientific Safety & Data Integrity', () => {
  it('preserves provenance: distinguished measured_at, created_at, and received_at', () => {
    const obsWithProvenance = mockObservations.find((o) => o.measured_at && o.created_at && o.received_at);
    expect(obsWithProvenance).toBeDefined();

    if (obsWithProvenance) {
      expect(obsWithProvenance.measured_at).toBeDefined();
      expect(obsWithProvenance.created_at).toBeDefined();
      expect(obsWithProvenance.received_at).toBeDefined();

      const measuredTime = new Date(obsWithProvenance.measured_at).getTime();
      const receivedTime = new Date(obsWithProvenance.received_at).getTime();
      // Server receipt must be >= device measurement
      expect(receivedTime).toBeGreaterThanOrEqual(measuredTime);
    }
  });

  it('marks all demonstration records as synthetic', () => {
    mockObservations.forEach((obs) => {
      expect(obs.is_synthetic).toBe(true);
    });
    mockAssessments.forEach((asm) => {
      expect(asm.is_synthetic).toBe(true);
    });
  });

  it('never marks an insufficient-data domain as normal', () => {
    const immuneAssessment = mockAssessments.find((a) => a.health_domain === 'immune');
    expect(immuneAssessment).toBeDefined();
    expect(immuneAssessment?.status).toBe('insufficient_data');
    expect(immuneAssessment?.data_sufficiency).toBe('insufficient');
  });

  it('strictly distinguishes personal dosimeter readings from environmental monitors', () => {
    const personalRadObs = mockObservations.filter((o) =>
      ['dose_rate', 'dose_equivalent'].includes(o.measurement_code) && o.source === 'dosimeter'
    );
    expect(personalRadObs.length).toBeGreaterThan(0);

    personalRadObs.forEach((obs) => {
      // Must be tied to specific astronaut
      expect(obs.astronaut_id).toBe(DEMO_ASTRONAUT_ID);
      expect(obs.source_device_id).toBeDefined();
      // Unit must be Sv/uSv/mSv, not Gy
      expect(['uSv/h', 'mSv', 'Sv']).toContain(obs.unit);
    });
  });

  it('distinguishes direct bone lab biomarkers from indirect adherence indicators', () => {
    const directBoneObs = mockObservations.filter((o) =>
      ['ctx_bone_resorption', 'p1np_bone_formation'].includes(o.measurement_code)
    );
    const indirectAdherenceObs = mockObservations.filter((o) =>
      ['resistance_exercise_minutes', 'grip_strength'].includes(o.measurement_code)
    );

    expect(directBoneObs.length).toBeGreaterThan(0);
    expect(indirectAdherenceObs.length).toBeGreaterThan(0);

    directBoneObs.forEach((o) => {
      expect(o.source).toBe('laboratory');
      expect(o.context).toBeDefined();
    });
  });

  it('maintains compatibility with Phase 1 backend demo IDs', () => {
    expect(DEMO_ASTRONAUT_ID).toBe('11111111-1111-1111-1111-111111111111');
    expect(DEMO_MISSION_ID).toBe('22222222-2222-2222-2222-222222222222');
  });
});

describe('Formatting & Utility Functions', () => {
  it('formats measurement values with canonical units', () => {
    expect(formatValue(72, 'bpm')).toBe('72 bpm');
    expect(formatValue(118, 'mmHg')).toBe('118 mmHg');
    expect(formatValue(45, 'ms')).toBe('45 ms');
    expect(formatValue(98, '%')).toBe('98 %');
    expect(formatValue(36.7, 'degC')).toBe('36.7 °C');
    expect(formatValue(4200, 'ppm')).toBe('4200 ppm');
    expect(formatValue(31.2, 'uSv/h')).toBe('31.2 µSv/h');
    expect(formatValue(19.1, 'mSv')).toBe('19.1 mSv');
    expect(formatValue(7, 'score_0_10')).toBe('7 /10');
    expect(formatValue(undefined, 'bpm')).toBe('—');
  });

  it('maps measurement codes to readable clinical labels', () => {
    expect(getMeasurementLabel('heart_rate')).toBe('Heart Rate');
    expect(getMeasurementLabel('resting_heart_rate')).toBe('Resting Heart Rate');
    expect(getMeasurementLabel('hrv_rmssd')).toBe('HRV (RMSSD)');
    expect(getMeasurementLabel('systolic_bp')).toBe('Systolic Blood Pressure');
    expect(getMeasurementLabel('cabin_co2')).toBe('Cabin Carbon Dioxide (CO₂)');
    expect(getMeasurementLabel('pvt_mean_reaction_time')).toBe('PVT Reaction Time');
    expect(getMeasurementLabel('ctx_bone_resorption')).toBe('Bone Marker (CTX)');
  });

  it('maps health domains to appropriate labels', () => {
    expect(getHealthDomainLabel('cardiovascular')).toBe('Cardiovascular');
    expect(getHealthDomainLabel('behavioural_cognitive')).toBe('Behavioural & Cognitive');
    expect(getHealthDomainLabel('musculoskeletal')).toBe('Musculoskeletal & Bone');
    expect(getHealthDomainLabel('immune')).toBe('Immune & Clinical Laboratory');
    expect(getHealthDomainLabel('radiation')).toBe('Personal Radiation');
    expect(getHealthDomainLabel('environmental')).toBe('Cabin Environment');
  });

  it('formats timestamps across display modes', () => {
    const iso = '2026-11-14T12:00:00Z';
    const formattedFull = formatTimestamp(iso, 'full');
    expect(formattedFull).toContain('14 Nov 2026');
    expect(formattedFull).toContain('12:00:00');

    const formattedDate = formatTimestamp(iso, 'date');
    expect(formattedDate).toBe('14 Nov 2026 UTC');

    const formattedTime = formatTimestamp(iso, 'time');
    expect(formattedTime).toBe('12:00:00 UTC');
  });

  it('groups observations by code and preserves time ordering', () => {
    const grouped = groupObservationsByCode(mockObservations);
    expect(grouped['heart_rate']).toBeDefined();
    expect(grouped['heart_rate'].length).toBeGreaterThan(1);

    // Verify chronological order
    const hrObs = grouped['heart_rate'];
    for (let i = 1; i < hrObs.length; i++) {
      const prev = new Date(hrObs[i - 1].measured_at).getTime();
      const curr = new Date(hrObs[i].measured_at).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('supports all 3 communication states without hallucinating connectivity', () => {
    expect(getCommunicationStateLabel('LIVE')).toBe('LIVE LINK');
    expect(getCommunicationStateLabel('DELAYED')).toBe('DELAYED / STORE & FORWARD');
    expect(getCommunicationStateLabel('BLACKOUT')).toBe('COMMUNICATION BLACKOUT');
  });

  it('maps data freshness states without false nominal claims', () => {
    expect(getDataFreshnessLabel('current')).toContain('CURRENT');
    expect(getDataFreshnessLabel('stale')).toContain('STALE');
    expect(getDataFreshnessLabel('unavailable')).toContain('NO DATA');
  });
});

describe('Mock Data Coverage & Filtering', () => {
  it('generates a complete dashboard summary', () => {
    const summary = getMockDashboardSummary();
    expect(summary.mission).toBeDefined();
    expect(summary.crew.length).toBe(2);
    expect(summary.recent_activity.length).toBeGreaterThan(0);
    expect(summary.attention_items.length).toBeGreaterThan(0);
  });

  it('filters observations by astronaut and measurement code', () => {
    const vasquezHR = getMockObservationsForAstronaut(DEMO_ASTRONAUT_ID, 'heart_rate');
    expect(vasquezHR.length).toBeGreaterThan(0);
    vasquezHR.forEach((o) => {
      expect(o.astronaut_id).toBe(DEMO_ASTRONAUT_ID);
      expect(o.measurement_code).toBe('heart_rate');
    });
  });

  it('filters assessments by domain', () => {
    const cvAssessments = getMockAssessmentsForAstronaut(DEMO_ASTRONAUT_ID, 'cardiovascular');
    expect(cvAssessments.length).toBe(1);
    expect(cvAssessments[0].health_domain).toBe('cardiovascular');
    expect(cvAssessments[0].baselines_used.length).toBeGreaterThan(0);
  });
});
