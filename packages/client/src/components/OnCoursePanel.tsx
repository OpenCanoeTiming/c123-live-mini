/**
 * OnCoursePanel Component
 *
 * Collapsible panel showing all athletes currently on the water across the entire event.
 * Displays gate progress, penalties, time-to-beat comparison, and provisional rank.
 *
 * Features:
 * - Collapse/expand toggle
 * - Sorted by position (1 = closest to finish)
 * - Shows gate-by-gate penalties via GatePenalties component
 * - Displays accumulated time, penalty, provisional rank
 * - Time-to-beat comparison (ahead/behind reference athlete)
 * - Hides when no athletes are on course
 */

import { Card, SectionHeader, Button } from '@czechcanoe/rvp-design-system';
import type { PublicOnCourseEntry } from '@c123-live-mini/shared';
import { GatePenalties } from './GatePenalties';
import { formatTime, formatPenalty } from '../utils/formatTime';

interface OnCoursePanelProps {
  oncourse: PublicOnCourseEntry[];
  isOpen: boolean;
  onToggle: () => void;
}

export function OnCoursePanel({ oncourse, isOpen, onToggle }: OnCoursePanelProps) {
  // Hide panel when no athletes on course
  if (oncourse.length === 0) {
    return null;
  }

  return (
    <Card>
      <SectionHeader
        title={`Na trati (${oncourse.length})`}
        action={
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isOpen ? 'Sbalit' : 'Rozbalit'}
          </Button>
        }
      />

      {isOpen && (
        <div style={{ marginTop: '1rem' }}>
          {oncourse.map((entry) => (
            <div
              key={`${entry.raceId}-${entry.bib}`}
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid var(--csk-color-border-secondary)',
              }}
            >
              {/* Athlete info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {entry.name} <span style={{ color: 'var(--csk-color-text-tertiary)' }}>({entry.bib})</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--csk-color-text-tertiary)' }}>
                    {entry.club}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {entry.rank !== null && (
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Průběžně #{entry.rank}
                    </div>
                  )}
                </div>
              </div>

              {/* Gate progress */}
              <div style={{ marginBottom: '0.5rem' }}>
                <GatePenalties gates={entry.gates} />
              </div>

              {/* Time and penalty */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--csk-color-text-tertiary)' }}>Čas:</span>{' '}
                  {entry.time !== null ? formatTime(entry.time) : '-'}
                </div>
                <div>
                  <span style={{ color: 'var(--csk-color-text-tertiary)' }}>Trest:</span>{' '}
                  {formatPenalty(entry.pen)}
                </div>
                <div>
                  <span style={{ color: 'var(--csk-color-text-tertiary)' }}>Celkem:</span>{' '}
                  {entry.total !== null ? formatTime(entry.total) : '-'}
                </div>
              </div>

              {/* Time-to-beat comparison */}
              {entry.ttbDiff && entry.ttbName && (
                <div style={{ fontSize: '0.75rem', color: 'var(--csk-color-text-tertiary)', marginTop: '0.25rem' }}>
                  {entry.ttbDiff.startsWith('+')
                    ? `${entry.ttbDiff} za ${entry.ttbName}`
                    : `${entry.ttbDiff} před ${entry.ttbName}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
