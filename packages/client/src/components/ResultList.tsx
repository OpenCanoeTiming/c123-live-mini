import React from 'react';
import {
  Card,
  Table,
  EmptyState,
  type ColumnDef,
} from '@czechcanoe/rvp-design-system';
import type { ResultEntry, ResultsResponse } from '../services/api';
import type { RunDetailData } from '../hooks/useEventLiveState';
import { formatTime, formatPenalty } from '../utils/formatTime';
import { RunDetailExpand } from './RunDetailExpand';

// Standard result columns with Czech headers
const standardColumns: ColumnDef<ResultEntry>[] = [
  {
    key: 'rnk',
    header: 'Poř.',
    width: '50px',
    align: 'center',
    cell: (row) => row.rnk ?? '-',
  },
  {
    key: 'bib',
    header: 'St.č.',
    width: '55px',
    align: 'center',
    cell: (row) => row.bib ?? '-',
  },
  {
    key: 'name',
    header: 'Jméno',
    cell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{row.name}</div>
        {row.club && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--csk-color-text-tertiary)',
            }}
          >
            {row.club}
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'time',
    header: 'Čas',
    align: 'right',
    cell: (row) => {
      if (row.status) {
        return (
          <span
            style={{
              fontFamily: 'var(--csk-font-mono)',
              color: 'var(--csk-color-error)',
              fontWeight: 600,
            }}
          >
            {row.status}
          </span>
        );
      }
      return (
        <span style={{ fontFamily: 'var(--csk-font-mono)' }}>
          {formatTime(row.time)}
        </span>
      );
    },
  },
  {
    key: 'pen',
    header: 'Trest',
    align: 'right',
    cell: (row) => (
      <span style={{ fontFamily: 'var(--csk-font-mono)' }}>
        {row.status === null ? formatPenalty(row.pen) : ''}
      </span>
    ),
  },
  {
    key: 'total',
    header: 'Výsledek',
    align: 'right',
    cell: (row) => (
      <span style={{ fontFamily: 'var(--csk-font-mono)' }}>
        {row.status === null ? formatTime(row.total) : ''}
      </span>
    ),
  },
  {
    key: 'behind',
    header: 'Ztráta',
    align: 'right',
    cell: (row) => (
      <span style={{ color: 'var(--csk-color-text-secondary)' }}>
        {row.totalBehind ?? ''}
      </span>
    ),
  },
];

// Best-run result columns
const bestRunColumns: ColumnDef<ResultEntry>[] = [
  {
    key: 'rnk',
    header: 'Poř.',
    width: '50px',
    align: 'center',
    cell: (row) => row.rnk ?? '-',
  },
  {
    key: 'bib',
    header: 'St.č.',
    width: '55px',
    align: 'center',
    cell: (row) => row.bib ?? '-',
  },
  {
    key: 'name',
    header: 'Jméno',
    cell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{row.name}</div>
        {row.club && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--csk-color-text-tertiary)',
            }}
          >
            {row.club}
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'run1',
    header: '1. jízda',
    align: 'right',
    cell: (row) => {
      if (row.status) {
        return (
          <span
            style={{
              fontFamily: 'var(--csk-font-mono)',
              color: 'var(--csk-color-error)',
              fontWeight: 600,
            }}
          >
            {row.status}
          </span>
        );
      }
      // Server always uses BR2 as primary (contains prev_ fields):
      //   total = Run 2 result, prevTotal = Run 1 result
      // When only BR1 exists: total = Run 1, prevTotal = null
      const run1Total = row.prevTotal ?? (row.prevTotal === undefined ? row.total : null);
      const isBetter = row.betterRunNr === 1;
      return (
        <span
          style={{
            fontFamily: 'var(--csk-font-mono)',
            fontWeight: isBetter ? 700 : undefined,
          }}
        >
          {formatTime(run1Total ?? null)}
        </span>
      );
    },
  },
  {
    key: 'run2',
    header: '2. jízda',
    align: 'right',
    cell: (row) => {
      if (row.status) return '';
      // When BR2 exists: total = Run 2 result
      // When only BR1: prevTotal is null → Run 2 doesn't exist
      const run2Total = row.prevTotal != null ? row.total : null;
      const isBetter = row.betterRunNr === 2;
      return (
        <span
          style={{
            fontFamily: 'var(--csk-font-mono)',
            fontWeight: isBetter ? 700 : undefined,
          }}
        >
          {formatTime(run2Total ?? null)}
        </span>
      );
    },
  },
  {
    key: 'totalTotal',
    header: 'Výsledek',
    align: 'right',
    cell: (row) => (
      <span style={{ fontFamily: 'var(--csk-font-mono)', fontWeight: 600 }}>
        {row.status === null ? formatTime(row.totalTotal ?? null) : ''}
      </span>
    ),
  },
  {
    key: 'behind',
    header: 'Ztráta',
    align: 'right',
    cell: (row) => (
      <span style={{ color: 'var(--csk-color-text-secondary)' }}>
        {row.totalBehind ?? ''}
      </span>
    ),
  },
];

