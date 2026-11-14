// Ground Health Console — Astronaut Health Profile & Monitoring Workspace
// Comprehensive multi-domain clinical workspace with personal baselines and explainable evidence

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAstronautProfile } from '../api/hooks';
import { TrendChart } from '../components/common/TrendChart';
import { DataTable, Column } from '../components/common/DataTable';
import {
  AssessmentBadge,
  FreshnessBadge,
  CommStateBadge,
  DataQualityBadge,
  SyntheticTag
} from '../components/common/StatusBadge';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import {
  IconHeart,
  IconCrew,
  IconAssessment,
  IconActivity,
  IconRadio,
  IconShield,
  IconEnvironment
} from '../components/common/Icons';
import { Observation, ModuleAssessment } from '../types';
import {
  formatTimestamp,
  formatValue,
  getMeasurementLabel,
  getHealthDomainLabel,
  groupObservationsByCode
} from '../utilities';

type ActiveTab =
  | 'overview'
  | 'cardiovascular'
  | 'behavioural'
  | 'sleep_cognition'
  | 'musculoskeletal'
  | 'immune'
  | 'radiation'
  | 'environmental'
  | 'timeline';

export const AstronautProfile: React.FC = () => {
  const { astronautId } = useParams<{ astronautId: string }>();
  const navigate = useNavigate();

  const currentAstronautId = astronautId || '11111111-1111-1111-1111-111111111111';
  const { astronaut, observations, assessments, baselines, loading } = useAstronautProfile(currentAstronautId);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  if (loading && !astronaut) {
    return <LoadingState message="Loading astronaut clinical workspace..." height={340} />;
  }

  const groupedObs = groupObservationsByCode(observations);

  // Helper to find baseline for a measurement code
  const getBaseline = (code: string) => baselines.find((b) => b.measurement_code === code);

  // Tab definitions
  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'overview', label: '1. Overview', icon: '◉' },
    { key: 'cardiovascular', label: '2. Cardiovascular', icon: '♥' },
    { key: 'behavioural', label: '3. Behavioural', icon: '🧠' },
    { key: 'sleep_cognition', label: '4. Sleep & Cognition', icon: '◷' },
    { key: 'musculoskeletal', label: '5. Musculoskeletal', icon: '🦴' },
    { key: 'immune', label: '6. Immune & Clinical', icon: '🛡' },
    { key: 'radiation', label: '7. Personal Radiation', icon: '☢' },
    { key: 'environmental', label: '8. Environmental', icon: '⬡' },
    { key: 'timeline', label: 'Historical Timeline', icon: '≡' }
  ];

  // Common Observation Table Columns
  const obsColumns: Column<Observation>[] = [
    {
      key: 'measurement',
      header: 'Measurement',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{getMeasurementLabel(row.measurement_code)}</div>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
            {row.source_device_id || row.source}
          </div>
        </div>
      )
    },
    {
      key: 'value',
      header: 'Value & Unit',
      render: (row) => (
        <span style={{ fontWeight: 800, fontSize: '13px', fontFamily: 'monospace' }}>
          {formatValue(row.value, row.unit)}
        </span>
      )
    },
    {
      key: 'timestamps',
      header: 'Provenance (Device / Received)',
      render: (row) => (
        <TimeDisplay
          measured_at={row.measured_at}
          created_at={row.created_at}
          received_at={row.received_at}
          format="compact"
        />
      )
    },
    {
      key: 'source',
      header: 'Source Origin',
      render: (row) => (
        <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>
          {row.source.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: 'quality',
      header: 'Data Quality',
      render: (row) => <DataQualityBadge quality={row.quality} />
    }
  ];

  return (
    <div>
      {/* Astronaut Header Card */}
      <div
        style={{
          border: '2px solid #000000',
          backgroundColor: '#FFFFFF',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                backgroundColor: '#FFFF08',
                color: '#000000',
                padding: '2px 6px',
                border: '1px solid #000000',
                textTransform: 'uppercase'
              }}
            >
              ASTRONAUT HEALTH WORKSPACE
            </span>
            <SyntheticTag compact />
          </div>

          <h1
            style={{
              fontSize: '26px',
              fontWeight: 900,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              margin: '0 0 6px 0'
            }}
          >
            {astronaut?.name}
          </h1>

          <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>
              Callsign: <strong style={{ color: '#000000' }}>"{astronaut?.callsign}"</strong>
            </span>
            <span>
              Role: <strong style={{ color: '#000000' }}>{astronaut?.role_in_crew}</strong>
            </span>
            <span>
              Agency: <strong style={{ color: '#000000' }}>{astronaut?.agency}</strong>
            </span>
            <span>
              Sex: <strong style={{ color: '#000000' }}>{astronaut?.biological_sex || 'Unspecified'}</strong>
            </span>
          </div>

          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace', marginTop: '6px' }}>
            ID: {astronaut?.astronaut_id} · Mission: Artemis VII
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SecondaryButton
            size="sm"
            onClick={() => navigate('/messages')}
          >
            COMPOSE CREW MESSAGE
          </SecondaryButton>
          <SecondaryButton
            size="sm"
            onClick={() => navigate('/alerts')}
          >
            VIEW ACTION CENTRE
          </SecondaryButton>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #000000',
          marginBottom: '24px',
          overflowX: 'auto',
          backgroundColor: '#FFFFFF'
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive ? '4px solid #000000' : '4px solid transparent',
                backgroundColor: isActive ? '#FFFF08' : '#FFFFFF',
                color: '#000000',
                fontWeight: isActive ? 800 : 500,
                fontSize: '12px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.08s ease'
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Top Banner: Status & Attention Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
                Recent Assessments Summary
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>
                {assessments.filter((a) => a.status === 'normal').length} Nominal / {assessments.length} Domains
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', marginTop: '4px' }}>
                {assessments.filter((a) => a.status === 'attention' || a.status === 'monitor').length} require operational observation
              </div>
            </div>

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
                Telecommunication & Freshness
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                <CommStateBadge state="LIVE" />
                <FreshnessBadge freshness="current" />
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', marginTop: '6px' }}>
                Latest synchronized measurement: {formatTimestamp(observations[observations.length - 1]?.measured_at, 'time')}
              </div>
            </div>

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
                Personal Baselines Active
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>
                {baselines.length} Metric Profiles
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', marginTop: '4px' }}>
                Established at Flight Day 0 (Pre-launch normative testing)
              </div>
            </div>
          </div>

          {/* Explainable Domain Assessments Grid */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              Latest Domain Assessments & Explainable Findings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {assessments.map((asm) => (
                <div
                  key={asm.assessment_id}
                  style={{
                    border: '1px solid #000000',
                    padding: '14px 18px',
                    backgroundColor: asm.status === 'attention' ? 'rgba(255, 255, 8, 0.15)' : '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AssessmentBadge status={asm.status} />
                      <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                        {getHealthDomainLabel(asm.health_domain)}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
                      Algorithm: {asm.algorithm_version} · Evaluated: {formatTimestamp(asm.assessed_at, 'relative')}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.4, marginBottom: '8px' }}>
                    {asm.summary}
                  </div>

                  {asm.findings.length > 0 && (
                    <div style={{ borderLeft: '3px solid #000000', paddingLeft: '12px', margin: '8px 0', fontSize: '12px' }}>
                      {asm.findings.map((f) => (
                        <div key={f.finding_id} style={{ marginBottom: '4px' }}>
                          <strong>Finding:</strong> {f.description}
                          {f.recommendation && (
                            <div style={{ color: 'rgba(0,0,0,0.7)', marginTop: '2px' }}>
                              <em>Next Step:</em> {f.recommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '6px' }}>
                    Data sufficiency: <strong>{asm.data_sufficiency.toUpperCase()}</strong> · {asm.data_quality_summary}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Synced Observations Table */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              Most Recent Observations Received (All Domains)
            </h3>
            <DataTable
              columns={obsColumns}
              data={observations.slice(-10).reverse()}
              keyField="observation_id"
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CARDIOVASCULAR HEALTH */}
      {/* ======================================================== */}
      {activeTab === 'cardiovascular' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                Cardiovascular Health & Autonomic Balance
              </h2>
              <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
                Continuous wearable biometric stream evaluated against individual resting baseline.
              </div>
            </div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
              Baseline: HR mean {getBaseline('heart_rate')?.value_mean} bpm (range: {getBaseline('heart_rate')?.range_min}–{getBaseline('heart_rate')?.range_max} bpm)
            </div>
          </div>

          {/* Trend Charts Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <TrendChart
              title="Heart Rate (Continuous Daily Peak/Rest)"
              unit="bpm"
              data={(groupedObs['heart_rate'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={getBaseline('heart_rate')?.value_mean}
              baselineMin={getBaseline('heart_rate')?.range_min}
              baselineMax={getBaseline('heart_rate')?.range_max}
              baselineLabel="Personal Mean"
            />

            <TrendChart
              title="Heart Rate Variability (HRV - RMSSD)"
              unit="ms"
              data={(groupedObs['hrv_rmssd'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={getBaseline('hrv_rmssd')?.value_mean}
              baselineMin={getBaseline('hrv_rmssd')?.range_min}
              baselineMax={getBaseline('hrv_rmssd')?.range_max}
              baselineLabel="Autonomic Norm"
            />
          </div>

          {/* Vitals Summary Table */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Cardiovascular Observations Log
            </h3>
            <DataTable
              columns={obsColumns}
              data={observations.filter((o) =>
                ['heart_rate', 'resting_heart_rate', 'hrv_rmssd', 'systolic_bp', 'diastolic_bp', 'spo2', 'body_temperature'].includes(
                  o.measurement_code
                )
              )}
              keyField="observation_id"
            />
          </div>

          <div style={{ border: '1px solid #000000', padding: '12px', backgroundColor: '#FAFAFA', fontSize: '11px' }}>
            <strong>Autonomic Balance Interpretation:</strong> HRV RMSSD measures parasympathetic reactivation. Reductions over consecutive rest cycles indicate sympathetic activation and potential cumulative workload fatigue.
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: BEHAVIOURAL HEALTH */}
      {/* ======================================================== */}
      {activeTab === 'behavioural' && (
        <div>
          <div
            style={{
              backgroundColor: '#FFFF08',
              border: '1px solid #000000',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: 700,
              marginBottom: '16px'
            }}
          >
            NOTE: Behavioural self-reports reflect subjective daily visual analogue scales (VAS). They represent monitored longitudinal trends and operational self-assessments, NOT psychiatric or diagnostic determinations.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <TrendChart
              title="Self-Reported Fatigue Trend"
              unit="score /10"
              data={(groupedObs['fatigue_score'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={3}
              baselineLabel="Nominal Max"
            />

            <TrendChart
              title="Self-Reported Stress Trend"
              unit="score /10"
              data={(groupedObs['stress_score'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={4}
              baselineLabel="Nominal Max"
            />

            <TrendChart
              title="Self-Reported Mood State"
              unit="score /10"
              data={(groupedObs['mood_score'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={8}
              baselineLabel="Personal Baseline"
            />
          </div>

          <DataTable
            columns={obsColumns}
            data={observations.filter((o) =>
              ['mood_score', 'stress_score', 'fatigue_score', 'pain_score'].includes(o.measurement_code)
            )}
            keyField="observation_id"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SLEEP AND COGNITION */}
      {/* ======================================================== */}
      {activeTab === 'sleep_cognition' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              Sleep Architecture & Cognitive Vigilance
            </h2>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
              Objective polysomnographic wearable duration correlated with Psychomotor Vigilance Task (PVT) performance.
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <TrendChart
              title="Total Sleep Duration"
              unit="hours"
              data={(groupedObs['sleep_duration'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={getBaseline('sleep_duration')?.value_mean}
              baselineMin={getBaseline('sleep_duration')?.range_min}
              baselineMax={getBaseline('sleep_duration')?.range_max}
              baselineLabel="Prescribed Rest"
            />

            <TrendChart
              title="PVT Mean Reaction Time"
              unit="ms"
              data={(groupedObs['pvt_mean_reaction_time'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={getBaseline('pvt_mean_reaction_time')?.value_mean}
              baselineLabel="Cognitive Baseline"
            />
          </div>

          <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Individual Cognitive Assessment Sessions & PVT Telemetry
          </h3>
          <DataTable
            columns={obsColumns}
            data={observations.filter((o) =>
              ['sleep_duration', 'pvt_mean_reaction_time', 'pvt_lapses', 'pvt_false_starts'].includes(o.measurement_code)
            )}
            keyField="observation_id"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MUSCULOSKELETAL AND BONE */}
      {/* ======================================================== */}
      {activeTab === 'musculoskeletal' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              Musculoskeletal Countermeasures & Bone Metabolism
            </h2>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
              ARED resistance countermeasure adherence tracked alongside periodic biochemical bone resorption markers.
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #000000',
              padding: '10px 14px',
              fontSize: '11px',
              marginBottom: '16px'
            }}
          >
            <strong>SCIENTIFIC DISTINCTION:</strong> Resistance exercise minutes and grip strength represent indirect behavioural/mechanical indicators. Serum CTX and P1NP assays represent direct biochemical bone turnover markers.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <TrendChart
              title="Resistance Countermeasure Adherence"
              unit="min"
              data={(groupedObs['resistance_exercise_minutes'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={60}
              baselineLabel="Prescribed 60m"
            />

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                Bone Biochemical Marker Panel (Direct Lab)
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.6 }}>
                <div>CTX Bone Resorption: <strong>0.58 ng/mL</strong> (Lab Reference: 0.15–0.65 ng/mL)</div>
                <div>P1NP Bone Formation: <strong>46.2 ng/mL</strong> (Lab Reference: 25.0–75.0 ng/mL)</div>
                <div>Serum Calcium: <strong>9.4 mg/dL</strong> (Normal Range: 8.5–10.2 mg/dL)</div>
                <div>25-OH Vitamin D: <strong>38 ng/mL</strong> (Target: &gt;30 ng/mL)</div>
                <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', marginTop: '8px' }}>
                  Specimen: Fasting morning blood draw · ECLIA automated analyzer
                </div>
              </div>
            </div>
          </div>

          <DataTable
            columns={obsColumns}
            data={observations.filter((o) =>
              ['resistance_exercise_minutes', 'grip_strength', 'ctx_bone_resorption', 'p1np_bone_formation'].includes(
                o.measurement_code
              )
            )}
            keyField="observation_id"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: IMMUNE HEALTH */}
      {/* ======================================================== */}
      {activeTab === 'immune' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              Immune Surveillance & Clinical Laboratory
            </h2>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
              Periodic clinical assays, complete blood counts (CBC), and symptom surveillance logs.
            </div>
          </div>

          <div
            style={{
              border: '2px dashed #000000',
              backgroundColor: '#FFFFFF',
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <AssessmentBadge status="insufficient_data" />
              <span style={{ fontSize: '13px', fontWeight: 800 }}>AWAITING FLIGHT DAY 145 CLINICAL ASSAY</span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', lineHeight: 1.4 }}>
              No complete blood count (CBC) or inflammatory cytokine panel has been ingested within the last 14 days.
              Do not infer immune competency or suppression from symptom absence alone.
            </div>
          </div>

          <DataTable
            columns={obsColumns}
            data={observations.filter((o) =>
              ['wbc_count', 'lymphocyte_count', 'neutrophil_count', 'crp', 'body_temperature', 'infection_symptom_flag'].includes(
                o.measurement_code
              )
            )}
            keyField="observation_id"
            emptyMessage="No acute immune or infection symptom records reported in current telemetry window."
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: RADIATION */}
      {/* ======================================================== */}
      {activeTab === 'radiation' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              Personal Radiation Dosimetry
            </h2>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
              Astronaut personal dosimeter measurements. Strictly separated from environmental cabin radiation monitors.
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <TrendChart
              title="Personal Dose Equivalent Rate"
              unit="µSv/h"
              data={(groupedObs['dose_rate'] || []).map((o) => ({
                timestamp: o.measured_at,
                value: o.value
              }))}
              baselineValue={25}
              baselineLabel="Nominal GCR"
            />

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
                Accumulated Flight Mission Dose
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'monospace' }}>
                19.1 <span style={{ fontSize: '16px' }}>mSv</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', marginTop: '4px' }}>
                Mission Elapsed Time: Flight Day 142 · Career Limit Utilization: <strong>3.8%</strong>
              </div>
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '12px', paddingTop: '8px', fontSize: '10px', color: 'rgba(0,0,0,0.5)' }}>
                Instrument: Active Silicon Solid-State Microdosimeter (dev-personal-dosimeter-01)
              </div>
            </div>
          </div>

          <DataTable
            columns={obsColumns}
            data={observations.filter((o) =>
              ['dose_rate', 'dose_equivalent', 'absorbed_dose', 'linear_energy_transfer'].includes(o.measurement_code)
            )}
            keyField="observation_id"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 8: ENVIRONMENTAL HEALTH */}
      {/* ======================================================== */}
      {activeTab === 'environmental' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              Cabin Biosphere & Atmospheric Conditions
            </h2>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
              Atmospheric gas composition, thermal parameters, and habitat area radiation monitors.
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #000000',
              padding: '12px',
              fontSize: '11px',
              marginBottom: '16px'
            }}
          >
            Environmental sensor data reflects onboard ECLSS sensors and is shared across all crew members.
            See the dedicated <button onClick={() => navigate('/environment')} style={{ textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Environment & Radiation Workspace</button> for full habitat sector telemetry.
          </div>

          <DataTable
            columns={obsColumns}
            data={observations.filter((o) =>
              ['cabin_co2', 'cabin_temperature', 'relative_humidity', 'cabin_pressure'].includes(o.measurement_code)
            )}
            keyField="observation_id"
            emptyMessage="All environmental telemetry synchronized through habitat area network."
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 9: HISTORICAL ACTIVITY TIMELINE */}
      {/* ======================================================== */}
      {activeTab === 'timeline' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              Unified Astronaut Historical Timeline
            </h2>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
              Audited chronological stream of observations, assessments, alert generation, and status acknowledgements.
            </div>
          </div>

          <div style={{ border: '1px solid #000000', backgroundColor: '#FFFFFF' }}>
            {observations.slice(-15).reverse().map((obs, idx) => (
              <div
                key={obs.observation_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: idx !== 14 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '11px',
                      backgroundColor: 'rgba(0,0,0,0.06)',
                      padding: '2px 6px'
                    }}
                  >
                    OBSERVATION
                  </span>
                  <span style={{ fontWeight: 600 }}>{getMeasurementLabel(obs.measurement_code)}:</span>
                  <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>
                    {formatValue(obs.value, obs.unit)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)' }}>
                    via {obs.source} ({obs.source_device_id || 'manual'})
                  </span>
                </div>
                <TimeDisplay
                  measured_at={obs.measured_at}
                  received_at={obs.received_at}
                  format="compact"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default AstronautProfile;
