import { Fragment } from 'react';
import {
  Badge,
  EmptyState,
  SearchInput,
} from '@czechcanoe/rvp-design-system';
import type { ResultEntry, ResultsResponse, RaceInfo, CategoryInfo } from '../services/api';
import type { RunDetailData } from '../hooks/useEventLiveState';
import { formatTime, formatPenalty } from '../utils/formatTime';
import { RunDetailExpand } from './RunDetailExpand';
import { ViewModeToggle, type ViewMode } from './ViewModeToggle';
import { RoundTabs } from './RoundTabs';
import { CategoryFilter } from './CategoryFilter';
import { StarButton } from './StarButton';
import { FavoritesToggle } from './FavoritesToggle';
import styles from './ResultList.module.css';

interface Column {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  hideOnMobile?: boolean;
  mobileOnly?: boolean;
  cellClassName?: string;
  render: (row: ResultEntry, index: number) => React.ReactNode;
}

/** Name cell with [bib] ☆ Name / [cat] Club layout */
function NameCell({
  row,
  favorites,
}: {
  row: ResultEntry;
  favorites?: {
    isFavorite: (bib: number, classId: string) => boolean;
    onToggle: (bib: number, classId: string) => void;
    classId: string | null;
  };
}) {
  return (
    <div className={styles.nameCell}>
      <div className={styles.athleteName}>
        {favorites && row.bib != null && favorites.classId && (
          <StarButton
            active={favorites.isFavorite(row.bib, favorites.classId)}
            onClick={() => favorites.onToggle(row.bib!, favorites.classId!)}
          />
        )}
        <span className={styles.athleteNameText}>{row.name}</span>
        {row.catId && <span className={styles.catTag}>{row.catId}</span>}
      </div>
      {row.club && (
        <div className={styles.athleteClub}>
          <span className={styles.athleteClubText}>{row.club}</span>
        </div>
      )}
    </div>
  );
}

/** Split-span time value for decimal-point alignment in stacked mobile cells.
 *  The integer part right-aligns in a fixed 3ch box, the fraction part left-aligns;
 *  the decimal point therefore sits at a consistent offset across stacked rows. */
function TimeValue({ centis }: { centis: number | null }) {
  if (centis == null) {
    return <span className={styles.timeDash}>—</span>;
  }
  const formatted = (centis / 100).toFixed(2);
  const [intPart, fracPart] = formatted.split('.');
  return (
    <span className={styles.timeValue}>
      <span className={styles.timeInt}>{intPart}</span>
      <span className={styles.timeFrac}>.{fracPart}</span>
    </span>
  );
}

function buildStandardColumns(
  selectedCatId: string | null,
  favorites?: { isFavorite: (bib: number, classId: string) => boolean; onToggle: (bib: number, classId: string) => void; classId: string | null },
): Column[] {
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
      key: 'name',
      header: 'Jméno',
      width: '100%',
      cellClassName: styles.nameCol,
      render: (row) => <NameCell row={row} favorites={favorites} />,
    },
  ];
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

/**
 * Resolve BR run 1 / run 2 values from a row.
 *
 * Server convention: when both runs exist, `prev*` holds BR1 and `time/pen/total`
 * holds BR2. When only one run exists, `prev*` is null and `time/pen/total` holds
 * that single run — the `betterRunNr` field indicates whether it was run 1 or run 2.
 */
function resolveBrRuns(row: ResultEntry) {
  const br1Status = row.prevStatus ?? null;
  const br2Status = row.currStatus ?? null;
  // BR1 is "present" when it has either a time or a status.
  const hasBr1 = row.prevTotal != null || br1Status != null;
  if (hasBr1) {
    return {
      run1: { total: row.prevTotal ?? null, pen: row.prevPen ?? null, status: br1Status },
      run2: { total: row.total ?? null, pen: row.pen ?? null, status: br2Status },
    };
  }
  // Only one run exists — route by betterRunNr (#155). For all-DNF singletons
  // betterRunNr is null; fall back to run1 (matches pre-#155 behavior).
  const single = { total: row.total ?? null, pen: row.pen ?? null, status: br2Status };
  const empty = { total: null, pen: null, status: null };
  if (row.betterRunNr === 2) {
    return { run1: empty, run2: single };
  }
  return { run1: single, run2: empty };
}

