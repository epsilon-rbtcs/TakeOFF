// Ground Health Console — Sidebar
// Navigation mirrors the operational task flow: mission status, crew, the
// seven supported health domains, response actions, communications and audit.

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconMission,
  IconCrew,
  IconAssessment,
  IconAlerts,
  IconSync,
  IconMessage,
  IconEnvironment,
  IconHeart,
  IconActivity,
  IconShield,
  IconRadio
} from '../common/Icons';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const groups: NavGroup[] = [
    {
      label: 'Operations',
      items: [
        { to: '/', label: 'Overview', icon: <IconMission size={17} />, exact: true },
        { to: '/crew', label: 'Crew', icon: <IconCrew size={17} /> }
      ]
    },
    {
      label: 'Health domains',
      items: [
        { to: '/domains/cardiovascular', label: 'Cardiovascular', icon: <IconHeart size={17} /> },
        { to: '/domains/behavioural', label: 'Behavioural Health', icon: <IconActivity size={17} /> },
        { to: '/domains/sleep', label: 'Sleep & Cognition', icon: <IconActivity size={17} /> },
        { to: '/domains/musculoskeletal', label: 'Musculoskeletal', icon: <IconShield size={17} /> },
        { to: '/domains/immune', label: 'Immune Health', icon: <IconShield size={17} /> },
        { to: '/domains/radiation', label: 'Radiation', icon: <IconRadio size={17} /> },
        { to: '/domains/environmental', label: 'Environment', icon: <IconEnvironment size={17} /> }
      ]
    },
    {
      label: 'Response',
      items: [
        { to: '/alerts', label: 'Alerts & Actions', icon: <IconAlerts size={17} /> },
        { to: '/communications', label: 'Communications', icon: <IconSync size={17} /> }
      ]
    },
    {
      label: 'Records',
      items: [
        { to: '/assessments', label: 'Assessments', icon: <IconAssessment size={17} /> },
        { to: '/messages', label: 'Messages', icon: <IconMessage size={17} /> },
        { to: '/audit', label: 'Audit', icon: <IconShield size={17} /> }
      ]
    }
  ];

  return (
    <aside
      style={{
        width: collapsed ? '58px' : '236px',
        backgroundColor: '#FFFFFF',
        borderRight: '2px solid #000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.15s ease',
        flexShrink: 0,
        height: 'calc(100vh - 88px)',
        position: 'sticky',
        top: '88px',
        overflowY: 'auto'
      }}
    >
      <div>
        <div
          style={{
            padding: collapsed ? '14px 8px' : '14px 16px',
            borderBottom: '1px solid #000000',
            backgroundColor: '#000000',
            color: '#FFFFFF'
          }}
        >
          {collapsed ? (
            <div style={{ textAlign: 'center', fontWeight: 900, color: '#FFFF08', fontSize: '12px' }}>
              GHC
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: '#FFFF08',
                  textTransform: 'uppercase'
                }}
              >
                Astronaut Health System
              </div>
              <div
                style={{
                  fontSize: '12px',
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

        <nav style={{ padding: '8px 0' }}>
          {groups.map((group) => (
            <div key={group.label} style={{ marginBottom: '6px' }}>
              {!collapsed && (
                <div
                  style={{
                    padding: '8px 16px 4px',
                    fontSize: '8px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.45)'
                  }}
                >
                  {group.label}
                </div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: collapsed ? '9px 0' : '7px 16px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: '#000000',
                    textDecoration: 'none',
                    fontSize: '11px',
                    fontWeight: isActive ? 800 : 500,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    backgroundColor: isActive ? '#FFFF08' : 'transparent',
                    borderLeft: isActive ? '4px solid #000000' : '4px solid transparent',
                    borderBottom: '1px solid rgba(0,0,0,0.04)'
                  })}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div
        style={{
          padding: collapsed ? '10px 6px' : '12px 16px',
          borderTop: '1px solid #000000',
          fontSize: '10px',
          backgroundColor: '#FAFAFA'
        }}
      >
        {!collapsed && (
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Decision support only
            </div>
            <div style={{ color: 'rgba(0,0,0,0.6)', fontSize: '9px', marginTop: '3px', lineHeight: 1.35 }}>
              Flight-surgeon review interface. No autonomous diagnosis and no medical certification.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
