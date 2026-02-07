/**
 * Race Type Mapping Utility
 *
 * Maps C123 dis_id codes to human-readable race type labels.
 * These labels are technology-transparent and stored in the database.
 *
 * Reference: specs/006-client-api/research.md R1
 */

/**
 * Human-readable race type labels
 */
export type RaceType =
  | 'best-run-1'
  | 'best-run-2'
  | 'training'
  | 'seeding'
  | 'qualification'
  | 'semifinal'
  | 'final'
  | 'cross-trial'
  | 'cross-heat'
  | 'cross-semifinal'
  | 'cross-final'
  | 'cross-extra'
  | 'unknown';

/**
 * Mapping from C123 dis_id codes to human-readable labels
 */
const DIS_ID_TO_RACE_TYPE: Record<string, RaceType> = {
  BR1: 'best-run-1',
  BR2: 'best-run-2',
  TSR: 'training',
  SR: 'seeding',
  QUA: 'qualification',
  SEM: 'semifinal',
  FIN: 'final',
  XT: 'cross-trial',
  X4: 'cross-heat',
  XS: 'cross-semifinal',
  XF: 'cross-final',
  XER: 'cross-extra',
};

/**
 * Map a C123 dis_id code to a human-readable race type label
 *
 * @param disId - C123 run type identifier (e.g., BR1, QUA, FIN)
 * @returns Human-readable race type label
 */
export function mapDisIdToRaceType(disId: string): RaceType {
  return DIS_ID_TO_RACE_TYPE[disId] ?? 'unknown';
}

/**
 * Get all valid dis_id codes
 */
export function getValidDisIds(): string[] {
  return Object.keys(DIS_ID_TO_RACE_TYPE);
}

/**
 * Check if a dis_id is valid (known)
 */
export function isValidDisId(disId: string): boolean {
  return disId in DIS_ID_TO_RACE_TYPE;
}
