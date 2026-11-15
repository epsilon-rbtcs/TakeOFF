// Ground Health Console — Health Assessments
// Server-generated module and integrated assessments. The console only reads
// persisted results; it never re-runs analysis or fabricates a conclusion.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAssessmentDetail, useAssessmentList } from '../api/hooks';
import { DOMAINS, domainForModule } from '../api/domains';
import type { AssessmentSummaryDto } from '../api/types';
import { DataTable, Column } from '../components/common/DataTable';
import { AssessmentBadge, SeverityBadge, SyntheticTag } from '../components/common/StatusBadge';
import { SecondaryButton } from '../components/common/Buttons';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { IconRefresh } from '../components/common/Icons';
import {
  ErrorNotice,
  KeyValue,
  PageHeader,
  Panel,
  Stat,
  WarningNotice
} from '../components/common/PageChrome';
import {
  formatTimestamp,
  formatValue,
  getMeasurementLabel,
  toAssessmentStatus
} from '../utilities';

const MODULE_FILTERS = Array.from(new Set(DOMAINS.map((domain) => domain.moduleCode))).map(
  (moduleCode) => ({
    moduleCode,
    label: DOMAINS.filter((domain) => domain.moduleCode === moduleCode)
      .map((domain) => domain.label)
      .join(' / ')
  })
);

function moduleLabel(moduleCode: string | undefined): string {
  if (!moduleCode) return 'Integrated';
  const labels = DOMAINS.filter((domain) => domain.moduleCode === moduleCode).map(
    (domain) => domain.label
  );
  return labels.length > 0 ? labels.join(' / ') : moduleCode.replace(/_/g, ' ');
}

