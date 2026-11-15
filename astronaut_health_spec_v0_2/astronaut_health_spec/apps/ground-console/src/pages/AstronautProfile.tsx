// Ground Health Console — Crew health workspace
// Identification, observations, trends, assessments, alerts, recommended
// actions and analysis provenance for one astronaut.

import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAssessmentDetail, useAstronaut, useAstronautWorkspace } from '../api/hooks';
import type {
  ActionDto,
  AlertDto,
  AnalysisRunDto,
  AssessmentSummaryDto,
  ObservationDto
} from '../api/types';
import { domainForModule } from '../api/domains';
import { TrendChart } from '../components/common/TrendChart';
import { DataTable, Column } from '../components/common/DataTable';
import {
  AssessmentBadge,
  FreshnessBadge,
  SeverityBadge,
  SyntheticTag
} from '../components/common/StatusBadge';
import { TimeDisplay } from '../components/common/TimeDisplay';
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
  getActionStatusLabel,
  getActionTypeLabel,
  getMeasurementLabel,
  getPriorityLabel,
  getSourceTypeLabel,
  isNumericValue,
  normaliseFreshness,
  toAssessmentStatus
} from '../utilities';

export const AstronautProfile: React.FC = () => {
  const { astronautId } = useParams<{ astronautId: string }>();
  const navigate = useNavigate();
  const { selectedAstronautId, missionId, mission, selectAstronaut } = useData();
  const effectiveId = astronautId ?? selectedAstronautId;

  const identity = useAstronaut(effectiveId, missionId);
  const workspace = useAstronautWorkspace(effectiveId, missionId);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const detail = useAssessmentDetail(selectedAssessmentId);

  const observationsByCode = useMemo(() => {
    const groups = new Map<string, ObservationDto[]>();
    for (const observation of workspace.data?.observations ?? []) {
      const existing = groups.get(observation.measurement_code) ?? [];
      existing.push(observation);
      groups.set(observation.measurement_code, existing);
    }
    for (const items of groups.values()) {
      items.sort(
        (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
      );
    }
    return groups;
  }, [workspace.data?.observations]);

  const chartable = [...observationsByCode.entries()]
    .map(([code, items]) => ({
      code,
      numeric: items.filter((item) => isNumericValue(item.value))
    }))
    .filter((item) => item.numeric.length >= 2)
    .slice(0, 8);

  const observationColumns: Column<ObservationDto>[] = [
    {
      key: 'measured',
      header: 'Measured (device)',
      render: (row) => <TimeDisplay measured_at={row.measured_at} format="compact" />
    },
    {
      key: 'code',
      header: 'Measurement',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{getMeasurementLabel(row.measurement_code)}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.measurement_code}
          </div>
        </div>
      )
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (row) =>
        isNumericValue(row.value) ? formatValue(row.value, row.unit) : String(row.value ?? '—')
    },
    {
      key: 'canonical',
      header: 'Canonical',
      align: 'right',
      render: (row) =>
        row.canonical_unit && isNumericValue(row.canonical_value)
          ? formatValue(row.canonical_value, row.canonical_unit)
          : '—'
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => getSourceTypeLabel(row.source.type)
    },
    {
      key: 'quality',
      header: 'Quality',
      render: (row) => row.quality_status.toUpperCase()
    },
    {
      key: 'created',
      header: 'Client created',
      render: (row) => <TimeDisplay created_at={row.created_at} format="compact" />
    },
    {
      key: 'received',
      header: 'Ground received',
      render: (row) => <TimeDisplay received_at={row.received_at} format="compact" />
    }
  ];

  const assessmentColumns: Column<AssessmentSummaryDto>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
          {row.assessment_type}
        </span>
      )
    },
    {
      key: 'module',
      header: 'Module',
      render: (row) => {
        if (!row.module_code) return 'Integrated';
        const domain = domainForModule(row.module_code);
        return domain ? (
          <button
            type="button"
            onClick={() => navigate(domain.route)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              fontSize: '11px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {domain.label}
          </button>
        ) : (
          row.module_code
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AssessmentBadge status={toAssessmentStatus(row.status)} />
    },
    {
      key: 'assessed',
      header: 'Assessed',
      render: (row) => (row.assessed_at ? formatTimestamp(row.assessed_at) : '—')
    },
    {
      key: 'summary',
      header: 'Summary',
      render: (row) => <span style={{ fontSize: '10px' }}>{row.summary}</span>
    },
    {
      key: 'algorithm',
      header: 'Algorithm / rules',
      render: (row) => (
        <span style={{ fontSize: '9px', fontFamily: 'monospace' }}>
          {row.algorithm_version} / {row.rule_set_version}
        </span>
      )
    },
    {
      key: 'synthetic',
      header: 'Data',
      render: (row) => (row.simulated ? <SyntheticTag compact /> : 'RECORDED')
    }
  ];

  const alertColumns: Column<AlertDto>[] = [
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <SeverityBadge severity={row.severity as never} />
    },
    {
      key: 'title',
      header: 'Alert',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.title}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.alert_code}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>{row.status}</span>
      )
    },
    {
      key: 'created',
      header: 'Raised',
      render: (row) => formatTimestamp(row.created_at)
    },
    {
      key: 'ack',
      header: 'Acknowledgement',
      render: (row) =>
        row.acknowledged_at ? (
          <div style={{ fontSize: '10px' }}>
            {formatTimestamp(row.acknowledged_at)}
            <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
              {row.acknowledged_by ?? 'actor not recorded'}
            </div>
          </div>
        ) : (
          <span style={{ fontSize: '10px' }}>Not acknowledged</span>
        )
    },
    {
      key: 'revision',
      header: 'Rev',
      align: 'right',
      render: (row) => row.revision
    }
  ];

  const actionColumns: Column<ActionDto>[] = [
    {
      key: 'title',
      header: 'Action',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.title}</div>
          <div style={{ fontSize: '9px' }}>{getActionTypeLabel(row.action_type)}</div>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => getPriorityLabel(row.priority)
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => getActionStatusLabel(row.status)
    },
    {
      key: 'due',
      header: 'Due',
      render: (row) => (row.due_at ? formatTimestamp(row.due_at) : 'No due time')
    },
    {
      key: 'revision',
      header: 'Rev',
      align: 'right',
      render: (row) => row.revision
    }
  ];

  const runColumns: Column<AnalysisRunDto>[] = [
    {
      key: 'run',
      header: 'Run',
      render: (row) => (
        <span style={{ fontSize: '9px', fontFamily: 'monospace' }}>{row.run_id.slice(0, 8)}…</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => row.status.toUpperCase()
    },
    {
      key: 'algorithm',
      header: 'Algorithm / rules',
      render: (row) => (
        <span style={{ fontSize: '9px', fontFamily: 'monospace' }}>
          {row.algorithm_version} / {row.rule_set_version}
        </span>
      )
    },
    {
      key: 'location',
      header: 'Execution',
      render: (row) => row.execution_location
    },
    {
      key: 'started',
      header: 'Started',
      render: (row) => (row.started_at ? formatTimestamp(row.started_at) : '—')
    },
    {
      key: 'completed',
      header: 'Completed',
      render: (row) => (row.completed_at ? formatTimestamp(row.completed_at) : '—')
    },
    {
      key: 'error',
      header: 'Error code',
      render: (row) => row.error_code ?? '—'
    }
  ];

  if (!effectiveId) {
    return (
      <div>
        <PageHeader eyebrow="Crew" title="Crew health workspace" />
        <EmptyState
          title="No crew member selected"
          description="Select a crew member from the roster or header before opening a health workspace."
        />
      </div>
    );
  }

  if (workspace.loading) {
    return <LoadingState message="Loading crew observations, assessments and provenance..." />;
  }

  if (workspace.error || !workspace.data) {
    return (
      <div>
        <PageHeader
          eyebrow="Crew"
          title={identity.data?.display_name ?? 'Crew health workspace'}
        />
        <ErrorNotice
          title="Crew workspace unavailable"
          message={workspace.error?.message ?? 'The Ground API returned no workspace payload.'}
          details={workspace.error?.details}
        />
      </div>
    );
  }

  const data = workspace.data;
  const dash = data.dashboard;
  const astronaut = identity.data;
  const openAlerts = data.alerts.filter((alert) => alert.status === 'open');
  const acknowledgedAlerts = data.alerts.filter((alert) => alert.status === 'acknowledged');
  const latestObservation = data.observations[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Crew health workspace"
        title={astronaut?.display_name ?? identity.data?.astronaut_code ?? 'Crew member'}
        description={
          mission
            ? `${mission.mission_code} · ${mission.mission_name}. All values originate from received observations and server analysis records.`
            : 'Crew record from the Ground API.'
        }
        actions={
          <div style={{ display: 'flex', gap: '6px' }}>
            <SecondaryButton size="sm" onClick={() => selectAstronaut(effectiveId)}>
              Select for console
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={workspace.refetch} icon={<IconRefresh size={12} />}>
              Reload
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={() => navigate('/crew')}>
              Roster
            </SecondaryButton>
          </div>
        }
      />

      {data.warnings.map((warning) => (
        <WarningNotice key={warning} message={warning} />
      ))}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px'
        }}
      >
        <Stat
          label="Integrated status"
          value={dash ? toAssessmentStatus(dash.integrated_status).replace('_', ' ').toUpperCase() : '—'}
          detail={dash?.assessed_at ? formatTimestamp(dash.assessed_at) : 'No integrated assessment'}
          emphasis
        />
        <Stat
          label="Freshness"
          value={dash ? normaliseFreshness(dash.freshness).toUpperCase() : '—'}
          detail={latestObservation ? `Latest ${formatTimestamp(latestObservation.measured_at)}` : 'No observation'}
        />
        <Stat label="Observations" value={data.observations.length} detail="Received records (up to 500)" />
        <Stat label="Open alerts" value={openAlerts.length} detail={`${acknowledgedAlerts.length} acknowledged`} />
        <Stat label="Pending actions" value={dash?.pending_action_count ?? 0} />
        <Stat label="Analysis runs" value={data.analysisRuns.length} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '12px'
        }}
      >
        <Panel title="Identification" subtitle="Enrolled astronaut record">
          {astronaut ? (
            <>
              <KeyValue label="Display name" value={astronaut.display_name} />
              <KeyValue label="Astronaut code" value={astronaut.astronaut_code} mono />
              <KeyValue label="Astronaut ID" value={astronaut.astronaut_id} mono />
              <KeyValue label="Mission IDs" value={astronaut.mission_ids.join(', ') || 'None'} mono />
              <KeyValue label="Record created" value={astronaut.created_at ? formatTimestamp(astronaut.created_at) : '—'} />
              <KeyValue label="Record updated" value={astronaut.updated_at ? formatTimestamp(astronaut.updated_at) : '—'} />
              <KeyValue label="Simulated" value={astronaut.simulated ? 'YES — synthetic demonstration record' : 'NO'} />
              {astronaut.simulated && <div style={{ marginTop: '8px' }}><SyntheticTag /></div>}
            </>
          ) : (
            <ErrorNotice
              title="Identity payload"
              message={identity.error?.message ?? 'Astronaut identity was not returned.'}
            />
          )}
        </Panel>

        <Panel title="Measurement provenance" subtitle="Device time, client envelope and Ground receipt are distinct">
          <KeyValue
            label="Latest measured"
            value={latestObservation ? formatTimestamp(latestObservation.measured_at) : '—'}
          />
          <KeyValue
            label="Latest client created"
            value={latestObservation?.created_at ? formatTimestamp(latestObservation.created_at) : '—'}
          />
          <KeyValue
            label="Latest Ground receipt"
            value={latestObservation?.received_at ? formatTimestamp(latestObservation.received_at) : '—'}
          />
          <KeyValue label="Latest source" value={latestObservation ? getSourceTypeLabel(latestObservation.source.type) : '—'} />
          <KeyValue label="Latest quality" value={latestObservation?.quality_status.toUpperCase() ?? '—'} />
          <KeyValue
            label="Contact recency"
            value={dash?.contact_recency ?? 'unknown'}
          />
          <KeyValue
            label="Adapter state observed"
            value={dash?.adapter_state_observed_at ? formatTimestamp(dash.adapter_state_observed_at) : 'Not reported'}
          />
          <KeyValue
            label="Generated at"
            value={dash?.generated_at ? formatTimestamp(dash.generated_at) : '—'}
          />
        </Panel>
      </div>

      <Panel
        title="Assessments"
        subtitle="Select a row to inspect findings and evidence"
        actions={data.assessments.length > 0 ? <span style={{ fontSize: '9px' }}>{data.assessments.length} RECORD(S)</span> : undefined}
      >
        {data.assessments.length === 0 ? (
          <EmptyState
            title="No assessments"
            description="No module or integrated assessment exists for this crew member."
          />
        ) : (
          <DataTable
            columns={assessmentColumns}
            data={data.assessments}
            keyField="assessment_id"
            selectedRowKey={selectedAssessmentId ?? undefined}
            onRowClick={(row) => setSelectedAssessmentId(row.assessment_id)}
          />
        )}
      </Panel>

      {selectedAssessmentId && (
        <Panel
          title="Assessment detail & evidence"
          subtitle="Server-computed findings with linked observation identifiers"
          actions={
            <SecondaryButton size="sm" onClick={() => setSelectedAssessmentId(null)}>
              Close
            </SecondaryButton>
          }
        >
          {detail.loading ? (
            <LoadingState height={120} message="Loading assessment detail..." />
          ) : detail.error || !detail.data ? (
            <ErrorNotice
              title="Assessment detail"
              message={detail.error?.message ?? 'No detail payload.'}
              details={detail.error?.details}
            />
          ) : (
            <>
              <KeyValue label="Assessment ID" value={detail.data.assessment_id} mono />
              <KeyValue label="Data sufficiency" value={detail.data.data_sufficiency ?? 'Not returned'} />
              <KeyValue label="Analysis run" value={detail.data.analysis_run_id ?? 'Not linked'} mono />
              <KeyValue
                label="Evidence observation IDs"
                value={
                  detail.data.evidence_observation_ids && detail.data.evidence_observation_ids.length > 0
                    ? detail.data.evidence_observation_ids.join(', ')
                    : 'None linked'
                }
                mono
              />
              {detail.data.baseline_versions && detail.data.baseline_versions.length > 0 && (
                <KeyValue
                  label="Baseline versions"
                  value={detail.data.baseline_versions
                    .map((baseline) => `${baseline.measurement_code ?? 'unknown'} v${baseline.version}`)
                    .join(', ')}
                />
              )}
              {detail.data.limitations && detail.data.limitations.length > 0 && (
                <div style={{ marginTop: '8px' }}>
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
              {detail.data.findings && detail.data.findings.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
                    FINDINGS
                  </div>
                  {detail.data.findings.map((finding) => (
                    <div
                      key={finding.finding_code}
                      style={{ border: '1px solid rgba(0,0,0,0.25)', padding: '7px 8px', marginBottom: '6px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '11px' }}>
                          {finding.measurement_code
                            ? getMeasurementLabel(finding.measurement_code)
                            : finding.finding_code}
                        </span>
                        <SeverityBadge severity={finding.severity as never} />
                      </div>
                      <div style={{ fontSize: '10px', marginTop: '3px' }}>{finding.explanation}</div>
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                        Evidence: {finding.evidence_observation_ids.join(', ') || 'none linked'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      <Panel title="Observed trends" subtitle="Every point is a received observation; gaps are not filled">
        {chartable.length === 0 ? (
          <EmptyState
            title="Insufficient numeric history"
            description="At least two numeric observations of the same code are required to draw a trend."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '12px'
            }}
          >
            {chartable.map(({ code, numeric }) => (
              <TrendChart
                key={code}
                title={getMeasurementLabel(code)}
                unit={numeric[0]?.unit ?? ''}
                data={numeric.map((item) => ({
                  timestamp: item.measured_at,
                  value: item.value as number
                }))}
                height={150}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Observation history" subtitle="Newest first; original device unit preserved">
        {data.observations.length === 0 ? (
          <EmptyState
            title="No observations"
            description="No observation has been received for this crew member."
          />
        ) : (
          <DataTable
            columns={observationColumns}
            data={data.observations}
            keyField="observation_id"
            emptyMessage="No observations."
          />
        )}
      </Panel>

      <Panel title="Alerts" subtitle="Open, acknowledged, resolved and dismissed records">
        {data.alerts.length === 0 ? (
          <EmptyState
            title="No alerts"
            description="The analysis service produced no alert records for this crew member."
          />
        ) : (
          <DataTable columns={alertColumns} data={data.alerts} keyField="alert_id" />
        )}
      </Panel>

      <Panel title="Recommended actions" subtitle="Server-persisted action lifecycle">
        {data.actions.length === 0 ? (
          <EmptyState
            title="No recommended actions"
            description="No action record exists for this crew member."
          />
        ) : (
          <DataTable columns={actionColumns} data={data.actions} keyField="action_id" />
        )}
      </Panel>

      <Panel title="Analysis runs" subtitle="Persisted provenance; selecting a run does not re-execute analysis">
        {data.analysisRuns.length === 0 ? (
          <EmptyState
            title="No analysis runs"
            description="No analysis run is recorded for this crew member."
          />
        ) : (
          <DataTable columns={runColumns} data={data.analysisRuns} keyField="run_id" />
        )}
      </Panel>

      {dash && (
        <Panel title="Data quality summary">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            <Stat label="Quality status" value={dash.data_quality.status.toUpperCase()} />
            <Stat label="Total observations" value={dash.data_quality.observation_count} />
            <Stat label="Invalid" value={dash.data_quality.invalid_measurement_count} />
            <Stat label="Questionable" value={dash.data_quality.questionable_measurement_count} />
            <Stat label="Stale" value={dash.data_quality.stale_measurement_count} />
            <Stat
              label="Freshness"
              value={<FreshnessBadge freshness={normaliseFreshness(dash.freshness)} />}
            />
          </div>
        </Panel>
      )}
    </div>
  );
};

export default AstronautProfile;
