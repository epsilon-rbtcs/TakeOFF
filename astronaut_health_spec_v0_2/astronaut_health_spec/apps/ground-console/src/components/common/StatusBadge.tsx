// Ground Health Console — Status Badges
// Strict medical design: text, borders, and high-contrast labels without color rainbows

import React from 'react';
import {
  AssessmentStatus,
  AlertSeverity,
  CommunicationState,
  DataFreshness,
  DataQuality,
  MessageStatus,
  AlertLifecycle
} from '../../types';

interface BadgeProps {
  style?: React.CSSProperties;
}

// 1. Assessment Status Badge
export const AssessmentBadge: React.FC<{ status: AssessmentStatus } & BadgeProps> = ({ status, style }) => {
  const configs: Record<AssessmentStatus, { label: string; border: string; bg: string; dot?: boolean; bold?: boolean }> = {
    normal: { label: 'NOMINAL', border: '1px solid #000000', bg: '#FFFFFF' },
    monitor: { label: 'MONITOR TREND', border: '1px solid #000000', bg: 'rgba(255, 255, 8, 0.2)', bold: true },
    attention: { label: 'ATTENTION REQUIRED', border: '2px solid #000000', bg: '#FFFF08', bold: true, dot: true },
    urgent: { label: 'URGENT PROTOCOL', border: '2px solid #000000', bg: '#000000', bold: true, dot: true },
    insufficient_data: { label: 'INSUFFICIENT DATA', border: '1px dashed #000000', bg: '#FFFFFF' },
    data_quality_issue: { label: 'DATA QUALITY ISSUE', border: '1px dashed #000000', bg: '#F2F2F2', bold: true }
  };

  const c = configs[status] ?? { label: status.toUpperCase(), border: '1px solid #000000', bg: '#FFFFFF' };
  const isUrgent = status === 'urgent';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 7px',
        fontSize: '11px',
        fontWeight: c.bold ? 700 : 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        border: c.border,
        backgroundColor: c.bg,
        color: isUrgent ? '#FFFF08' : '#000000',
        borderRadius: '0px',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {c.dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isUrgent ? '#FFFF08' : '#000000'
          }}
        />
      )}
      {c.label}
    </span>
  );
};

// 2. Alert Severity Badge
export const SeverityBadge: React.FC<{ severity: AlertSeverity } & BadgeProps> = ({ severity, style }) => {
  const isCritical = severity === 'critical';
  const isHigh = severity === 'high';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: isCritical || isHigh ? 700 : 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        border: isCritical ? '2px solid #000000' : '1px solid #000000',
        backgroundColor: isCritical ? '#000000' : isHigh ? '#FFFF08' : '#FFFFFF',
        color: isCritical ? '#FFFF08' : '#000000',
        borderRadius: '0px',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {(isCritical || isHigh) && <span>▲</span>}
      {severity.toUpperCase()}
    </span>
  );
};

// 3. Alert Lifecycle Badge
export const AlertLifecycleBadge: React.FC<{ status: AlertLifecycle } & BadgeProps> = ({ status, style }) => {
  const isResolved = status === 'resolved';
  const isOpen = status === 'open';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: isOpen ? 700 : 500,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        border: '1px solid #000000',
        backgroundColor: isOpen ? '#FFFF08' : isResolved ? '#F0F0F0' : '#FFFFFF',
        color: '#000000',
        borderRadius: '0px',
        ...style
      }}
    >
      {status.toUpperCase()}
    </span>
  );
};

