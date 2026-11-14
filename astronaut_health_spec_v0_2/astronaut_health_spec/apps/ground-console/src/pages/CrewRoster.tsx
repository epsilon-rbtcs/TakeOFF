// Ground Health Console — Crew Roster Page
// Astronaut directory with domain coverage, search filtering, and workspace access

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrewRoster } from '../api/hooks';
import { DataTable, Column } from '../components/common/DataTable';
import { CommStateBadge, FreshnessBadge, SyntheticTag } from '../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { IconSearch, IconCrew } from '../components/common/Icons';
import { AstronautSummary } from '../types';
import { formatTimestamp } from '../utilities';

export const CrewRoster: React.FC = () => {
  const navigate = useNavigate();
  const { summary } = useCrewRoster();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCrew = summary.filter((astronaut) => {
    const matchesSearch =
      astronaut.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      astronaut.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
      astronaut.role_in_crew.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && astronaut.communication_status === 'LIVE') ||
      (statusFilter === 'pending' && astronaut.pending_assessments > 0);

    return matchesSearch && matchesStatus;
  });

  const columns: Column<AstronautSummary>[] = [
    {
      key: 'identity',
      header: 'Astronaut Profile',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800, fontSize: '13px' }}>{row.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)' }}>
            Callsign: <strong style={{ color: '#000000' }}>{row.callsign}</strong> · {row.role_in_crew}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.4)', fontFamily: 'monospace' }}>
            ID: {row.astronaut_id}
          </div>
        </div>
      )
    },
    {
      key: 'domains',
      header: 'Monitored Domains',
      render: () => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {['CV', 'SLP', 'COG', 'MSK', 'RAD', 'ENV'].map((d) => (
            <span
              key={d}
              style={{
                fontSize: '9px',
                fontWeight: 700,
                border: '1px solid rgba(0,0,0,0.2)',
                padding: '1px 4px',
                backgroundColor: '#F9F9F9'
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'last_update',
      header: 'Last Downlink',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '12px' }}>
            {formatTimestamp(row.last_health_update, 'time')}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)' }}>
            {formatTimestamp(row.last_health_update, 'date')}
          </div>
        </div>
      )
    },
    {
      key: 'assessments',
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
      key: 'actions',
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
      key: 'freshness',
      header: 'Freshness',
      render: (row) => <FreshnessBadge freshness={row.data_freshness} />
    },
    {
      key: 'comm',
      header: 'Comm Link',
      render: (row) => <CommStateBadge state={row.communication_status} />
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) => (
        <PrimaryButton
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/crew/${row.astronaut_id}`);
          }}
        >
          OPEN PROFILE →
        </PrimaryButton>
      )
    }
  ];

  return (
    <div>
      {/* Title & Filter Bar */}
      <div
        style={{
          borderBottom: '2px solid #000000',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}
      >
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
            FLIGHT PERSONNEL DIRECTORY
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
          Crew Health Roster
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0' }}>
          Select an astronaut to inspect synchronized physiological time series, domain assessments, and medical follow-up protocols.
        </p>
      </div>

      {/* Search and Filters Controls */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            placeholder="Search by name, callsign, or crew role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              border: '1px solid #000000',
              fontSize: '12px'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(0,0,0,0.5)'
            }}
          >
            <IconSearch size={14} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Filter:</span>
          {['all', 'active', 'pending'].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              style={{
                padding: '6px 10px',
                border: '1px solid #000000',
                backgroundColor: statusFilter === filterKey ? '#FFFF08' : '#FFFFFF',
                color: '#000000',
                fontWeight: statusFilter === filterKey ? 700 : 500,
                fontSize: '11px',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              {filterKey === 'all' ? 'All Crew' : filterKey === 'active' ? 'Live Telemetry' : 'Action Required'}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table */}
      <DataTable
        columns={columns}
        data={filteredCrew}
        keyField="astronaut_id"
        onRowClick={(row) => navigate(`/crew/${row.astronaut_id}`)}
      />
    </div>
  );
};
export default CrewRoster;