/** Mobile-only cell showing both BR runs stacked.
 *  Position = run number (no label). Missing slot renders as em-dash placeholder
 *  so the "top = run 1" convention is preserved even when only one run has data. */
function BrRunsCell({ row }: { row: ResultEntry }) {
  const { run1, run2 } = resolveBrRuns(row);
  const isBetter1 = row.betterRunNr === 1;
  const isBetter2 = row.betterRunNr === 2;

  const renderLine = (
    run: { total: number | null; pen: number | null; status: string | null },
    isBetter: boolean,
    key: string,
  ) => {
    const hasData = run.total != null || run.status != null;
    const dimClass = hasData ? '' : styles.brRunLineDim;
    return (
      <div key={key} className={`${styles.brRunLine} ${isBetter ? styles.betterRun : ''} ${dimClass}`}>
        {run.status ? (
          <StatusBadge status={run.status} />
        ) : (
          <>
            <TimeValue centis={run.total} />
            {run.pen != null && run.pen > 0 && (
              <span className={styles.brRunPen}>({formatPenalty(run.pen)})</span>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.brRunsStacked}>
      {renderLine(run1, isBetter1, 'run1')}
      {renderLine(run2, isBetter2, 'run2')}
    </div>
  );
}

function buildBestRunColumns(
  selectedCatId: string | null,
  favorites?: { isFavorite: (bib: number, classId: string) => boolean; onToggle: (bib: number, classId: string) => void; classId: string | null },
): Column[] {
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
      key: 'name',
      header: 'Jméno',
      width: '100%',
      cellClassName: styles.nameCol,
      render: (row) => <NameCell row={row} favorites={favorites} />,
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
        const { run1 } = resolveBrRuns(row);
        if (run1.status) return <StatusBadge status={run1.status} />;
        if (run1.total == null) return <span className={styles.monoText}>-</span>;
        const isBetter = row.betterRunNr === 1;
        return (
          <span className={`${styles.monoText} ${isBetter ? styles.betterRun : ''}`}>
            {formatTime(run1.total)}
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
        const { run2 } = resolveBrRuns(row);
        if (run2.status) return <StatusBadge status={run2.status} />;
        if (run2.total == null) return <span className={styles.monoText}>-</span>;
        const isBetter = row.betterRunNr === 2;
        return (
          <span className={`${styles.monoText} ${isBetter ? styles.betterRun : ''}`}>
            {formatTime(run2.total)}
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
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  // Round tabs
  roundRaces?: RaceInfo[];
  selectedRaceId?: string | null;
  onRaceChange?: (raceId: string) => void;
  hasMergedBR?: boolean;
  showRoundTabs?: boolean;
  // Search (uncontrolled — no value prop, just onChange callback)
  onSearchChange?: (q: string) => void;
  /** Forces SearchInput to remount, resetting its uncontrolled internal value. Change this
   *  when the filter context changes (e.g. class/category switch) so a stale query can't
   *  stay in the DOM input while the parent state has moved on. See #149. */
  searchResetKey?: string;
  // Category
  categories?: CategoryInfo[];
  onCategoryChange?: (catId: string | null) => void;
  // Favorites
  isFavorite?: (bib: number, classId: string) => boolean;
  onToggleFavorite?: (bib: number, classId: string) => void;
  raceClassId?: string | null;
  showOnlyFavorites?: boolean;
  onToggleShowFavorites?: () => void;
  favoritesCount?: number;
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
  onViewModeChange,
  roundRaces,
  selectedRaceId,
  onRaceChange,
  hasMergedBR = false,
  showRoundTabs = false,
  onSearchChange,
  searchResetKey,
  categories = [],
  onCategoryChange,
  isFavorite,
  onToggleFavorite,
  raceClassId,
  showOnlyFavorites,
  onToggleShowFavorites,
  favoritesCount = 0,
}: ResultListProps) {
  const { results, race } = data;

  const effectiveExpandedRows = viewMode === 'detailed'
    ? new Set(results.map((r) => `${race.raceId}-${r.bib}`))
    : expandedRows;

  const sorted = [...results].sort((a, b) => {
    if (a.status && !b.status) return 1;
    if (!a.status && b.status) return -1;
    return 0;
  });

  const favoritesParam = isFavorite && onToggleFavorite
    ? { isFavorite, onToggle: onToggleFavorite, classId: raceClassId ?? null }
    : undefined;

  const columns = isBestRun
    ? buildBestRunColumns(selectedCatId ?? null, favoritesParam)
    : buildStandardColumns(selectedCatId ?? null, favoritesParam);

  const hasToolbar = onViewModeChange || showRoundTabs || onSearchChange || categories.length > 0 || onToggleShowFavorites;

  if (sorted.length === 0 && !hasToolbar) {
    return (
      <EmptyState
        title="Zatím žádné výsledky"
        description="Výsledky se zobrazí po zahájení závodu."
      />
    );
  }

  return (
    <div className={styles.tableWrapper}>
      {hasToolbar && (
        <div className={styles.tableToolbar}>
          {showRoundTabs && roundRaces && onRaceChange && (
            <RoundTabs
              races={roundRaces}
              selectedRaceId={selectedRaceId ?? null}
              onRaceChange={onRaceChange}
              hasMergedBR={hasMergedBR}
            />
          )}
          {onSearchChange && (
            <div className={styles.searchWrapper}>
              <SearchInput
                key={searchResetKey}
                size="sm"
                placeholder="Hledat závodníka..."
                onChange={onSearchChange}
                debounceMs={200}
              />
            </div>
          )}
          <div className={styles.toolbarRight}>
            {onCategoryChange && categories.length > 0 && (
              <CategoryFilter
                categories={categories}
                selectedCatId={selectedCatId ?? null}
                onCategoryChange={onCategoryChange}
              />
            )}
            {onToggleShowFavorites && (
              <FavoritesToggle
                active={showOnlyFavorites ?? false}
                count={favoritesCount}
                onToggle={onToggleShowFavorites}
              />
            )}
            {onViewModeChange && (
              <div className={styles.viewModeDesktopOnly}>
                <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
              </div>
            )}
          </div>
        </div>
      )}
      <table className={`${styles.table} ${hasToolbar ? styles.tableWithToolbar : ''}`}>
          <thead className={styles.tableHead}>
            <tr className={styles.headerRow}>
              {onToggleExpand && <th className={`${styles.headerCell} ${styles.expandCol}`}></th>}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.headerCell} ${getAlignClass(col.align)} ${col.hideOnMobile ? styles.hideOnMobile : ''} ${col.mobileOnly ? styles.mobileOnly : ''} ${col.cellClassName ?? ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onToggleExpand ? 1 : 0)}>
                  <EmptyState
                    title="Žádné výsledky"
                    description="Zkuste upravit hledání nebo filtry."
                  />
                </td>
              </tr>
            ) : sorted.map((row, index) => {
              const rowKey = `${race.raceId}-${row.bib}`;
              const isExpanded = effectiveExpandedRows.has(rowKey);
              const isLoading = detailedLoading.has(rowKey);
              const detail = detailedCache[rowKey] ?? null;
              const podiumClass = getRowPodiumClass(row.rnk, row.status);
              return (
                <Fragment key={rowKey}>
                  <tr
                    onClick={onToggleExpand ? () => onToggleExpand(rowKey) : undefined}
                    className={`${styles.dataRow} ${podiumClass} ${index % 2 === 1 ? styles.stripedRow : ''} ${onToggleExpand ? styles.clickable : ''} ${isExpanded ? styles.expandedDataRow : ''}`}
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
                        className={`${styles.cell} ${getAlignClass(col.align)} ${col.hideOnMobile ? styles.hideOnMobile : ''} ${col.mobileOnly ? styles.mobileOnly : ''} ${col.cellClassName ?? ''}`}
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
                          prevStatus={row.prevStatus}
                          currStatus={row.currStatus}
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
  );
}

function getAlignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return styles.alignCenter;
  if (align === 'right') return styles.alignRight;
  return '';
}
