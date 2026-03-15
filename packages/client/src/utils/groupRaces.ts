/**
 * Utility for grouping flat race arrays into class-based groups
 * for two-level navigation (class → round).
 */

import type { RaceInfo } from '../services/api';

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
 * Filter races for tab display:
 * - When both best-run-1 and best-run-2 exist, hide BR1 (BR2 has combined data)
 * - Keeps all other race types
 */
function getDisplayRaces(races: RaceInfo[]): RaceInfo[] {
  const hasBr2 = races.some((r) => r.raceType === 'best-run-2');
  if (!hasBr2) return races;

  return races.filter((r) => r.raceType !== 'best-run-1');
}
