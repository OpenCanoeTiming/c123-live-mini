import {
  Card,
  Table,
  EmptyState,
  SectionHeader,
  type ColumnDef,
} from '@czechcanoe/rvp-design-system';
import type { StartlistEntry } from '../services/api';
import styles from './StartlistTable.module.css';

function formatStartTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function buildColumns(hasStartTimes: boolean): ColumnDef<StartlistEntry>[] {
  const cols: ColumnDef<StartlistEntry>[] = [
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
      cell: (row) => row.bib ?? '-',
    },
  ];

  if (hasStartTimes) {
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
          <div className={styles.athleteName}>{row.name}</div>
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
  entries: StartlistEntry[];
}

export function StartlistTable({ entries }: StartlistTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Startovní listina je prázdná"
          description="Zatím nebyli přiřazeni žádní závodníci."
        />
      </Card>
    );
  }

  const hasStartTimes = entries.some((e) => e.startTime != null);
  const columns = buildColumns(hasStartTimes);

  return (
    <Card>
      <SectionHeader title="Startovní listina" />
      <Table
        columns={columns}
        data={entries}
        rowKey="athleteId"
        size="sm"
        hoverable
        variant="striped"
      />
    </Card>
  );
}
