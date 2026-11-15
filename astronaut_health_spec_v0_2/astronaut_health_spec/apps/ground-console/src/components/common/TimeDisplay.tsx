// Ground Health Console — Provenance-Aware Time Display
// Distinguishes Device Measurement, Client Creation, and Ground Server Receipt

import React, { useState } from 'react';
import { formatTimestamp } from '../../utilities';

interface TimeDisplayProps {
  measured_at?: string | null;
  created_at?: string | null;
  received_at?: string | null;
  format?: 'compact' | 'full';
  showProvenancePopup?: boolean;
  style?: React.CSSProperties;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  measured_at,
  created_at,
  received_at,
  format = 'compact',
  showProvenancePopup = true,
  style
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // A receipt-only or client-only record must still show its own timestamp.
  // Prefer device time, then client creation time, then Ground receipt.
  const primaryTimestamp = measured_at ?? created_at ?? received_at ?? null;
  const primaryLabel = measured_at
    ? 'Device measurement'
    : created_at
    ? 'Client created'
    : received_at
    ? 'Ground receipt'
    : 'Timestamp';

  if (format === 'full') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          fontSize: '11px',
          fontFamily: 'monospace',
          backgroundColor: '#FFFFFF',
          padding: '6px 8px',
          border: '1px solid rgba(0,0,0,0.15)',
          ...style
        }}
      >
        {measured_at ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>DEVICE MEASURED:</span>
            <span style={{ fontWeight: 700 }}>{formatTimestamp(measured_at, 'full')}</span>
          </div>
        ) : null}
        {created_at && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: 'rgba(0,0,0,0.6)' }}>CLIENT ENVELOPED:</span>
            <span>{formatTimestamp(created_at, 'full')}</span>
          </div>
        )}
        {received_at && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: 'rgba(0,0,0,0.6)' }}>GROUND RECEIVED:</span>
            <span>{formatTimestamp(received_at, 'full')}</span>
          </div>
        )}
        {!primaryTimestamp && (
          <div style={{ color: 'rgba(0,0,0,0.6)' }}>No timestamp recorded.</div>
        )}
      </div>
    );
  }

  // Compact representation with click-to-expand provenance details
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        type="button"
        onClick={() => showProvenancePopup && setShowDetails(!showDetails)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontFamily: 'inherit',
          color: '#000000',
          background: 'none',
          border: 'none',
          padding: '2px 4px',
          cursor: showProvenancePopup ? 'pointer' : 'default',
          borderBottom: showProvenancePopup ? '1px dotted #000000' : 'none'
        }}
        title={`Click to view provenance timestamps (${primaryLabel})`}
      >
        <span>{formatTimestamp(primaryTimestamp, 'relative')}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>
          ({formatTimestamp(primaryTimestamp, 'time')})
        </span>
      </button>

      {showDetails && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99
            }}
            onClick={() => setShowDetails(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 100,
              width: '280px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
              padding: '8px 10px',
              marginTop: '4px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                borderBottom: '1px solid #000000',
                paddingBottom: '4px',
                marginBottom: '6px',
                backgroundColor: '#FFFF08',
                margin: '-8px -10px 6px -10px',
                padding: '4px 10px'
              }}
            >
              Provenance Timestamps
            </div>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>
                1. {primaryLabel}
              </div>
              <div style={{ fontWeight: 700 }}>{formatTimestamp(primaryTimestamp, 'full')}</div>
            </div>
            {measured_at && created_at && (
              <div style={{ marginBottom: '4px' }}>
                <div style={{ color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>2. Crew Client Created</div>
                <div>{formatTimestamp(created_at, 'full')}</div>
              </div>
            )}
            {measured_at && received_at && (
              <div>
                <div style={{ color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>3. Ground Station Ingest</div>
                <div>{formatTimestamp(received_at, 'full')}</div>
              </div>
            )}
            {!measured_at && created_at && (
              <div style={{ marginBottom: '4px' }}>
                <div style={{ color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>2. Ground Station Ingest</div>
                <div>{received_at ? formatTimestamp(received_at, 'full') : 'Not recorded'}</div>
              </div>
            )}
            {!measured_at && !created_at && (
              <div style={{ color: 'rgba(0,0,0,0.6)' }}>No additional timestamp recorded.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
