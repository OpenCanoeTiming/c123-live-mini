/**
 * Event status in the timing system lifecycle
 */
export type EventStatus =
  | 'draft'
  | 'startlist'
  | 'running'
  | 'finished'
  | 'official';

/**
 * Canoe discipline types
 */
export type Discipline = 'Slalom' | 'Sprint' | 'WildWater';

/**
 * Event data from the timing system
 */
export interface Event {
  /** Internal database ID */
  id: number;
  /** C123 EventId (e.g., CZE2.2024062500) */
  eventId: string;
  /** Event main title */
  mainTitle: string;
  /** Event subtitle (optional) */
  subTitle: string | null;
  /** Venue location */
  location: string | null;
  /** Venue facility name */
  facility: string | null;
  /** Event start date (ISO 8601) */
  startDate: string | null;
  /** Event end date (ISO 8601) */
  endDate: string | null;
  /** Canoe discipline */
  discipline: Discipline | null;
  /** Current event status */
  status: EventStatus;
  /** Event creation timestamp */
  createdAt: string;
}

/**
 * Event data for creation (without server-generated fields)
 */
export interface EventCreate {
  eventId: string;
  mainTitle: string;
  subTitle?: string | null;
  location?: string | null;
  facility?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  discipline?: Discipline | null;
}

/**
 * Event with API key (returned on creation)
 */
export interface EventWithApiKey extends Event {
  apiKey: string;
}
