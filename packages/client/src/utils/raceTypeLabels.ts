/**
 * Czech label mapping for race types from the API.
 */

const RACE_TYPE_LABELS: Record<string, string> = {
  qualification: 'Kvalifikace',
  semifinal: 'Semifinále',
  final: 'Finále',
  'best-run-1': '1. jízda',
  'best-run-2': '2. jízda',
  training: 'Trénink',
  seeding: 'Seeding',
  'cross-heat': 'Kříž - Jízda',
  'cross-semifinal': 'Kříž - Semifinále',
  'cross-final': 'Kříž - Finále',
  unknown: 'Neznámý typ',
};

const BEST_RUN_TYPES = new Set(['best-run-1', 'best-run-2']);

/**
 * Get Czech label for a race type.
 */
export function getRaceTypeLabel(raceType: string): string {
  return RACE_TYPE_LABELS[raceType] ?? raceType;
}

/**
 * Check if a race type is a best-run format.
 */
export function isBestRunRace(raceType: string): boolean {
  return BEST_RUN_TYPES.has(raceType);
}
