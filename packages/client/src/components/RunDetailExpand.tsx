/**
 * RunDetailExpand Component
 *
 * Displays inline detail for a single run below the result row.
 * Shows start/finish timestamps and gate-by-gate penalties.
 *
 * Features:
 * - Loading state while fetching detailed data
 * - Timestamps formatted for readability
 * - Gate penalties visualized via GatePenalties component
 * - Mobile-friendly layout (timestamps on one line, gates wrap/scroll)
 */

import { SkeletonCard } from '@czechcanoe/rvp-design-system';
import type { RunDetailData } from '../hooks/useEventLiveState';
import { GatePenalties } from './GatePenalties';
import styles from './RunDetailExpand.module.css';

interface RunDetailExpandProps {
  detail: RunDetailData | null;
  isLoading: boolean;
}

/**
 * Format ISO timestamp to readable time (HH:MM:SS.mmm)
 *
 * Note: Uses browser local timezone. For production, consider using event timezone
 * or UTC to ensure consistent display across different user locations.
 */
function formatTimestamp(isoString: string | null): string {
  if (!isoString) return '-';

  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');

  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export function RunDetailExpand({ detail, isLoading }: RunDetailExpandProps) {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <SkeletonCard />
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Timestamps */}
      <div className={styles.timestamps}>
        <div>
          <span className={styles.timestampLabel}>Start:</span>{' '}
          {formatTimestamp(detail.dtStart)}
        </div>
        <div>
          <span className={styles.timestampLabel}>Cíl:</span>{' '}
          {formatTimestamp(detail.dtFinish)}
        </div>
        {detail.courseGateCount !== null && (
          <div>
            <span className={styles.timestampLabel}>Branek:</span>{' '}
            {detail.courseGateCount}
          </div>
        )}
      </div>

      {/* Gate penalties */}
      {detail.gates && detail.gates.length > 0 && (
        <div>
          <div className={styles.gatesLabel}>Brankový průběh:</div>
          <GatePenalties gates={detail.gates} />
        </div>
      )}
    </div>
  );
}
