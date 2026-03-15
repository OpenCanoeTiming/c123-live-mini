import {
  Card,
  Table,
  EmptyState,
  SectionHeader,
  type ColumnDef,
} from '@czechcanoe/rvp-design-system';
import type { StartlistEntry } from '../services/api';
import styles from './StartlistTable.module.css';

const columns: ColumnDef<StartlistEntry>[] = [
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
];

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
