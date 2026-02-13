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
import styles from './OnCoursePanel.module.css';

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
        <div className={styles.panelContent}>
          {oncourse.map((entry) => (
            <div key={`${entry.raceId}-${entry.bib}`} className={styles.entry}>
              {/* Athlete info */}
              <div className={styles.athleteInfo}>
                <div>
                  <div className={styles.athleteName}>
                    {entry.name} <span className={styles.athleteBib}>({entry.bib})</span>
                  </div>
                  <div className={styles.athleteClub}>{entry.club}</div>
                </div>
                <div className={styles.rankInfo}>
                  {entry.rank !== null && (
                    <div className={styles.rankText}>Průběžně #{entry.rank}</div>
                  )}
                </div>
              </div>

              {/* Gate progress */}
              <div className={styles.gateProgress}>
                <GatePenalties gates={entry.gates} />
              </div>

              {/* Time and penalty */}
              <div className={styles.timeInfo}>
                <div>
                  <span className={styles.timeLabel}>Čas:</span>{' '}
                  {entry.time !== null ? formatTime(entry.time) : '-'}
                </div>
                <div>
                  <span className={styles.timeLabel}>Trest:</span>{' '}
                  {formatPenalty(entry.pen)}
                </div>
                <div>
                  <span className={styles.timeLabel}>Celkem:</span>{' '}
                  {entry.total !== null ? formatTime(entry.total) : '-'}
                </div>
              </div>

              {/* Time-to-beat comparison */}
              {entry.ttbDiff && entry.ttbName && (
                <div className={styles.ttbDiff}>
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
