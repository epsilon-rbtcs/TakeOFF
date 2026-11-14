// Ground Health Console — Environmental & Radiation Monitoring Workspace
// Strict separation between personal astronaut dosimeters and habitat environmental radiation

import React, { useState } from 'react';
import { useEnvironmentAndRadiation } from '../api/hooks';
import { TrendChart } from '../components/common/TrendChart';
import { DataTable, Column } from '../components/common/DataTable';
import { SyntheticTag } from '../components/common/StatusBadge';
import { TimeDisplay } from '../components/common/TimeDisplay';
import { EnvironmentalReading, RadiationReading } from '../types';
import { formatTimestamp, formatValue, getMeasurementLabel } from '../utilities';

type SubView = 'environmental' | 'personal_rad' | 'environmental_rad';

export const EnvironmentalRadiation: React.FC = () => {
  const [subView, setSubView] = useState<SubView>('environmental');
  const { environmental, radiation } = useEnvironmentAndRadiation();

  // Filter personal vs environmental radiation
  const personalRad = radiation.filter((r) => r.sensor_type === 'personal_dosimeter');
  const environmentalRad = radiation.filter((r) => r.sensor_type === 'habitat_area_monitor');

  // Environmental Table Columns
  const envColumns: Column<EnvironmentalReading>[] = [
    {
      key: 'code',
      header: 'Atmospheric Parameter',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800 }}>{getMeasurementLabel(row.measurement_code)}</div>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
            Sensor: {row.sensor_id}
          </div>
        </div>
      )
    },
    {
      key: 'value',
      header: 'Value & Unit',
      render: (row) => (
        <span style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'monospace' }}>
          {formatValue(row.value, row.unit)}
        </span>
      )
    },
    {
      key: 'location',
      header: 'Habitat Compartment',
      render: (row) => <span>{row.location || 'Central Core'}</span>
    },
    {
      key: 'timestamps',
      header: 'Provenance (Device / Received)',
      render: (row) => (
        <TimeDisplay
          measured_at={row.measured_at}
          received_at={row.received_at}
          format="compact"
        />
      )
    }
  ];

  // Radiation Table Columns
  const radColumns: Column<RadiationReading>[] = [
    {
      key: 'sensor',
      header: 'Monitor & Source Device',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800 }}>{row.source_device}</div>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
            Type: {row.sensor_type.replace(/_/g, ' ').toUpperCase()}
          </div>
        </div>
      )
    },
    {
      key: 'rate',
      header: 'Dose-Equivalent Rate',
      render: (row) => (
        <span style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'monospace' }}>
          {formatValue(row.value, row.unit)}
        </span>
      )
    },
    {
      key: 'cumulative',
      header: 'Cumulative Mission Exposure',
      render: (row) => (
        <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
          {row.cumulative_dose !== undefined
            ? formatValue(row.cumulative_dose, row.cumulative_unit || 'mSv')
            : '—'}
        </span>
      )
    },
    {
      key: 'timestamps',
      header: 'Measurement Timestamp',
      render: (row) => (
        <TimeDisplay
          measured_at={row.measured_at}
          received_at={row.received_at}
          format="compact"
        />
      )
    }
  ];

  return (
    <div>
      {/* Title Bar */}
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
            HABITAT TELEMETRY WORKSPACE
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
          Environmental & Radiation Monitoring
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0' }}>
          Real-time biosphere atmospheric telemetry and personal vs environmental dosimeter radiation tracking.
        </p>
      </div>

      {/* View Selector Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid #000000',
          paddingBottom: '12px'
        }}
      >
        {[
          { key: 'environmental', label: '1. Cabin Atmosphere & ECLSS' },
          { key: 'personal_rad', label: '2. Personal Astronaut Dosimetry' },
          { key: 'environmental_rad', label: '3. Habitat Environmental Radiation' }
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setSubView(v.key as SubView)}
            style={{
              padding: '8px 14px',
              border: '1px solid #000000',
              backgroundColor: subView === v.key ? '#FFFF08' : '#FFFFFF',
              color: '#000000',
              fontWeight: subView === v.key ? 800 : 500,
              fontSize: '12px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: CABIN ATMOSPHERE & ECLSS */}
      {subView === 'environmental' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <TrendChart
              title="Cabin Carbon Dioxide (CO₂)"
              unit="ppm"
              data={environmental
                .filter((e) => e.measurement_code === 'cabin_co2')
                .map((e) => ({ timestamp: e.measured_at, value: e.value }))}
              baselineValue={3800}
              baselineLabel="Flight Limit (3,800 ppm)"
            />

            <TrendChart
              title="Cabin Temperature"
              unit="°C"
              data={environmental
                .filter((e) => e.measurement_code === 'cabin_temperature')
                .map((e) => ({ timestamp: e.measured_at, value: e.value }))}
              baselineValue={22.0}
              baselineLabel="Target (22.0°C)"
            />

            <TrendChart
              title="Relative Humidity"
              unit="%"
              data={environmental
                .filter((e) => e.measurement_code === 'relative_humidity')
                .map((e) => ({ timestamp: e.measured_at, value: e.value }))}
              baselineValue={45}
              baselineLabel="Target (45%)"
            />

            <TrendChart
              title="Cabin Atmospheric Pressure"
              unit="kPa"
              data={environmental
                .filter((e) => e.measurement_code === 'cabin_pressure')
                .map((e) => ({ timestamp: e.measured_at, value: e.value }))}
              baselineValue={101.3}
              baselineLabel="Sea Level (101.3 kPa)"
            />
          </div>

          <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Environmental Sensor Stream History
          </h3>
          <DataTable
            columns={envColumns}
            data={environmental}
            keyField="reading_id"
          />
        </div>
      )}

      {/* VIEW 2: PERSONAL ASTRONAUT DOSIMETRY */}
      {subView === 'personal_rad' && (
        <div>
          <div
            style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #000000',
              padding: '12px 16px',
              fontSize: '11px',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}
          >
            <strong>SCIENTIFIC REGULATORY DISTINCTION:</strong> Personal dosimeters measure the individual cumulative dose equivalent (in Sieverts / mSv) absorbed by specific flight crew members during mission tasks. They must be evaluated separately from environmental area monitors.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <TrendChart
              title="Cmdr. Elena Vasquez — Personal Dose Rate"
              unit="µSv/h"
              data={personalRad
                .filter((r) => r.astronaut_id === '11111111-1111-1111-1111-111111111111')
                .map((r) => ({ timestamp: r.measured_at, value: r.value }))}
              baselineValue={25.0}
              baselineLabel="Nominal Background"
            />

            <div style={{ border: '2px solid #000000', padding: '20px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>
                Personal Dose Ledger Summary
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '6px' }}>
                Cmdr. Elena Vasquez: 19.1 mSv
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '4px' }}>
                Dr. James Chen: 18.7 mSv
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '8px' }}>
                Cumulative flight duration: 142 Days · 30-Day Rate: 5.8 mSv/month
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Personal Dosimeter Telemetry Log
          </h3>
          <DataTable
            columns={radColumns}
            data={personalRad}
            keyField="reading_id"
          />
        </div>
      )}

      {/* VIEW 3: HABITAT ENVIRONMENTAL RADIATION */}
      {subView === 'environmental_rad' && (
        <div>
          <div
            style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #000000',
              padding: '12px 16px',
              fontSize: '11px',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}
          >
            <strong>HABITAT SENSORS:</strong> Fixed Area Passive & Active Radiation Monitors installed in distinct vehicle shielding zones (e.g. storm shelter vs unshielded equipment bay).
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                Storm Shelter Area Monitor
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', marginTop: '4px' }}>
                22.4 µSv/h
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '4px' }}>
                High-density polyethylene & water wall shielding effective.
              </div>
            </div>

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                Unshielded Service Bay Area Monitor
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', marginTop: '4px' }}>
                39.1 µSv/h
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginTop: '4px' }}>
                External hull boundary sensor. Crew access restricted during SPE warnings.
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Habitat Radiation Sensor History
          </h3>
          <DataTable
            columns={radColumns}
            data={environmentalRad}
            keyField="reading_id"
          />
        </div>
      )}
    </div>
  );
};
export default EnvironmentalRadiation;
