import {
  Card,
  Table,
  EmptyState,
  type ColumnDef,
} from '@czechcanoe/rvp-design-system';
import type { ResultEntry, ResultsResponse } from '../services/api';

/**
 * Format time from hundredths to display format (e.g., 8520 -> "85.20")
 */
function formatTime(hundredths: number | null): string {
  if (hundredths === null) return '-';
  const seconds = hundredths / 100;
  return seconds.toFixed(2);
}

/**
 * Format penalty from hundredths (e.g., 200 -> "2")
 */
function formatPenalty(hundredths: number | null): string {
  if (hundredths === null || hundredths === 0) return '';
  return String(hundredths / 100);
}

// Column definitions for results table
const columns: ColumnDef<ResultEntry>[] = [
  {
    key: 'rnk',
    header: 'Rnk',
    width: '60px',
    align: 'center',
    cell: (row) => row.rnk ?? '-',
  },
  {
    key: 'bib',
    header: 'Bib',
    width: '60px',
    align: 'center',
    cell: (row) => row.bib ?? '-',
  },
  {
    key: 'name',
    header: 'Name',
    cell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{row.name}</div>
        {row.club && (
          <div style={{ fontSize: '0.75rem', color: 'var(--csk-color-text-tertiary)' }}>
            {row.club}
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'time',
    header: 'Time',
    align: 'right',
    cell: (row) => {
      const hasStatus = row.status !== null;
      return (
        <span style={{
          fontFamily: 'var(--csk-font-mono)',
          color: hasStatus ? 'var(--csk-color-error)' : undefined,
          fontWeight: hasStatus ? 600 : undefined
        }}>
          {hasStatus ? row.status : formatTime(row.time)}
        </span>
      );
    },
  },
  {
    key: 'pen',
    header: 'Pen',
    align: 'right',
    cell: (row) => (
      <span style={{ fontFamily: 'var(--csk-font-mono)' }}>
        {row.status === null ? formatPenalty(row.pen) : ''}
      </span>
    ),
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    cell: (row) => (
      <span style={{ fontFamily: 'var(--csk-font-mono)' }}>
        {row.status === null ? formatTime(row.total) : ''}
      </span>
    ),
  },
  {
    key: 'behind',
    header: 'Behind',
    align: 'right',
    cell: (row) => (
      <span style={{ color: 'var(--csk-color-text-secondary)' }}>
        {row.totalBehind ?? ''}
      </span>
    ),
  },
];

interface ResultListProps {
  data: ResultsResponse;
}

/**
 * Display race results in a table using DS components
 */
export function ResultList({ data }: ResultListProps) {
  const { race, results } = data;

  if (results.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No results yet"
          description="Results will appear here when the race starts."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--csk-color-text-secondary)' }}>
        <span style={{ fontWeight: 600 }}>Race: {race.raceId}</span>
        <span>{race.classId ?? 'All classes'}</span>
        <span>{race.disId}</span>
      </div>
      <Table
        columns={columns}
        data={results}
        rowKey="participantId"
        size="sm"
        hoverable
      />
    </Card>
  );
}
