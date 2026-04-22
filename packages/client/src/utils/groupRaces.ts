/**
 * Utility for grouping flat race arrays into class-based groups
 * for two-level navigation (class → round).
 */

import type { RaceInfo } from '../services/api';

export interface DayInfo {
  date: string; // YYYY-MM-DD
  label: string; // "Pá 18.4." etc.
  raceIds: Set<string>;
}

/**
 * Format a Date as YYYY-MM-DD in the browser's local timezone.
 * Matches the `date` field format produced by {@link extractDays}.
 */
export function formatLocalDateYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Pick the day to auto-select when the user opens a multi-day event.
 *
 * Priority:
 *   1. Day whose date equals today (spectator at the venue — most common case).
 *   2. Day containing a race that's currently running (`raceStatus >= 2`).
 *   3. First upcoming day (today is before the event).
 *   4. First day (today is after the event, or no other signal).
 *
 * @param days      Sorted list of event days (from {@link extractDays}). Must be non-empty.
 * @param races     All races in the event (used to look up raceStatus for priority 2).
 * @param now       Current time — injected for testability.
 * @returns         `DayInfo.date` of the day to auto-select, or `null` if `days` is empty.
 */
export function pickDefaultDay(
  days: DayInfo[],
  races: RaceInfo[],
  now: Date = new Date()
): string | null {
  if (days.length === 0) return null;

  const today = formatLocalDateYMD(now);

  // 1. Today matches one of the event days
  const todayDay = days.find((d) => d.date === today);
  if (todayDay) return todayDay.date;

  // 2. A race is currently running on some day
  const runningDay = days.find((d) =>
    races.some(
      (r) => d.raceIds.has(r.raceId) && r.raceStatus != null && r.raceStatus >= 2
    )
  );
  if (runningDay) return runningDay.date;

  // 3. First upcoming day (today is before the event — days are sorted ascending)
  const upcomingDay = days.find((d) => d.date > today);
  if (upcomingDay) return upcomingDay.date;

  // 4. Fallback: first day
  return days[0].date;
}

/**
 * Extract unique days from race startTimes.
 * Returns sorted array of DayInfo. If all races fall on same day, returns empty array.
 */
export function extractDays(races: RaceInfo[]): DayInfo[] {
  const dayMap = new Map<string, Set<string>>();

  for (const race of races) {
    if (!race.startTime) continue;
    const d = new Date(race.startTime);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = dayMap.get(key);
    if (existing) {
      existing.add(race.raceId);
    } else {
      dayMap.set(key, new Set([race.raceId]));
    }
  }

  if (dayMap.size <= 1) return [];

  const sorted = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  return sorted.map(([date, raceIds]) => {
    const d = new Date(date + 'T12:00:00');
    const dayName = dayNames[d.getDay()];
    const [, m, day] = date.split('-');
    return {
      date,
      label: `${dayName} ${parseInt(day)}.${parseInt(m)}.`,
      raceIds,
    };
  });
}

export interface ClassGroup {
  classId: string;
  races: RaceInfo[];
  /** Races filtered for tab display (BR1 hidden when BR2 exists) */
  displayRaces: RaceInfo[];
}

/**
 * Group a flat array of races by classId, sorted by raceOrder.
 *
 * - Groups races by classId
 * - Sorts classes by the first race's raceOrder (preserves schedule order)
 * - Sorts races within each class by raceOrder
 * - Races with null classId are grouped under "other"
 */
export function groupRaces(races: RaceInfo[]): ClassGroup[] {
  const groupMap = new Map<string, RaceInfo[]>();

  for (const race of races) {
    const key = race.classId || 'other';
    const group = groupMap.get(key);
    if (group) {
      group.push(race);
    } else {
      groupMap.set(key, [race]);
    }
  }

  // Sort races within each group by raceOrder
  for (const group of groupMap.values()) {
    group.sort((a, b) => (a.raceOrder ?? 0) - (b.raceOrder ?? 0));
  }

  // Convert to array and sort classes by first race's raceOrder
  const groups: ClassGroup[] = [];
  for (const [classId, classRaces] of groupMap) {
    groups.push({
      classId,
      races: classRaces,
      displayRaces: getDisplayRaces(classRaces),
    });
  }

  groups.sort((a, b) => {
    // Push unassigned/other groups to the end
    const aIsOther = a.classId === 'other' || a.classId === '';
    const bIsOther = b.classId === 'other' || b.classId === '';
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    return (a.races[0].raceOrder ?? 0) - (b.races[0].raceOrder ?? 0);
  });

  return groups;
}

/**
 * Single source of truth for parsing BR race IDs.
 * Format: {classId}_BR{N}_{suffix} where classId may contain underscores
 * (e.g. K1M_ST_BR1_6 → classPrefix=K1M_ST, run=1, suffix=6).
 */
const BR_RACE_ID_PATTERN = /^(.+)_(BR[12])_(.+)$/;

/**
 * Given a BR race ID, return the paired run's race ID
 * (BR1 ↔ BR2). Returns null if raceId is not a BR race.
 */
export function getPairedBrRaceId(raceId: string): string | null {
  const match = raceId.match(BR_RACE_ID_PATTERN);
  if (!match) return null;
  const [, classPrefix, runCode, suffix] = match;
  const pairedRunCode = runCode === 'BR1' ? 'BR2' : 'BR1';
  return `${classPrefix}_${pairedRunCode}_${suffix}`;
}

/**
 * Filter races for tab display:
 * - When both best-run-1 and best-run-2 exist, hide BR1 (BR2 has combined data)
 * - Keeps all other race types
 */
export function getDisplayRaces(races: RaceInfo[]): RaceInfo[] {
  const hasBr2 = races.some((r) => r.raceType === 'best-run-2');
  if (!hasBr2) return races;

  const filtered = races.filter((r) => r.raceType !== 'best-run-1');

  // Deduplicate BR2 races: keep only the one with the highest suffix per class.
  // raceId format: {classId}_BR{N}_{suffix} — classId may contain underscores,
  // so we must use regex, not split.
  const br2Races = filtered.filter((r) => r.raceType === 'best-run-2');
  if (br2Races.length <= 1) return filtered;

  let bestBr2: RaceInfo | null = null;
  let bestSuffix = -1;

  for (const r of br2Races) {
    const match = r.raceId.match(BR_RACE_ID_PATTERN);
    const suffix = match ? parseInt(match[3], 10) : 0;
    if (suffix > bestSuffix) {
      bestSuffix = suffix;
      bestBr2 = r;
    }
  }

  return filtered.filter(
    (r) => r.raceType !== 'best-run-2' || r === bestBr2
  );
}
