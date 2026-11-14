// Ground Health Console — Action Modal Dialog
// High-contrast, sharp borders, Swiss minimalist layout

import React, { useEffect } from 'react';
import { IconClose } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '520px'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #000000',
          boxShadow: '6px 6px 0px #000000',
          width,
          maxWidth: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          animation: 'fadeIn 0.12s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '2px solid #000000',
            backgroundColor: '#FFFF08',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#000000'
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', marginTop: '2px' }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #000000',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF'
            }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: 1.5
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #000000',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
