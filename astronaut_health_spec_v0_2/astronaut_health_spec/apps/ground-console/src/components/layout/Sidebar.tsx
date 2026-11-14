// Ground Health Console — Sidebar Navigation
// Precision Swiss editorial navigation with high-contrast active states

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconMission,
  IconCrew,
  IconAssessment,
  IconAlerts,
  IconSync,
  IconMessage,
  IconEnvironment
} from '../common/Icons';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navItems = [
    { to: '/', label: 'Mission Overview', icon: <IconMission size={18} />, exact: true },
    { to: '/crew', label: 'Crew Roster', icon: <IconCrew size={18} /> },
    { to: '/assessments', label: 'Health Assessments', icon: <IconAssessment size={18} /> },
    { to: '/alerts', label: 'Alerts & Action Centre', icon: <IconAlerts size={18} /> },
    { to: '/sync', label: 'Communication & Sync', icon: <IconSync size={18} /> },
    { to: '/messages', label: 'Messages & Updates', icon: <IconMessage size={18} /> },
    { to: '/environment', label: 'Environment & Radiation', icon: <IconEnvironment size={18} /> }
  ];

  return (
    <aside
      style={{
        width: collapsed ? '60px' : '250px',
        backgroundColor: '#FFFFFF',
        borderRight: '2px solid #000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.15s ease',
        flexShrink: 0,
        height: 'calc(100vh - 54px)', // Adjust for sticky header
        position: 'sticky',
        top: '54px',
        overflowY: 'auto'
      }}
    >
      {/* Navigation Links */}
      <div>
        {/* Brand Title */}
        <div
          style={{
            padding: collapsed ? '16px 8px' : '16px 18px',
            borderBottom: '1px solid #000000',
            backgroundColor: '#000000',
            color: '#FFFFFF'
          }}
        >
          {collapsed ? (
            <div style={{ textAlign: 'center', fontWeight: 900, color: '#FFFF08' }}>GHC</div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#FFFF08',
                  textTransform: 'uppercase'
                }}
              >
                ASTRONAUT HEALTH SYSTEM
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: '2px'
                }}
              >
                Ground Health Console
              </div>
            </div>
          )}
        </div>

        {/* Links list */}
        <nav style={{ padding: '10px 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px 0' : '11px 18px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: '#000000',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: isActive ? 800 : 500,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                backgroundColor: isActive ? '#FFFF08' : 'transparent',
                borderLeft: isActive ? '5px solid #000000' : '5px solid transparent',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                transition: 'background-color 0.08s ease'
              })}
              title={collapsed ? item.label : undefined}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer System Status */}
      <div
        style={{
          padding: collapsed ? '12px 6px' : '14px 18px',
          borderTop: '1px solid #000000',
          fontSize: '11px',
          backgroundColor: '#FAFAFA'
        }}
      >
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              DECISION-SUPPORT
            </div>
            <div style={{ color: 'rgba(0,0,0,0.6)', fontSize: '10px', marginTop: '3px', lineHeight: 1.3 }}>
              Authorized flight surgeon review interface. Not an autonomous diagnostic engine.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
