/**
 * RunDetailExpand Component
 *
 * Displays inline detail for a run below the result row.
 * Shows start/finish timestamps and gate-by-gate penalties.
 * For BR races, shows both runs side by side with the better run highlighted.
 */

import { SkeletonText } from '@czechcanoe/rvp-design-system';
import type { RunDetailData } from '../hooks/useEventLiveState';
import { GatePenalties } from './GatePenalties';
import styles from './RunDetailExpand.module.css';

interface RunDetailExpandProps {
  detail: RunDetailData | null;
  isLoading: boolean;
  /** When true, indicates this is a best-run race (gates are for the current run) */
  isBestRun?: boolean;
  /** Athlete name for context */
  athleteName?: string;
  /** Which run number (1 or 2) is the better run — only used for BR races */
  betterRunNr?: number | null;
}

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function RunSection({ label, isBetter, dtStart, dtFinish, gates }: {
  label: string;
  isBetter: boolean;
  dtStart: string | null;
  dtFinish: string | null;
  gates: RunDetailData['gates'];
}) {
  return (
    <div className={`${styles.runSection} ${isBetter ? styles.runSectionBetter : ''}`}>
      <div className={styles.runSectionLabel}>
        {label}
        {isBetter && <span className={styles.betterBadge}>lepší</span>}
      </div>
      <div className={styles.timestamps}>
        <div className={styles.timestampItem}>
          <span className={styles.timestampLabel}>Start</span>
          <span className={styles.timestampValue}>{formatTimestamp(dtStart)}</span>
        </div>
        <div className={styles.timestampItem}>
          <span className={styles.timestampLabel}>Cíl</span>
          <span className={styles.timestampValue}>{formatTimestamp(dtFinish)}</span>
        </div>
      </div>
      {gates && gates.length > 0 && (
        <div className={styles.gatesSection}>
          <GatePenalties gates={gates} />
        </div>
      )}
    </div>
  );
}

export function RunDetailExpand({ detail, isLoading, isBestRun, athleteName, betterRunNr }: RunDetailExpandProps) {
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

  // For BR races, show both runs side by side
  if (isBestRun && (detail.gates || detail.prevGates)) {
    // Determine which run's data goes where
    const run1 = betterRunNr === 1
      ? { dt: detail.dtStart, dtF: detail.dtFinish, gates: detail.gates }
      : { dt: detail.prevDtStart ?? null, dtF: detail.prevDtFinish ?? null, gates: detail.prevGates ?? null };
    const run2 = betterRunNr === 2
      ? { dt: detail.dtStart, dtF: detail.dtFinish, gates: detail.gates }
      : { dt: detail.prevDtStart ?? null, dtF: detail.prevDtFinish ?? null, gates: detail.prevGates ?? null };

    return (
      <div className={styles.container}>
        {athleteName && (
          <div className={styles.detailHeader}>{athleteName}</div>
        )}
        <div className={styles.runsGrid}>
          <RunSection
            label="1. jízda"
            isBetter={betterRunNr === 1}
            dtStart={run1.dt}
            dtFinish={run1.dtF}
            gates={run1.gates}
          />
          <RunSection
            label="2. jízda"
            isBetter={betterRunNr === 2}
            dtStart={run2.dt}
            dtFinish={run2.dtF}
            gates={run2.gates}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with athlete name for context */}
      {athleteName && (
        <div className={styles.detailHeader}>
          {athleteName}
          {isBestRun && <span className={styles.runLabel}> — brankový průběh</span>}
        </div>
      )}

      {/* Timestamps */}
      <div className={styles.timestamps}>
        <div className={styles.timestampItem}>
          <span className={styles.timestampLabel}>Start</span>
          <span className={styles.timestampValue}>{formatTimestamp(detail.dtStart)}</span>
        </div>
        <div className={styles.timestampItem}>
          <span className={styles.timestampLabel}>Cíl</span>
          <span className={styles.timestampValue}>{formatTimestamp(detail.dtFinish)}</span>
        </div>
        {detail.courseGateCount !== null && (
          <div className={styles.timestampItem}>
            <span className={styles.timestampLabel}>Branek</span>
            <span className={styles.timestampValue}>{detail.courseGateCount}</span>
          </div>
        )}
      </div>

      {/* Gate penalties */}
      {detail.gates && detail.gates.length > 0 && (
        <div className={styles.gatesSection}>
          <div className={styles.gatesLabel}>Brankový průběh</div>
          <GatePenalties gates={detail.gates} />
        </div>
      )}
    </div>
  );
}
