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

interface RunDetailExpandProps {
  detail: RunDetailData | null;
  isLoading: boolean;
}

/**
 * Format ISO timestamp to readable time (HH:MM:SS.mmm)
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
      <div style={{ padding: '0.75rem' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div
      style={{
        padding: '0.75rem',
        backgroundColor: 'var(--csk-color-bg-secondary)',
        borderTop: '1px solid var(--csk-color-border-secondary)',
      }}
    >
      {/* Timestamps */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
        <div>
          <span style={{ color: 'var(--csk-color-text-tertiary)' }}>Start:</span>{' '}
          {formatTimestamp(detail.dtStart)}
        </div>
        <div>
          <span style={{ color: 'var(--csk-color-text-tertiary)' }}>Cíl:</span>{' '}
          {formatTimestamp(detail.dtFinish)}
        </div>
        {detail.courseGateCount !== null && (
          <div>
            <span style={{ color: 'var(--csk-color-text-tertiary)' }}>Branek:</span>{' '}
            {detail.courseGateCount}
          </div>
        )}
      </div>

      {/* Gate penalties */}
      {detail.gates && detail.gates.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--csk-color-text-tertiary)', marginBottom: '0.25rem' }}>
            Brankový průběh:
          </div>
          <GatePenalties gates={detail.gates} />
        </div>
      )}
    </div>
  );
}
