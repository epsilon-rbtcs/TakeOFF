// Ground Health Console — Empty State Component
// Minimalist clinical presentation for unpopulated datasets or filtered queries

import React from 'react';
import { PrimaryButton } from './Buttons';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = '∅',
  actionLabel,
  onAction,
  style
}) => {
  return (
    <div
      style={{
        border: '1px dashed rgba(0,0,0,0.3)',
        backgroundColor: '#FFFFFF',
        padding: '36px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '8px', color: '#000000' }}>{icon}</div>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '6px'
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'rgba(0,0,0,0.6)',
          maxWidth: '460px',
          lineHeight: '1.4',
          marginBottom: actionLabel ? '16px' : '0'
        }}
      >
        {description}
      </div>
      {actionLabel && onAction && (
        <PrimaryButton size="sm" onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      )}
    </div>
  );
};
