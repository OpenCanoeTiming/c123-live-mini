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
import styles from './ResultList.module.css';

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
        <div className={styles.athleteName}>{row.name}</div>
        {row.club && <div className={styles.athleteClub}>{row.club}</div>}
      </div>
    ),
  },
  {
    key: 'time',
    header: 'Čas',
    align: 'right',
    cell: (row) => {
      if (row.status) {
        return <span className={styles.statusText}>{row.status}</span>;
      }
      return <span className={styles.monoText}>{formatTime(row.time)}</span>;
    },
  },
  {
    key: 'pen',
    header: 'Trest',
    align: 'right',
    cell: (row) => (
      <span className={styles.monoText}>
        {row.status === null ? formatPenalty(row.pen) : ''}
      </span>
    ),
  },
  {
    key: 'total',
    header: 'Výsledek',
    align: 'right',
    cell: (row) => (
      <span className={styles.monoText}>
        {row.status === null ? formatTime(row.total) : ''}
      </span>
    ),
  },
  {
    key: 'behind',
    header: 'Ztráta',
    align: 'right',
    cell: (row) => (
      <span className={styles.secondaryText}>{row.totalBehind ?? ''}</span>
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
        <div className={styles.athleteName}>{row.name}</div>
        {row.club && <div className={styles.athleteClub}>{row.club}</div>}
      </div>
    ),
  },
  {
    key: 'run1',
    header: '1. jízda',
    align: 'right',
    cell: (row) => {
      if (row.status) {
        return <span className={styles.statusText}>{row.status}</span>;
      }
      // Server always uses BR2 as primary (contains prev_ fields):
      //   total = Run 2 result, prevTotal = Run 1 result
      // When only BR1 exists: total = Run 1, prevTotal = null
      const run1Total = row.prevTotal ?? (row.prevTotal === undefined ? row.total : null);
      const isBetter = row.betterRunNr === 1;
      return (
        <span className={isBetter ? `${styles.monoText} ${styles.betterRun}` : styles.monoText}>
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
        <span className={isBetter ? `${styles.monoText} ${styles.betterRun}` : styles.monoText}>
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
      <span className={`${styles.monoText} ${styles.totalTotal}`}>
        {row.status === null ? formatTime(row.totalTotal ?? null) : ''}
      </span>
    ),
  },
  {
    key: 'behind',
    header: 'Ztráta',
    align: 'right',
    cell: (row) => (
      <span className={styles.secondaryText}>{row.totalBehind ?? ''}</span>
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
          <span className={styles.secondaryText}>
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
      <div className={styles.tableWrapper}>
        <table className={styles.customTable}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.chevronCell}></th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.tableHeaderCell} ${col.align === 'center' ? styles.tableHeaderCellCenter : col.align === 'right' ? styles.tableHeaderCellRight : ''}`}
                  style={col.width ? { width: col.width } : undefined}
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
                <>
                  <tr
                    key={`row-${rowKey}`}
                    onClick={() => onToggleExpand(rowKey)}
                    className={styles.tableRow}
                  >
                    <td className={`${styles.tableCell} ${styles.tableCellCenter} ${styles.chevronCell}`}>
                      {isExpanded ? '▼' : '▶'}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${styles.tableCell} ${col.align === 'center' ? styles.tableCellCenter : col.align === 'right' ? styles.tableCellRight : ''}`}
                      >
                        {col.cell?.(row, index) ?? null}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr key={`expand-${rowKey}`} className={styles.expandedRow}>
                      <td colSpan={columns.length + 1}>
                        <RunDetailExpand detail={detail} isLoading={isLoading} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
