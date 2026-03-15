/**
 * OnCoursePanel Component
 *
 * Collapsible panel showing athletes currently on the water.
 * Compact layout: single-row with inline times, gate penalties below.
 */

import { Card, LiveIndicator, Badge } from '@czechcanoe/rvp-design-system';
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
  if (oncourse.length === 0) {
    return null;
  }

  return (
    <Card variant="aesthetic">
      <div className={styles.header}>
        <span className={styles.label}>Na trati</span>
        <LiveIndicator variant="live" size="sm" energyGlow />
        <Badge variant="default" size="sm">{oncourse.length}</Badge>
        <span className={styles.spacer} />
        <button
          className={styles.toggleButton}
          onClick={onToggle}
          aria-label={isOpen ? 'Sbalit panel' : 'Rozbalit panel'}
          aria-expanded={isOpen}
        >
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>›</span>
        </button>
      </div>

      {isOpen && (
        <div className={styles.panelContent}>
          {oncourse.map((entry) => (
            <div key={`${entry.raceId}-${entry.bib}`} className={styles.entry}>
              {/* Line 1: bib, name (club) ... time +pen = total #rank */}
              <div className={styles.mainRow}>
                <Badge variant="default" size="sm" pill>
                  {entry.bib}
                </Badge>
                <span className={styles.athleteName}>{entry.name}</span>
                {entry.club && (
                  <span className={styles.athleteClub}>({entry.club})</span>
                )}
                <span className={styles.spacer} />
                <span className={styles.inlineTime}>
                  {entry.pen != null && entry.pen > 0 ? (
                    <>
                      {formatTime(entry.time)}
                      <span className={styles.inlinePen}> +{formatPenalty(entry.pen)}</span>
                      <span className={styles.inlineTotal}> = {formatTime(entry.total)}</span>
                    </>
                  ) : (
                    <span className={styles.inlineTotal}>{entry.total !== null ? formatTime(entry.total) : '—'}</span>
                  )}
                </span>
                {entry.rank !== null && (
                  <Badge variant="primary" size="sm">#{entry.rank}</Badge>
                )}
              </div>
              {/* Line 2: gate penalties */}
              {entry.gates && entry.gates.length > 0 && (
                <div className={styles.gateRow}>
                  <GatePenalties gates={entry.gates} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
