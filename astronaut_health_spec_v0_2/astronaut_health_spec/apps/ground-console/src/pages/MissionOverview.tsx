// Ground Health Console — Mission Overview Landing Page
// Authoritative operational dashboard summarizing crew state, attention items, and recent telemetry activity

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../api/hooks';
import { DataTable, Column } from '../components/common/DataTable';
import {
  CommStateBadge,
  FreshnessBadge,
  SeverityBadge,
  SyntheticTag
} from '../components/common/StatusBadge';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { LoadingState } from '../components/common/LoadingState';
import { IconRefresh, IconCrew, IconAlerts, IconActivity } from '../components/common/Icons';
import { AstronautSummary, AttentionItem, ActivityItem } from '../types';
import { formatTimestamp } from '../utilities';

export const MissionOverview: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useDashboard();

  if (loading && !data) {
    return <LoadingState message="Retrieving synchronized mission telemetry..." height={320} />;
  }

  const mission = data?.mission;
  const crew = data?.crew || [];
  const attentionItems = data?.attention_items || [];
  const recentActivity = data?.recent_activity || [];

  const crewColumns: Column<AstronautSummary>[] = [
    {
      key: 'name',
      header: 'Astronaut Identity',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800, fontSize: '13px' }}>{row.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)' }}>
            "{row.callsign}" · {row.role_in_crew}
          </div>
        </div>
      )
    },
    {
      key: 'last_health_update',
      header: 'Last Received Update',
      render: (row) => (
        <TimeDisplay
          measured_at={row.latest_measurement_at}
          received_at={row.last_health_update}
          format="compact"
        />
      )
    },
    {
      key: 'pending_assessments',
      header: 'Pending Assessments',
      align: 'center',
      render: (row) => (
        <span
          style={{
            fontWeight: row.pending_assessments > 0 ? 800 : 500,
            padding: '2px 8px',
            backgroundColor: row.pending_assessments > 0 ? 'rgba(255, 255, 8, 0.4)' : '#F5F5F5',
            border: '1px solid #000000',
            fontSize: '11px'
          }}
        >
          {row.pending_assessments}
        </span>
      )
    },
    {
      key: 'open_actions',
      header: 'Open Actions',
      align: 'center',
      render: (row) => (
        <span
          style={{
            fontWeight: row.open_actions > 0 ? 800 : 500,
            padding: '2px 8px',
            backgroundColor: row.open_actions > 0 ? '#FFFF08' : '#F5F5F5',
            border: '1px solid #000000',
            fontSize: '11px'
          }}
        >
          {row.open_actions}
        </span>
      )
    },
    {
      key: 'data_freshness',
      header: 'Data Freshness',
      render: (row) => <FreshnessBadge freshness={row.data_freshness} />
    },
    {
      key: 'communication_status',
      header: 'Comm State',
      render: (row) => <CommStateBadge state={row.communication_status} />
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) => (
        <SecondaryButton
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/crew/${row.astronaut_id}`);
          }}
        >
          INSPECT WORKSPACE →
        </SecondaryButton>
      )
    }
  ];

  return (
    <div>
      {/* Page Title & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #000000',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                padding: '2px 6px',
                textTransform: 'uppercase'
              }}
            >
              MISSION WORKSPACE
            </span>
            <SyntheticTag compact />
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              margin: 0
            }}
          >
            {mission?.name || 'Mission Operations'}
          </h1>
          <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '4px' }}>
            Target: <strong style={{ color: '#000000' }}>{mission?.target_body}</strong> · Flight Day{' '}
            <strong style={{ color: '#000000' }}>{mission?.flight_day}</strong> · Status:{' '}
            <strong style={{ color: '#000000' }}>{mission?.status}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <SecondaryButton size="sm" icon={<IconRefresh size={14} />} onClick={refetch}>
            REFRESH TELEMETRY
          </SecondaryButton>
        </div>
      </div>

      {/* Grid: Attention Items & System Health Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          marginBottom: '28px'
        }}
      >
        {/* 1. Items Requiring Attention */}
        <div
          style={{
            border: '2px solid #000000',
            backgroundColor: '#FFFFFF',
            padding: '16px 20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #000000',
              paddingBottom: '8px',
              marginBottom: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#000000'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Items Requiring Attention ({attentionItems.length})
              </span>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Action Centre →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {attentionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => item.action_route && navigate(item.action_route)}
                style={{
                  border: '1px solid rgba(0,0,0,0.2)',
                  padding: '10px 14px',
                  backgroundColor: item.severity === 'high' ? 'rgba(255, 255, 8, 0.2)' : '#FFFFFF',
                  cursor: item.action_route ? 'pointer' : 'default',
                  transition: 'background-color 0.1s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 8, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    item.severity === 'high' ? 'rgba(255, 255, 8, 0.2)' : '#FFFFFF';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SeverityBadge severity={item.severity} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.title}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', fontFamily: 'monospace' }}>
                    {formatTimestamp(item.created_at, 'relative')}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', lineHeight: 1.4 }}>
                  {item.description}
                </div>
                {item.astronaut_name && (
                  <div style={{ fontSize: '10px', fontWeight: 600, marginTop: '4px', color: '#000000' }}>
                    Target Crew: {item.astronaut_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Mission Operations Summary */}
        <div
          style={{
            border: '2px solid #000000',
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #000000',
                paddingBottom: '8px',
                marginBottom: '14px'
              }}
            >
              Telemetry Synchronization
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Active Flight Link State
                </div>
                <div style={{ marginTop: '2px' }}>
                  <CommStateBadge state={mission?.communication_state || 'LIVE'} showDetail />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Last Server Contact Confirmation
                </div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>
                  {formatTimestamp(mission?.last_sync, 'full')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Assigned Flight Personnel
                </div>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>
                  {crew.length} Astronauts Monitored
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid rgba(0,0,0,0.1)',
              padding: '10px',
              fontSize: '11px',
              color: 'rgba(0,0,0,0.7)',
              marginTop: '16px'
            }}
          >
            <strong>Note:</strong> Ground system never assumes real-time reception. Telemetry timestamps represent device measurement time and store-and-forward receipt.
          </div>
        </div>
      </div>

      {/* Crew Overview Section */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '12px'
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                margin: 0
              }}
            >
              Assigned Crew Directory & Synchronization Health
            </h2>
            <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
              Real-time physiological telemetry breakdown per assigned astronaut.
            </div>
          </div>
          <button
            onClick={() => navigate('/crew')}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Full Roster View →
          </button>
        </div>

        <DataTable
          columns={crewColumns}
          data={crew}
          keyField="astronaut_id"
          onRowClick={(row) => navigate(`/crew/${row.astronaut_id}`)}
        />
      </div>

      {/* Recent Activity Feed */}
      <div>
        <div style={{ marginBottom: '12px' }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              margin: 0
            }}
          >
            Operational Activity & Downlink Events
          </h2>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '2px' }}>
            Chronological log of synchronized biometrics, algorithm evaluations, and medical acknowledgements.
          </div>
        </div>

        <div
          style={{
            border: '1px solid #000000',
            backgroundColor: '#FFFFFF'
          }}
        >
          {recentActivity.map((activity, idx) => (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: idx !== recentActivity.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    border: '1px solid #000000',
                    backgroundColor:
                      activity.type === 'alert'
                        ? '#FFFF08'
                        : activity.type === 'assessment'
                        ? 'rgba(0,0,0,0.06)'
                        : '#FFFFFF',
                    width: '90px',
                    textAlign: 'center'
                  }}
                >
                  {activity.type}
                </span>
                <span style={{ fontWeight: 500 }}>{activity.description}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {formatTimestamp(activity.timestamp, 'relative')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default MissionOverview;
