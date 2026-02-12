/**
 * Public API Response Types
 *
 * These types define the structure of responses from the client-facing API.
 * All internal IDs are stripped, and C123-specific fields are abstracted.
 *
 * Reference: specs/006-client-api/data-model.md
 */

/**
 * Event status values (draft excluded from public API)
 */
export type PublicEventStatus =
  | 'startlist'
  | 'running'
  | 'finished'
  | 'official';

/**
 * Human-readable race type labels (mapped from C123 dis_id)
 */
export type PublicRaceType =
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
 * Gate type labels (mapped from course gate_config)
 */
export type PublicGateType = 'normal' | 'reverse' | 'unknown';

/**
 * Self-describing gate penalty object
 */
export interface PublicGate {
  /** Gate number (1-based) */
  number: number;
  /** Gate type derived from course config */
  type: PublicGateType;
  /** Penalty: 0 = clean, 2 = touch, 50 = miss, null = not yet passed */
  penalty: number | null;
}

/**
 * Public event (list item) - used in GET /api/v1/events
 */
export interface PublicEvent {
  /** Timekeeper-assigned identifier */
  eventId: string;
  /** Event name */
  mainTitle: string;
  /** Subtitle */
  subTitle: string | null;
  /** Venue location */
  location: string | null;
  /** ISO 8601 date */
  startDate: string | null;
  /** ISO 8601 date */
  endDate: string | null;
  /** Discipline: Slalom/Sprint/WildWater */
  discipline: string | null;
  /** Event status */
  status: PublicEventStatus;
}

/**
 * Public event detail - extends PublicEvent with facility field
 * Used in GET /api/v1/events/:eventId
 */
export interface PublicEventDetail extends PublicEvent {
  /** Venue name */
  facility: string | null;
}

/**
 * Public category
 */
export interface PublicCategory {
  /** Category code (e.g., ZS, ZM) */
  catId: string;
  /** Display name */
  name: string;
  /** Youngest birth year */
  firstYear: number | null;
  /** Oldest birth year */
  lastYear: number | null;
}

/**
 * Public class with categories
 */
export interface PublicClass {
  /** Class identifier (e.g., K1M-ZS) */
  classId: string;
  /** Short name (e.g., K1M) */
  name: string;
  /** Full name */
  longTitle: string | null;
  /** Age categories in this class */
  categories: PublicCategory[];
}

/**
 * Aggregated category (for category filter endpoint)
 * Same as PublicCategory but with classIds array
 */
export interface PublicAggregatedCategory extends PublicCategory {
  /** List of class IDs containing this category */
  classIds: string[];
}

/**
 * Public race
 */
export interface PublicRace {
  /** Race identifier */
  raceId: string;
  /** Parent class ID */
  classId: string;
  /** Human-readable race type */
  raceType: PublicRaceType;
  /** Schedule position */
  raceOrder: number | null;
  /** Scheduled start (ISO 8601) */
  startTime: string | null;
  /** Race status code (1-12) */
  raceStatus: number;
}

/**
 * Public participant (embedded in results/startlist)
 */
export interface PublicParticipant {
  /** Bib number */
  bib: number | null;
  /** Registration ID (technology-transparent) */
  athleteId: string | null;
  /** Full name (formatted from familyName + givenName) */
  name: string;
  /** Club name */
  club: string | null;
  /** Country code */
  noc: string | null;
  /** Age category */
  catId: string | null;
  /** Team entry flag */
  isTeam: boolean;
}

/**
 * Public startlist entry
 */
export interface PublicStartlistEntry {
  /** Start order */
  startOrder: number | null;
  /** Bib number */
  bib: number | null;
  /** Registration ID */
  athleteId: string | null;
  /** Full name */
  name: string;
  /** Club name */
  club: string | null;
  /** Country code */
  noc: string | null;
  /** Age category */
  catId: string | null;
  /** Scheduled start time */
  startTime: string | null;
}

/**
 * Public result (standard mode)
 */
export interface PublicResult {
  /** Overall rank */
  rnk: number | null;
  /** Bib number */
  bib: number | null;
  /** Registration ID */
  athleteId: string | null;
  /** Full name */
  name: string;
  /** Club name */
  club: string | null;
  /** Country code */
  noc: string | null;
  /** Age category */
  catId: string | null;
  /** Category rank */
  catRnk: number | null;
  /** Run time (hundredths) */
  time: number | null;
  /** Total penalty (hundredths) */
  pen: number | null;
  /** Time + penalty */
  total: number | null;
  /** Gap to leader */
  totalBehind: string | null;
  /** Gap to category leader */
  catTotalBehind: string | null;
  /** DNS/DNF/DSQ/CAP or null */
  status: string | null;
}

/**
 * Public result (detailed mode) - extends standard with additional fields
 */
export interface PublicResultDetailed extends PublicResult {
  /** Actual start timestamp */
  dtStart: string | null;
  /** Actual finish timestamp */
  dtFinish: string | null;
  /** Self-describing gate penalties */
  gates: PublicGate[] | null;
  /** Total gates on course */
  courseGateCount: number | null;
}

/**
 * Public result (multi-run mode) - extends with BR race fields
 */
export interface PublicResultMultiRun extends PublicResult {
  /** Which run was better (1 or 2) */
  betterRunNr: number | null;
  /** Best time of both runs */
  totalTotal: number | null;
  /** Other run time */
  prevTime: number | null;
  /** Other run penalty */
  prevPen: number | null;
  /** Other run total */
  prevTotal: number | null;
  /** Other run rank */
  prevRnk: number | null;
}

/**
 * Public on-course entry
 */
export interface PublicOnCourseEntry {
  /** Race identifier */
  raceId: string;
  /** Bib number */
  bib: number;
  /** Full name */
  name: string;
  /** Club name */
  club: string;
  /** Position on course */
  position: number;
  /** Self-describing gate progress */
  gates: PublicGate[];
  /** Finished flag */
  completed: boolean;
  /** Start timestamp */
  dtStart: string | null;
  /** Finish timestamp */
  dtFinish: string | null;
  /** Current time (hundredths) */
  time: number | null;
  /** Current penalty */
  pen: number;
  /** Current total */
  total: number | null;
  /** Live rank */
  rank: number | null;
  /** Time-to-beat difference */
  ttbDiff: string | null;
  /** TTB reference name */
  ttbName: string | null;
}
