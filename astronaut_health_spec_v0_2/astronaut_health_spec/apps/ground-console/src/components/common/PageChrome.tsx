// Ground Health Console — shared page chrome
// Swiss editorial panels, page headers and explicit error / warning notices.

import React from 'react';

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, actions }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px',
      borderBottom: '2px solid #000000',
      paddingBottom: '12px',
      marginBottom: '18px'
    }}
  >
    <div>
      {eyebrow && (
        <div
          style={{
            display: 'inline-block',
            backgroundColor: '#FFFF08',
            border: '1px solid #000000',
            padding: '1px 6px',
            fontSize: '9px',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}
        >
          {eyebrow}
        </div>
      )}
      <h1
        style={{
          fontSize: '20px',
          fontWeight: 900,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          margin: 0
        }}
      >
        {title}
      </h1>
      {description && (
        <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.65)', margin: '4px 0 0 0', maxWidth: '860px' }}>
          {description}
        </p>
      )}
    </div>
    {actions && <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>{actions}</div>}
  </div>
);

export const Panel: React.FC<{
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}> = ({ title, subtitle, actions, children, style, bodyStyle }) => (
  <section style={{ border: '1px solid #000000', backgroundColor: '#FFFFFF', ...style }}>
    {title && (
      <div
        style={{
          borderBottom: '1px solid #000000',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#FAFAFA'
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.55)', marginTop: '1px' }}>
              {subtitle}
            </div>
          )}
        </div>
        {actions}
      </div>
    )}
    <div style={{ padding: '12px', ...bodyStyle }}>{children}</div>
  </section>
);

export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  emphasis?: boolean;
}> = ({ label, value, detail, emphasis = false }) => (
  <div
    style={{
      border: '1px solid #000000',
      backgroundColor: emphasis ? '#FFFF08' : '#FFFFFF',
      padding: '10px 12px',
      minWidth: 0
    }}
  >
    <div
      style={{
        fontSize: '8px',
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(0,0,0,0.6)',
        marginBottom: '4px'
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.15, wordBreak: 'break-word' }}>
      {value}
    </div>
    {detail && (
      <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)', marginTop: '4px' }}>{detail}</div>
    )}
  </div>
);

export const ErrorNotice: React.FC<{
  title?: string;
  message: string;
  details?: Record<string, unknown>;
  action?: React.ReactNode;
}> = ({ title = 'Request failed', message, details, action }) => (
  <div
    style={{
      border: '2px solid #000000',
      backgroundColor: '#000000',
      color: '#FFFF08',
      padding: '10px 12px',
      fontSize: '11px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      alignItems: 'flex-start'
    }}
  >
    <div>
      <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </div>
      <div style={{ marginTop: '2px', color: '#FFFFFF' }}>{message}</div>
      {details && Object.keys(details).length > 0 && (
        <pre
          style={{
            margin: '6px 0 0 0',
            fontSize: '9px',
            color: '#FFFF08',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace'
          }}
        >
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
    {action}
  </div>
);

export const WarningNotice: React.FC<{ message: string; title?: string }> = ({
  message,
  title = 'Partial data'
}) => (
  <div
    style={{
      border: '1px dashed #000000',
      backgroundColor: 'rgba(255,255,8,0.12)',
      padding: '7px 10px',
      fontSize: '10px'
    }}
  >
    <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {title}:
    </span>{' '}
    {message}
  </div>
);

export const KeyValue: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}> = ({ label, value, mono = false }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(120px, 38%) 1fr',
      gap: '8px',
      padding: '5px 0',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      fontSize: '11px'
    }}
  >
    <span style={{ color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em' }}>
      {label}
    </span>
    <span style={{ fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>
      {value}
    </span>
  </div>
);

export const SectionGrid: React.FC<{
  columns?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ columns = 2, children, style }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 3 ? '240px' : '320px'}, 1fr))`,
      gap: '12px',
      ...style
    }}
  >
    {children}
  </div>
);
