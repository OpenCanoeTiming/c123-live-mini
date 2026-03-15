import { Fragment } from 'react';
import {
  Card,
  Badge,
  EmptyState,
} from '@czechcanoe/rvp-design-system';
import type { ResultEntry, ResultsResponse } from '../services/api';
import type { RunDetailData } from '../hooks/useEventLiveState';
import { formatTime, formatPenalty } from '../utils/formatTime';
import { RunDetailExpand } from './RunDetailExpand';
import styles from './ResultList.module.css';

interface Column {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  hideOnMobile?: boolean;
  mobileOnly?: boolean;
  render: (row: ResultEntry, index: number) => React.ReactNode;
}

function buildStandardColumns(selectedCatId: string | null): Column[] {
  const useCategory = Boolean(selectedCatId);
  const cols: Column[] = [
    {
      key: 'rnk',
      header: 'Poř.',
      width: '44px',
      align: 'center',
      render: (row) => {
        const rank = useCategory ? (row.catRnk ?? row.rnk) : row.rnk;
        return <RankCell rank={rank} status={row.status} />;
      },
    },
    {
      key: 'bib',
      header: 'St.č.',
      width: '48px',
      align: 'center',
      hideOnMobile: true,
      render: (row) => <span className={styles.bibText}>{row.bib ?? '-'}</span>,
    },
    {
      key: 'name',
      header: 'Jméno',
      width: '100%',
      render: (row) => (
        <div>
          <div className={styles.athleteName}>
            <span className={styles.bibBadgeMobile}>{row.bib}</span>
            {row.name}
          </div>
          {row.club && <div className={styles.athleteClub}>{row.club}</div>}
        </div>
      ),
    },
  ];
  if (!selectedCatId) {
    cols.push({
      key: 'catId',
      header: 'Kat.',
      width: '48px',
      hideOnMobile: true,
      render: (row) => <span className={styles.catText}>{row.catId ?? ''}</span>,
    });
  }
  cols.push(
    {
      key: 'time',
      header: 'Čas',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        if (row.status) return <StatusBadge status={row.status} />;
        return <span className={styles.monoText}>{formatTime(row.time)}</span>;
      },
    },
    {
      key: 'pen',
      header: 'Trest',
      align: 'right',
      width: '52px',
      hideOnMobile: true,
      render: (row) => {
        if (row.status) return null;
        const val = formatPenalty(row.pen);
        if (!val) return null;
        return <span className={styles.penaltyText}>{val}</span>;
      },
    },
    {
      key: 'total',
      header: 'Výsledek',
      align: 'right',
      render: (row) => {
        if (row.status) return <StatusBadge status={row.status} />;
        return <span className={`${styles.monoText} ${styles.totalText}`}>{formatTime(row.total)}</span>;
      },
    },
    {
      key: 'behind',
      header: 'Ztráta',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        const behind = useCategory ? (row.catTotalBehind ?? row.totalBehind) : row.totalBehind;
        return <span className={styles.behindText}>{behind ?? ''}</span>;
      },
    },
  );
  return cols;
}

/** Mobile-only cell showing both BR runs stacked */
function BrRunsCell({ row }: { row: ResultEntry }) {
  if (row.status) return <StatusBadge status={row.status} />;

  const run1Total = row.prevTotal != null ? row.prevTotal : row.total;
  const run2Total = row.prevTotal != null ? row.total : null;
  const isBetter1 = row.betterRunNr === 1;
  const isBetter2 = row.betterRunNr === 2;

  return (
    <div className={styles.brRunsStacked}>
      <div className={`${styles.brRunLine} ${isBetter1 ? styles.betterRun : ''}`}>
        <span className={styles.brRunLabel}>1.</span>
        <span className={styles.monoText}>{formatTime(run1Total ?? null)}</span>
        {row.prevPen != null && row.prevPen > 0 && (
          <span className={styles.brRunPen}>({formatPenalty(row.prevTotal != null ? row.prevPen : row.pen)})</span>
        )}
      </div>
      {run2Total !== null && (
        <div className={`${styles.brRunLine} ${isBetter2 ? styles.betterRun : ''}`}>
          <span className={styles.brRunLabel}>2.</span>
          <span className={styles.monoText}>{formatTime(run2Total)}</span>
          {row.pen != null && row.pen > 0 && (
            <span className={styles.brRunPen}>({formatPenalty(row.prevTotal != null ? row.pen : null)})</span>
          )}
        </div>
      )}
    </div>
  );
}

