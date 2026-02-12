import { Card, Table, EmptyState, type ColumnDef } from '@czechcanoe/rvp-design-system';
import type { StartlistEntry } from '../services/api';

const columns: ColumnDef<StartlistEntry>[] = [
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
    key: 'catId',
    header: 'Kategorie',
    width: '80px',
    cell: (row) => row.catId ?? '',
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
      <Table
        columns={columns}
        data={entries}
        rowKey="athleteId"
        size="sm"
        hoverable
      />
    </Card>
  );
}
