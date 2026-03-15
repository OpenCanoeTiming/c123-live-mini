/**
 * RunDetailExpand Component
 *
 * Displays inline detail for a run below the result row.
 * Shows start/finish timestamps and gate-by-gate penalties.
 * For BR races, clearly labels which run's data is displayed.
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

export function RunDetailExpand({ detail, isLoading, isBestRun, athleteName }: RunDetailExpandProps) {
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
