// Ground Health Console — Communications
// Separates three independent facts: Ground API connectivity, the spacecraft
// adapter's reported link state, and the age of the last health-data receipt.
// A successful request is never rendered as a LIVE link.

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useCommunications } from '../api/hooks';
import type { FreshnessEntryDto } from '../api/types';
import { DataTable, Column } from '../components/common/DataTable';
import { CommStateBadge, FreshnessBadge, SyntheticTag } from '../components/common/StatusBadge';
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
  formatSecondsDuration,
  formatTimestamp,
  normaliseCommunicationState,
  normaliseFreshness
} from '../utilities';

const ROLE_LABEL: Record<string, string> = {
  medical_officer: 'Medical officer',
  administrator: 'Administrator',
  crew_member: 'Crew member'
};

function renderDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const CommunicationSync: React.FC = () => {
  const { user, isCrewMember } = useAuth();
  const {
    health,
    healthError,
    apiStatus,
    mission,
    selectedAstronaut,
    commStatus,
    commError,
    commSupported,
    refreshAll
  } = useData();

  const { sync, syncError, syncLoading, refetchSync } = useCommunications();

  const freshnessColumns: Column<FreshnessEntryDto>[] = [
    {
      key: 'crew',
      header: 'Crew member',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>
            {row.astronaut_id === selectedAstronaut?.astronaut_id
              ? selectedAstronaut?.display_name ?? 'Selected crew'
              : 'Crew record'}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.astronaut_id}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Freshness',
      render: (row) => <FreshnessBadge freshness={normaliseFreshness(row.status)} />
    },
    {
      key: 'measured',
      header: 'Latest measured',
      render: (row) => (row.latest_measured_at ? formatTimestamp(row.latest_measured_at) : 'Not recorded')
    },
    {
      key: 'received',
      header: 'Latest received',
      render: (row) => (row.latest_received_at ? formatTimestamp(row.latest_received_at) : 'Not recorded')
    },
    {
      key: 'age',
      header: 'Age of measurement',
      align: 'right',
      render: (row) => (row.age_seconds === null ? 'Unknown' : formatSecondsDuration(row.age_seconds))
    }
  ];

  const reportedState = normaliseCommunicationState(commStatus?.state);
  const primaryFreshness = commStatus?.freshness?.[0] ?? null;
  const reportedDetails = commStatus?.details ?? {};
  const reportedKeys = Object.keys(reportedDetails);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Response"
        title="Communications"
        description="Ground API connectivity, the adapter-reported spacecraft link and health-data freshness are shown as three separate observations. None of them is promoted to LIVE by this console."
        actions={
          <SecondaryButton
            size="sm"
            onClick={() => {
              refreshAll();
              refetchSync();
            }}
            icon={<IconRefresh size={12} />}
          >
            Reload
          </SecondaryButton>
        }
      />

      {!commSupported && (
        <WarningNotice
          title="Not in this role's scope"
          message={`${ROLE_LABEL[user?.role ?? ''] ?? 'This identity'} identities cannot read clinical communication state or health-data freshness. The Ground API connectivity panel remains available.`}
        />
      )}
      {healthError && <ErrorNotice title="Ground API health" message={healthError} />}
      {commError && <ErrorNotice title="Reported communication state" message={commError} />}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px'
        }}
      >
        <Stat
          label="Ground API"
          value={
            apiStatus === 'connected'
              ? 'CONNECTED'
              : apiStatus === 'degraded'
              ? 'DEGRADED'
              : apiStatus === 'offline'
              ? 'OFFLINE'
              : 'CHECKING'
          }
          detail={health ? `${health.service} v${health.version}` : 'No health payload'}
          emphasis={apiStatus === 'offline'}
        />
        <Stat
          label="Spacecraft link (reported)"
          value={commSupported ? reportedState : 'OUT OF SCOPE'}
          detail={
            commSupported
              ? commStatus?.observed_at
                ? `Observed ${formatTimestamp(commStatus.observed_at)}`
                : 'No state report'
              : 'Administrator scope excludes health communication state'
          }
          emphasis={commSupported && reportedState === 'BLACKOUT'}
        />
        <Stat
          label="Contact recency"
          value={commSupported && commStatus ? commStatus.contact_recency.toUpperCase() : commSupported ? '—' : 'OUT OF SCOPE'}
          detail={
            !commSupported
              ? 'Not in this role’s scope'
              : commStatus?.last_successful_contact_at
              ? `Last contact ${formatTimestamp(commStatus.last_successful_contact_at)}`
              : 'No successful contact recorded'
          }
        />
        <Stat
          label="Queued events"
          value={
            commSupported && commStatus
              ? commStatus.queued_event_count_reported
                ? commStatus.queued_event_count
                : 'NOT REPORTED'
              : '—'
          }
          detail={
            !commSupported
              ? 'Not in this role’s scope'
              : commStatus?.estimated_delay_seconds !== null &&
                commStatus?.estimated_delay_seconds !== undefined
              ? `Estimated delay ${formatSecondsDuration(commStatus.estimated_delay_seconds)}`
              : 'No delay estimate'
          }
        />
        <Stat
          label="Health-data freshness"
          value={
            !commSupported
              ? 'OUT OF SCOPE'
              : primaryFreshness
              ? normaliseFreshness(primaryFreshness.status).toUpperCase()
              : 'NO DATA'
          }
          detail={
            !commSupported
              ? 'Not in this role’s scope'
              : primaryFreshness?.latest_measured_at
              ? `Measured ${formatTimestamp(primaryFreshness.latest_measured_at)}`
              : 'No measurement recorded'
          }
        />
      </div>

      <SectionGrid columns={2}>
        <Panel
          title="Ground API connectivity"
          subtitle="Observed by this browser session from /health"
        >
          <KeyValue
            label="Connection"
            value={
              apiStatus === 'connected'
                ? 'Connected'
                : apiStatus === 'degraded'
                ? 'Degraded'
                : apiStatus === 'offline'
                ? 'Unreachable'
                : 'Checking'
            }
          />
          {health ? (
            <>
              <KeyValue label="Service" value={health.service} mono />
              <KeyValue label="Version" value={health.version} mono />
              <KeyValue label="Environment" value={health.environment} />
              <KeyValue label="Database" value={health.database} />
              <KeyValue label="Schema" value={health.schema} />
              <KeyValue label="Demo authentication" value={health.demo_authentication ? 'Enabled' : 'Disabled'} />
              <KeyValue
                label="Simulated communications"
                value={health.simulated_communications ? 'YES — adapter state is simulated' : 'No'}
              />
              <KeyValue
                label="Medical certification"
                value={health.medical_certification ? 'Certified' : 'NOT CERTIFIED'}
              />
            </>
          ) : (
            <EmptyState
              title="No health response"
              description="The console cannot confirm Ground API connectivity. No cached payload is substituted."
            />
          )}
          <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.65)', margin: '8px 0 0 0' }}>
            Ground API connectivity describes the browser-to-server path only. It carries no information
            about the spacecraft link.
          </p>
        </Panel>

        <Panel
          title="Reported spacecraft link"
          subtitle="Adapter state as last reported; this console does not infer a state"
        >
          {!commSupported ? (
            <EmptyState
              title="Not in this role's scope"
              description="The Ground API does not grant administrator identities health communication state."
            />
          ) : !commStatus ? (
            <EmptyState
              title="No reported state"
              description="The Ground API holds no communication-state report for this crew member. The console does not infer LIVE."
            />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em' }}>
                  REPORTED STATE
                </span>
                <CommStateBadge state={reportedState} showDetail />
              </div>
              <KeyValue
                label="State observed"
                value={commStatus.observed_at ? formatTimestamp(commStatus.observed_at) : 'Not reported'}
              />
              <KeyValue
                label="Last successful contact"
                value={
                  commStatus.last_successful_contact_at
                    ? formatTimestamp(commStatus.last_successful_contact_at)
                    : 'Not reported'
                }
              />
              <KeyValue
                label="Contact recency"
                value={commStatus.contact_recency.toUpperCase()}
              />
              <KeyValue
                label="Last push"
                value={commStatus.last_push_at ? formatTimestamp(commStatus.last_push_at) : 'Not reported'}
              />
              <KeyValue
                label="Last pull"
                value={commStatus.last_pull_at ? formatTimestamp(commStatus.last_pull_at) : 'Not reported'}
              />
              <KeyValue
                label="Queued events"
                value={
                  commStatus.queued_event_count_reported
                    ? `${commStatus.queued_event_count} event(s)`
                    : 'Not reported by the adapter'
                }
              />
              <KeyValue
                label="Estimated delay"
                value={
                  commStatus.estimated_delay_seconds !== null
                    ? formatSecondsDuration(commStatus.estimated_delay_seconds)
                    : 'Not reported'
                }
              />
              {commStatus.mission_id && (
                <KeyValue label="Mission ID" value={commStatus.mission_id} mono />
              )}
              {commStatus.astronaut_id && (
                <KeyValue label="Astronaut ID" value={commStatus.astronaut_id} mono />
              )}
              <div style={{ marginTop: '8px' }}>
                <SyntheticTag compact />
              </div>
            </>
          )}
        </Panel>
      </SectionGrid>

      <Panel
        title="Health-data freshness"
        subtitle="Age is determined from device measurement and Ground receipt timestamps"
      >
        {!commSupported ? (
          <EmptyState
            title="Not in this role's scope"
            description="Health-data freshness is withheld from this identity."
          />
        ) : !commStatus || commStatus.freshness.length === 0 ? (
          <EmptyState
            title="No freshness record"
            description="The Ground API returned no freshness entry for this crew member and mission."
          />
        ) : (
          <DataTable
            columns={freshnessColumns}
            data={commStatus.freshness}
            keyField="astronaut_id"
            emptyMessage="No freshness entries."
          />
        )}
      </Panel>

      <Panel
        title="Synchronization record"
        subtitle="Client-scoped records only; the console holds no batch-history endpoint for ground identities"
      >
        {isCrewMember ? (
          syncLoading ? (
            <LoadingState height={120} message="Loading crew sync status..." />
          ) : syncError ? (
            <ErrorNotice
              title="Sync status"
              message={syncError.message}
              details={syncError.details}
            />
          ) : !sync ? (
            <EmptyState
              title="No sync record"
              description="The Ground API returned no synchronization status for this crew client."
            />
          ) : (
            <>
              <KeyValue label="Reported state" value={normaliseCommunicationState(sync.state)} />
              <KeyValue
                label="State observed"
                value={sync.observed_at ? formatTimestamp(String(sync.observed_at)) : 'Not reported'}
              />
              <KeyValue
                label="Contact recency"
                value={String(sync.contact_recency ?? 'unknown').toUpperCase()}
              />
              <KeyValue
                label="Last successful contact"
                value={
                  sync.last_successful_contact_at
                    ? formatTimestamp(String(sync.last_successful_contact_at))
                    : 'Not reported'
                }
              />
              <KeyValue
                label="Last push"
                value={sync.last_push_at ? formatTimestamp(String(sync.last_push_at)) : 'Not reported'}
              />
              <KeyValue
                label="Last pull"
                value={sync.last_pull_at ? formatTimestamp(String(sync.last_pull_at)) : 'Not reported'}
              />
              <KeyValue
                label="Queued events"
                value={
                  typeof sync.queued_event_count === 'number'
                    ? sync.queued_event_count
                    : 'Not reported'
                }
              />
              <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.65)', margin: '8px 0 0 0' }}>
                This is the crew client&apos;s own synchronization record. It is not a ground-station batch
                acknowledgement log.
              </p>
            </>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <EmptyState
              title="Batch envelopes are not exposed here"
              description="The Ground API exposes /sync/status for a crew client identity or for an explicit client_id supplied by a ground officer. The astronaut-scoped communication payload contains no client identifier, and no batch-history route exists for ground roles."
            />
            <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.65)', margin: 0 }}>
              Consequently this console cannot show per-batch retries, failed envelopes or ingestion
              acknowledgements. It shows only the adapter-reported state, contact recency, queue count when
              reported, and the freshness of received health data.
            </p>
          </div>
        )}
      </Panel>

      {commSupported && reportedKeys.length > 0 && (
        <Panel
          title="Adapter-reported details"
          subtitle="Verbatim fields returned by the adapter; no interpretation is applied"
        >
          {reportedKeys.map((key) => (
            <KeyValue key={key} label={key.replace(/_/g, ' ')} value={renderDetailValue(reportedDetails[key])} mono />
          ))}
        </Panel>
      )}

      <Panel title="What this view can and cannot establish">
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', lineHeight: 1.6 }}>
          <li>
            Ground API connectivity is established only by the /health response. It does not imply that the
            spacecraft is in contact.
          </li>
          <li>
            The link state shown is the value the adapter last reported. A null state is rendered as
            UNKNOWN, never as LIVE.
          </li>
          <li>
            A successful API request, a recent page load or an authenticated session is not evidence of a
            live spacecraft link.
          </li>
          <li>
            Freshness describes received health data. Stale or absent measurements are labelled as such and
            are not interpolated.
          </li>
          <li>
            Ground identities cannot retrieve per-batch synchronization history from the current Ground API;
            this limitation is reported rather than filled with synthetic batches.
          </li>
          <li>
            {mission
              ? `Mission scope: ${mission.mission_code} · ${mission.mission_name}.`
              : 'No mission is currently selected.'}{' '}
            {selectedAstronaut ? `Selected crew: ${selectedAstronaut.display_name}.` : 'No crew member is selected.'}
          </li>
        </ul>
      </Panel>
    </div>
  );
};

export default CommunicationSync;
