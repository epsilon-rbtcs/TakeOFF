// Ground Health Console — Alerts & Action Centre
// Clinical action management workspace with auditable lifecycle state transitions

import React, { useState } from 'react';
import { useAlertsAndActions } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { DataTable, Column } from '../components/common/DataTable';
import {
  SeverityBadge,
  AlertLifecycleBadge,
  SyntheticTag
} from '../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { Modal } from '../components/common/Modal';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { IconAlerts, IconCheck } from '../components/common/Icons';
import { Alert, FollowUpAction, AlertLifecycle } from '../types';
import { formatTimestamp, getHealthDomainLabel } from '../utilities';

export const AlertsActionCenter: React.FC = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const {
    alerts,
    actions,
    acknowledgeAlert,
    updateAlertStatus,
    addFollowUpAction,
    updateActionStatus
  } = useAlertsAndActions({
    status: statusFilter,
    severity: severityFilter,
    domain: domainFilter
  });

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(alerts[0] || null);

  // Modal States
  const [ackModalOpen, setAckModalOpen] = useState<boolean>(false);
  const [ackNote, setAckNote] = useState<string>('');

  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<AlertLifecycle>('monitoring');
  const [statusNote, setStatusNote] = useState<string>('');

  const [newActionModalOpen, setNewActionModalOpen] = useState<boolean>(false);
  const [actionDesc, setActionDesc] = useState<string>('');
  const [actionProtocol, setActionProtocol] = useState<string>('');
  const [actionAssignee, setActionAssignee] = useState<string>('Dr. Sarah Connor');

  const actorName =
    user?.role === 'medical_officer'
      ? 'Dr. Sarah Connor (Flight Surgeon)'
      : user?.role === 'administrator'
      ? 'Sys Admin'
      : 'Crew Observer';

  const handleAcknowledge = async () => {
    if (selectedAlert) {
      await acknowledgeAlert(selectedAlert.alert_id, actorName, ackNote);
      setAckModalOpen(false);
      setAckNote('');
    }
  };

  const handleStatusChange = async () => {
    if (selectedAlert) {
      await updateAlertStatus(selectedAlert.alert_id, newStatus, actorName, statusNote);
      setStatusModalOpen(false);
      setStatusNote('');
    }
  };

  const handleCreateAction = async () => {
    if (selectedAlert) {
      await addFollowUpAction({
        alert_id: selectedAlert.alert_id,
        astronaut_id: selectedAlert.astronaut_id,
        mission_id: selectedAlert.mission_id,
        description: actionDesc,
        protocol_reference: actionProtocol || undefined,
        assigned_to: actionAssignee,
        status: 'pending',
        is_synthetic: true
      });
      setNewActionModalOpen(false);
      setActionDesc('');
      setActionProtocol('');
    }
  };

  const alertColumns: Column<Alert>[] = [
    {
      key: 'severity',
      header: 'Severity',
      width: '100px',
      render: (row) => <SeverityBadge severity={row.severity} />
    },
    {
      key: 'title',
      header: 'Clinical Alert / Finding',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800, fontSize: '13px' }}>{row.title}</div>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)' }}>
            Domain: {getHealthDomainLabel(row.health_domain)}
          </div>
        </div>
      )
    },
    {
      key: 'assigned_to',
      header: 'Assigned Officer',
      render: (row) => (
        <span style={{ fontSize: '11px', fontWeight: 600 }}>
          {row.assigned_to || 'Unassigned'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Action Status',
      render: (row) => <AlertLifecycleBadge status={row.status} />
    },
    {
      key: 'created_at',
      header: 'Generated',
      render: (row) => (
        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>
          {formatTimestamp(row.created_at, 'relative')}
        </span>
      )
    }
  ];

  const relatedActions = actions.filter((a) => a.alert_id === selectedAlert?.alert_id);

  return (
    <div>
      {/* Title Bar */}
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
            ACTION CENTRE
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
          Alerts & Medical Follow-Up Actions
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0' }}>
          Review unacknowledged deviations, record clinical action plans, and maintain auditable lifecycle history.
        </p>
      </div>

      {/* Filter Bar */}
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
          Filter Alerts:
        </span>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #000000',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #000000',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="moderate">Moderate</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(0,0,0,0.6)', fontFamily: 'monospace' }}>
          Showing {alerts.length} active findings
        </span>
      </div>

      {/* Layout: Split view — Alerts Table on top, Action Workspace on bottom */}
      <div style={{ marginBottom: '24px' }}>
        <DataTable
          columns={alertColumns}
          data={alerts}
          keyField="alert_id"
          selectedRowKey={selectedAlert?.alert_id}
          onRowClick={(row) => setSelectedAlert(row)}
        />
      </div>

      {/* Selected Alert Action Workspace */}
      {selectedAlert && (
        <div
          style={{
            border: '2px solid #000000',
            backgroundColor: '#FFFFFF',
            padding: '24px',
            boxShadow: '4px 4px 0px #000000'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #000000',
              paddingBottom: '14px',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <SeverityBadge severity={selectedAlert.severity} />
                <AlertLifecycleBadge status={selectedAlert.status} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
                  {getHealthDomainLabel(selectedAlert.health_domain)} · ID: {selectedAlert.alert_id}
                </span>
              </div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  margin: 0
                }}
              >
                {selectedAlert.title}
              </h2>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedAlert.status === 'open' && (
                <PrimaryButton size="sm" onClick={() => setAckModalOpen(true)}>
                  ACKNOWLEDGE ALERT
                </PrimaryButton>
              )}
              <SecondaryButton size="sm" onClick={() => setStatusModalOpen(true)}>
                UPDATE STATUS
              </SecondaryButton>
              <SecondaryButton size="sm" onClick={() => setNewActionModalOpen(true)}>
                + ASSIGN ACTION
              </SecondaryButton>
            </div>
          </div>

          {/* Description & Evidence */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px'
            }}
          >
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                Clinical Finding Context
              </h4>
              <div style={{ fontSize: '13px', lineHeight: 1.5, backgroundColor: '#FAFAFA', padding: '12px', border: '1px solid rgba(0,0,0,0.1)' }}>
                {selectedAlert.description}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                Supporting Objective Evidence
              </h4>
              <div style={{ fontSize: '13px', lineHeight: 1.5, backgroundColor: 'rgba(255, 255, 8, 0.1)', padding: '12px', border: '1px solid #000000' }}>
                {selectedAlert.evidence_summary}
              </div>
            </div>
          </div>

          {/* Assigned Actions for this Alert */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
              Assigned Follow-Up Protocols ({relatedActions.length})
            </h4>

            {relatedActions.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', fontStyle: 'italic', padding: '8px 0' }}>
                No active follow-up action currently assigned. Click "+ Assign Action" to register a clinical countermeasure.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {relatedActions.map((act) => (
                  <div
                    key={act.action_id}
                    style={{
                      border: '1px solid #000000',
                      padding: '12px',
                      backgroundColor: act.status === 'completed' ? '#F9F9F9' : '#FFFFFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{act.description}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
                        Protocol: <strong>{act.protocol_reference || 'Ad-hoc clinical directive'}</strong> · Assignee: <strong>{act.assigned_to}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          border: '1px solid #000000',
                          backgroundColor: act.status === 'completed' ? '#E5E5E5' : '#FFFF08'
                        }}
                      >
                        {act.status.toUpperCase()}
                      </span>

                      {act.status !== 'completed' && (
                        <SecondaryButton
                          size="sm"
                          onClick={() => updateActionStatus(act.action_id, 'completed', actorName, 'Completed by medical officer')}
                        >
                          MARK DONE
                        </SecondaryButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auditable Lifecycle Event Log */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
              Audited Lifecycle State Transitions
            </h4>

            <div style={{ border: '1px solid rgba(0,0,0,0.15)', backgroundColor: '#FAFAFA' }}>
              {selectedAlert.events.map((ev, i) => (
                <div
                  key={ev.event_id}
                  style={{
                    padding: '8px 12px',
                    borderBottom: i !== selectedAlert.events.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    fontSize: '11px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700 }}>{ev.action}</span>
                    <span style={{ color: 'rgba(0,0,0,0.6)', marginLeft: '8px' }}>
                      by <strong>{ev.actor}</strong>
                    </span>
                    {ev.note && <div style={{ color: 'rgba(0,0,0,0.7)', marginTop: '2px' }}>"{ev.note}"</div>}
                  </div>
                  <span style={{ fontFamily: 'monospace', color: 'rgba(0,0,0,0.5)' }}>
                    {formatTimestamp(ev.timestamp, 'full')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Acknowledge Alert */}
      <Modal
        isOpen={ackModalOpen}
        onClose={() => setAckModalOpen(false)}
        title="Acknowledge Health Alert"
        subtitle={selectedAlert?.title}
        footer={
          <>
            <SecondaryButton size="sm" onClick={() => setAckModalOpen(false)}>
              CANCEL
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={handleAcknowledge}>
              CONFIRM ACKNOWLEDGEMENT
            </PrimaryButton>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', marginTop: 0 }}>
            Acknowledging registers that medical personnel have inspected this finding. It does not close or resolve the underlying condition.
          </p>

          <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            Clinical Assessment Note (Optional)
          </label>
          <textarea
            value={ackNote}
            onChange={(e) => setAckNote(e.target.value)}
            rows={3}
            placeholder="Add operational notes or schedule follow-up..."
            style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
          />
        </div>
      </Modal>

      {/* MODAL 2: Update Alert Status */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Transition Alert Lifecycle Status"
        subtitle={selectedAlert?.title}
        footer={
          <>
            <SecondaryButton size="sm" onClick={() => setStatusModalOpen(false)}>
              CANCEL
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={handleStatusChange}>
              SUBMIT STATUS TRANSITION
            </PrimaryButton>
          </>
        }
      >
        <div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              New Lifecycle Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AlertLifecycle)}
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
            >
              <option value="monitoring">Monitoring — Active observation</option>
              <option value="resolved">Resolved — Condition mitigated</option>
              <option value="escalated">Escalated — Urgent flight rule response</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="open">Re-open Alert</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Justification & Operational Note
            </label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              rows={3}
              placeholder="State rationale for status transition..."
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Create Follow-up Action */}
      <Modal
        isOpen={newActionModalOpen}
        onClose={() => setNewActionModalOpen(false)}
        title="Assign Medical Follow-Up Action"
        subtitle={selectedAlert?.title}
        footer={
          <>
            <SecondaryButton size="sm" onClick={() => setNewActionModalOpen(false)}>
              CANCEL
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={handleCreateAction}>
              CREATE & ASSIGN ACTION
            </PrimaryButton>
          </>
        }
      >
        <div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Action Directive Description
            </label>
            <textarea
              value={actionDesc}
              onChange={(e) => setActionDesc(e.target.value)}
              rows={2}
              placeholder="e.g. Verify scrubber bed duty cycle and inspect ventilation grille..."
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Protocol Reference Code
            </label>
            <input
              type="text"
              value={actionProtocol}
              onChange={(e) => setActionProtocol(e.target.value)}
              placeholder="e.g. ECLSS-FD142-CO2-SCRUB"
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Assigned Medical Officer
            </label>
            <input
              type="text"
              value={actionAssignee}
              onChange={(e) => setActionAssignee(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default AlertsActionCenter;
