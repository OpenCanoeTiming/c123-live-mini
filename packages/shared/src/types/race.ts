/**
 * Race status codes from C123 (1-12 enum)
 */
export type RaceStatus =
  | 1 // Scheduled
  | 2 // Announced
  | 3 // StartListOK
  | 4 // ComingUp
  | 5 // OnStart
  | 6 // Recalled
  | 7 // Running
  | 8 // InProgress
  | 9 // OnHold
  | 10 // Completed
  | 11 // Final
  | 12; // Cancelled

/**
 * Race status display names
 */
export const RACE_STATUS_NAMES: Record<RaceStatus, string> = {
  1: 'Scheduled',
  2: 'Announced',
  3: 'Startlist Ready',
  4: 'Coming Up',
  5: 'On Start',
  6: 'Recalled',
  7: 'Running',
  8: 'In Progress',
  9: 'On Hold',
  10: 'Unofficial',
  11: 'Official',
  12: 'Cancelled',
};

/**
 * Run type identifier
 */
export type DisId =
  | 'BR1'
  | 'BR2'
  | 'TSR'
  | 'SR'
  | 'QUA'
  | 'SEM'
  | 'FIN'
  | 'XT'
  | 'X4'
  | 'XS'
  | 'XF'
  | 'XER';

/**
 * Race (scheduled run within an event)
 */
export interface Race {
  /** Internal database ID */
  id: number;
  /** C123 RaceId (e.g., K1M-ZS_BR1_25) */
  raceId: string;
  /** Class internal ID */
  classId: number | null;
  /** Run type */
  disId: string;
  /** Schedule order */
  raceOrder: number | null;
  /** Scheduled start time (ISO 8601) */
  startTime: string | null;
  /** Interval between starts */
  startInterval: string | null;
  /** Course number (1-4) */
  courseNr: number | null;
  /** Race status code */
  raceStatus: RaceStatus;
}

/**
 * Race data for creation
 */
export interface RaceCreate {
  raceId: string;
  classId?: number | null;
  disId: string;
  raceOrder?: number | null;
  startTime?: string | null;
  startInterval?: string | null;
  courseNr?: number | null;
  raceStatus?: RaceStatus;
}
