/**
 * Utility for grouping flat race arrays into class-based groups
 * for two-level navigation (class → round).
 */

import type { RaceInfo } from '../services/api';

export interface ClassGroup {
  classId: string;
  races: RaceInfo[];
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
    const key = race.classId ?? 'other';
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
    groups.push({ classId, races: classRaces });
  }

  groups.sort(
    (a, b) => (a.races[0].raceOrder ?? 0) - (b.races[0].raceOrder ?? 0)
  );

  return groups;
}
