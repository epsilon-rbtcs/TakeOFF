// Ground Health Console — Alerts & Actions
// The backend owns the lifecycle. This page acknowledges, resolves or dismisses
// an alert only with the revision it last read, and surfaces REVISION_CONFLICT
// rather than retrying blindly.

import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  useActionHistory,
  useAlertHistory,
  useAlertsActions
} from '../api/hooks';
import { domainForAlertCode } from '../api/domains';
import type { ActionDto, AlertDto } from '../api/types';
import { DataTable, Column } from '../components/common/DataTable';
import { SeverityBadge, SyntheticTag } from '../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { IconRefresh, IconCheck } from '../components/common/Icons';
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
  getActionStatusLabel,
  getActionTypeLabel,
  getAlertStatusLabel,
  getPriorityLabel
} from '../utilities';

const ACTION_TYPES = [
  'repeat_measurement',
  'complete_assessment',
  'review_protocol',
  'contact_medical_officer',
  'scheduled_test',
  'informational'
] as const;

type ActionType = (typeof ACTION_TYPES)[number];

export const AlertsActionCenter: React.FC = () => {
  const { canMutateClinical, isMedicalOfficer } = useAuth();
  const { selectedAstronaut, selectedAstronautId, missionId, mission } = useData();
  const query = useAlertsActions();

  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    actionType: 'review_protocol' as ActionType,
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    dueAt: ''
  });

  const alerts = query.data?.alerts ?? [];
  const actions = query.data?.actions ?? [];

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
        if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
        return true;
      }),
    [alerts, statusFilter, severityFilter]
  );

  const selectedAlert =
    alerts.find((alert) => alert.alert_id === selectedAlertId) ?? filteredAlerts[0] ?? null;
  const alertHistory = useAlertHistory(selectedAlert?.alert_id ?? null);
  const actionHistory = useActionHistory(selectedActionId);

  const linkedActions = selectedAlert
    ? actions.filter((action) => action.alert_id === selectedAlert.alert_id)
    : [];

  const resetFeedback = () => {
    setMutationError(null);
    setMutationSuccess(null);
  };

  const applyMutation = async (
    label: string,
    run: () => Promise<{ error: { message: string; details: Record<string, unknown>; code: string } | null }>
  ): Promise<boolean> => {
    resetFeedback();
    setBusy(label);
    const result = await run();
    setBusy(null);
    if (result.error) {
      setMutationError(
        result.error.code === 'REVISION_CONFLICT'
          ? `${result.error.message} The console has reloaded the latest server revision; review the record and retry.`
          : result.error.message
      );
      query.refetch();
      alertHistory.refetch();
      return false;
    }
    setMutationSuccess(`${label} recorded by the Ground API.`);
    query.refetch();
    alertHistory.refetch();
    return true;
  };

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    await applyMutation('Acknowledgement', () => query.acknowledgeAlert(selectedAlert, note || undefined));
    setNote('');
  };

  const handleTransition = async (event: 'resolved' | 'dismissed') => {
    if (!selectedAlert) return;
    await applyMutation(
      event === 'resolved' ? 'Resolution' : 'Dismissal',
      () => query.transitionAlert(selectedAlert, event, note || undefined)
    );
    setNote('');
  };

  const handleActionStatus = async (action: ActionDto, status: string) => {
    await applyMutation(`Action ${getActionStatusLabel(status).toLowerCase()}`, () =>
      query.updateActionStatus(action, status)
    );
  };

  const handleActionNote = async (action: ActionDto) => {
    if (!note.trim()) {
      setMutationError('Enter a note before recording it against the action.');
      return;
    }
    await applyMutation('Action note', () => query.addActionNote(action, note.trim()));
    setNote('');
  };

  const handleCreateAction = async () => {
    if (!missionId || !selectedAstronautId) return;
    if (!form.title.trim() || !form.description.trim()) {
      setMutationError('Title and description are required for a recommended action.');
      return;
    }
    resetFeedback();
    setBusy('Create action');
    const result = await query.createAction({
      mission_id: missionId,
      astronaut_id: selectedAstronautId,
      alert_id: selectedAlert?.alert_id ?? null,
      action_type: form.actionType,
      priority: form.priority,
      title: form.title.trim(),
      description: form.description.trim(),
      due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null
    });
    setBusy(null);
    if (result.error) {
      setMutationError(result.error.message);
      return;
    }
    setMutationSuccess('Recommended action created.');
    setShowCreate(false);
    setForm({
      title: '',
      description: '',
      actionType: 'review_protocol',
      priority: 'normal',
      dueAt: ''
    });
    query.refetch();
  };

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
          <div style={{ fontWeight: 800 }}>{row.title}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.55)' }}>
            {row.alert_code}
          </div>
        </div>
      )
    },
    {
      key: 'domain',
      header: 'Domain',
      render: (row) => domainForAlertCode(row.alert_code)?.label ?? 'Unmapped'
    },
    {
      key: 'status',
      header: 'Lifecycle',
      render: (row) => (
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
          {getAlertStatusLabel(row.status)}
        </span>
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
      key: 'alert',
      header: 'Alert link',
      render: (row) =>
        row.alert_id ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedAlertId(row.alert_id);
            }}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: '9px', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {row.alert_id.slice(0, 8)}…
          </button>
        ) : (
          'None'
        )
    },
    {
      key: 'revision',
      header: 'Rev',
      align: 'right',
      render: (row) => row.revision
    }
  ];

  if (!selectedAstronautId || !missionId) {
    return (
      <div>
        <PageHeader eyebrow="Response" title="Alerts & Actions" />
        <EmptyState
          title="No crew member selected"
          description="Select a crew member before reviewing alerts and actions."
        />
      </div>
    );
  }

  if (query.loading) {
    return <LoadingState message="Loading alert and action lifecycle..." />;
  }

  if (query.error || !query.data) {
    return (
      <div>
        <PageHeader eyebrow="Response" title="Alerts & Actions" />
        <ErrorNotice
          title="Alerts and actions unavailable"
          message={query.error?.message ?? 'The Ground API returned no alert payload.'}
          details={query.error?.details}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Response"
        title="Alerts & Actions"
        description={`${selectedAstronaut?.display_name ?? 'Selected crew'} · ${
          mission?.mission_code ?? 'mission'
        }. Alert lifecycle changes require the latest server revision.`}
        actions={
          <div style={{ display: 'flex', gap: '6px' }}>
            <SecondaryButton size="sm" onClick={query.refetch} icon={<IconRefresh size={12} />}>
              Reload
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={() => setShowCreate(true)} disabled={!isMedicalOfficer}>
              New action
            </PrimaryButton>
          </div>
        }
      />

      {!canMutateClinical && (
        <WarningNotice
          title="Read-only role"
          message="Only medical officers may acknowledge, resolve, dismiss, create or edit clinical actions. This identity can inspect the records but not change them."
        />
      )}
      {query.data.warning && <WarningNotice message={query.data.warning} />}
      {mutationError && <ErrorNotice title="Lifecycle update" message={mutationError} />}
      {mutationSuccess && (
        <div
          style={{
            border: '1px solid #000000',
            backgroundColor: 'rgba(255,255,8,0.2)',
            padding: '7px 10px',
            fontSize: '11px',
            fontWeight: 700
          }}
        >
          ✓ {mutationSuccess}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
        <Stat label="Open" value={alerts.filter((a) => a.status === 'open').length} emphasis />
        <Stat label="Acknowledged" value={alerts.filter((a) => a.status === 'acknowledged').length} />
        <Stat label="Resolved" value={alerts.filter((a) => a.status === 'resolved').length} />
        <Stat label="Dismissed" value={alerts.filter((a) => a.status === 'dismissed').length} />
        <Stat label="Recommended actions" value={actions.length} />
        <Stat label="Open actions" value={actions.filter((a) => ['pending', 'in_progress', 'deferred'].includes(a.status)).length} />
      </div>

      <Panel title="Filters" bodyStyle={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
          <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Severity
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              style={{ padding: '5px 7px', border: '1px solid #000000', fontSize: '11px' }}
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <span style={{ fontSize: '10px', marginLeft: 'auto' }}>
            {filteredAlerts.length} of {alerts.length} alert(s)
          </span>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '12px' }}>
        <Panel title="Alerts" subtitle="Newest first; select a row for evidence and history">
          {alerts.length === 0 ? (
            <EmptyState
              title="No alerts"
              description="The analysis service produced no alerts for this crew member."
            />
          ) : (
            <DataTable
              columns={alertColumns}
              data={filteredAlerts}
              keyField="alert_id"
              selectedRowKey={selectedAlert?.alert_id}
              onRowClick={(row) => {
                setSelectedAlertId(row.alert_id);
                setSelectedActionId(null);
                resetFeedback();
              }}
              emptyMessage="No alert matches the current filters."
            />
          )}
        </Panel>

        <Panel
          title={selectedAlert ? 'Alert detail' : 'No alert selected'}
          subtitle={selectedAlert ? selectedAlert.alert_code : undefined}
          actions={selectedAlert?.provenance?.demo_only ? <SyntheticTag /> : undefined}
        >
          {!selectedAlert ? (
            <EmptyState
              title="Select an alert"
              description="Choose an alert to inspect its evidence, acknowledgement state and append-only history."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <SeverityBadge severity={selectedAlert.severity as never} />
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {getAlertStatusLabel(selectedAlert.status)}
                </span>
                <span style={{ fontSize: '9px', fontFamily: 'monospace' }}>REV {selectedAlert.revision}</span>
                <span style={{ fontSize: '9px' }}>
                  {domainForAlertCode(selectedAlert.alert_code)?.label ?? 'Unmapped domain'}
                </span>
              </div>

              <div style={{ fontSize: '12px', fontWeight: 700 }}>{selectedAlert.title}</div>
              <div style={{ fontSize: '11px' }}>{selectedAlert.message}</div>

              <KeyValue label="Raised" value={formatTimestamp(selectedAlert.created_at)} />
              <KeyValue
                label="Acknowledged"
                value={
                  selectedAlert.acknowledged_at
                    ? `${formatTimestamp(selectedAlert.acknowledged_at)} · ${selectedAlert.acknowledged_by ?? 'actor not recorded'}`
                    : 'Not acknowledged'
                }
              />
              <KeyValue
                label="Resolved"
                value={selectedAlert.resolved_at ? formatTimestamp(selectedAlert.resolved_at) : 'Not resolved'}
              />
              <KeyValue
                label="Analysis run"
                value={String(selectedAlert.provenance?.analysis_run_id ?? 'Not linked')}
                mono
              />
              <KeyValue
                label="Finding code"
                value={String(selectedAlert.provenance?.finding_code ?? 'Not returned')}
                mono
              />
              <KeyValue
                label="Algorithm / rule set"
                value={`${String(selectedAlert.provenance?.algorithm_version ?? '—')} / ${String(
                  selectedAlert.provenance?.rule_set_version ?? '—'
                )}`}
                mono
              />

              {canMutateClinical && !['resolved', 'dismissed'].includes(selectedAlert.status) && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '3px' }}>
                    OPERATOR NOTE (OPTIONAL)
                  </label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    maxLength={2000}
                    style={{ width: '100%', border: '1px solid #000000', padding: '6px', fontSize: '11px', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {selectedAlert.status === 'open' && (
                      <PrimaryButton
                        size="sm"
                        onClick={handleAcknowledge}
                        disabled={busy !== null}
                        icon={<IconCheck size={12} />}
                      >
                        Acknowledge
                      </PrimaryButton>
                    )}
                    <SecondaryButton
                      size="sm"
                      onClick={() => handleTransition('resolved')}
                      disabled={busy !== null}
                    >
                      Resolve
                    </SecondaryButton>
                    <SecondaryButton
                      size="sm"
                      onClick={() => handleTransition('dismissed')}
                      disabled={busy !== null}
                    >
                      Dismiss
                    </SecondaryButton>
                  </div>
                  <p style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)', margin: '5px 0 0 0' }}>
                    Acknowledgement does not resolve an alert. Each transition is appended to history and
                    audited with the acting identity.
                  </p>
                </div>
              )}

              <div>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
                  LIFECYCLE HISTORY
                </div>
                {alertHistory.loading ? (
                  <LoadingState height={80} message="Loading history..." />
                ) : alertHistory.error ? (
                  <ErrorNotice title="History" message={alertHistory.error.message} />
                ) : (alertHistory.data ?? []).length === 0 ? (
                  <div style={{ fontSize: '10px' }}>No lifecycle events recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(alertHistory.data ?? []).map((event) => (
                      <div key={event.event_id} style={{ border: '1px solid rgba(0,0,0,0.2)', padding: '5px 7px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{event.event_type}</span>
                          <span style={{ fontFamily: 'monospace' }}>rev {event.result_revision}</span>
                        </div>
                        <div>{event.recorded_at ? formatTimestamp(event.recorded_at) : '—'} · {event.actor_id}</div>
                        {event.note && <div style={{ marginTop: '2px' }}>“{event.note}”</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
                  LINKED ACTIONS ({linkedActions.length})
                </div>
                {linkedActions.length === 0 ? (
                  <div style={{ fontSize: '10px' }}>No action is linked to this alert.</div>
                ) : (
                  linkedActions.map((action) => (
                    <div key={action.action_id} style={{ border: '1px solid rgba(0,0,0,0.2)', padding: '5px 7px', marginBottom: '4px', fontSize: '10px' }}>
                      <div style={{ fontWeight: 700 }}>{action.title}</div>
                      <div>{getActionTypeLabel(action.action_type)} · {getActionStatusLabel(action.status)} · rev {action.revision}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recommended actions" subtitle="Select a row to inspect its append-only event history">
        {actions.length === 0 ? (
          <EmptyState
            title="No recommended actions"
            description="No action record exists for this crew member."
          />
        ) : (
          <DataTable
            columns={actionColumns}
            data={actions}
            keyField="action_id"
            selectedRowKey={selectedActionId ?? undefined}
            onRowClick={(row) => {
              setSelectedActionId(row.action_id);
              resetFeedback();
            }}
          />
        )}
      </Panel>

      {selectedActionId && (
        <Panel
          title="Action detail"
          subtitle="Current revision and lifecycle"
          actions={
            <SecondaryButton size="sm" onClick={() => setSelectedActionId(null)}>
              Close
            </SecondaryButton>
          }
        >
          {(() => {
            const action = actions.find((item) => item.action_id === selectedActionId);
            if (!action) {
              return <EmptyState title="Action not found" description="The action is no longer in the current payload." />;
            }
            return (
              <>
                <KeyValue label="Action ID" value={action.action_id} mono />
                <KeyValue label="Title" value={action.title} />
                <KeyValue label="Description" value={action.description} />
                <KeyValue label="Type" value={getActionTypeLabel(action.action_type)} />
                <KeyValue label="Priority" value={getPriorityLabel(action.priority)} />
                <KeyValue label="Status" value={getActionStatusLabel(action.status)} />
                <KeyValue label="Due" value={action.due_at ? formatTimestamp(action.due_at) : 'No due time'} />
                <KeyValue label="Revision" value={action.revision} mono />
                <KeyValue label="Linked alert" value={action.alert_id ?? 'None'} mono />

                {canMutateClinical && !['completed', 'cancelled'].includes(action.status) && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['in_progress', 'completed', 'deferred', 'skipped', 'cancelled'].map((status) => (
                      <PrimaryButton
                        key={status}
                        size="sm"
                        onClick={() => handleActionStatus(action, status)}
                        disabled={busy !== null || action.status === status}
                      >
                        {getActionStatusLabel(status)}
                      </PrimaryButton>
                    ))}
                    <SecondaryButton
                      size="sm"
                      onClick={() => handleActionNote(action)}
                      disabled={busy !== null}
                    >
                      Record note
                    </SecondaryButton>
                  </div>
                )}

                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', marginBottom: '4px' }}>
                    ACTION EVENT HISTORY
                  </div>
                  {actionHistory.loading ? (
                    <LoadingState height={80} message="Loading action history..." />
                  ) : actionHistory.error ? (
                    <ErrorNotice title="Action history" message={actionHistory.error.message} />
                  ) : (actionHistory.data ?? []).length === 0 ? (
                    <div style={{ fontSize: '10px' }}>No action events recorded.</div>
                  ) : (
                    (actionHistory.data ?? []).map((event) => (
                      <div key={event.event_id} style={{ border: '1px solid rgba(0,0,0,0.2)', padding: '5px 7px', marginBottom: '4px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{event.event_type}</span>
                          <span style={{ fontFamily: 'monospace' }}>rev {event.result_revision}</span>
                        </div>
                        <div>{event.created_at ? formatTimestamp(event.created_at) : '—'} · {event.actor_code}</div>
                        {event.note && <div style={{ marginTop: '2px' }}>“{event.note}”</div>}
                      </div>
                    ))
                  )}
                </div>
              </>
            );
          })()}
        </Panel>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create recommended action"
        subtitle={
          selectedAlert
            ? `Linked to alert ${selectedAlert.alert_code}`
            : 'Not linked to an alert'
        }
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <SecondaryButton onClick={() => setShowCreate(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleCreateAction} disabled={busy !== null}>
              {busy === 'Create action' ? 'Creating…' : 'Create action'}
            </PrimaryButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            Description
            <textarea
              value={form.description}
              maxLength={2000}
              rows={3}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px', fontFamily: 'inherit' }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700 }}>
              Action type
              <select
                value={form.actionType}
                onChange={(event) => setForm((current) => ({ ...current, actionType: event.target.value as ActionType }))}
                style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
              >
                {ACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getActionTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: '10px', fontWeight: 700 }}>
              Priority
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as typeof current.priority
                  }))
                }
                style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <label style={{ fontSize: '10px', fontWeight: 700 }}>
            Due (optional)
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', border: '1px solid #000000', fontSize: '11px' }}
            />
          </label>
          <p style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)', margin: 0 }}>
            The backend assigns the action identifier, revision 1 and initial lifecycle event.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AlertsActionCenter;
