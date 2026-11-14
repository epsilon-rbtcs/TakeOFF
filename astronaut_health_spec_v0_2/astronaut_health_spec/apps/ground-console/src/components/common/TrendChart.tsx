// Ground Health Console — Precision Clinical Time-Series Chart
// Strict Visual Identity: White background, black axes/lines, electric yellow (#FFFF08) hover & highlights

import React, { useState } from 'react';
import { formatTimestamp, formatValue } from '../../utilities';

interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
  isAnomaly?: boolean;
}

interface TrendChartProps {
  title: string;
  unit: string;
  data: DataPoint[];
  baselineValue?: number;
  baselineMin?: number;
  baselineMax?: number;
  baselineLabel?: string;
  height?: number;
  minVal?: number;
  maxVal?: number;
  style?: React.CSSProperties;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  unit,
  data,
  baselineValue,
  baselineMin,
  baselineMax,
  baselineLabel = 'Personal Baseline',
  height = 180,
  minVal: propMin,
  maxVal: propMax,
  style
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          border: '1px solid rgba(0,0,0,0.15)',
          backgroundColor: '#FFFFFF',
          padding: '16px',
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'rgba(0,0,0,0.5)',
          ...style
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ fontSize: '11px', marginTop: '4px' }}>Insufficient observation samples for trend plotting</span>
      </div>
    );
  }

  // Calculate min/max boundaries
  const values = data.map((d) => d.value);
  if (baselineValue !== undefined) values.push(baselineValue);
  if (baselineMin !== undefined) values.push(baselineMin);
  if (baselineMax !== undefined) values.push(baselineMax);

  const rawMin = propMin !== undefined ? propMin : Math.min(...values);
  const rawMax = propMax !== undefined ? propMax : Math.max(...values);
  const padding = (rawMax - rawMin) * 0.15 || 5;

  const yMin = Math.floor(rawMin - padding);
  const yMax = Math.ceil(rawMax + padding);
  const yRange = yMax - yMin || 1;

  // Chart dimensions
  const svgWidth = 560;
  const svgHeight = height - 50; // Leave room for title and labels
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Coordinate projections
  const getX = (index: number) => {
    if (data.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (data.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    return padTop + chartH - ((val - yMin) / yRange) * chartH;
  };

  // Generate SVG path string
  const pathD = data.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.value);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const latestPoint = data[data.length - 1];

  return (
    <div
      style={{
        border: '1px solid #000000',
        backgroundColor: '#FFFFFF',
        padding: '12px 14px',
        position: 'relative',
        ...style
      }}
    >
      {/* Chart Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          paddingBottom: '8px',
          marginBottom: '8px'
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {title}
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.6)', marginLeft: '8px' }}>
            ({unit})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase' }}>Latest:</span>
          <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace' }}>
            {formatValue(latestPoint.value, unit)}
          </span>
          {baselineValue !== undefined && (
            <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', marginLeft: '6px' }}>
              Base: {baselineValue}
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: `${svgHeight}px`, display: 'block' }}
        >
          {/* Horizontal Grid lines & Y Axis labels */}
          {[0, 0.5, 1].map((pct, i) => {
            const val = yMin + pct * yRange;
            const y = getY(val);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="rgba(0,0,0,0.08)"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="monospace"
                  fill="rgba(0,0,0,0.6)"
                >
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Baseline Range Band if min/max defined */}
          {baselineMin !== undefined && baselineMax !== undefined && (
            <rect
              x={padLeft}
              y={getY(baselineMax)}
              width={chartW}
              height={Math.max(2, getY(baselineMin) - getY(baselineMax))}
              fill="rgba(255, 255, 8, 0.15)"
              stroke="none"
            />
          )}

          {/* Baseline Reference Line if single value defined */}
          {baselineValue !== undefined && (
            <g>
              <line
                x1={padLeft}
                y1={getY(baselineValue)}
                x2={svgWidth - padRight}
                y2={getY(baselineValue)}
                stroke="#000000"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text
                x={svgWidth - padRight - 4}
                y={getY(baselineValue) - 4}
                textAnchor="end"
                fontSize="8"
                fontWeight="bold"
                fill="#000000"
              >
                {baselineLabel}: {baselineValue}
              </text>
            </g>
          )}

          {/* Main Data Line */}
          <path d={pathD} fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {data.map((pt, i) => {
            const cx = getX(i);
            const cy = getY(pt.value);
            const isHovered = hoveredIndex === i;
            const isLast = i === data.length - 1;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hit area */}
                <circle cx={cx} cy={cy} r="10" fill="transparent" />

                {/* Point dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? '6' : isLast ? '4.5' : '3.5'}
                  fill={isHovered || pt.isAnomaly ? '#FFFF08' : '#000000'}
                  stroke="#000000"
                  strokeWidth={isHovered ? '2' : '1.5'}
                />
              </g>
            );
          })}

          {/* X Axis Timeline Labels */}
          {data.length > 0 && (
            <>
              <text
                x={padLeft}
                y={svgHeight - 6}
                textAnchor="start"
                fontSize="9"
                fontFamily="monospace"
                fill="rgba(0,0,0,0.6)"
              >
                {formatTimestamp(data[0].timestamp, 'date')}
              </text>
              {data.length > 2 && (
                <text
                  x={padLeft + chartW / 2}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="monospace"
                  fill="rgba(0,0,0,0.6)"
                >
                  {formatTimestamp(data[Math.floor(data.length / 2)].timestamp, 'date')}
                </text>
              )}
              <text
                x={svgWidth - padRight}
                y={svgHeight - 6}
                textAnchor="end"
                fontSize="9"
                fontFamily="monospace"
                fill="rgba(0,0,0,0.6)"
              >
                {formatTimestamp(latestPoint.timestamp, 'date')}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Hover Inspection Callout */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '14px',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            padding: '4px 8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <span style={{ color: '#FFFF08', fontWeight: 700 }}>
            {formatValue(data[hoveredIndex].value, unit)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>|</span>
          <span>{formatTimestamp(data[hoveredIndex].timestamp, 'full')}</span>
        </div>
      )}
    </div>
  );
};
