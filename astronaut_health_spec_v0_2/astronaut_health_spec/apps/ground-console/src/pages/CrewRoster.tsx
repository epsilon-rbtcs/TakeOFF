// Ground Health Console — Crew Roster
// Every row is an enrolled astronaut returned by the Ground API.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useCrewOverview } from '../api/hooks';
import type { CrewOverviewRow } from '../api/hooks';
import { DataTable, Column } from '../components/common/DataTable';
import { AssessmentBadge, FreshnessBadge } from '../components/common/StatusBadge';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { IconRefresh, IconSearch } from '../components/common/Icons';
import { ErrorNotice, PageHeader, Panel } from '../components/common/PageChrome';
import { formatTimestamp, normaliseFreshness, toAssessmentStatus } from '../utilities';

export const CrewRoster: React.FC = () => {
  const navigate = useNavigate();
  const { mission, missionId, missionError, crewError, selectedAstronautId, selectAstronaut } = useData();
  const crew = useCrewOverview();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const rows = crew.data?.rows ?? [];

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const term = search.trim().toLowerCase();
        const matchesSearch =
          term.length === 0 ||
          row.astronaut.display_name.toLowerCase().includes(term) ||
          row.astronaut.astronaut_code.toLowerCase().includes(term);
        const status = row.dashboard?.integrated_status ?? 'insufficient_data';
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [rows, search, statusFilter]
  );

  const columns: Column<CrewOverviewRow>[] = [
    {
      key: 'identity',
      header: 'Identity',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800 }}>{row.astronaut.display_name}</div>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(0,0,0,0.6)' }}>
            {row.astronaut.astronaut_code} · {row.astronaut.astronaut_id.slice(0, 8)}
          </div>
        </div>
      )
    },
    {
      key: 'missions',
      header: 'Mission scope',
      render: (row) => (
        <span style={{ fontSize: '10px', fontFamily: 'monospace' }}>
          {row.astronaut.mission_ids.map((id) => id.slice(0, 8)).join(', ') || '—'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Integrated status',
      render: (row) =>
        row.dashboard ? (
          <AssessmentBadge status={toAssessmentStatus(row.dashboard.integrated_status)} />
        ) : (
          '—'
        )
    },
    {
      key: 'freshness',
      header: 'Freshness',
      render: (row) =>
        row.dashboard ? (
          <FreshnessBadge freshness={normaliseFreshness(row.dashboard.freshness)} />
        ) : (
          '—'
        )
    },
    {
      key: 'measured',
      header: 'Latest measurement',
      render: (row) =>
        row.dashboard?.latest_measured_at ? (
          <TimeDisplay measured_at={row.dashboard.latest_measured_at} format="compact" />
        ) : (
          'No measurement'
        )
    },
    {
      key: 'received',
      header: 'Latest receipt',
      render: (row) =>
        row.dashboard?.latest_received_at ? (
          <TimeDisplay received_at={row.dashboard.latest_received_at} format="compact" />
        ) : (
          'No receipt'
        )
    },
    {
      key: 'alerts',
      header: 'Open / ack',
      align: 'center',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {row.openAlerts.length} / {row.acknowledgedAlerts.length}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Pending actions',
      align: 'center',
      render: (row) => (row.dashboard ? row.dashboard.pending_action_count : '—')
    },
    {
      key: 'error',
      header: 'Payload',
      render: (row) =>
        row.error ? (
          <span
            style={{ fontSize: '10px', fontWeight: 700 }}
            title={`${row.error.code}: ${row.error.message}`}
          >
            ERROR
          </span>
        ) : (
          <span style={{ fontSize: '10px' }}>COMPLETE</span>
        )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageHeader
        eyebrow="Crew"
        title="Crew Roster"
        description={
          mission
            ? `Enrolled crew for ${mission.mission_code}. Freshness and assessment states are read from each crew member's dashboard payload.`
            : 'Crew records in the authenticated mission scope.'
        }
        actions={
          <SecondaryButton size="sm" onClick={crew.refetch} icon={<IconRefresh size={12} />}>
            Reload
          </SecondaryButton>
        }
      />

      {missionError && <ErrorNotice title="Mission scope" message={missionError} />}
      {crewError && <ErrorNotice title="Crew roster" message={crewError} />}
      {crew.error && <ErrorNotice title="Crew roster" message={crew.error.message} details={crew.error.details} />}

      <Panel title="Filter" bodyStyle={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 260px' }}>
            <IconSearch size={14} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or astronaut code"
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #000000', fontSize: '12px' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            Integrated status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '11px' }}
            >
              <option value="all">All</option>
              <option value="normal">Normal</option>
              <option value="monitor">Monitor</option>
              <option value="attention">Attention</option>
              <option value="urgent">Urgent</option>
              <option value="insufficient_data">Insufficient data</option>
            </select>
          </label>
          <span style={{ fontSize: '10px', marginLeft: 'auto' }}>
            {filtered.length} of {rows.length} record(s) shown
            {!missionId ? ' · no mission scope' : ''}
          </span>
        </div>
      </Panel>

      <Panel title="Crew directory" subtitle="Click a row to open the crew workspace">
        {crew.loading ? (
          <LoadingState height={180} message="Loading crew records..." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No crew records"
            description={
              crewError
                ? 'The Ground API did not grant this identity access to the crew roster. See the notice above; no cached or synthetic crew records are substituted.'
                : "The Ground API returned no astronauts for this identity's mission scope."
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField={(row) => row.astronaut.astronaut_id}
            selectedRowKey={selectedAstronautId ?? undefined}
            onRowClick={(row) => {
              selectAstronaut(row.astronaut.astronaut_id);
              navigate(`/crew/${row.astronaut.astronaut_id}`);
            }}
            emptyMessage="No crew member matches the current filters."
          />
        )}
      </Panel>

      <div style={{ display: 'flex', gap: '8px' }}>
        <PrimaryButton
          size="sm"
          disabled={!selectedAstronautId}
          onClick={() => selectedAstronautId && navigate(`/crew/${selectedAstronautId}`)}
        >
          Open selected crew workspace
        </PrimaryButton>
        <SecondaryButton size="sm" onClick={() => navigate('/alerts')}>
          Review alerts & actions
        </SecondaryButton>
      </div>
    </div>
  );
};

export default CrewRoster;