// Category-aware columns: replace rnk/behind with catRnk/catTotalBehind
function getCategoryColumns(
  baseColumns: ColumnDef<ResultEntry>[]
): ColumnDef<ResultEntry>[] {
  return baseColumns.map((col) => {
    if (col.key === 'rnk') {
      return {
        ...col,
        cell: (row: ResultEntry) => row.catRnk ?? row.rnk ?? '-',
      };
    }
    if (col.key === 'behind') {
      return {
        ...col,
        cell: (row: ResultEntry) => (
          <span style={{ color: 'var(--csk-color-text-secondary)' }}>
            {row.catTotalBehind ?? row.totalBehind ?? ''}
          </span>
        ),
      };
    }
    return col;
  });
}

interface ResultListProps {
  data: ResultsResponse;
  isBestRun?: boolean;
  selectedCatId?: string | null;
  expandedRows?: Set<string>;
  onToggleExpand?: (key: string) => void;
  detailedCache?: Record<string, RunDetailData>;
  detailedLoading?: Set<string>;
  viewMode?: 'simple' | 'detailed';
}

/**
 * Display race results in a table using DS components
 */
export function ResultList({
  data,
  isBestRun,
  selectedCatId,
  expandedRows = new Set(),
  onToggleExpand,
  detailedCache = {},
  detailedLoading = new Set(),
  viewMode = 'simple',
}: ResultListProps) {
  const { results, race } = data;

  // In detailed mode, all rows are expanded
  const effectiveExpandedRows = viewMode === 'detailed'
    ? new Set(results.map((r) => `${race.raceId}-${r.bib}`))
    : expandedRows;

  if (results.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Zatím žádné výsledky"
          description="Výsledky se zobrazí po zahájení závodu."
        />
      </Card>
    );
  }

  // Sort: ranked athletes first (by rnk), then status athletes at bottom
  const sorted = [...results].sort((a, b) => {
    if (a.status && !b.status) return 1;
    if (!a.status && b.status) return -1;
    return 0;
  });

  const baseColumns = isBestRun ? bestRunColumns : standardColumns;
  const columns = selectedCatId
    ? getCategoryColumns(baseColumns)
    : baseColumns;

  // If no expand handler provided, use standard Table
  if (!onToggleExpand) {
    return (
      <Card>
        <Table
          columns={columns}
          data={sorted}
          rowKey={(row, index) => row.athleteId ?? `row-${index}`}
          size="sm"
          hoverable
        />
      </Card>
    );
  }

  // Custom table with expandable rows
  return (
    <Card>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead style={{ borderBottom: '1px solid var(--csk-color-border-secondary)' }}>
            <tr>
              <th style={{ width: '24px' }}></th> {/* Chevron column */}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '0.5rem',
                    textAlign: col.align ?? 'left',
                    fontWeight: 600,
                    color: 'var(--csk-color-text-secondary)',
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const rowKey = `${race.raceId}-${row.bib}`;
              const isExpanded = effectiveExpandedRows.has(rowKey);
              const isLoading = detailedLoading.has(rowKey);
              const detail = detailedCache[rowKey] ?? null;

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    onClick={() => onToggleExpand(rowKey)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--csk-color-border-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--csk-color-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '0.5rem',
                          textAlign: col.align ?? 'left',
                        }}
                      >
                        {col.cell?.(row, index) ?? null}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={columns.length + 1} style={{ padding: 0 }}>
                        <RunDetailExpand detail={detail} isLoading={isLoading} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
