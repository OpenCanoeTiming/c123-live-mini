/**
 * OnCoursePanel Component
 *
 * Collapsible panel showing all athletes currently on the water across the entire event.
 * Displays gate progress, penalties, time-to-beat comparison, and provisional rank.
 *
 * Features:
 * - Collapse/expand toggle with chevron icon
 * - Sorted by position (1 = closest to finish)
 * - Shows gate-by-gate penalties via GatePenalties component
 * - Displays accumulated time, penalty, provisional rank
 * - Time-to-beat comparison (ahead/behind reference athlete) with color coding
 * - LiveIndicator in header to signal live nature
 * - Hides when no athletes are on course
 */

import { Card, SectionHeader, Badge, LiveIndicator } from '@czechcanoe/rvp-design-system';
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
        title="Na trati"
        badge={
          <span className={styles.headerBadges}>
            <LiveIndicator variant="live" color="success" size="sm" pulse />
            <Badge variant="info" size="sm" pill>
              {oncourse.length}
            </Badge>
          </span>
        }
        action={
          <button
            className={styles.toggleButton}
            onClick={onToggle}
            aria-label={isOpen ? 'Sbalit panel' : 'Rozbalit panel'}
            aria-expanded={isOpen}
          >
            <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>›</span>
          </button>
        }
      />

      {isOpen && (
        <div className={styles.panelContent}>
          {oncourse.map((entry) => (
            <div key={`${entry.raceId}-${entry.bib}`} className={styles.entry}>
              {/* Athlete info row */}
              <div className={styles.athleteInfo}>
                <div className={styles.athleteIdentity}>
                  <Badge variant="default" size="sm" pill>
                    {entry.bib}
                  </Badge>
                  <span className={styles.athleteName}>{entry.name}</span>
                </div>
                {entry.rank !== null && (
                  <Badge variant="primary" size="sm">
                    #{entry.rank}
                  </Badge>
                )}
              </div>

              {/* Club */}
              {entry.club && (
                <div className={styles.athleteClub}>{entry.club}</div>
              )}

              {/* Gate progress */}
              <div className={styles.gateProgress}>
                <GatePenalties gates={entry.gates} />
              </div>

              {/* Time / penalty / total row */}
              <div className={styles.timeRow}>
                <div className={styles.timeCell}>
                  <span className={styles.timeLabel}>Čas</span>
                  <span className={styles.timeValue}>
                    {entry.time !== null ? formatTime(entry.time) : '—'}
                  </span>
                </div>
                <div className={styles.timeDivider} />
                <div className={styles.timeCell}>
                  <span className={styles.timeLabel}>Trest</span>
                  <span className={styles.timeValue}>{formatPenalty(entry.pen)}</span>
                </div>
                <div className={styles.timeDivider} />
                <div className={styles.timeCell}>
                  <span className={styles.timeLabel}>Celkem</span>
                  <span className={`${styles.timeValue} ${styles.timeValueTotal}`}>
                    {entry.total !== null ? formatTime(entry.total) : '—'}
                  </span>
                </div>
              </div>

              {/* Time-to-beat comparison */}
              {entry.ttbDiff && entry.ttbName && (
                <div
                  className={`${styles.ttbRow} ${
                    entry.ttbDiff.startsWith('+') ? styles.ttbBehind : styles.ttbAhead
                  }`}
                >
                  <span className={styles.ttbDiff}>{entry.ttbDiff}</span>
                  <span className={styles.ttbLabel}>
                    {entry.ttbDiff.startsWith('+')
                      ? `za ${entry.ttbName}`
                      : `před ${entry.ttbName}`}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
