// Ground Health Console — Header Component
// Mission-critical status bar, UTC synchronized clock, and Synthetic Data Banner

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { CommStateBadge, SyntheticTag } from '../common/StatusBadge';
import { GhostButton, PrimaryButton } from '../common/Buttons';
import { mockMissionSummary } from '../../mock-data';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { mode, toggleMode, isMock, apiStatus } = useData();
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const dateStr = now.toLocaleDateString('en-GB', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      setUtcTime(`${dateStr} · ${timeStr} UTC`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '2px solid #000000',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      {/* 1. Persistent Synthetic Demo Warning Bar */}
      {isMock && (
        <div
          style={{
            backgroundColor: '#FFFF08',
            color: '#000000',
            borderBottom: '1px solid #000000',
            padding: '4px 16px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>⚠</span>
            <span>
              SYNTHETIC DEMO DATA ACTIVE — Non-diagnostic flight telemetry simulation for medical console demonstration.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8 }}>
              FastAPI: {apiStatus.toUpperCase()}
            </span>
            <button
              onClick={toggleMode}
              style={{
                backgroundColor: '#000000',
                color: '#FFFF08',
                border: 'none',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.05em'
              }}
            >
              SWITCH TO LIVE API
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Top Navigation Bar */}
      <div
        style={{
          height: '52px',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* Left: Mission context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: '1px solid #000000',
              padding: '6px 8px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Toggle Navigation Menu"
          >
            ☰ MENU
          </button>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.05em' }}>
              {mockMissionSummary.code}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: '#000000',
                color: '#FFFF08',
                padding: '2px 6px'
              }}
            >
              FLIGHT DAY {mockMissionSummary.flight_day}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', display: 'none' }}>
              {mockMissionSummary.target_body}
            </span>
          </div>

          <div style={{ marginLeft: '6px' }}>
            <CommStateBadge state={mockMissionSummary.communication_state} />
          </div>
        </div>

        {/* Center: Synchronized Mission Clock */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '4px 10px',
            border: '1px solid rgba(0,0,0,0.15)',
            backgroundColor: '#FAFAFA'
          }}
        >
          {utcTime || 'SYNCHRONIZING CLOCK...'}
        </div>

        {/* Right: Data Mode Toggle & User session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Mode Pill Toggle */}
          <div
            style={{
              display: 'flex',
              border: '1px solid #000000',
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            <button
              onClick={() => toggleMode()}
              style={{
                backgroundColor: isMock ? '#FFFF08' : '#FFFFFF',
                color: '#000000',
                border: 'none',
                borderRight: '1px solid #000000',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              MOCK
            </button>
            <button
              onClick={() => toggleMode()}
              style={{
                backgroundColor: !isMock ? '#000000' : '#FFFFFF',
                color: !isMock ? '#FFFF08' : '#000000',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              LIVE API
            </button>
          </div>

          {/* User profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2 }}>
                {user?.role === 'medical_officer'
                  ? 'FLIGHT SURGEON'
                  : user?.role === 'administrator'
                  ? 'SYS ADMIN'
                  : 'CREW OBSERVER'}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
                DEMO AUTH
              </div>
            </div>

            <GhostButton size="sm" onClick={logout} style={{ border: '1px solid rgba(0,0,0,0.3)' }}>
              LOGOUT
            </GhostButton>
          </div>
        </div>
      </div>
    </header>
  );
};
