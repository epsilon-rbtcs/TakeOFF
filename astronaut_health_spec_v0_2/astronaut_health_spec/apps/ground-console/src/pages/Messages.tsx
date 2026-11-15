// Ground Health Console — Messages
// Ground-authored messages and their append-only lifecycle. Delivery is only
// shown when the corresponding lifecycle event exists; no receipt is inferred
// from a successful request.

import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useMessages } from '../api/hooks';
import type { MessageDto, MessageEventTypeDto, MessageTypeDto } from '../api/types';
import { DataTable, Column } from '../components/common/DataTable';
import { SecondaryButton, PrimaryButton } from '../components/common/Buttons';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { IconMessage, IconRefresh } from '../components/common/Icons';
import {
  ErrorNotice,
  KeyValue,
  PageHeader,
  Panel,
  Stat,
  WarningNotice
} from '../components/common/PageChrome';
import { formatTimestamp } from '../utilities';

const STATUSES = ['queued', 'transmitted', 'received', 'read', 'withdrawn', 'expired'] as const;

const MESSAGE_TYPES: { value: MessageTypeDto; label: string }[] = [
  { value: 'message', label: 'Message' },
  { value: 'update', label: 'Crew update' },
  { value: 'notification', label: 'Notification' }
];

function typeLabel(value: string): string {
  return MESSAGE_TYPES.find((item) => item.value === value)?.label ?? value.replace(/_/g, ' ');
}

function LifecycleBadge({ status }: { status: string }) {
  const closed = status === 'withdrawn' || status === 'expired';
  const delivered = status === 'received' || status === 'read';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: delivered || closed ? 700 : 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        border: closed ? '1px dashed #000000' : '1px solid #000000',
        backgroundColor: status === 'read' ? '#FFFF08' : status === 'withdrawn' ? '#E5E5E5' : '#FFFFFF'
      }}
    >
      {status}
    </span>
  );
}

