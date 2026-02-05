/**
 * OnCourse entry representing a competitor currently on the water
 * Data is transient and stored in-memory only
 */
export interface OnCourseEntry {
  /** C123 participant ID (e.g., 60070.K1M.ZS) */
  participantId: string;

  /** C123 race ID (e.g., K1M-ZS_BR1_25) */
  raceId: string;

  /** Bib number */
  bib: number;

  /** Display name (FAMILY Given) */
  name: string;

  /** Club name */
  club: string;

  /** Position relative to finish (1 = closest to finish) */
  position: number;

  /** Gate penalty states: 0=clean, 2=touch, 50=missed, null=not passed */
  gates: (number | null)[];

  /** Whether competitor has finished */
  completed: boolean;

  /** Actual start timestamp (ISO time or null) */
  dtStart: string | null;

  /** Actual finish timestamp (ISO time or null) */
  dtFinish: string | null;

  /** Current running time in hundredths of a second */
  time: number | null;

  /** Accumulated penalty in hundredths of a second */
  pen: number;

  /** Running total (time + pen) in hundredths */
  total: number | null;

  /** Current provisional rank */
  rank: number | null;

  /** Time to beat difference (e.g., "+1.20" or "-0.50") */
  ttbDiff: string | null;

  /** Name of the leader being compared against */
  ttbName: string | null;
}

/**
 * Input data for creating/updating OnCourse entry
 */
export interface OnCourseInput {
  participantId: string;
  raceId: string;
  bib: number;
  name: string;
  club: string;
  position: number;
  gates: (number | null)[];
  dtStart: string | null;
  dtFinish: string | null;
  time: number | null;
  pen: number;
  total?: number | null;
  rank?: number | null;
  ttbDiff?: string | null;
  ttbName?: string | null;
}
