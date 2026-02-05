/**
 * Course (gate configuration for a race)
 */
export interface Course {
  /** Internal database ID */
  id: number;
  /** Course number (1-4) */
  courseNr: number;
  /** Number of gates */
  nrGates: number | null;
  /** Gate types configuration: N=normal, R=reverse */
  gateConfig: string | null;
}

/**
 * Course data for creation
 */
export interface CourseCreate {
  courseNr: number;
  nrGates?: number | null;
  gateConfig?: string | null;
}

/**
 * Parse gate configuration string into array
 * @param config Gate config string (e.g., "NNRNNNRNNNN")
 * @returns Array of gate types
 */
export function parseGateConfig(
  config: string | null
): Array<'N' | 'R'> | null {
  if (!config) return null;
  return config.split('').filter((c): c is 'N' | 'R' => c === 'N' || c === 'R');
}
