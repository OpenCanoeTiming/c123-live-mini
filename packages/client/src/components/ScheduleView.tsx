/**
 * ScheduleView Component
 *
 * Displays the race program/schedule for an event.
 * Groups races by day, shows correct per-race status badges.
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

function formatDayHeader(isoString: string): string {
  const date = new Date(isoString + 'T00:00:00');
  if (isNaN(date.getTime())) return isoString;
  const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const dayName = dayNames[date.getDay()];
  return `${dayName} ${date.getDate()}.${date.getMonth() + 1}.`;
}

function getRaceStatusBadge(raceStatus: number, isCurrent: boolean) {
  if (isCurrent) return <Badge variant="primary" size="sm">Aktuální</Badge>;
  if (raceStatus >= 12) return <Badge variant="success" size="sm">Oficiální</Badge>;
  if (raceStatus >= 11) return <Badge variant="default" size="sm">Neoficiální</Badge>;
  if (raceStatus >= 4) return <Badge variant="default" size="sm">Neoficiální</Badge>;
  if (raceStatus >= 2) return <Badge variant="primary" size="sm">Probíhá</Badge>;
  return null;
}

interface DayGroup {
  date: string;
  races: RaceInfo[];
}

function groupByDay(races: RaceInfo[]): DayGroup[] {
  const groups = new Map<string, RaceInfo[]>();

  for (const race of races) {
    let dateKey = '__unknown__';
    if (race.startTime) {
      const d = new Date(race.startTime);
      if (!isNaN(d.getTime())) {
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(race);
    } else {
      groups.set(dateKey, [race]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRaces]) => ({ date, races: dayRaces }));
}

export function ScheduleView({ races, classNameMap, currentRaceId, onRaceClick }: ScheduleViewProps) {
  const sorted = [...races].sort((a, b) => (a.raceOrder ?? 0) - (b.raceOrder ?? 0));
  const dayGroups = groupByDay(sorted);
  const hasMultipleDays = dayGroups.length > 1 || (dayGroups.length === 1 && dayGroups[0].date !== '__unknown__');

  const renderRaceItem = (race: RaceInfo) => {
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
          {getRaceStatusBadge(race.raceStatus, isCurrent)}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <SectionHeader title="Program závodu" />
      <div className={styles.scheduleList}>
        {hasMultipleDays
          ? dayGroups.map((group) => (
              <div key={group.date}>
                {group.date !== '__unknown__' && (
                  <div className={styles.dayHeader}>{formatDayHeader(group.date)}</div>
                )}
                {group.races.map(renderRaceItem)}
              </div>
            ))
          : sorted.map(renderRaceItem)
        }
      </div>
    </Card>
  );
}