export const HealthAssessments: React.FC = () => {
  const navigate = useNavigate();
  const { selectedAstronaut, selectedAstronautId, missionId, mission } = useData();

  const query = useAssessmentList(selectedAstronautId, missionId);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const detail = useAssessmentDetail(selectedAssessmentId);

  const assessments = query.data ?? [];

  const filtered = useMemo(
    () =>
      assessments.filter((row) => {
        if (moduleFilter === 'integrated' && row.assessment_type !== 'integrated') return false;
        if (moduleFilter === 'module' && row.assessment_type !== 'module') return false;
        if (
          moduleFilter !== 'all' &&
          moduleFilter !== 'integrated' &&
          moduleFilter !== 'module' &&
          row.module_code !== moduleFilter
        ) {
          return false;
        }
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        return true;
      }),
    [assessments, moduleFilter, statusFilter]
  );

  const selected = assessments.find((row) => row.assessment_id === selectedAssessmentId) ?? null;
  const counts = useMemo(
    () => ({
      module: assessments.filter((row) => row.assessment_type === 'module').length,
      integrated: assessments.filter((row) => row.assessment_type === 'integrated').length,
      insufficient: assessments.filter((row) => row.status === 'insufficient_data').length,
      attention: assessments.filter((row) => row.status === 'attention' || row.status === 'urgent').length
    }),
    [assessments]
  );
  const latest = assessments[0] ?? null;

  const columns: Column<AssessmentSummaryDto>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
            {row.assessment_type}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.assessment_id.slice(0, 8)}…
          </div>
        </div>
      )
    },
    {
      key: 'module',
      header: 'Module / domain',
      render: (row) =>
        row.module_code ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              const domain = domainForModule(row.module_code as string);
              if (domain) navigate(domain.route);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              fontSize: '11px',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {moduleLabel(row.module_code)}
          </button>
        ) : (
          <span style={{ fontSize: '11px' }}>All modules</span>
        )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AssessmentBadge status={toAssessmentStatus(row.status)} />
    },
    {
      key: 'summary',
      header: 'Summary',
      render: (row) => (
        <span style={{ fontSize: '10px', lineHeight: 1.4, display: 'block', maxWidth: '380px' }}>
          {row.summary}
        </span>
      )
    },
    {
      key: 'assessed',
      header: 'Assessed',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
          {row.assessed_at ? formatTimestamp(row.assessed_at) : '—'}
        </span>
      )
    },
    {
      key: 'algorithm',
      header: 'Algorithm / rules',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>
          {row.algorithm_version} / {row.rule_set_version}
        </span>
      )
    },
    {
      key: 'data',
      header: 'Data',
      render: (row) => (row.simulated ? <SyntheticTag compact /> : <span style={{ fontSize: '10px' }}>RECORDED</span>)
    }
  ];

  if (!selectedAstronautId || !missionId) {
    return (
      <div>
        <PageHeader eyebrow="Records" title="Health Assessments" />
        <EmptyState
          title="No crew member or mission selected"
          description="Assessments are scoped to one crew member and one mission. Select a crew member from the header or roster."
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Records"
        title="Health Assessments"
        description={`Persisted module and integrated assessments for ${
          selectedAstronaut?.display_name ?? 'the selected crew member'
        }${mission ? ` on ${mission.mission_code}` : ''}. The console does not re-run analysis or derive a diagnosis.`}
        actions={
          <SecondaryButton size="sm" onClick={query.refetch} icon={<IconRefresh size={12} />}>
            Reload
          </SecondaryButton>
        }
      />

      {query.error && (
        <ErrorNotice
          title="Assessments unavailable"
          message={query.error.message}
          details={query.error.details}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px'
        }}
      >
        <Stat label="Assessments" value={assessments.length} emphasis />
        <Stat label="Module" value={counts.module} />
        <Stat label="Integrated" value={counts.integrated} />
        <Stat label="Insufficient data" value={counts.insufficient} />
        <Stat label="Attention / urgent" value={counts.attention} />
        <Stat
          label="Latest assessed"
          value={latest?.assessed_at ? formatTimestamp(latest.assessed_at, 'time') : 'None'}
          detail={latest ? moduleLabel(latest.module_code) : 'No assessment recorded'}
        />
      </div>

      <Panel title="Filters" bodyStyle={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            Module
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
            >
              <option value="all">All assessments</option>
              <option value="module">All module assessments</option>
              <option value="integrated">Integrated only</option>
              {MODULE_FILTERS.map((module) => (
                <option key={module.moduleCode} value={module.moduleCode}>
                  {module.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
            >
              <option value="all">All statuses</option>
              <option value="normal">Normal</option>
              <option value="monitor">Monitor</option>
              <option value="attention">Attention</option>
              <option value="urgent">Urgent</option>
              <option value="insufficient_data">Insufficient data</option>
            </select>
          </label>
          <span style={{ fontSize: '10px', marginLeft: 'auto' }}>
            {filtered.length} of {assessments.length} assessment(s)
          </span>
        </div>
      </Panel>

      <Panel title="Assessment register" subtitle="Click a row to inspect persisted evidence and provenance">
        {query.loading ? (
          <LoadingState height={180} message="Loading assessments..." />
        ) : assessments.length === 0 ? (
          <EmptyState
            title="No assessments recorded"
            description="The Ground API holds no module or integrated assessment for this crew member and mission."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="assessment_id"
            selectedRowKey={selectedAssessmentId ?? undefined}
            onRowClick={(row) => setSelectedAssessmentId(row.assessment_id)}
            emptyMessage="No assessment matches the current filters."
          />
        )}
      </Panel>

      {selected && (
        <Panel
          title="Assessment detail"
          subtitle={`${selected.assessment_type.toUpperCase()} · ${moduleLabel(selected.module_code)}`}
          actions={
            <div style={{ display: 'flex', gap: '6px' }}>
              {selected.module_code && domainForModule(selected.module_code) && (
                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    const domain = domainForModule(selected.module_code as string);
                    if (domain) navigate(domain.route);
                  }}
                >
                  Open domain workspace
                </SecondaryButton>
              )}
              <SecondaryButton size="sm" onClick={() => setSelectedAssessmentId(null)}>
                Close
              </SecondaryButton>
            </div>
          }
        >
          {detail.loading ? (
            <LoadingState height={140} message="Loading assessment detail..." />
          ) : detail.error || !detail.data ? (
            <ErrorNotice
              title="Assessment detail"
              message={detail.error?.message ?? 'No detail payload was returned.'}
              details={detail.error?.details}
            />
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '8px'
                }}
              >
                <AssessmentBadge status={toAssessmentStatus(detail.data.status)} />
                <span style={{ fontSize: '10px' }}>
                  Assessed{' '}
                  {detail.data.assessed_at ? formatTimestamp(detail.data.assessed_at) : 'at an unrecorded time'}
                </span>
                {detail.data.simulated && <SyntheticTag compact />}
              </div>

              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.2)',
                  backgroundColor: '#FAFAFA',
                  padding: '10px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  marginBottom: '10px'
                }}
              >
                {detail.data.summary}
              </div>

              <KeyValue label="Assessment ID" value={detail.data.assessment_id} mono />
              <KeyValue label="Algorithm version" value={detail.data.algorithm_version} mono />
              <KeyValue label="Rule-set version" value={detail.data.rule_set_version} mono />
              <KeyValue label="Analysis run" value={detail.data.analysis_run_id ?? 'Not linked'} mono />
              {detail.data.data_sufficiency && (
                <KeyValue label="Data sufficiency" value={detail.data.data_sufficiency.toUpperCase()} />
              )}
              {detail.data.baseline_versions && detail.data.baseline_versions.length > 0 && (
                <KeyValue
                  label="Baseline versions"
                  value={detail.data.baseline_versions
                    .map(
                      (baseline) =>
                        `${baseline.measurement_code ? getMeasurementLabel(baseline.measurement_code) : baseline.baseline_id} v${baseline.version}`
                    )
                    .join(', ')}
                />
              )}

              {detail.data.data_sufficiency === 'insufficient' && (
                <div style={{ marginTop: '10px' }}>
                  <WarningNotice
                    title="Insufficient data"
                    message="The analysis service reported that the inputs do not satisfy its sufficiency rule. The summary above must not be read as a negative finding."
                  />
                </div>
              )}

              {detail.data.findings && detail.data.findings.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '5px' }}>
                    FINDINGS & EVIDENCE
                  </div>
                  {detail.data.findings.map((finding) => (
                    <div
                      key={finding.finding_code}
                      style={{ border: '1px solid #000000', padding: '8px', marginBottom: '6px' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: '11px' }}>
                          {finding.measurement_code
                            ? getMeasurementLabel(finding.measurement_code)
                            : finding.finding_code}
                        </span>
                        <SeverityBadge severity={finding.severity as never} />
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '3px' }}>{finding.explanation}</div>
                      <div
                        style={{
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          color: 'rgba(0,0,0,0.6)',
                          marginTop: '4px'
                        }}
                      >
                        Finding {finding.finding_code}
                        {finding.direction ? ` · direction ${finding.direction}` : ''}
                      </div>
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                        Current{' '}
                        {finding.current_value !== null
                          ? formatValue(finding.current_value, finding.unit ?? '')
                          : '—'}{' '}
                        · baseline{' '}
                        {finding.baseline_value !== null
                          ? formatValue(finding.baseline_value, finding.unit ?? '')
                          : '—'}{' '}
                        · delta{' '}
                        {finding.delta_value !== null
                          ? formatValue(finding.delta_value, finding.unit ?? '')
                          : '—'}
                      </div>
                      <div
                        style={{
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          color: 'rgba(0,0,0,0.6)',
                          marginTop: '3px',
                          wordBreak: 'break-word'
                        }}
                      >
                        Evidence observations:{' '}
                        {finding.evidence_observation_ids.length > 0
                          ? finding.evidence_observation_ids.join(', ')
                          : 'none linked'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detail.data.evidence_observation_ids && detail.data.evidence_observation_ids.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '3px' }}>
                    ASSESSMENT INPUT OBSERVATIONS ({detail.data.evidence_observation_ids.length})
                  </div>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                    {detail.data.evidence_observation_ids.join(', ')}
                  </div>
                </div>
              )}

              {detail.data.limitations && detail.data.limitations.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '3px' }}>
                    LIMITATIONS
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px' }}>
                    {detail.data.limitations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.data.uncertainty_notes && detail.data.uncertainty_notes.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '3px' }}>
                    UNCERTAINTY NOTES
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px' }}>
                    {detail.data.uncertainty_notes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.data.component_assessment_ids &&
                detail.data.component_assessment_ids.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        marginBottom: '3px'
                      }}
                    >
                      COMPONENT MODULE ASSESSMENTS ({detail.data.component_assessment_ids.length})
                    </div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                      {detail.data.component_assessment_ids.join(', ')}
                    </div>
                  </div>
                )}

              <p style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)', margin: '12px 0 0 0' }}>
                Findings, sufficiency and limitations are the analysis service&apos;s own output. The console
                adds no threshold, diagnosis or recommendation.
              </p>
            </>
          )}
        </Panel>
      )}
    </div>
  );
};

export default HealthAssessments;
