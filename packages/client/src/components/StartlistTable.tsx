import {
  Table,
  EmptyState,
  type ColumnDef,
} from '@czechcanoe/rvp-design-system';
import type { StartlistDisplayRow } from '../services/api';
import { StarButton } from './StarButton';
import styles from './StartlistTable.module.css';

function formatStartTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function buildColumns(
  hasStartTimes: boolean,
  hasBothRuns: boolean,
  favorites?: { isFavorite: (bib: number, classId: string) => boolean; onToggle: (bib: number, classId: string) => void; classId: string | null },
): ColumnDef<StartlistDisplayRow>[] {
  const cols: ColumnDef<StartlistDisplayRow>[] = [
    {
      key: 'startOrder',
      header: 'Pořadí',
      width: '60px',
      align: 'center',
      cell: (row, rowIndex) => row.startOrder ?? rowIndex + 1,
    },
    {
      key: 'bib',
      header: 'St.č.',
      width: '60px',
      align: 'center',
      cell: (row) => <span className={styles.bibBadge}>{row.bib ?? '-'}</span>,
    },
  ];

  if (hasBothRuns) {
    cols.push(
      {
        key: 'run1StartTime',
        header: 'B1',
        width: '55px',
        align: 'center',
        cell: (row) => (
          <span className={styles.startTime}>
            {formatStartTime(row.run1StartTime)}
          </span>
        ),
      },
      {
        key: 'run2StartTime',
        header: 'B2',
        width: '55px',
        align: 'center',
        cell: (row) => (
          <span className={styles.startTime}>
            {formatStartTime(row.run2StartTime)}
          </span>
        ),
      }
    );
  } else if (hasStartTimes) {
    cols.push({
      key: 'startTime',
      header: 'Start',
      width: '70px',
      cell: (row) => (
        <span className={styles.startTime}>{formatStartTime(row.startTime)}</span>
      ),
    });
  }

  cols.push(
    {
      key: 'name',
      header: 'Jméno',
      cell: (row) => (
        <div>
          <div className={styles.athleteName}>
            {row.name}
            {favorites && row.bib != null && favorites.classId && (
              <StarButton
                active={favorites.isFavorite(row.bib, favorites.classId)}
                onClick={() => favorites.onToggle(row.bib!, favorites.classId!)}
              />
            )}
          </div>
          {row.club && (
            <div className={styles.athleteClub}>{row.club}</div>
          )}
        </div>
      ),
    },
    {
      key: 'catId',
      header: 'Kategorie',
      width: '80px',
      cell: (row) =>
        row.catId ? (
          <span className={styles.categoryBadge}>{row.catId}</span>
        ) : (
          ''
        ),
    },
  );

  return cols;
}

interface StartlistTableProps {
  entries: StartlistDisplayRow[];
  isFavorite?: (bib: number, classId: string) => boolean;
  onToggleFavorite?: (bib: number, classId: string) => void;
  raceClassId?: string | null;
}

export function StartlistTable({ entries, isFavorite, onToggleFavorite, raceClassId }: StartlistTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Startovní listina je prázdná"
        description="Zatím nebyli přiřazeni žádní závodníci."
      />
    );
  }

  const hasBothRuns = entries.some(
    (e) => e.run1StartTime !== undefined || e.run2StartTime !== undefined
  );
  const hasStartTimes = entries.some((e) => e.startTime != null);
  const favoritesParam = isFavorite && onToggleFavorite
    ? { isFavorite, onToggle: onToggleFavorite, classId: raceClassId ?? null }
    : undefined;
  const columns = buildColumns(hasStartTimes, hasBothRuns, favoritesParam);
  const entriesWithKey = entries.map((e, i) => ({
    ...e,
    _rowKey: `${e.athleteId ?? 'x'}-${e.catId ?? 'x'}-${e.startOrder ?? i}-${i}`,
  }));

  return (
    <div className={styles.startlistCard}>
      <Table
        columns={columns}
        data={entriesWithKey}
        rowKey="_rowKey"
        size="sm"
        hoverable
        variant="striped"
      />
    </div>
  );
}