export const Messages: React.FC = () => {
  const { user, isMedicalOfficer, isCrewMember, isAdministrator } = useAuth();
  const { mission, missionId, astronauts, selectedAstronautId } = useData();

  const [astronautFilter, setAstronautFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const scopedAstronautId = astronautFilter === 'all' ? null : astronautFilter;
  const query = useMessages(scopedAstronautId);
  const messages = query.data ?? [];

  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({
    astronautId: selectedAstronautId ?? '',
    messageType: 'message' as MessageTypeDto,
    title: '',
    body: '',
    version: '',
    expiresAt: ''
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const filtered = useMemo(
    () => messages.filter((row) => statusFilter === 'all' || row.status === statusFilter),
    [messages, statusFilter]
  );

  const selected =
    filtered.find((row) => row.message_id === selectedMessageId) ??
    messages.find((row) => row.message_id === selectedMessageId) ??
    null;

  const astronautName = (astronautId: string) =>
    astronauts.find((item) => item.astronaut_id === astronautId)?.display_name ?? astronautId;

  const hasEvent = (message: MessageDto, eventType: string) =>
    message.lifecycle.some((event) => event.event_type === eventType);

  const resetFeedBack = () => {
    setFeedback(null);
    setMutationError(null);
  };

  const handleSend = async () => {
    if (!missionId) return;
    if (!form.astronautId) {
      setMutationError('Select a recipient crew member.');
      return;
    }
    if (!form.title.trim() || !form.body.trim()) {
      setMutationError('Title and body are required.');
      return;
    }
    resetFeedBack();
    setBusy('send');
    const result = await query.sendMessage({
      missionId,
      astronautId: form.astronautId,
      title: form.title.trim(),
      body: form.body.trim(),
      messageType: form.messageType,
      version: form.version.trim() || undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined
    });
    setBusy(null);
    if (result.error || !result.data) {
      setMutationError(result.error?.message ?? 'The Ground API did not create the message.');
      return;
    }
    setFeedback(`Message created in state ${result.data.status.toUpperCase()}. No delivery has been recorded.`);
    setComposeOpen(false);
    setForm({
      astronautId: form.astronautId,
      messageType: 'message',
      title: '',
      body: '',
      version: '',
      expiresAt: ''
    });
    setSelectedMessageId(result.data.message_id);
    query.refetch();
  };

  const handleEvent = async (message: MessageDto, eventType: MessageEventTypeDto) => {
    resetFeedBack();
    setBusy(eventType);
    const result = await query.recordMessageEvent(message.message_id, eventType);
    setBusy(null);
    if (result.error) {
      setMutationError(result.error.message);
      return;
    }
    setFeedback(
      `Lifecycle event "${eventType}" recorded. The message is now ${String(
        result.data?.message_status ?? 'updated'
      ).toUpperCase()}.`
    );
    query.refetch();
  };

  const columns: Column<MessageDto>[] = [
    {
      key: 'title',
      header: 'Message',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800 }}>{row.title}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.message_id.slice(0, 8)}…
          </div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => typeLabel(row.message_type)
    },
    {
      key: 'astronaut',
      header: 'Recipient',
      render: (row) => astronautName(row.astronaut_id)
    },
    {
      key: 'status',
      header: 'Lifecycle',
      render: (row) => <LifecycleBadge status={row.status} />
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => (row.created_at ? formatTimestamp(row.created_at) : '—')
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (row) => (row.expires_at ? formatTimestamp(row.expires_at) : 'No expiry')
    }
  ];

  if (isAdministrator) {
    return (
      <div>
        <PageHeader eyebrow="Records" title="Messages" />
        <EmptyState
          title="Message access is not granted to administrators"
          description="The Ground API withholds ground-to-crew message content from administrator identities. No cached or synthetic message list is shown."
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Records"
        title="Messages"
        description={
          mission
            ? `Ground-authored messages for ${mission.mission_code}. A message is reported as delivered only when a lifecycle event records it.`
            : 'Ground-authored messages in the authenticated mission scope.'
        }
        actions={
          <div style={{ display: 'flex', gap: '6px' }}>
            <SecondaryButton size="sm" onClick={query.refetch} icon={<IconRefresh size={12} />}>
              Reload
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              icon={<IconMessage size={14} />}
              onClick={() => {
                resetFeedBack();
                setForm((current) => ({
                  ...current,
                  astronautId: current.astronautId || selectedAstronautId || astronauts[0]?.astronaut_id || ''
                }));
                setComposeOpen(true);
              }}
              disabled={!isMedicalOfficer || !missionId}
            >
              Compose message
            </PrimaryButton>
          </div>
        }
      />

      {!isMedicalOfficer && !isCrewMember && (
        <WarningNotice
          title="Read-only role"
          message="This identity cannot create messages."
        />
      )}
      {isCrewMember && (
        <WarningNotice
          title="Crew scope"
          message="A crew identity may read its own messages and record crew-side lifecycle events. Ground-authored message creation is restricted to medical officers."
        />
      )}
      {query.error && (
        <ErrorNotice title="Messages unavailable" message={query.error.message} details={query.error.details} />
      )}
      {mutationError && <ErrorNotice title="Message operation" message={mutationError} />}
      {feedback && (
        <div
          style={{
            border: '1px solid #000000',
            backgroundColor: 'rgba(255,255,8,0.2)',
            padding: '7px 10px',
            fontSize: '11px',
            fontWeight: 700
          }}
        >
          {feedback}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px'
        }}
      >
        <Stat label="Messages" value={messages.length} emphasis />
        <Stat label="Queued" value={messages.filter((row) => row.status === 'queued').length} />
        <Stat label="Transmitted" value={messages.filter((row) => row.status === 'transmitted').length} />
        <Stat
          label="Received / read"
          value={messages.filter((row) => row.status === 'received' || row.status === 'read').length}
        />
        <Stat
          label="Closed"
          value={messages.filter((row) => row.status === 'withdrawn' || row.status === 'expired').length}
        />
      </div>

      <Panel title="Filters" bodyStyle={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            Lifecycle
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
            >
              <option value="all">All</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          {!isCrewMember && (
            <label style={{ fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Crew member
              <select
                value={astronautFilter}
                onChange={(event) => {
                  setAstronautFilter(event.target.value);
                  setSelectedMessageId(null);
                }}
                style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px', minWidth: '190px' }}
              >
                <option value="all">All crew in mission</option>
                {astronauts.map((astronaut) => (
                  <option key={astronaut.astronaut_id} value={astronaut.astronaut_id}>
                    {astronaut.display_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span style={{ fontSize: '10px', marginLeft: 'auto' }}>
            {filtered.length} of {messages.length} message(s) · signed in as{' '}
            {user?.role.replace(/_/g, ' ') ?? 'unknown'}
          </span>
        </div>
      </Panel>

      <Panel
        title="Message register"
        subtitle="Select a message to inspect content and its append-only lifecycle"
        actions={<span style={{ fontSize: '9px' }}>{query.loading ? 'LOADING…' : `${filtered.length} RECORD(S)`}</span>}
      >
        {query.loading ? (
          <LoadingState height={180} message="Loading messages..." />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages"
            description="The Ground API returned no message for this mission and crew selection."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="message_id"
            selectedRowKey={selectedMessageId ?? undefined}
            onRowClick={(row) => {
              setSelectedMessageId(row.message_id);
              resetFeedBack();
            }}
            emptyMessage="No message matches the current filters."
          />
        )}
      </Panel>

      {selected && (
        <Panel
          title="Message detail"
          subtitle={typeLabel(selected.message_type)}
          actions={
            <SecondaryButton size="sm" onClick={() => setSelectedMessageId(null)}>
              Close
            </SecondaryButton>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <LifecycleBadge status={selected.status} />
            <span style={{ fontSize: '10px' }}>
              Created {selected.created_at ? formatTimestamp(selected.created_at) : 'at an unrecorded time'}
            </span>
            {selected.simulated && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  border: '1px dashed #000000',
                  padding: '1px 5px',
                  textTransform: 'uppercase'
                }}
              >
                Simulated message
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '16px', fontWeight: 900, margin: '4px 0 8px 0' }}>{selected.title}</h2>

          <KeyValue label="Message ID" value={selected.message_id} mono />
          <KeyValue label="Mission ID" value={selected.mission_id} mono />
          <KeyValue label="Recipient" value={astronautName(selected.astronaut_id)} />
          <KeyValue label="Recipient ID" value={selected.astronaut_id} mono />
          <KeyValue label="Sender user" value={selected.sender_user_id} mono />
          <KeyValue label="Message type" value={typeLabel(selected.message_type)} />
          <KeyValue label="Version" value={selected.version ?? 'Not set'} mono />
          <KeyValue label="Created" value={selected.created_at ? formatTimestamp(selected.created_at) : '—'} />
          <KeyValue label="Expires" value={selected.expires_at ? formatTimestamp(selected.expires_at) : 'No expiry'} />

          <div
            style={{
              marginTop: '10px',
              border: '1px solid rgba(0,0,0,0.2)',
              backgroundColor: '#FAFAFA',
              padding: '12px',
              fontSize: '12px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}
          >
            {selected.body}
          </div>

          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '5px' }}>
              LIFECYCLE EVENTS ({selected.lifecycle.length})
            </div>
            {selected.lifecycle.length === 0 ? (
              <div style={{ fontSize: '10px', border: '1px dashed #000000', padding: '8px' }}>
                No lifecycle event has been recorded. The message remains in its initial queued state; no
                delivery is claimed.
              </div>
            ) : (
              <div style={{ border: '1px solid #000000' }}>
                {selected.lifecycle.map((event, index) => (
                  <div
                    key={event.event_id}
                    style={{
                      padding: '7px 10px',
                      borderBottom:
                        index === selected.lifecycle.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.1)',
                      fontSize: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{event.event_type}</span>
                      <span style={{ fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                        {event.recorded_at ? formatTimestamp(event.recorded_at) : '—'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                      actor {event.actor_id}
                    </div>
                    {event.client_created_at && (
                      <div style={{ fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                        client reported {formatTimestamp(event.client_created_at)}
                      </div>
                    )}
                    {event.occurred_at && event.occurred_at !== event.client_created_at && (
                      <div style={{ fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
                        occurred {formatTimestamp(event.occurred_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!['withdrawn', 'expired'].includes(selected.status) && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '5px' }}>
                RECORD A LIFECYCLE EVENT
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {isMedicalOfficer && !hasEvent(selected, 'transmitted') && (
                  <PrimaryButton
                    size="sm"
                    onClick={() => handleEvent(selected, 'transmitted')}
                    disabled={busy !== null}
                  >
                    Record transmitted
                  </PrimaryButton>
                )}
                {isMedicalOfficer && (
                  <SecondaryButton
                    size="sm"
                    onClick={() => handleEvent(selected, 'expired')}
                    disabled={busy !== null}
                  >
                    Mark expired
                  </SecondaryButton>
                )}
                {isCrewMember && !hasEvent(selected, 'received_by_crew') && (
                  <PrimaryButton
                    size="sm"
                    onClick={() => handleEvent(selected, 'received_by_crew')}
                    disabled={busy !== null}
                  >
                    Record received by crew
                  </PrimaryButton>
                )}
                {isCrewMember && !hasEvent(selected, 'read') && (
                  <SecondaryButton size="sm" onClick={() => handleEvent(selected, 'read')} disabled={busy !== null}>
                    Record read
                  </SecondaryButton>
                )}
                {(isMedicalOfficer || isCrewMember) && (
                  <SecondaryButton
                    size="sm"
                    onClick={() => handleEvent(selected, 'withdrawn')}
                    disabled={busy !== null}
                  >
                    Withdraw
                  </SecondaryButton>
                )}
              </div>
              <p style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)', margin: '6px 0 0 0' }}>
                The server decides which actor may record which event. Ground officers record ground-side
                events; crew identities record crew-side events. Nothing here simulates a downlink.
              </p>
            </div>
          )}
        </Panel>
      )}

      <Modal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose ground message"
        subtitle="Persisted as a new message in queued state; no delivery is implied"
        footer={
          <>
            <SecondaryButton size="sm" onClick={() => setComposeOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={handleSend} disabled={busy !== null}>
              {busy === 'send' ? 'Creating…' : 'Create message'}
            </PrimaryButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700 }}>
            Recipient
            <select
              value={form.astronautId}
              onChange={(event) => setForm((current) => ({ ...current, astronautId: event.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
            >
              <option value="">Select crew member</option>
              {astronauts.map((astronaut) => (
                <option key={astronaut.astronaut_id} value={astronaut.astronaut_id}>
                  {astronaut.display_name} · {astronaut.astronaut_code}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700 }}>
              Message type
              <select
                value={form.messageType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, messageType: event.target.value as MessageTypeDto }))
                }
                style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
              >
                {MESSAGE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: '10px', fontWeight: 700 }}>
              Version (optional)
              <input
                value={form.version}
                maxLength={120}
                onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
                style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
              />
            </label>
          </div>

          <label style={{ fontSize: '10px', fontWeight: 700 }}>
            Title
            <input
              value={form.title}
              maxLength={200}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
            />
          </label>

          <label style={{ fontSize: '10px', fontWeight: 700 }}>
            Body
            <textarea
              value={form.body}
              maxLength={10000}
              rows={5}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px', fontFamily: 'inherit' }}
            />
          </label>

          <label style={{ fontSize: '10px', fontWeight: 700 }}>
            Expires (optional)
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
            />
          </label>

          <p style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)', margin: 0 }}>
            The Ground API assigns the message identifier and initial lifecycle. Delivery and read events must
            be recorded separately, by the identity authorized for that side.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Messages;
