// Ground Health Console — Explainable Health Assessments Review
// Full provenance drill-down tracing clinical findings back to raw underlying observations and personal baselines

import React, { useState } from 'react';
import { useAssessments } from '../api/hooks';
import { DataTable, Column } from '../components/common/DataTable';
import { AssessmentBadge, SyntheticTag } from '../components/common/StatusBadge';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { SecondaryButton, PrimaryButton } from '../components/common/Buttons';
import { IconAssessment, IconFilter, IconCheck } from '../components/common/Icons';
import { ModuleAssessment } from '../types';
import {
  formatTimestamp,
  formatValue,
  getHealthDomainLabel,
  getMeasurementLabel
} from '../utilities';

export const HealthAssessments: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAstronaut, setSelectedAstronaut] = useState<string>('all');
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>('asm-cv-01');

  const { assessments } = useAssessments({
    domain: selectedDomain,
    status: selectedStatus,
    astronautId: selectedAstronaut
  });

  const columns: Column<ModuleAssessment>[] = [
    {
      key: 'domain',
      header: 'Health Domain',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase' }}>
            {getHealthDomainLabel(row.health_domain)}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
            {row.assessment_id}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Evaluation Status',
      render: (row) => <AssessmentBadge status={row.status} />
    },
    {
      key: 'summary',
      header: 'Clinical Summary Finding',
      render: (row) => (
        <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
          {row.summary}
        </div>
      )
    },
    {
      key: 'sufficiency',
      header: 'Data Sufficiency',
      render: (row) => (
        <span
          style={{
            fontWeight: row.data_sufficiency === 'insufficient' ? 800 : 500,
            textTransform: 'uppercase',
            fontSize: '11px',
            backgroundColor: row.data_sufficiency === 'insufficient' ? '#FFFF08' : 'transparent',
            padding: row.data_sufficiency === 'insufficient' ? '2px 6px' : '0'
          }}
        >
          {row.data_sufficiency}
        </span>
      )
    },
    {
      key: 'timestamp',
      header: 'Evaluated At',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
          {formatTimestamp(row.assessed_at, 'full')}
        </span>
      )
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedAssessmentId(expandedAssessmentId === row.assessment_id ? null : row.assessment_id);
          }}
          style={{
            background: 'none',
            border: '1px solid #000000',
            backgroundColor: expandedAssessmentId === row.assessment_id ? '#FFFF08' : '#FFFFFF',
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {expandedAssessmentId === row.assessment_id ? 'COLLAPSE ▲' : 'INSPECT EVIDENCE ▼'}
        </button>
      )
    }
  ];

  const activeAssessment = assessments.find((a) => a.assessment_id === expandedAssessmentId);

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          borderBottom: '2px solid #000000',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              padding: '2px 6px',
              textTransform: 'uppercase'
            }}
          >
            DECISION-SUPPORT AUDIT
          </span>
          <SyntheticTag compact />
        </div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            margin: 0
          }}
        >
          Explainable Health Assessments
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0' }}>
          Inspect automated multi-domain rule evaluation, supporting observation vectors, and baseline thresholds.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          backgroundColor: '#FAFAFA',
          border: '1px solid #000000',
          padding: '12px 16px',
          marginBottom: '20px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
          Filter Assessments:
        </span>

        {/* Domain Filter */}
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #000000',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Health Domains</option>
          <option value="cardiovascular">Cardiovascular</option>
          <option value="behavioural_cognitive">Behavioural & Cognitive</option>
          <option value="musculoskeletal">Musculoskeletal & Bone</option>
          <option value="immune">Immune & Lab</option>
          <option value="radiation">Personal Radiation</option>
          <option value="environmental">Environmental</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #000000',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Evaluation States</option>
          <option value="normal">Nominal</option>
          <option value="monitor">Monitor Trend</option>
          <option value="attention">Attention Required</option>
          <option value="urgent">Urgent Protocol</option>
          <option value="insufficient_data">Insufficient Data</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(0,0,0,0.6)', fontFamily: 'monospace' }}>
          Showing {assessments.length} assessments
        </span>
      </div>

      {/* Main Table */}
      <div style={{ marginBottom: '24px' }}>
        <DataTable
          columns={columns}
          data={assessments}
          keyField="assessment_id"
          selectedRowKey={expandedAssessmentId || undefined}
          onRowClick={(row) =>
            setExpandedAssessmentId(expandedAssessmentId === row.assessment_id ? null : row.assessment_id)
          }
        />
      </div>

      {/* Evidence Drill-Down Panel */}
      {activeAssessment && (
        <div
          style={{
            border: '2px solid #000000',
            backgroundColor: '#FFFFFF',
            padding: '24px',
            boxShadow: '4px 4px 0px #000000'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderBottom: '2px solid #000000',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
                EVIDENCE DRILL-DOWN & PROVENANCE TRACE
              </div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  margin: '4px 0 0 0'
                }}
              >
                {getHealthDomainLabel(activeAssessment.health_domain)} Assessment · {activeAssessment.assessment_id}
              </h2>
            </div>
            <AssessmentBadge status={activeAssessment.status} />
          </div>

          {/* Insufficient Data Warning Banner if applicable */}
          {activeAssessment.data_sufficiency === 'insufficient' && (
            <div
              style={{
                backgroundColor: '#FFFF08',
                border: '1px solid #000000',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '18px'
              }}
            >
              ⚠ INSUFFICIENT DATA NOTICE: Telemetry inputs for this health domain do not satisfy minimum evaluation thresholds. Conclusions cannot be inferred.
            </div>
          )}

          {/* Clinical Finding Summary */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
              Finding Summary
            </h4>
            <div style={{ fontSize: '13px', lineHeight: 1.5, backgroundColor: '#FAFAFA', padding: '12px', border: '1px solid rgba(0,0,0,0.1)' }}>
              {activeAssessment.summary}
            </div>
          </div>

          {/* Findings & Evidence Breakdown */}
          {activeAssessment.findings.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                Supporting Findings & Evidence
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeAssessment.findings.map((f) => (
                  <div key={f.finding_id} style={{ border: '1px solid #000000', padding: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>
                      {f.description}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)', marginBottom: '4px' }}>
                      Underlying Evidence:
                    </div>
                    <ul style={{ margin: '0 0 6px 18px', fontSize: '12px', lineHeight: 1.4 }}>
                      {f.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                    {f.recommendation && (
                      <div style={{ marginTop: '8px', fontSize: '11px', backgroundColor: 'rgba(255, 255, 8, 0.25)', padding: '6px 8px', border: '1px solid #000000' }}>
                        <strong>Recommended Protocol:</strong> {f.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supporting Observations Vector Table */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
              Supporting Raw Observations Used In Assessment ({activeAssessment.inputs.length})
            </h4>
            {activeAssessment.inputs.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', fontStyle: 'italic' }}>
                Zero active telemetry inputs available for this domain.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #000000' }}>
                <thead>
                  <tr style={{ backgroundColor: '#000000', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Observation ID</th>
                    <th style={{ padding: '6px 10px' }}>Measurement Code</th>
                    <th style={{ padding: '6px 10px' }}>Value & Unit</th>
                    <th style={{ padding: '6px 10px' }}>Device Measured At</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssessment.inputs.map((inp) => (
                    <tr key={inp.observation_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{inp.observation_id}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{getMeasurementLabel(inp.measurement_code)}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatValue(inp.value, inp.unit)}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                        {formatTimestamp(inp.measured_at, 'full')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Baselines Reference Used */}
          {activeAssessment.baselines_used.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                Personal Baseline Reference Values Used
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #000000' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F0F0F0', color: '#000000', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Metric</th>
                    <th style={{ padding: '6px 10px' }}>Type</th>
                    <th style={{ padding: '6px 10px' }}>Personal Mean</th>
                    <th style={{ padding: '6px 10px' }}>Acceptable Range</th>
                    <th style={{ padding: '6px 10px' }}>Established At</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssessment.baselines_used.map((b) => (
                    <tr key={b.baseline_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{getMeasurementLabel(b.measurement_code)}</td>
                      <td style={{ padding: '6px 10px', textTransform: 'uppercase' }}>{b.baseline_type}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700 }}>
                        {b.value_mean} {b.unit}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                        {b.range_min ?? '—'} to {b.range_max ?? '—'} {b.unit}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                        {formatTimestamp(b.established_at, 'date')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Algorithm & Reproducibility Metadata */}
          <div
            style={{
              borderTop: '1px solid #000000',
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'rgba(0,0,0,0.6)',
              fontFamily: 'monospace'
            }}
          >
            <span>Algorithm Version: <strong>{activeAssessment.algorithm_version}</strong></span>
            <span>Data Provenance: {activeAssessment.data_quality_summary}</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default HealthAssessments;
