// Ground Health Console — Audit
// Read-only retrieval of the append-only audit log. The console never edits,
// deletes or re-orders audit records; it only filters and displays them.

import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAudit } from '../api/hooks';
import type { AuditFilters } from '../api/hooks';
import type { AuditEventDto } from '../api/types';
import { DataTable, Column } from '../components/common/DataTable';
import { SecondaryButton, PrimaryButton, GhostButton } from '../components/common/Buttons';
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
import { formatTimestamp } from '../utilities';

interface AuditDraft {
  action: string;
  entityType: string;
  outcome: string;
  astronautId: string;
  occurredFrom: string;
  occurredTo: string;
}

const EMPTY_DRAFT: AuditDraft = {
  action: '',
  entityType: '',
  outcome: '',
  astronautId: '',
  occurredFrom: '',
  occurredTo: ''
};

function toIso(localValue: string): string | undefined {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function outcomeStyle(outcome: string): React.CSSProperties {
  if (outcome === 'success') {
    return { border: '1px solid #000000', backgroundColor: 'rgba(255,255,8,0.25)', padding: '1px 6px', fontWeight: 700, fontSize: '10px' };
  }
  if (outcome === 'denied' || outcome === 'failure' || outcome === 'conflict') {
    return { border: '1px solid #000000', backgroundColor: '#000000', color: '#FFFF08', padding: '1px 6px', fontWeight: 700, fontSize: '10px' };
  }
  return { border: '1px dashed #000000', padding: '1px 6px', fontWeight: 700, fontSize: '10px' };
}

export const Audit: React.FC = () => {
  const { isMedicalOfficer, isAdministrator } = useAuth();
  const { mission, missionId, astronauts, selectedAstronautId } = useData();

  const canReadAudit = isMedicalOfficer || isAdministrator;

  const [draft, setDraft] = useState<AuditDraft>({
    ...EMPTY_DRAFT,
    astronautId: selectedAstronautId ?? ''
  });
  const [applied, setApplied] = useState<AuditFilters>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const query = useAudit(applied, canReadAudit);
  const events = query.data ?? [];

  const selectedEvent = events.find((event) => event.audit_event_id === selectedEventId) ?? null;

  const counts = useMemo(
    () => ({
      success: events.filter((event) => event.outcome === 'success').length,
      denied: events.filter((event) => event.outcome === 'denied').length,
      failure: events.filter((event) => event.outcome === 'failure' || event.outcome === 'conflict').length
    }),
    [events]
  );

  const applyFilters = () => {
    setApplied({
      action: draft.action.trim() || undefined,
      entityType: draft.entityType.trim() || undefined,
      outcome: draft.outcome || undefined,
      astronautId: draft.astronautId || undefined,
      occurredFrom: toIso(draft.occurredFrom),
      occurredTo: toIso(draft.occurredTo)
    });
    setSelectedEventId(null);
  };

  const clearFilters = () => {
    setDraft({ ...EMPTY_DRAFT, astronautId: selectedAstronautId ?? '' });
    setApplied({});
    setSelectedEventId(null);
  };

  const columns: Column<AuditEventDto>[] = [
    {
      key: 'occurred_at',
      header: 'Occurred (UTC)',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{formatTimestamp(row.occurred_at)}</span>
      )
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row) => (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
            {row.actor_role.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.actor_id}
          </div>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{row.action}</span>
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (row) => (
        <div>
          <div style={{ fontSize: '10px' }}>{row.entity_type}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.entity_id ?? '—'}
          </div>
        </div>
      )
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (row) => <span style={outcomeStyle(row.outcome)}>{row.outcome.toUpperCase()}</span>
    },
    {
      key: 'scope',
      header: 'Astronaut',
      render: (row) =>
        row.astronaut_id ? (
          <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>{row.astronaut_id.slice(0, 8)}…</span>
        ) : (
          'Mission-wide'
        )
    },
    {
      key: 'request',
      header: 'Request ID',
      render: (row) =>
        row.request_id ? (
          <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>{row.request_id.slice(0, 12)}…</span>
        ) : (
          '—'
        )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Records"
        title="Audit"
        description={
          mission
            ? `Append-only audit records for ${mission.mission_code}. Retrieval is read-only; the console offers no edit or delete operation.`
            : 'Append-only audit records for the authenticated mission scope.'
        }
        actions={
          <SecondaryButton
            size="sm"
            onClick={query.refetch}
            icon={<IconRefresh size={12} />}
            disabled={!canReadAudit}
          >
            Reload
          </SecondaryButton>
        }
      />

      {!canReadAudit ? (
        <EmptyState
          title="Audit retrieval is not available to this identity"
          description="The Ground API grants audit retrieval to medical officers and administrators. Crew identities may only read their own operational records through the crew workspace."
        />
      ) : (
        <>
          {!missionId && (
            <WarningNotice
              title="No mission scope"
              message="No mission is selected, so mission-scoped audit records cannot be requested."
            />
          )}
          {query.error && (
            <ErrorNotice title="Audit retrieval" message={query.error.message} details={query.error.details} />
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px'
            }}
          >
            <Stat label="Records shown" value={events.length} detail="Most recent 200 matching records" emphasis />
            <Stat label="Success" value={counts.success} />
            <Stat label="Denied" value={counts.denied} />
            <Stat label="Failure / conflict" value={counts.failure} />
            <Stat
              label="Mission"
              value={mission ? mission.mission_code : 'NONE'}
              detail={mission ? mission.mission_name : 'No mission selected'}
            />
          </div>

          <Panel title="Filters" bodyStyle={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                Action
                <input
                  value={draft.action}
                  onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}
                  placeholder="e.g. alert.acknowledge"
                  style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px', minWidth: '190px' }}
                />
              </label>
              <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                Entity type
                <input
                  value={draft.entityType}
                  onChange={(event) => setDraft((current) => ({ ...current, entityType: event.target.value }))}
                  placeholder="e.g. alert"
                  style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px', minWidth: '150px' }}
                />
              </label>
              <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                Outcome
                <select
                  value={draft.outcome}
                  onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))}
                  style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
                >
                  <option value="">All</option>
                  <option value="success">Success</option>
                  <option value="denied">Denied</option>
                  <option value="failure">Failure</option>
                  <option value="conflict">Conflict</option>
                </select>
              </label>
              <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                Astronaut
                <select
                  value={draft.astronautId}
                  onChange={(event) => setDraft((current) => ({ ...current, astronautId: event.target.value }))}
                  style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px', minWidth: '180px' }}
                >
                  <option value="">All in scope</option>
                  {astronauts.map((astronaut) => (
                    <option key={astronaut.astronaut_id} value={astronaut.astronaut_id}>
                      {astronaut.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                Occurred from
                <input
                  type="datetime-local"
                  value={draft.occurredFrom}
                  onChange={(event) => setDraft((current) => ({ ...current, occurredFrom: event.target.value }))}
                  style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
                />
              </label>
              <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                Occurred to
                <input
                  type="datetime-local"
                  value={draft.occurredTo}
                  onChange={(event) => setDraft((current) => ({ ...current, occurredTo: event.target.value }))}
                  style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
                />
              </label>
              <PrimaryButton size="sm" onClick={applyFilters} disabled={!missionId}>
                Apply filters
              </PrimaryButton>
              <GhostButton size="sm" onClick={clearFilters}>
                Clear
              </GhostButton>
            </div>
            <p style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)', margin: '8px 0 0 0' }}>
              Filters are applied on demand. Timestamps are converted from your local input to UTC before the
              request.
            </p>
          </Panel>

          <Panel
            title="Audit events"
            subtitle="Newest first; select a row to inspect recorded details"
            actions={
              <span style={{ fontSize: '9px' }}>
                {query.loading ? 'LOADING…' : `${events.length} RECORD(S)`}
              </span>
            }
          >
            {query.loading ? (
              <LoadingState height={180} message="Loading audit events..." />
            ) : events.length === 0 ? (
              <EmptyState
                title="No matching audit events"
                description="The Ground API returned no audit event for this mission and filter combination."
              />
            ) : (
              <DataTable
                columns={columns}
                data={events}
                keyField="audit_event_id"
                selectedRowKey={selectedEventId ?? undefined}
                onRowClick={(row) => setSelectedEventId(row.audit_event_id)}
              />
            )}
          </Panel>

          {selectedEvent && (
            <Panel
              title="Audit event detail"
              subtitle="Recorded fields are displayed verbatim"
              actions={
                <SecondaryButton size="sm" onClick={() => setSelectedEventId(null)}>
                  Close
                </SecondaryButton>
              }
            >
              <KeyValue label="Audit event ID" value={selectedEvent.audit_event_id} mono />
              <KeyValue label="Occurred at" value={formatTimestamp(selectedEvent.occurred_at)} />
              <KeyValue label="Recorded at" value={formatTimestamp(selectedEvent.recorded_at)} />
              <KeyValue
                label="Actor"
                value={`${selectedEvent.actor_role.replace(/_/g, ' ')} · ${selectedEvent.actor_id}`}
              />
              <KeyValue label="Action" value={selectedEvent.action} mono />
              <KeyValue label="Entity type" value={selectedEvent.entity_type} mono />
              <KeyValue label="Entity ID" value={selectedEvent.entity_id ?? '—'} mono />
              <KeyValue label="Outcome" value={selectedEvent.outcome.toUpperCase()} />
              <KeyValue label="Mission ID" value={selectedEvent.mission_id ?? 'Mission-wide'} mono />
              <KeyValue label="Astronaut ID" value={selectedEvent.astronaut_id ?? 'Not astronaut-specific'} mono />
              <KeyValue label="Request ID" value={selectedEvent.request_id ?? 'Not recorded'} mono />
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
                  RECORDED DETAILS
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '8px',
                    border: '1px solid #000000',
                    backgroundColor: '#FAFAFA',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '260px',
                    overflow: 'auto'
                  }}
                >
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            </Panel>
          )}

          <Panel title="Scope of this view">
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', lineHeight: 1.6 }}>
              <li>Audit retrieval is read-only and append-only; no mutation control is exposed here.</li>
              <li>
                Mission-scoped records are limited to the authenticated mission and to astronauts inside the
                actor&apos;s scope.
              </li>
              <li>
                A denied request is itself an audited event. Denied rows appear with a black outcome badge and
                do not imply that the underlying clinical action succeeded.
              </li>
              <li>
                Detail payloads may contain identifiers of the affected record. They are shown without
                enrichment or inference.
              </li>
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
};

export default Audit;
