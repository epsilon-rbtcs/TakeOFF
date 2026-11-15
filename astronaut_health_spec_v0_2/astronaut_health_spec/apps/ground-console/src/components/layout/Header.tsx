// Ground Health Console — Header
// Reports the authenticated mission scope, API connectivity, the adapter's
// reported communication state, and the selected crew member. A successful
// request is never rendered as a LIVE link.

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { CommStateBadge, SyntheticTag } from '../common/StatusBadge';
import { GhostButton } from '../common/Buttons';
import { IconRefresh } from '../common/Icons';
import { formatTimestamp, normaliseCommunicationState } from '../../utilities';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

function flightDay(startAt: string | null): number | null {
  if (!startAt) return null;
  const start = new Date(startAt);
  if (isNaN(start.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1);
}

const ROLE_LABEL: Record<string, string> = {
  medical_officer: 'MEDICAL OFFICER',
  administrator: 'ADMINISTRATOR',
  crew_member: 'CREW MEMBER'
};

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const {
    apiStatus,
    health,
    mission,
    missions,
    selectMission,
    astronauts,
    selectedAstronautId,
    selectAstronaut,
    commStatus,
    commSupported,
    lastRefreshedAt,
    refreshAll
  } = useData();
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

  const selectedCrew = astronauts.find((item) => item.astronaut_id === selectedAstronautId) ?? null;
  const day = mission ? flightDay(mission.start_at) : null;
  const reportedState = normaliseCommunicationState(commStatus?.state);
  const apiLabel =
    apiStatus === 'connected'
      ? 'API CONNECTED'
      : apiStatus === 'degraded'
      ? 'API DEGRADED'
      : apiStatus === 'offline'
      ? 'API OFFLINE'
      : 'API CHECKING';

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
      {/* Demonstration / capability banner. It never claims medical certification. */}
      <div
        style={{
          backgroundColor: apiStatus === 'offline' ? '#000000' : '#FFFF08',
          color: apiStatus === 'offline' ? '#FFFF08' : '#000000',
          borderBottom: '1px solid #000000',
          padding: '3px 16px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span>
          {apiStatus === 'offline'
            ? 'GROUND API UNREACHABLE — NO LIVE TELEMETRY IS BEING DISPLAYED'
            : health
            ? `DEMONSTRATION ENVIRONMENT · ${health.service} v${health.version} · SIMULATED COMMUNICATIONS · NOT MEDICALLY CERTIFIED`
            : 'AWAITING GROUND API HEALTH RESPONSE'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
          <span>{apiLabel}</span>
          <span style={{ opacity: 0.7 }}>
            LAST LOAD {lastRefreshedAt ? formatTimestamp(lastRefreshedAt, 'time') : '—'}
          </span>
          <button
            type="button"
            onClick={refreshAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'transparent',
              border: '1px solid currentColor',
              color: 'inherit',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <IconRefresh size={12} /> REFRESH
          </button>
        </span>
      </div>

      <div
        style={{
          minHeight: '54px',
          padding: '6px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: '1px solid #000000',
              padding: '5px 8px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '11px'
            }}
            title="Toggle navigation"
          >
            ☰ MENU
          </button>

          {missions.length > 1 ? (
            <select
              value={mission?.mission_id ?? ''}
              onChange={(event) => selectMission(event.target.value)}
              aria-label="Mission"
              style={{
                fontWeight: 800,
                fontSize: '13px',
                border: '1px solid #000000',
                backgroundColor: '#FFFFFF',
                padding: '4px 6px',
                textTransform: 'uppercase'
              }}
            >
              {missions.map((item) => (
                <option key={item.mission_id} value={item.mission_id}>
                  {item.mission_code} — {item.mission_name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em' }}>
              {mission ? mission.mission_code : 'NO MISSION IN SCOPE'}
            </span>
          )}

          {mission && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: '#000000',
                color: '#FFFF08',
                padding: '2px 6px'
              }}
              title={mission.mission_name}
            >
              {day !== null ? `FLIGHT DAY ${day}` : 'FLIGHT DAY UNKNOWN'}
            </span>
          )}

          {astronauts.length > 1 ? (
            <select
              value={selectedAstronautId ?? ''}
              onChange={(event) => selectAstronaut(event.target.value || null)}
              aria-label="Selected crew member"
              style={{
                fontSize: '12px',
                border: '1px solid #000000',
                backgroundColor: '#FFFFFF',
                padding: '4px 6px'
              }}
            >
              {astronauts.map((item) => (
                <option key={item.astronaut_id} value={item.astronaut_id}>
                  {item.display_name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '12px', fontWeight: 600 }}>
              {selectedCrew?.display_name ?? 'NO CREW IN SCOPE'}
            </span>
          )}

          {selectedCrew?.simulated && <SyntheticTag compact />}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {commSupported ? (
              <>
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em' }}>
                  REPORTED LINK
                </span>
                <CommStateBadge state={reportedState} />
                <span style={{ fontSize: '9px', color: 'rgba(0,0,0,0.6)' }}>
                  {commStatus?.observed_at
                    ? formatTimestamp(commStatus.observed_at, 'time')
                    : 'NO STATE REPORTED'}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)' }}>
                COMMUNICATION STATE NOT IN THIS ROLE&apos;S SCOPE
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              border: '1px solid rgba(0,0,0,0.15)',
              backgroundColor: '#FAFAFA'
            }}
          >
            {utcTime || 'SYNCHRONIZING CLOCK...'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em' }}>
                {user ? ROLE_LABEL[user.role] ?? user.role.toUpperCase() : 'UNAUTHENTICATED'}
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.55)', fontFamily: 'monospace' }}>
                DEMO IDENTITY{user?.astronaut_id ? ' · CREW-SCOPED' : ''}
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