// 4. Communication State Badge
export const CommStateBadge: React.FC<{ state: CommunicationState; showDetail?: boolean } & BadgeProps> = ({
  state,
  showDetail = false,
  style
}) => {
  const configs: Record<CommunicationState, { label: string; symbol: string; border: string; bg: string }> = {
    LIVE: { label: 'LIVE LINK', symbol: '●', border: '1px solid #000000', bg: '#FFFF08' },
    DELAYED: { label: 'DELAYED', symbol: '⏳', border: '1px solid #000000', bg: '#FFFFFF' },
    BLACKOUT: { label: 'BLACKOUT', symbol: '✕', border: '2px solid #000000', bg: '#000000' },
    UNKNOWN: { label: 'UNKNOWN', symbol: '?', border: '1px dashed #000000', bg: '#FFFFFF' }
  };

  const c = configs[state] ?? configs.UNKNOWN;
  const isBlackout = state === 'BLACKOUT';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        border: c.border,
        backgroundColor: c.bg,
        color: isBlackout ? '#FFFFFF' : '#000000',
        borderRadius: '0px',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <span style={{ fontSize: '10px', color: isBlackout ? '#FFFF08' : 'inherit' }}>{c.symbol}</span>
      <span>{c.label}</span>
      {showDetail && state === 'DELAYED' && <span style={{ fontSize: '10px', opacity: 0.7 }}>(Store & Fwd)</span>}
    </span>
  );
};

// 5. Data Freshness Badge
export const FreshnessBadge: React.FC<{ freshness: DataFreshness } & BadgeProps> = ({ freshness, style }) => {
  const isStale = freshness === 'stale';
  const isUnavailable = freshness === 'unavailable';
  const isCurrent = freshness === 'current';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: isStale || isUnavailable ? 700 : 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        border: isStale || isUnavailable ? '1px dashed #000000' : '1px solid #000000',
        backgroundColor: isCurrent ? 'rgba(255, 255, 8, 0.25)' : isStale ? '#E5E5E5' : '#FFFFFF',
        color: '#000000',
        borderRadius: '0px',
        ...style
      }}
    >
      {freshness === 'current'
        ? 'FRESH (<1h)'
        : freshness === 'recent'
        ? 'RECENT (1–4h)'
        : freshness === 'stale'
        ? 'STALE (>4h)'
        : freshness === 'unavailable'
        ? 'NO DATA'
        : 'UNCONFIRMED'}
    </span>
  );
};

// 6. Data Quality Badge
export const DataQualityBadge: React.FC<{ quality: DataQuality } & BadgeProps> = ({ quality, style }) => {
  const isInvalid = quality === 'invalid' || quality === 'suspect';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 5px',
        fontSize: '10px',
        fontWeight: isInvalid ? 700 : 400,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        border: isInvalid ? '1px solid #000000' : '1px solid rgba(0,0,0,0.3)',
        backgroundColor: isInvalid ? '#FFFF08' : '#FFFFFF',
        color: '#000000',
        ...style
      }}
    >
      {quality}
    </span>
  );
};

// 7. Message Status Badge
export const MessageStatusBadge: React.FC<{ status: MessageStatus } & BadgeProps> = ({ status, style }) => {
  const iconMap: Record<MessageStatus, string> = {
    draft: '✎ DRAFT',
    queued: '⏳ QUEUED',
    sent: '→ SENT',
    delivered: '✓ DELIVERED',
    read: '✓✓ READ',
    acknowledged: '✓✓✓ ACKNOWLEDGED',
    failed: '✕ FAILED',
    expired: '◷ EXPIRED'
  };

  const isAck = status === 'acknowledged';
  const isFailed = status === 'failed';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: isAck || isFailed ? 700 : 500,
        letterSpacing: '0.04em',
        border: '1px solid #000000',
        backgroundColor: isAck ? '#FFFF08' : isFailed ? '#000000' : '#FFFFFF',
        color: isFailed ? '#FFFFFF' : '#000000',
        ...style
      }}
    >
      {iconMap[status] ?? status.toUpperCase()}
    </span>
  );
};

// 8. Synthetic Tag
export const SyntheticTag: React.FC<{ compact?: boolean } & BadgeProps> = ({ compact = false, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: compact ? '1px 4px' : '2px 6px',
      fontSize: compact ? '9px' : '10px',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      border: '1px solid #000000',
      backgroundColor: '#FFFF08',
      color: '#000000',
      ...style
    }}
  >
    SYNTHETIC
  </span>
);
