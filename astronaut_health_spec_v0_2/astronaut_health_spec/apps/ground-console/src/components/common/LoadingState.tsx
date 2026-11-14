// Ground Health Console — Loading State Component

import React from 'react';

export const LoadingState: React.FC<{ message?: string; height?: number }> = ({
  message = 'Retrieving synchronized mission telemetry...',
  height = 200
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.1)',
        padding: '24px'
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          border: '3px solid rgba(0,0,0,0.1)',
          borderTop: '3px solid #000000',
          borderRight: '3px solid #FFFF08',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
          marginBottom: '12px'
        }}
      />
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.7)'
        }}
      >
        {message}
      </div>
    </div>
  );
};
