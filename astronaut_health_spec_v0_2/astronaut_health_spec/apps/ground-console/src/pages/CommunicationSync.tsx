// Ground Health Console — Communication & Store-and-Forward Synchronization
// Rigorous delay-tolerant network monitoring reflecting orbital telemetry reality

import React, { useState } from 'react';
import { useCommunicationAndSync } from '../api/hooks';
import { DataTable, Column } from '../components/common/DataTable';
import { CommStateBadge, SyntheticTag } from '../components/common/StatusBadge';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { IconSync, IconRadio } from '../components/common/Icons';
import { SyncBatch, CommunicationState } from '../types';
import { formatTimestamp, getCommunicationStateDescription } from '../utilities';

export const CommunicationSync: React.FC = () => {
  const { commStatus, batches, simulateCommunicationState } = useCommunicationAndSync();
  const [selectedBatch, setSelectedBatch] = useState<SyncBatch | null>(batches[0] || null);

  const batchColumns: Column<SyncBatch>[] = [
    {
      key: 'batch_id',
      header: 'Batch Identifier',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800, fontFamily: 'monospace' }}>{row.batch_id}</div>
          {row.notes && <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)' }}>{row.notes}</div>}
        </div>
      )
    },
    {
      key: 'direction',
      header: 'Direction',
      align: 'center',
      render: (row) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '11px',
            backgroundColor: row.direction === 'push' ? '#FFFF08' : '#F0F0F0',
            border: '1px solid #000000',
            padding: '2px 6px'
          }}
        >
          {row.direction === 'push' ? '▲ DOWNLINK (PUSH)' : '▼ UPLINK (PULL)'}
        </span>
      )
    },
    {
      key: 'event_count',
      header: 'Event Count',
      align: 'center',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.event_count}</span>
      )
    },
    {
      key: 'status',
      header: 'Ingest Status',
      render: (row) => {
        const isAccepted = row.status === 'accepted';
        const isFailed = row.status === 'failed';
        return (
          <span
            style={{
              padding: '2px 6px',
              border: '1px solid #000000',
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              backgroundColor: isAccepted ? '#FFFFFF' : isFailed ? '#000000' : '#FFFF08',
              color: isFailed ? '#FFFFFF' : '#000000'
            }}
          >
            {row.status.toUpperCase()}
          </span>
        );
      }
    },
    {
      key: 'retries',
      header: 'Retries',
      align: 'center',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', color: row.retry_count > 0 ? '#000000' : 'rgba(0,0,0,0.4)', fontWeight: row.retry_count > 0 ? 800 : 400 }}>
          {row.retry_count}
        </span>
      )
    },
    {
      key: 'timestamps',
      header: 'Client Created / Ground Acknowledged',
      render: (row) => (
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            Sent: {formatTimestamp(row.created_at, 'time')}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
            Ack: {row.acknowledged_at ? formatTimestamp(row.acknowledged_at, 'time') : 'UNACKNOWLEDGED'}
          </div>
        </div>
      )
    }
  ];

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
            TELECOMMUNICATION LINK MONITOR
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
          Communication & Store-and-Forward Synchronization
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0' }}>
          Monitor orbital delay, staging envelopes, receipt verifications, and ground station batch acknowledgements.
        </p>
      </div>

      {/* Critical Epistemological Ground Notice */}
      <div
        style={{
          border: '1px solid #000000',
          backgroundColor: '#FAFAFA',
          padding: '12px 16px',
          marginBottom: '24px',
          fontSize: '11px',
          lineHeight: 1.5
        }}
      >
        <strong style={{ textTransform: 'uppercase' }}>Scientific Communication Boundary:</strong> The ground system cannot independently determine that an astronaut's remote client has entered blackout unless reported by the client or confirmed by orbital passes. Telemetry freshness reflects the age of the last successful contact packet, not real-time presence.
      </div>

      {/* Communication Link Status Block */}
      <div
        style={{
          border: '2px solid #000000',
          backgroundColor: '#FFFFFF',
          padding: '20px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          boxShadow: '4px 4px 0px #000000'
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
            Active Transport State
          </div>
          <div style={{ marginTop: '6px' }}>
            <CommStateBadge state={commStatus.state} showDetail />
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', marginTop: '8px' }}>
            {getCommunicationStateDescription(commStatus.state)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
            Last Successful Contact
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', marginTop: '6px' }}>
            {formatTimestamp(commStatus.last_successful_contact_at, 'full')}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '4px' }}>
            Observed timestamp: {formatTimestamp(commStatus.observed_at, 'relative')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
            Crew Client Identifier
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', marginTop: '6px' }}>
            {commStatus.client_id}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '4px' }}>
            Envelopes staged in outbox: <strong>{commStatus.queued_event_count}</strong>
          </div>
        </div>

        {/* Demo Link Switcher */}
        <div style={{ borderLeft: '1px solid rgba(0,0,0,0.15)', paddingLeft: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)', marginBottom: '8px' }}>
            Demonstration State Control
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['LIVE', 'DELAYED', 'BLACKOUT'] as CommunicationState[]).map((st) => (
              <button
                key={st}
                onClick={() => simulateCommunicationState(st)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #000000',
                  fontSize: '11px',
                  fontWeight: commStatus.state === st ? 800 : 500,
                  backgroundColor: commStatus.state === st ? '#FFFF08' : '#FFFFFF',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                Set {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Synchronization Batches Table */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
          Synchronized Batch Envelopes History
        </h2>
        <DataTable
          columns={batchColumns}
          data={batches}
          keyField="batch_id"
          selectedRowKey={selectedBatch?.batch_id}
          onRowClick={(row) => setSelectedBatch(row)}
        />
      </div>

      {/* Selected Batch Details */}
      {selectedBatch && (
        <div
          style={{
            border: '2px solid #000000',
            backgroundColor: '#FFFFFF',
            padding: '20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderBottom: '1px solid #000000',
              paddingBottom: '10px',
              marginBottom: '14px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
                BATCH ENVELOPE INSPECTOR
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                {selectedBatch.batch_id}
              </h3>
            </div>
            <div style={{ fontSize: '12px' }}>
              Status: <strong>{selectedBatch.status.toUpperCase()}</strong> · Retries: <strong>{selectedBatch.retry_count}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '14px', fontSize: '12px' }}>
            {selectedBatch.notes && (
              <div style={{ marginBottom: '8px', padding: '6px 10px', backgroundColor: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }}>
                <strong>Log Note:</strong> {selectedBatch.notes}
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
            Contained Telemetry Envelopes ({selectedBatch.events.length})
          </h4>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #000000' }}>
            <thead>
              <tr style={{ backgroundColor: '#000000', color: '#FFFFFF', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Event ID</th>
                <th style={{ padding: '6px 10px' }}>Entity Type</th>
                <th style={{ padding: '6px 10px' }}>Server Ingest Status</th>
                <th style={{ padding: '6px 10px' }}>Receipt Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {selectedBatch.events.map((ev) => (
                <tr key={ev.event_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{ev.event_id}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{ev.entity_type}</td>
                  <td style={{ padding: '6px 10px', textTransform: 'uppercase' }}>
                    <span
                      style={{
                        padding: '1px 5px',
                        border: '1px solid #000000',
                        backgroundColor: ev.status === 'accepted' ? '#FFFFFF' : '#FFFF08',
                        fontWeight: 700
                      }}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                    {ev.received_at ? formatTimestamp(ev.received_at, 'full') : 'Acknowledged in Batch'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default CommunicationSync;
