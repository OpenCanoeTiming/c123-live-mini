/**
 * ScheduleView Component
 *
 * Displays the race program/schedule for an event.
 * Shows race times, class names, types, and status.
 * Highlights the currently active race.
 */

import { Card, SectionHeader, Badge } from '@czechcanoe/rvp-design-system';
import type { RaceInfo } from '../services/api';
import { getRaceTypeLabel } from '../utils/raceTypeLabels';
import styles from './ScheduleView.module.css';

interface ScheduleViewProps {
  races: RaceInfo[];
  classNameMap: Record<string, string>;
  currentRaceId?: string | null;
  onRaceClick?: (raceId: string) => void;
}

function formatStartTime(isoString: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function getRaceStatusBadge(raceStatus: number) {
  // raceStatus: 1=not started, 2-10=in progress, 11=unofficial, 12=official
  if (raceStatus >= 11) return <Badge variant="success" size="sm">Hotovo</Badge>;
  if (raceStatus >= 2) return <Badge variant="primary" size="sm">Probíhá</Badge>;
  return null;
}

export function ScheduleView({ races, classNameMap, currentRaceId, onRaceClick }: ScheduleViewProps) {
  // Sort by raceOrder
  const sorted = [...races].sort((a, b) => (a.raceOrder ?? 0) - (b.raceOrder ?? 0));

  return (
    <Card>
      <SectionHeader title="Program závodu" />
      <div className={styles.scheduleList}>
        {sorted.map((race) => {
          const className = classNameMap[race.classId ?? ''] ?? race.classId ?? '';
          const raceLabel = getRaceTypeLabel(race.raceType);
          const isCurrent = race.raceId === currentRaceId;

          return (
            <div
              key={race.raceId}
              className={`${styles.scheduleItem} ${isCurrent ? styles.currentRace : ''} ${onRaceClick ? styles.clickable : ''}`}
              onClick={onRaceClick ? () => onRaceClick(race.raceId) : undefined}
            >
              <div className={styles.timeCol}>
                <span className={styles.startTime}>{formatStartTime(race.startTime)}</span>
              </div>
              <div className={styles.infoCol}>
                <span className={styles.raceName}>{className}</span>
                <span className={styles.raceType}>{raceLabel}</span>
              </div>
              <div className={styles.statusCol}>
                {isCurrent && <Badge variant="primary" size="sm">Aktuální</Badge>}
                {!isCurrent && getRaceStatusBadge(race.raceStatus)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
