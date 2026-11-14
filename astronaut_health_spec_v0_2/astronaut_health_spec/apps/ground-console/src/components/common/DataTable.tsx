// Ground Health Console — Reusable Clinical Data Table
// Swiss editorial design: clean typography, subtle borders, yellow selection accents

import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  selectedRowKey?: string;
  emptyMessage?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  selectedRowKey,
  emptyMessage = 'No records found matching current criteria.',
  loading = false,
  style
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number): string => {
    if (typeof keyField === 'function') return keyField(row);
    return row[keyField] ?? index.toString();
  };

  return (
    <div
      style={{
        border: '1px solid #000000',
        backgroundColor: '#FFFFFF',
        overflowX: 'auto',
        width: '100%',
        ...style
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '12px',
          fontFamily: 'inherit'
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#FFFFFF',
              borderBottom: '2px solid #000000',
              color: '#000000'
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: col.align || 'left',
                  width: col.width,
                  borderRight: '1px solid rgba(0,0,0,0.08)'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'rgba(0,0,0,0.6)',
                  fontStyle: 'italic'
                }}
              >
                Loading telemetry stream...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  color: 'rgba(0,0,0,0.5)'
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const rowKey = getRowKey(row, index);
              const isSelected = selectedRowKey === rowKey;

              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    backgroundColor: isSelected ? 'rgba(255, 255, 8, 0.25)' : '#FFFFFF',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.05s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 8, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 12px',
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle',
                        borderRight: '1px solid rgba(0,0,0,0.05)'
                      }}
                    >
                      {col.render ? col.render(row, index) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
