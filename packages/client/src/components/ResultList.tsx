import {
  Card,
  Table,
  EmptyState,
  type ColumnDef,
} from '@czechcanoe/rvp-design-system';
import type { ResultEntry, ResultsResponse } from '../services/api';
import { formatTime, formatPenalty } from '../utils/formatTime';

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
      // betterRunNr=1 → current run is run 1, prev is run 2
      // betterRunNr=2 → current run is run 2, prev is run 1
      const isRun1Current = row.betterRunNr !== 2;
      const run1Total = isRun1Current ? row.total : row.prevTotal;
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
      const isRun2Current = row.betterRunNr === 2;
      const run2Total = isRun2Current ? row.total : row.prevTotal;
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
}

/**
 * Display race results in a table using DS components
 */
export function ResultList({ data, isBestRun, selectedCatId }: ResultListProps) {
  const { results } = data;

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