function buildBestRunColumns(selectedCatId: string | null): Column[] {
  const useCategory = Boolean(selectedCatId);
  return [
    {
      key: 'rnk',
      header: 'Poř.',
      width: '44px',
      align: 'center',
      render: (row) => {
        const rank = useCategory ? (row.catRnk ?? row.rnk) : row.rnk;
        return <RankCell rank={rank} status={row.status} />;
      },
    },
    {
      key: 'bib',
      header: 'St.č.',
      width: '48px',
      align: 'center',
      hideOnMobile: true,
      render: (row) => <span className={styles.bibText}>{row.bib ?? '-'}</span>,
    },
    {
      key: 'name',
      header: 'Jméno',
      width: '100%',
      render: (row) => (
        <div>
          <div className={styles.athleteName}>
            <span className={styles.bibBadgeMobile}>{row.bib}</span>
            {row.name}
          </div>
          {row.club && <div className={styles.athleteClub}>{row.club}</div>}
        </div>
      ),
    },
    {
      key: 'brRuns',
      header: 'Jízdy',
      width: '1px',
      mobileOnly: true,
      render: (row) => <BrRunsCell row={row} />,
    },
    {
      key: 'run1',
      header: '1. jízda',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        if (row.status) return <StatusBadge status={row.status} />;
        const run1Total = row.prevTotal != null ? row.prevTotal : row.total;
        const isBetter = row.betterRunNr === 1;
        return (
          <span className={`${styles.monoText} ${isBetter ? styles.betterRun : ''}`}>
            {formatTime(run1Total ?? null)}
          </span>
        );
      },
    },
    {
      key: 'run2',
      header: '2. jízda',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        if (row.status) return null;
        const run2Total = row.prevTotal != null ? row.total : null;
        const isBetter = row.betterRunNr === 2;
        if (run2Total === null) return <span className={styles.monoText}>-</span>;
        return (
          <span className={`${styles.monoText} ${isBetter ? styles.betterRun : ''}`}>
            {formatTime(run2Total)}
          </span>
        );
      },
    },
    {
      key: 'totalTotal',
      header: 'Výsledek',
      width: '1px',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        if (row.status) return null;
        return (
          <span className={`${styles.monoText} ${styles.totalText}`}>
            {formatTime(row.totalTotal ?? null)}
          </span>
        );
      },
    },
    {
      key: 'behind',
      header: 'Ztráta',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        const behind = useCategory ? (row.catTotalBehind ?? row.totalBehind) : row.totalBehind;
        return <span className={styles.behindText}>{behind ?? ''}</span>;
      },
    },
  ];
}

/** Rank display with podium styling */
function RankCell({ rank, status }: { rank: number | null; status: string | null }) {
  if (status) return <span className={styles.rankDash}>-</span>;
  if (rank === null) return <span className={styles.rankDash}>-</span>;
  if (rank <= 3) {
    const podiumClass = rank === 1 ? styles.rankGold : rank === 2 ? styles.rankSilver : styles.rankBronze;
    return <span className={`${styles.rankPodium} ${podiumClass}`}>{rank}</span>;
  }
  return <span className={styles.rankText}>{rank}</span>;
}

/** Status badge for DNS/DNF/DSQ */
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="error" size="sm">
      {status}
    </Badge>
  );
}

function getRowPodiumClass(rank: number | null, status: string | null): string {
  if (status || rank === null) return '';
  if (rank === 1) return styles.rowGold;
  if (rank === 2) return styles.rowSilver;
  if (rank === 3) return styles.rowBronze;
  return '';
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
  updatedBibs?: Set<number>;
}

export function ResultList({
  data,
  isBestRun,
  selectedCatId,
  expandedRows = new Set(),
  onToggleExpand,
  detailedCache = {},
  detailedLoading = new Set(),
  viewMode = 'simple',
  updatedBibs = new Set(),
}: ResultListProps) {
  const { results, race } = data;

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

  const sorted = [...results].sort((a, b) => {
    if (a.status && !b.status) return 1;
    if (!a.status && b.status) return -1;
    return 0;
  });

  const columns = isBestRun
    ? buildBestRunColumns(selectedCatId ?? null)
    : buildStandardColumns(selectedCatId ?? null);

  return (
    <Card className={styles.resultsCard}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              {onToggleExpand && <th className={styles.expandCol}></th>}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.headerCell} ${getAlignClass(col.align)} ${col.hideOnMobile ? styles.hideOnMobile : ''} ${col.mobileOnly ? styles.mobileOnly : ''}`}
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
              const podiumClass = getRowPodiumClass(row.rnk, row.status);
              const isUpdated = updatedBibs.has(row.bib ?? -1);

              return (
                <Fragment key={rowKey}>
                  <tr
                    onClick={onToggleExpand ? () => onToggleExpand(rowKey) : undefined}
                    className={`${styles.dataRow} ${podiumClass} ${index % 2 === 1 ? styles.stripedRow : ''} ${onToggleExpand ? styles.clickable : ''} ${isExpanded ? styles.expandedDataRow : ''} ${isUpdated ? styles.rowUpdated : ''}`}
                  >
                    {onToggleExpand && (
                      <td className={`${styles.cell} ${styles.expandCol}`}>
                        <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>
                          ›
                        </span>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${styles.cell} ${getAlignClass(col.align)} ${col.hideOnMobile ? styles.hideOnMobile : ''} ${col.mobileOnly ? styles.mobileOnly : ''}`}
                      >
                        {col.render(row, index)}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && onToggleExpand && (
                    <tr className={styles.detailRow}>
                      <td colSpan={columns.length + 1}>
                        <RunDetailExpand
                          detail={detail}
                          isLoading={isLoading}
                          isBestRun={isBestRun}
                          athleteName={row.name}
                          betterRunNr={row.betterRunNr}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function getAlignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return styles.alignCenter;
  if (align === 'right') return styles.alignRight;
  return '';
}
