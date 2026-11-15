// Ground Health Console — Health-domain workspace
// One implementation backs all seven domain screens. It renders only codes the
// backend catalogue publishes, preserves recorded units and timestamps, and
// reports unobserved codes instead of manufacturing values.

import React from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useDomainData } from '../api/hooks';
import { DOMAIN_BY_KEY } from '../api/domains';
import type { DomainDescriptor } from '../api/domains';
import type { BaselineDto, ObservationDto } from '../api/types';
import { TrendChart } from '../components/common/TrendChart';
import { DataTable, Column } from '../components/common/DataTable';
import { AssessmentBadge, FreshnessBadge, SeverityBadge, SyntheticTag } from '../components/common/StatusBadge';
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
  getMeasurementLabel,
  getSourceTypeLabel,
  isNumericValue,
  normaliseFreshness,
  toAssessmentStatus
} from '../utilities';

interface CodeSummary {
  code: string;
  displayName: string;
  description: string;
  unit: string | null;
  observations: ObservationDto[];
  latest: ObservationDto | null;
}

function summarise(
  domain: DomainDescriptor,
  definitions: { code: string; display_name: string; description: string; canonical_unit: string | null }[],
  observations: ObservationDto[]
): CodeSummary[] {
  return definitions.map((definition) => {
    const codeObservations = observations
      .filter((item) => item.measurement_code === definition.code)
      .sort(
        (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
      );
    return {
      code: definition.code,
      displayName: definition.display_name || getMeasurementLabel(definition.code),
      description: definition.description,
      unit: definition.canonical_unit,
      observations: codeObservations,
      latest: codeObservations[0] ?? null
    };
  });
}

export const DomainWorkspace: React.FC = () => {
  const { domainKey } = useParams<{ domainKey: string }>();
  const domain = domainKey ? DOMAIN_BY_KEY[domainKey] ?? null : null;

  if (!domain) {
    return (
      <div>
        <PageHeader
          eyebrow="Health domains"
          title="Unknown domain"
          description="The requested workspace does not exist."
        />
        <EmptyState
          title="No such domain workspace"
          description="Choose one of the supported domains from the navigation."
        />
      </div>
    );
  }

  return <DomainWorkspaceBody domain={domain} />;
};

const DomainWorkspaceBody: React.FC<{ domain: DomainDescriptor }> = ({ domain }) => {
  const { selectedAstronaut, selectedAstronautId, missionId, mission, commStatus } = useData();
  const query = useDomainData(domain);
  const freshnessEntry =
    commStatus?.freshness.find((entry) => entry.astronaut_id === selectedAstronautId) ??
    commStatus?.freshness[0] ??
    null;

  if (!selectedAstronautId || !missionId) {
    return (
      <div>
        <PageHeader eyebrow="Health domains" title={domain.label} description={domain.description} />
        <EmptyState
          title="No crew or mission selected"
          description="A health-domain workspace requires an authenticated mission and a selected crew member."
        />
      </div>
    );
  }

  if (query.loading) {
    return (
      <div>
        <PageHeader eyebrow="Health domains" title={domain.label} description={domain.description} />
        <LoadingState message={`Loading ${domain.label.toLowerCase()} observations and assessment...`} />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div>
        <PageHeader eyebrow="Health domains" title={domain.label} description={domain.description} />
        <ErrorNotice
          title="Domain data unavailable"
          message={query.error?.message ?? 'No domain payload was returned.'}
          details={query.error?.details}
        />
      </div>
    );
  }

  const data = query.data;
  const summaries = summarise(domain, data.definitions, data.observations);
  const observed = summaries.filter((item) => item.observations.length > 0);
  const unobserved = summaries.filter((item) => item.observations.length === 0);
  const latestObservation = data.observations.reduce<ObservationDto | null>((latest, item) => {
    if (!latest) return item;
    return new Date(item.measured_at).getTime() > new Date(latest.measured_at).getTime()
      ? item
      : latest;
  }, null);

  const summaryColumns: Column<CodeSummary>[] = [
    {
      key: 'code',
      header: 'Measurement code',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.displayName}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
            {row.code}
          </div>
        </div>
      )
    },
    {
      key: 'unit',
      header: 'Catalogue unit',
      render: (row) => <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{row.unit ?? '—'}</span>
    },
    {
      key: 'count',
      header: 'Observations',
      align: 'center',
      render: (row) => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.observations.length}</span>
    },
    {
      key: 'latest',
      header: 'Latest recorded value',
      align: 'right',
      render: (row) =>
        row.latest ? (
          <span style={{ fontFamily: 'monospace' }}>
            {isNumericValue(row.latest.value)
              ? formatValue(row.latest.value, row.latest.unit)
              : String(row.latest.value ?? '—')}
          </span>
        ) : (
          <span style={{ color: 'rgba(0,0,0,0.5)' }}>Not observed</span>
        )
    },
    {
      key: 'measured',
      header: 'Measured (device)',
      render: (row) =>
        row.latest ? <TimeDisplay measured_at={row.latest.measured_at} format="compact" /> : '—'
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => (row.latest ? getSourceTypeLabel(row.latest.source.type) : '—')
    },
    {
      key: 'quality',
      header: 'Quality',
      render: (row) =>
        row.latest ? (
          <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{row.latest.quality_status}</span>
        ) : (
          '—'
        )
    }
  ];

  const baselineColumns: Column<BaselineDto>[] = [
    {
      key: 'code',
      header: 'Measurement',
      render: (row) => (
        <span style={{ fontSize: '11px' }}>
          {row.measurement_code ? getMeasurementLabel(row.measurement_code) : '—'}
        </span>
      )
    },
    {
      key: 'mean',
      header: 'Mean',
      align: 'right',
      render: (row) => (row.mean !== null ? formatValue(row.mean, row.unit ?? '') : '—')
    },
    {
      key: 'sd',
      header: 'SD',
      align: 'right',
      render: (row) => (row.standard_deviation !== null ? formatValue(row.standard_deviation, row.unit ?? '') : '—')
    },
    {
      key: 'range',
      header: 'Min / max',
      align: 'right',
      render: (row) =>
        row.minimum !== null && row.maximum !== null
          ? `${row.minimum} / ${row.maximum}`
          : '—'
    },
    {
      key: 'samples',
      header: 'Samples',
      align: 'center',
      render: (row) => row.sample_count
    },
    {
      key: 'version',
      header: 'Version',
      align: 'center',
      render: (row) => `v${row.version}`
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => row.status.toUpperCase()
    },
    {
      key: 'period',
      header: 'Period end',
      render: (row) => (row.period_end ? formatTimestamp(row.period_end) : '—')
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow={`Health domain · ${domain.moduleCode}`}
        title={domain.label}
        description={`${domain.description} ${domain.scopeNote}`}
        actions={
          <SecondaryButton size="sm" onClick={query.refetch} icon={<IconRefresh size={12} />}>
            Reload
          </SecondaryButton>
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
          label="Crew member"
          value={selectedAstronaut?.display_name ?? '—'}
          detail={mission ? `${mission.mission_code} · ${mission.mission_name}` : undefined}
        />
        <Stat label="Supported codes" value={summaries.length} detail={`${domain.measurementCodes.length} catalogued aliases`} />
        <Stat label="Codes observed" value={`${observed.length} / ${summaries.length}`} emphasis={observed.length === 0} />
        <Stat label="Observations" value={data.observations.length} />
        <Stat
          label="Latest measurement"
          value={latestObservation ? formatTimestamp(latestObservation.measured_at, 'time') : 'None'}
          detail={
            latestObservation
              ? `${getMeasurementLabel(latestObservation.measurement_code)} · ${formatValue(
                  isNumericValue(latestObservation.value) ? latestObservation.value : null,
                  latestObservation.unit
                )}`
              : 'No observation recorded'
          }
        />
        <Stat
          label="Domain assessment"
          value={data.assessment ? toAssessmentStatus(data.assessment.status).replace('_', ' ').toUpperCase() : 'NONE'}
          detail={data.assessment?.assessed_at ? formatTimestamp(data.assessment.assessed_at) : 'No assessment recorded'}
        />
        <Stat
          label="Health-data freshness"
          value={
            freshnessEntry ? (
              <FreshnessBadge freshness={normaliseFreshness(freshnessEntry.status)} />
            ) : (
              'NOT REPORTED'
            )
          }
          detail={
            freshnessEntry?.latest_measured_at
              ? `Latest measured ${formatTimestamp(freshnessEntry.latest_measured_at)}`
              : 'No freshness record for this crew member'
          }
        />
      </div>

      <Panel
        title="Measurement coverage"
        subtitle="Codes and units come from the published measurement catalogue"
        actions={
          data.catalogue ? (
            <span style={{ fontSize: '9px', fontFamily: 'monospace' }}>
              CATALOGUE v{data.catalogue.catalogue_version}
            </span>
          ) : undefined
        }
      >
        {summaries.length === 0 ? (
          <EmptyState
            title="No supported measurement definitions"
            description="The catalogue does not publish any definition for this workspace."
          />
        ) : (
          <DataTable
            columns={summaryColumns}
            data={summaries}
            keyField="code"
            emptyMessage="No measurement definitions."
          />
        )}
      </Panel>

      {unobserved.length > 0 && (
        <Panel title="Not observed" subtitle="Catalogued codes with no received observation">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {unobserved.map((item) => (
              <span
                key={item.code}
                title={item.description}
                style={{
                  border: '1px dashed #000000',
                  padding: '3px 6px',
                  fontSize: '10px',
                  backgroundColor: '#FAFAFA'
                }}
              >
                {item.displayName} <span style={{ fontFamily: 'monospace', opacity: 0.55 }}>{item.code}</span>
              </span>
            ))}
          </div>
          <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.65)', margin: '8px 0 0 0' }}>
            These gaps are reported as absent data. The console does not substitute population values or
            interpolate them.
          </p>
        </Panel>
      )}

      {domain.moduleCode === 'behavioural_cognitive' && (
        <WarningNotice
          title="Shared module"
          message="The backend analyses Behavioural Health and Sleep & Cognition as one behavioural/cognitive module. This workspace shows the same module assessment as the other split view; measurement tables remain separated by code."
        />
      )}

      <Panel
        title="Observed trends"
        subtitle="Points are plotted only where observations exist; no resampling or interpolation"
      >
        {observed.length === 0 ? (
          <EmptyState
            title="No observations recorded"
            description={`No ${domain.label.toLowerCase()} observations have been received for this crew member. The assessment is therefore limited to the server's insufficient-data output.`}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '12px'
            }}
          >
            {observed.map((item) => {
              const numeric = item.observations.filter((observation) =>
                isNumericValue(observation.value)
              );
              const points = [...numeric]
                .sort(
                  (a, b) =>
                    new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
                )
                .map((observation) => ({
                  timestamp: observation.measured_at,
                  value: observation.value as number,
                  label:
                    observation.source.type === 'simulation' ? 'Simulated observation' : undefined
                }));
              if (points.length === 0) {
                return (
                  <div key={item.code} style={{ border: '1px solid rgba(0,0,0,0.25)', padding: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>{item.displayName}</div>
                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                      Non-numeric values recorded; no chart is produced.
                    </div>
                  </div>
                );
              }
              return (
                <div key={item.code}>
                  <TrendChart
                    title={item.displayName}
                    unit={item.latest?.unit ?? item.unit ?? ''}
                    data={points}
                    height={150}
                  />
                  <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.55)', marginTop: '2px' }}>
                    {points.length} numeric point(s) · {item.latest?.simulated ? 'simulated record' : 'recorded'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="Domain assessment"
        subtitle="Server-generated module assessment with explicit provenance"
        actions={data.assessment?.simulated ? <SyntheticTag /> : undefined}
      >
        {!data.assessment ? (
          <EmptyState
            title="No assessment recorded"
            description="No module assessment exists for this crew member and domain."
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <AssessmentBadge status={toAssessmentStatus(data.assessment.status)} />
              <span style={{ fontSize: '10px' }}>
                {data.assessment.assessment_type.toUpperCase()} · assessed{' '}
                {data.assessment.assessed_at ? formatTimestamp(data.assessment.assessed_at) : 'unknown'}
              </span>
            </div>
            <p style={{ fontSize: '12px', margin: '0 0 8px 0' }}>{data.assessment.summary}</p>
            <KeyValue label="Algorithm version" value={data.assessment.algorithm_version} mono />
            <KeyValue label="Rule-set version" value={data.assessment.rule_set_version} mono />
            <KeyValue
              label="Data sufficiency"
              value={data.assessmentDetail?.data_sufficiency ?? 'Not returned'}
            />
            <KeyValue
              label="Analysis run"
              value={data.assessmentDetail?.analysis_run_id ?? 'Not linked'}
              mono
            />
            {data.assessmentDetail?.limitations && data.assessmentDetail.limitations.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '3px' }}>
                  LIMITATIONS
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px' }}>
                  {data.assessmentDetail.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.assessmentDetail?.findings && data.assessmentDetail.findings.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
                  FINDINGS & EVIDENCE
                </div>
                {data.assessmentDetail.findings.map((finding) => (
                  <div
                    key={finding.finding_code}
                    style={{ border: '1px solid rgba(0,0,0,0.25)', padding: '7px 8px', marginBottom: '6px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '11px' }}>
                        {finding.measurement_code
                          ? getMeasurementLabel(finding.measurement_code)
                          : finding.finding_code}
                      </span>
                      <SeverityBadge severity={finding.severity as never} />
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '3px' }}>{finding.explanation}</div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)', marginTop: '3px' }}>
                      Current {finding.current_value ?? '—'} {finding.unit ?? ''} · baseline{' '}
                      {finding.baseline_value ?? '—'} {finding.unit ?? ''}
                    </div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                      Evidence observations: {finding.evidence_observation_ids.join(', ') || 'none linked'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>

      <Panel title="Personal baselines" subtitle="Versioned baseline records returned by the Ground API">
        {data.baselines.length === 0 ? (
          <EmptyState
            title="No domain baseline"
            description="No personal baseline has been activated for the codes in this workspace."
          />
        ) : (
          <DataTable
            columns={baselineColumns}
            data={data.baselines}
            keyField="baseline_id"
            emptyMessage="No baselines."
          />
        )}
      </Panel>

      <Panel title="Domain alerts" subtitle="Alerts whose code references this analysis module">
        {data.alerts.length === 0 ? (
          <EmptyState
            title="No domain alerts"
            description="The analysis service produced no alert whose code references this module."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.alerts.map((alert) => (
              <div key={alert.alert_id} style={{ border: '1px solid rgba(0,0,0,0.25)', padding: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '11px' }}>{alert.title}</div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                      {alert.alert_code} · rev {alert.revision}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <SeverityBadge severity={alert.severity as never} />
                    <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>
                      {alert.status}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>{alert.message}</div>
                {alert.provenance?.analysis_run_id && (
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)', marginTop: '3px' }}>
                    Analysis run {String(alert.provenance.analysis_run_id)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default DomainWorkspace;
