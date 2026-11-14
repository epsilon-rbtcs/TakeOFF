// Ground Health Console — Messages & Medical Directives
// Reliable delay-tolerant medical messaging with verifiable delivery lifecycle

import React, { useState } from 'react';
import { useMessages } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { MessageStatusBadge, SyntheticTag } from '../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { Modal } from '../components/common/Modal';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { IconMessage } from '../components/common/Icons';
import { Message, MessageStatus } from '../types';
import { formatTimestamp } from '../utilities';
import { DEMO_ASTRONAUT_ID, SECOND_ASTRONAUT_ID } from '../mock-data';

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [astronautFilter, setAstronautFilter] = useState<string>('all');

  const { messages, composeMessage, updateMessageStatus } = useMessages({
    status: statusFilter,
    astronautId: astronautFilter
  });

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(messages[0] || null);

  // Compose Modal State
  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [targetAstronautId, setTargetAstronautId] = useState<string>(DEMO_ASTRONAUT_ID);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [priority, setPriority] = useState<'routine' | 'priority' | 'urgent'>('routine');
  const [protocolRef, setProtocolRef] = useState<string>('');

  const handleSendMessage = () => {
    if (!subject.trim() || !body.trim()) return;

    const recipientName =
      targetAstronautId === DEMO_ASTRONAUT_ID ? 'Cmdr. Elena Vasquez' : 'Dr. James Chen';

    const created = composeMessage({
      astronaut_id: targetAstronautId,
      recipient_name: recipientName,
      subject,
      body,
      priority,
      protocol_reference: protocolRef || undefined
    });

    setSelectedMessage(created);
    setComposeOpen(false);
    setSubject('');
    setBody('');
    setProtocolRef('');
  };

  return (
    <div>
      {/* Title Bar */}
      <div
        style={{
          borderBottom: '2px solid #000000',
          paddingBottom: '16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <div>
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
              STORE & FORWARD COMMS
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
            Messages & Medical Directives
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0' }}>
            Authorized clinical communication channel with explicit transmission and delivery acknowledgements.
          </p>
        </div>

        <PrimaryButton icon={<IconMessage size={16} />} onClick={() => setComposeOpen(true)}>
          COMPOSE MEDICAL DISPATCH
        </PrimaryButton>
      </div>

      {/* Communications Blackout Caution */}
      <div
        style={{
          border: '1px solid #000000',
          backgroundColor: '#FAFAFA',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '11px',
          lineHeight: 1.4
        }}
      >
        <strong>PROTOCOL RULE:</strong> Messages dispatched during orbital blackout remain in ground staging queue until next confirmed downlink pass. Interface strictly distinguishes <em>Sent</em> (uplink broadcast) from <em>Delivered</em> (client confirmed receipt) and <em>Acknowledged</em> (crew read receipt).
      </div>

      {/* Main Split Layout: Message Thread List & Message Detail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '420px 1fr',
          gap: '20px',
          minHeight: '520px'
        }}
      >
        {/* Left Column: Messages Thread List */}
        <div
          style={{
            border: '2px solid #000000',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Thread Filters */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #000000',
              backgroundColor: '#FAFAFA',
              display: 'flex',
              gap: '8px'
            }}
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 8px',
                border: '1px solid #000000',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent / In Flight</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="draft">Drafts</option>
            </select>

            <select
              value={astronautFilter}
              onChange={(e) => setAstronautFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 8px',
                border: '1px solid #000000',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <option value="all">All Astronauts</option>
              <option value={DEMO_ASTRONAUT_ID}>Cmdr. Elena Vasquez</option>
              <option value={SECOND_ASTRONAUT_ID}>Dr. James Chen</option>
            </select>
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {messages.map((msg) => {
              const isSelected = selectedMessage?.message_id === msg.message_id;
              const isFromCrew = msg.sender_role === 'crew_member';

              return (
                <div
                  key={msg.message_id}
                  onClick={() => setSelectedMessage(msg)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    backgroundColor: isSelected ? 'rgba(255, 255, 8, 0.25)' : '#FFFFFF',
                    borderLeft: isSelected ? '4px solid #000000' : '4px solid transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.08s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 8, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        backgroundColor: isFromCrew ? '#000000' : '#E5E5E5',
                        color: isFromCrew ? '#FFFF08' : '#000000'
                      }}
                    >
                      {isFromCrew ? 'DOWNLINK FROM CREW' : 'GROUND DISPATCH'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
                      {formatTimestamp(msg.created_at, 'relative')}
                    </span>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '12px', marginBottom: '2px', lineHeight: 1.3 }}>
                    {msg.subject}
                  </div>

                  <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginBottom: '6px' }}>
                    {isFromCrew ? `From: ${msg.sender_name}` : `To: ${msg.recipient_name}`}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <MessageStatusBadge status={msg.status} />
                    {msg.priority !== 'routine' && (
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#000000', backgroundColor: '#FFFF08', padding: '1px 4px' }}>
                        {msg.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Message Detail & Lifecycle */}
        {selectedMessage ? (
          <div
            style={{
              border: '2px solid #000000',
              backgroundColor: '#FFFFFF',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '4px 4px 0px #000000'
            }}
          >
            <div>
              {/* Message Header */}
              <div
                style={{
                  borderBottom: '2px solid #000000',
                  paddingBottom: '14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <MessageStatusBadge status={selectedMessage.status} />
                    {selectedMessage.priority !== 'routine' && (
                      <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#FFFF08', padding: '2px 6px', border: '1px solid #000000' }}>
                        {selectedMessage.priority.toUpperCase()} PRIORITY
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.5)' }}>
                    ID: {selectedMessage.message_id}
                  </span>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', margin: '4px 0 10px 0' }}>
                  {selectedMessage.subject}
                </h2>

                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>
                    <strong style={{ textTransform: 'uppercase', fontSize: '11px' }}>Sender:</strong>{' '}
                    {selectedMessage.sender_name} ({selectedMessage.sender_role})
                  </div>
                  <div>
                    <strong style={{ textTransform: 'uppercase', fontSize: '11px' }}>Recipient:</strong>{' '}
                    {selectedMessage.recipient_name}
                  </div>
                  {selectedMessage.protocol_reference && (
                    <div>
                      <strong style={{ textTransform: 'uppercase', fontSize: '11px' }}>Protocol Reference:</strong>{' '}
                      <code>{selectedMessage.protocol_reference}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Body */}
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  padding: '16px',
                  backgroundColor: '#FAFAFA',
                  border: '1px solid rgba(0,0,0,0.15)',
                  marginBottom: '20px',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {selectedMessage.body}
              </div>
            </div>

            {/* Delivery Lifecycle Audited Timeline */}
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                Audited Transmission & Delivery Lifecycle
              </h4>

              <div style={{ border: '1px solid #000000', backgroundColor: '#FFFFFF', fontSize: '11px' }}>
                {selectedMessage.events.map((ev, i) => (
                  <div
                    key={ev.event_id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: i !== selectedMessage.events.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, textTransform: 'uppercase', width: '110px' }}>
                        {ev.status}
                      </span>
                      {ev.note && <span style={{ color: 'rgba(0,0,0,0.6)' }}>{ev.note}</span>}
                    </div>
                    <span style={{ fontFamily: 'monospace', color: 'rgba(0,0,0,0.5)' }}>
                      {formatTimestamp(ev.timestamp, 'full')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Simulation Action to advance status if Sent */}
              {selectedMessage.status === 'sent' && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <SecondaryButton
                    size="sm"
                    onClick={() => updateMessageStatus(selectedMessage.message_id, 'delivered', 'Telemetry Relay Confirmation')}
                  >
                    Simulate Downlink Delivery Receipt
                  </SecondaryButton>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ border: '2px solid #000000', padding: '32px', textAlign: 'center', color: 'rgba(0,0,0,0.5)' }}>
            Select a message thread from the left to inspect content and delivery lifecycle.
          </div>
        )}
      </div>

      {/* Compose Message Modal */}
      <Modal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose Medical Directive / Dispatch"
        subtitle="Staged for uplink on next confirmed line-of-sight pass"
        footer={
          <>
            <SecondaryButton size="sm" onClick={() => setComposeOpen(false)}>
              CANCEL
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={handleSendMessage}>
              ENQUEUE FOR UPLINK TRANSMISSION
            </PrimaryButton>
          </>
        }
      >
        <div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Target Astronaut
            </label>
            <select
              value={targetAstronautId}
              onChange={(e) => setTargetAstronautId(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
            >
              <option value={DEMO_ASTRONAUT_ID}>Cmdr. Elena Vasquez (Mission Commander)</option>
              <option value={SECOND_ASTRONAUT_ID}>Dr. James Chen (Flight Engineer / Medical Specialist)</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Subject Heading
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Countermeasure Adjustment / Rest Schedule Protocol"
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Transmission Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
              >
                <option value="routine">Routine — Next scheduled pass</option>
                <option value="priority">Priority — First available packet</option>
                <option value="urgent">Urgent — Immediate interrupt</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Protocol Reference (Optional)
              </label>
              <input
                type="text"
                value={protocolRef}
                onChange={(e) => setProtocolRef(e.target.value)}
                placeholder="e.g. MED-S-12"
                style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Clinical Message Directive
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Enter instructions, schedule modifications, or follow-up guidance..."
              style={{ width: '100%', padding: '8px', border: '1px solid #000000', fontSize: '12px' }}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Messages;
