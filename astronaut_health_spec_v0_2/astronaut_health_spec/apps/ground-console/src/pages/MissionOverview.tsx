// Ground Health Console — Mission Overview
// Operational landing page built from live dashboard, crew, alert,
// communication and observation payloads.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useCrewOverview, useDashboard, useRecentObservations } from '../api/hooks';
import type { CrewOverviewRow } from '../api/hooks';
import type { AlertDto, ObservationDto } from '../api/types';
import { DataTable, Column } from '../components/common/DataTable';
import {
  AssessmentBadge,
  CommStateBadge,
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
  SectionGrid,
  Stat,
  WarningNotice
} from '../components/common/PageChrome';
import {
  formatTimestamp,
  formatValue,
  getMeasurementLabel,
  getSourceTypeLabel,
  isNumericValue,
  normaliseCommunicationState,
  normaliseFreshness,
  toAssessmentStatus
} from '../utilities';

export const MissionOverview: React.FC = () => {
  const navigate = useNavigate();
  const {
    mission,
    missionId,
    selectedAstronautId,
    selectedAstronaut,
    astronauts,
    commStatus,
    commSupported,
    commError,
    missionsLoading,
    missionError,
    crewError,
    refreshAll
  } = useData();

  const crew = useCrewOverview();
  const dashboard = useDashboard(selectedAstronautId, missionId);
  const recent = useRecentObservations(selectedAstronautId, missionId, 12);

  const openAlerts = (crew.data?.rows ?? []).flatMap((row) => row.openAlerts);
  const acknowledgedAlerts = (crew.data?.rows ?? []).flatMap((row) =>
    row.acknowledgedAlerts
  );

  const crewColumns: Column<CrewOverviewRow>[] = [
    {
      key: 'name',
      header: 'Crew member',
      render: (row) => (
        <div>
          <button
            type="button"
            onClick={() => navigate(`/crew/${row.astronaut.astronaut_id}`)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {row.astronaut.display_name}
          </button>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
            {row.astronaut.astronaut_code}
          </div>
        </div>
      )
    },
    {
      key: 'integrated',
      header: 'Integrated status',
      render: (row) =>
        row.dashboard ? (
          <AssessmentBadge status={toAssessmentStatus(row.dashboard.integrated_status)} />
        ) : (
          <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.55)' }}>NO PAYLOAD</span>
        )
    },
    {
      key: 'freshness',
      header: 'Measurement freshness',
      render: (row) =>
        row.dashboard ? (
          <FreshnessBadge freshness={normaliseFreshness(row.dashboard.freshness)} />
        ) : (
          '—'
        )
    },
    {
      key: 'latest',
      header: 'Latest measurement',
      render: (row) =>
        row.dashboard?.latest_measured_at ? (
          <TimeDisplay measured_at={row.dashboard.latest_measured_at} format="compact" />
        ) : (
          <span style={{ fontSize: '10px' }}>No measurement recorded</span>
        )
    },
    {
      key: 'alerts',
      header: 'Open / acknowledged',
      align: 'center',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {row.openAlerts.length} / {row.acknowledgedAlerts.length}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Pending actions',
      align: 'center',
      render: (row) =>
        row.dashboard ? (
          <span style={{ fontFamily: 'monospace' }}>{row.dashboard.pending_action_count}</span>
        ) : (
          '—'
        )
    },
    {
      key: 'error',
      header: 'Status',
      render: (row) =>
        row.error ? (
          <span style={{ fontSize: '10px', fontWeight: 700 }} title={row.error.message}>
            PARTIAL / ERROR
          </span>
        ) : (
          <span style={{ fontSize: '10px' }}>RECEIVED</span>
        )
    }
  ];

  const observationColumns: Column<ObservationDto>[] = [
    {
      key: 'measured_at',
      header: 'Measured (device)',
      render: (row) => <TimeDisplay measured_at={row.measured_at} format="compact" />
    },
    {
      key: 'code',
      header: 'Measurement',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{getMeasurementLabel(row.measurement_code)}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
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
        isNumericValue(row.value)
          ? formatValue(row.value, row.unit)
          : String(row.value ?? '—')
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => (
        <span style={{ fontSize: '10px' }}>
          {getSourceTypeLabel(row.source.type)}
          {row.source.device_id && (
            <span style={{ display: 'block', fontFamily: 'monospace', fontSize: '9px', color: 'rgba(0,0,0,0.55)' }}>
              {row.source.device_id}
            </span>
          )}
        </span>
      )
    },
    {
      key: 'quality',
      header: 'Quality',
      render: (row) => (
        <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{row.quality_status}</span>
      )
    },
    {
      key: 'received',
      header: 'Received by Ground',
      render: (row) => <TimeDisplay received_at={row.received_at} format="compact" />
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
      key: 'created',
      header: 'Raised',
      render: (row) => formatTimestamp(row.created_at)
    },
    {
      key: 'revision',
      header: 'Rev',
      align: 'right',
      render: (row) => <span style={{ fontFamily: 'monospace' }}>{row.revision}</span>
    }
  ];

  if (missionsLoading && !mission) {
    return <LoadingState message="Loading mission scope from the Ground API..." />;
  }

  if (!missionId) {
    return (
      <div>
        <PageHeader
          eyebrow="Operations"
          title="Mission Overview"
          description="Mission context is derived from the authenticated Ground API session."
        />
        {missionError ? (
          <ErrorNotice title="Mission scope unavailable" message={missionError} />
        ) : (
          <EmptyState
            title="No mission in scope"
            description="The Ground API returned no mission for this identity. Mission and crew data cannot be displayed."
          />
        )}
      </div>
    );
  }

  const dash = dashboard.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Operations"
        title="Mission Overview"
        description={
          mission
            ? `${mission.mission_name} · ${mission.mission_type} · status ${mission.status}. All measurements are shown as received; no values are interpolated.`
            : 'Mission context loading.'
        }
        actions={
          <SecondaryButton
            size="sm"
            onClick={() => {
              crew.refetch();
              dashboard.refetch();
              recent.refetch();
              refreshAll();
            }}
            icon={<IconRefresh size={12} />}
          >
            Refresh
          </SecondaryButton>
        }
      />

      {missionError && <ErrorNotice title="Mission scope" message={missionError} />}
      {crewError && <ErrorNotice title="Crew roster" message={crewError} />}
      {crew.error && <ErrorNotice title="Crew overview" message={crew.error.message} details={crew.error.details} />}
      {dashboard.error && (
        <ErrorNotice
          title="Selected crew dashboard"
          message={dashboard.error.message}
          details={dashboard.error.details}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px'
        }}
      >
        <Stat
          label="Integrated assessment"
          value={dash ? toAssessmentStatus(dash.integrated_status).replace('_', ' ').toUpperCase() : '—'}
          detail={dash?.assessed_at ? `Assessed ${formatTimestamp(dash.assessed_at)}` : 'No assessment recorded'}
          emphasis
        />
        <Stat
          label="Open alerts"
          value={openAlerts.length}
          detail={`${acknowledgedAlerts.length} acknowledged`}
        />
        <Stat
          label="Pending actions"
          value={dash?.pending_action_count ?? 0}
          detail={selectedAstronaut?.display_name ?? 'No crew selected'}
        />
        <Stat
          label="Freshness"
          value={dash ? normaliseFreshness(dash.freshness).toUpperCase() : '—'}
          detail={dash?.latest_measured_at ? `Measured ${formatTimestamp(dash.latest_measured_at)}` : 'No measurement recorded'}
        />
        <Stat
          label="Last successful sync"
          value={
            commStatus?.last_successful_contact_at
              ? formatTimestamp(commStatus.last_successful_contact_at, 'time')
              : 'Not reported'
          }
          detail={commStatus?.contact_recency ? `Contact recency: ${commStatus.contact_recency}` : undefined}
        />
        <Stat
          label="Reported link state"
          value={normaliseCommunicationState(commStatus?.state)}
          detail={commStatus?.observed_at ? `Observed ${formatTimestamp(commStatus.observed_at)}` : 'No state report'}
        />
      </div>

      <SectionGrid columns={2}>
        <Panel
          title="Mission context"
          subtitle="Server-side mission record; flight day calculated from start time"
        >
          {mission ? (
            <>
              <KeyValue label="Mission code" value={mission.mission_code} mono />
              <KeyValue label="Mission name" value={mission.mission_name} />
              <KeyValue label="Type" value={mission.mission_type} />
              <KeyValue label="Status" value={mission.status} />
              <KeyValue label="Start" value={mission.start_at ? formatTimestamp(mission.start_at) : 'Not recorded'} />
              <KeyValue
                label="Expected end"
                value={mission.expected_end_at ? formatTimestamp(mission.expected_end_at) : 'Not recorded'}
              />
              <KeyValue
                label="Mission day"
                value={dash?.mission_day !== null && dash?.mission_day !== undefined ? `Day ${dash.mission_day}` : 'Not calculated'}
              />
              <KeyValue label="Simulated mission" value={mission.simulated ? 'YES — synthetic demonstration' : 'NO'} />
              <KeyValue
                label="Crew in scope"
                value={`${astronauts.length} enrolled record${astronauts.length === 1 ? '' : 's'}`}
              />
            </>
          ) : (
            <EmptyState title="No mission record" description="No mission context is available." />
          )}
        </Panel>

        <Panel
          title="Communication & sync"
          subtitle="Adapter-reported state; a successful API request is never promoted to LIVE"
        >
          {!commSupported ? (
            <EmptyState
              title="Not in this role's scope"
              description="Administrator identities cannot read clinical communication state or health freshness."
            />
          ) : commError ? (
            <ErrorNotice title="Communication state" message={commError} />
          ) : commStatus ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em' }}>REPORTED</span>
                <CommStateBadge state={normaliseCommunicationState(commStatus.state)} showDetail />
              </div>
              <KeyValue label="State observed" value={commStatus.observed_at ? formatTimestamp(commStatus.observed_at) : 'Not reported'} />
              <KeyValue
                label="Last successful contact"
                value={commStatus.last_successful_contact_at ? formatTimestamp(commStatus.last_successful_contact_at) : 'Not reported'}
              />
              <KeyValue label="Last push" value={commStatus.last_push_at ? formatTimestamp(commStatus.last_push_at) : 'Not reported'} />
              <KeyValue label="Last pull" value={commStatus.last_pull_at ? formatTimestamp(commStatus.last_pull_at) : 'Not reported'} />
              <KeyValue
                label="Queued events"
                value={
                  commStatus.queued_event_count_reported
                    ? commStatus.queued_event_count
                    : 'Not reported'
                }
              />
              <KeyValue
                label="Estimated delay"
                value={
                  commStatus.estimated_delay_seconds !== null
                    ? `${commStatus.estimated_delay_seconds}s`
                    : 'Not reported'
                }
              />
              {commStatus.freshness.map((entry) => (
                <div key={entry.astronaut_id} style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '2px' }}>
                    HEALTH-DATA FRESHNESS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <FreshnessBadge freshness={normaliseFreshness(entry.status)} />
                    <span style={{ fontSize: '10px' }}>
                      Measured {entry.latest_measured_at ? formatTimestamp(entry.latest_measured_at) : 'not recorded'}
                    </span>
                    <span style={{ fontSize: '10px' }}>
                      Received {entry.latest_received_at ? formatTimestamp(entry.latest_received_at) : 'not recorded'}
                    </span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <EmptyState
              title="No reported state"
              description="The Ground API holds no communication-state report for this crew member. The console does not infer LIVE."
            />
          )}
        </Panel>
      </SectionGrid>

      <Panel
        title="Crew roster"
        subtitle="Integrated status and freshness are read per crew member from the Ground API"
        actions={<span style={{ fontSize: '9px' }}>{crew.loading ? 'LOADING…' : `${crew.data?.rows.length ?? 0} RECORD(S)`}</span>}
      >
        {crew.loading ? (
          <LoadingState height={120} message="Loading crew dashboards..." />
        ) : (
          <DataTable
            columns={crewColumns}
            data={crew.data?.rows ?? []}
            keyField={(row) => row.astronaut.astronaut_id}
            emptyMessage={
              crewError
                ? 'The crew roster could not be loaded for this identity; see the notice above.'
                : 'No crew records are in the authenticated mission scope.'
            }
          />
        )}
      </Panel>

      <SectionGrid columns={2}>
        <Panel
          title="Latest observations"
          subtitle="Original device unit and timestamp preserved; newest first"
          actions={
            <SecondaryButton size="sm" onClick={() => recent.refetch()}>
              Reload
            </SecondaryButton>
          }
        >
          {recent.error ? (
            <ErrorNotice title="Observations" message={recent.error.message} />
          ) : recent.loading ? (
            <LoadingState height={140} message="Loading observations..." />
          ) : (
            <DataTable
              columns={observationColumns}
              data={recent.data ?? []}
              keyField="observation_id"
              emptyMessage="No observations have been received for this crew member."
            />
          )}
        </Panel>

        <Panel
          title="Open & acknowledged alerts"
          subtitle="Only real alert records; no generated findings"
          actions={
            <SecondaryButton size="sm" onClick={() => navigate('/alerts')}>
              Open Alerts & Actions
            </SecondaryButton>
          }
        >
          {crew.loading ? (
            <LoadingState height={120} message="Loading alerts..." />
          ) : openAlerts.length === 0 && acknowledgedAlerts.length === 0 ? (
            <EmptyState
              title="No open or acknowledged alerts"
              description="The analysis service produced no alert records for this mission scope."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '4px' }}>
                  OPEN ({openAlerts.length})
                </div>
                <DataTable
                  columns={alertColumns}
                  data={openAlerts}
                  keyField="alert_id"
                  emptyMessage="No open alerts."
                />
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '4px' }}>
                  ACKNOWLEDGED ({acknowledgedAlerts.length})
                </div>
                <DataTable
                  columns={alertColumns}
                  data={acknowledgedAlerts}
                  keyField="alert_id"
                  emptyMessage="No acknowledged alerts."
                />
              </div>
            </div>
          )}
        </Panel>
      </SectionGrid>

      <Panel
        title="Domain assessment states"
        subtitle="Server analysis output for the selected crew member"
        actions={dash?.simulated ? <SyntheticTag /> : undefined}
      >
        {dash ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '8px'
            }}
          >
            {dash.domains.map((domain) => (
              <div key={domain.module_code} style={{ border: '1px solid rgba(0,0,0,0.25)', padding: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {domain.module_code.replace(/_/g, ' ')}
                </div>
                <div style={{ margin: '5px 0' }}>
                  <AssessmentBadge status={toAssessmentStatus(domain.status)} />
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.7)' }}>{domain.summary}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No domain assessment payload"
            description="The dashboard summary could not be loaded for this crew member."
          />
        )}
      </Panel>

      {dash && (
        <Panel title="Data quality" subtitle="Counts returned by the Ground API">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            <Stat label="Status" value={dash.data_quality.status.toUpperCase()} />
            <Stat label="Observations" value={dash.data_quality.observation_count} />
            <Stat label="Invalid" value={dash.data_quality.invalid_measurement_count} />
            <Stat label="Questionable" value={dash.data_quality.questionable_measurement_count} />
            <Stat label="Stale" value={dash.data_quality.stale_measurement_count} />
          </div>
        </Panel>
      )}

      {crew.data?.rows.some((row) => row.error) && (
        <WarningNotice
          title="Partial crew data"
          message="At least one crew dashboard request failed. Rows marked PARTIAL / ERROR are incomplete; hover the row status for the server message."
        />
      )}
    </div>
  );
};

export default MissionOverview;
