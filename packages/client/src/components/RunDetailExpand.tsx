/**
 * RunDetailExpand Component
 *
 * Displays inline detail for a run below the result row.
 * Shows time breakdown (time/pen/total) and gate-by-gate penalties.
 * For BR races, always shows both runs side by side — missing run as placeholder.
 */

import { SkeletonText } from '@czechcanoe/rvp-design-system';
import type { RunDetailData } from '../hooks/useEventLiveState';
import { formatTime, formatPenalty } from '../utils/formatTime';
import { GatePenalties } from './GatePenalties';
import styles from './RunDetailExpand.module.css';

interface RunDetailExpandProps {
  detail: RunDetailData | null;
  isLoading: boolean;
  isBestRun?: boolean;
  /** Bib of the athlete for the detail header. */
  bib?: number | null;
  /** Age category rank — shown as "N." prefix when both catRnk and catId exist. */
  catRnk?: number | null;
  /** Age category id (e.g. "DM") — required for catRnk to render. */
  catId?: string | null;
  betterRunNr?: number | null;
  // Per-run status (#162): when set, render DNS/DNF/DSQ in place of
  // time/total. Distinguishes "run attempted but didn't finish" from
  // "run hasn't happened yet" (both-null → dashed placeholder).
  prevStatus?: string | null;
  currStatus?: string | null;
}

function TimeBreakdown({ time, pen, total }: {
  time: number | null;
  pen: number | null;
  total: number | null;
}) {
  return (
    <div className={styles.timeBreakdown}>
      <div className={styles.timeItem}>
        <span className={styles.timeLabel}>Čas</span>
        <span className={styles.timeValue}>{formatTime(time)}</span>
      </div>
      <div className={styles.timeItem}>
        <span className={styles.timeLabel}>Pen</span>
        <span className={styles.timeValue}>{pen != null ? String(pen / 100) : '-'}</span>
      </div>
      <div className={styles.timeItem}>
        <span className={styles.timeLabel}>Celkem</span>
        <span className={styles.timeValue}>{formatTime(total)}</span>
      </div>
    </div>
  );
}

function RunBlock({ label, isBetter, time, pen, total, gates }: {
  label: string;
  isBetter: boolean;
  time: number | null;
  pen: number | null;
  total: number | null;
  gates: RunDetailData['gates'];
}) {
  return (
    <div className={`${styles.runSection} ${isBetter ? styles.runSectionBetter : ''}`}>
      <div className={styles.runSectionLabel}>
        {label}
        {isBetter && <span className={styles.betterBadge}>lepší</span>}
      </div>
      <TimeBreakdown time={time} pen={pen} total={total} />
      {gates && gates.length > 0 && (
        <div className={styles.gatesSection}>
          <GatePenalties gates={gates} />
        </div>
      )}
    </div>
  );
}

/** Compact header for the detail panel: "St.č. [25], 3. DM".
 *  - catRnk without catId is suppressed (no orphan "3." without a category label).
 *  - catId without catRnk renders as "St.č. [25], DM".
 *  - bib missing falls back to "-". */
function DetailHeader({ bib, catRnk, catId }: {
  bib?: number | null;
  catRnk?: number | null;
  catId?: string | null;
}) {
  const showCat = Boolean(catId);
  const showRank = showCat && catRnk != null;
  return (
    <div className={styles.detailHeader}>
      <span className={styles.detailHeaderLabel}>St.č.</span>
      <span className={styles.detailHeaderBib}>{bib ?? '-'}</span>
      {showCat && (
        <span className={styles.detailHeaderMeta}>
          {showRank ? `, ${catRnk}. ${catId}` : `, ${catId}`}
        </span>
      )}
    </div>
  );
}

function RunPlaceholder({ label, status }: { label: string; status?: string | null }) {
  return (
    <div className={`${styles.runSection} ${styles.runSectionPlaceholder}`}>
      <div className={styles.runSectionLabel}>{label}</div>
      <div className={styles.timeBreakdown}>
        <div className={styles.timeItem}>
          <span className={styles.timeLabel}>Čas</span>
          <span className={styles.timeValue}>{status ?? '-'}</span>
        </div>
        <div className={styles.timeItem}>
          <span className={styles.timeLabel}>Celkem</span>
          <span className={styles.timeValue}>{status ?? '-'}</span>
        </div>
      </div>
    </div>
  );
}

export function RunDetailExpand({ detail, isLoading, isBestRun, bib, catRnk, catId, betterRunNr, prevStatus, currStatus }: RunDetailExpandProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <SkeletonText />
        <SkeletonText fontSize="sm" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>Detail není k dispozici</div>
      </div>
    );
  }

  // BR race — always show two run blocks
  // Server convention: when both runs exist, detail.prev* = BR1 and detail.* = BR2.
  // When only one run was ingested, detail.prev* is null and detail.* holds that
  // single run — betterRunNr indicates whether it was run 1 or run 2 so the data
  // can be routed into the correct block.
  if (isBestRun) {
    const hasBothRuns = detail.prevTotal != null;
    const primary = { time: detail.time, pen: detail.pen, total: detail.total, gates: detail.gates };
    const empty = { time: null, pen: null, total: null, gates: null };

    let run1: { time: number | null; pen: number | null; total: number | null; gates: RunDetailData['gates'] };
    let run2: { time: number | null; pen: number | null; total: number | null; gates: RunDetailData['gates'] };

    if (hasBothRuns) {
      run1 = {
        time: detail.prevTime ?? null,
        pen: detail.prevPen ?? null,
        total: detail.prevTotal ?? null,
        gates: detail.prevGates ?? null,
      };
      run2 = primary;
    } else if (betterRunNr === 2) {
      run1 = empty;
      run2 = primary;
    } else {
      run1 = primary;
      run2 = empty;
    }

    const run1HasData = run1.total != null;
    const run2HasData = run2.total != null;

    return (
      <div className={styles.container}>
        <DetailHeader bib={bib} catRnk={catRnk} catId={catId} />
        <div className={styles.runsGrid}>
          {run1HasData ? (
            <RunBlock label="1. jízda" isBetter={betterRunNr === 1} time={run1.time} pen={run1.pen} total={run1.total} gates={run1.gates} />
          ) : (
            <RunPlaceholder label="1. jízda" status={prevStatus} />
          )}
          {run2HasData ? (
            <RunBlock label="2. jízda" isBetter={betterRunNr === 2} time={run2.time} pen={run2.pen} total={run2.total} gates={run2.gates} />
          ) : (
            <RunPlaceholder label="2. jízda" status={currStatus} />
          )}
        </div>
      </div>
    );
  }

  // Single-run race — one block
  return (
    <div className={styles.container}>
      <DetailHeader bib={bib} catRnk={catRnk} catId={catId} />
      <TimeBreakdown time={detail.time} pen={detail.pen} total={detail.total} />
      {detail.gates && detail.gates.length > 0 && (
        <div className={styles.gatesSection}>
          <GatePenalties gates={detail.gates} />
        </div>
      )}
    </div>
  );
}
