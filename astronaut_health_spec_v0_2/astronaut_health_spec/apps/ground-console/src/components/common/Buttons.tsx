// Ground Health Console — Button Components
// Adhering strictly to #FFFFFF, #000000, and #FFFF08 color constraints

import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  size = 'md',
  fullWidth = false,
  icon,
  style,
  disabled,
  ...props
}) => {
  const paddingMap = {
    sm: '6px 12px',
    md: '10px 18px',
    lg: '14px 24px'
  };

  const fontSizeMap = {
    sm: '12px',
    md: '13px',
    lg: '15px'
  };

  return (
    <button
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#E5E5E5' : '#FFFF08',
        color: disabled ? '#888888' : '#000000',
        border: '1px solid #000000',
        padding: paddingMap[size],
        fontSize: fontSizeMap[size],
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        borderRadius: '0px',
        boxShadow: disabled ? 'none' : '2px 2px 0px #000000',
        transition: 'transform 0.08s ease, box-shadow 0.08s ease',
        ...style
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translate(1px, 1px)';
          e.currentTarget.style.boxShadow = '1px 1px 0px #000000';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '2px 2px 0px #000000';
        }
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  size = 'md',
  fullWidth = false,
  icon,
  style,
  disabled,
  ...props
}) => {
  const paddingMap = {
    sm: '6px 12px',
    md: '10px 18px',
    lg: '14px 24px'
  };

  const fontSizeMap = {
    sm: '12px',
    md: '13px',
    lg: '15px'
  };

  return (
    <button
      disabled={disabled}
      style={{
        backgroundColor: '#FFFFFF',
        color: disabled ? '#888888' : '#000000',
        border: '1px solid #000000',
        padding: paddingMap[size],
        fontSize: fontSizeMap[size],
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        borderRadius: '0px',
        boxShadow: disabled ? 'none' : '2px 2px 0px rgba(0,0,0,0.2)',
        transition: 'all 0.08s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 8, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};

export const GhostButton: React.FC<ButtonProps> = ({
  children,
  size = 'md',
  fullWidth = false,
  icon,
  style,
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled}
      style={{
        backgroundColor: 'transparent',
        color: disabled ? '#888888' : '#000000',
        border: '1px solid transparent',
        padding: size === 'sm' ? '4px 8px' : '8px 12px',
        fontSize: size === 'sm' ? '12px' : '13px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        width: fullWidth ? '100%' : 'auto',
        borderRadius: '0px',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};
