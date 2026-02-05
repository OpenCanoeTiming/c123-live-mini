/**
 * Result status codes
 * - null: OK (completed successfully)
 * - DNS: Did Not Start
 * - DNF: Did Not Finish
 * - DSQ: Disqualified
 * - CAP: Capsized
 */
export type ResultStatus = 'DNS' | 'DNF' | 'DSQ' | 'CAP' | null;

/**
 * Gate penalty values
 * - 0: Clean (no touch)
 * - 2: Touch (2 second penalty)
 * - 50: Missed (50 second penalty)
 * - null: Not yet passed (OnCourse only)
 */
export type GatePenalty = 0 | 2 | 50 | null;

/**
 * Race result for a participant
 */
export interface Result {
  /** Internal database ID */
  id: number;
  /** Race internal ID */
  raceId: number;
  /** Participant internal ID */
  participantId: number;
  /** Starting order */
  startOrder: number | null;
  /** Bib number */
  bib: number | null;
  /** Scheduled start time */
  startTime: string | null;
  /** Result status (null = OK) */
  status: ResultStatus;
  /** Actual start timestamp */
  dtStart: string | null;
  /** Actual finish timestamp */
  dtFinish: string | null;
  /** Run time in hundredths of seconds */
  time: number | null;
  /** Gate penalties as JSON array */
  gates: GatePenalty[] | null;
  /** Total penalty in hundredths */
  pen: number | null;
  /** Total time (time + pen) in hundredths */
  total: number | null;
  /** Overall rank */
  rnk: number | null;
  /** Rank order for ties */
  rnkOrder: number | null;
  /** Category rank */
  catRnk: number | null;
  /** Category rank order for ties */
  catRnkOrder: number | null;
  /** Gap to leader (display format) */
  totalBehind: string | null;
  /** Gap to category leader (display format) */
  catTotalBehind: string | null;
  /** Previous run time (BR2 only) */
  prevTime: number | null;
  /** Previous run penalty (BR2 only) */
  prevPen: number | null;
  /** Previous run total (BR2 only) */
  prevTotal: number | null;
  /** Previous run rank (BR2 only) */
  prevRnk: number | null;
  /** Best time of both runs (BR2 only) */
  totalTotal: number | null;
  /** Which run was better: 1 or 2 (BR2 only) */
  betterRunNr: number | null;
  /** Heat number (Cross discipline) */
  heatNr: number | null;
  /** Round number (Cross discipline) */
  roundNr: number | null;
  /** Qualification status (Cross discipline) */
  qualified: string | null;
}

/**
 * Result data for creation/update
 */
export interface ResultCreate {
  participantId: number;
  startOrder?: number | null;
  bib?: number | null;
  startTime?: string | null;
  status?: ResultStatus;
  dtStart?: string | null;
  dtFinish?: string | null;
  time?: number | null;
  gates?: GatePenalty[] | null;
  pen?: number | null;
  total?: number | null;
  rnk?: number | null;
  rnkOrder?: number | null;
  catRnk?: number | null;
  catRnkOrder?: number | null;
  totalBehind?: string | null;
  catTotalBehind?: string | null;
  prevTime?: number | null;
  prevPen?: number | null;
  prevTotal?: number | null;
  prevRnk?: number | null;
  totalTotal?: number | null;
  betterRunNr?: number | null;
  heatNr?: number | null;
  roundNr?: number | null;
  qualified?: string | null;
}

/**
 * Convert hundredths to display time (e.g., 8520 -> "85.20")
 */
export function formatTime(hundredths: number | null): string {
  if (hundredths === null) return '';
  const seconds = hundredths / 100;
  return seconds.toFixed(2);
}

/**
 * Convert penalty in hundredths to display (e.g., 200 -> "2")
 */
export function formatPenalty(hundredths: number | null): string {
  if (hundredths === null || hundredths === 0) return '';
  return String(hundredths / 100);
}
