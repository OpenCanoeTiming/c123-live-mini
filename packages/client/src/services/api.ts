/**
 * API service for c123-live-mini
 *
 * Fetch wrapper for /api/v1 endpoints with error handling.
 * Uses Public types from shared package.
 */

import type {
  PublicEvent,
  PublicEventDetail,
  PublicClass,
  PublicRace,
  PublicResult,
  PublicResultMultiRun,
  PublicAggregatedCategory,
  PublicStartlistEntry,
  PublicOnCourseEntry,
} from '@c123-live-mini/shared';
import { getPairedBrRaceId } from '../utils/groupRaces';

const API_BASE = '/api/v1';

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new ApiError(
      `API error: ${response.statusText}`,
      response.status
    );
  }

  return response.json();
}

// --- Type Re-exports for convenience ---

export type EventListItem = PublicEvent;
export type EventDetail = PublicEventDetail;
export type ClassInfo = PublicClass;
export type RaceInfo = PublicRace;
export type CategoryInfo = PublicAggregatedCategory;
export type StartlistEntry = PublicStartlistEntry;

/**
 * Display row for startlist tables.
 *
 * For non-BR races, only `startTime` is set; `run1StartTime`/`run2StartTime`
 * are absent and the table renders a single "Start" column.
 *
 * For BR (best-of-two-runs) races, both `run1StartTime` and `run2StartTime`
 * are present (either may be `null` if a participant only appears in one run)
 * and the table renders two columns "B1" / "B2". `startTime` retains the
 * queried race's start time for backward compat.
 */
export interface StartlistDisplayRow extends StartlistEntry {
  run1StartTime?: string | null;
  run2StartTime?: string | null;
}

/**
 * Result entry - combines standard, multi-run, and detailed fields
 * Server returns different optional fields based on query params (detailed, includeAllRuns)
 */
export interface ResultEntry extends PublicResult {
  // Multi-run fields (when includeAllRuns=true for BR races)
  betterRunNr?: number | null;
  totalTotal?: number | null;
  prevTime?: number | null;
  prevPen?: number | null;
  prevTotal?: number | null;
  prevRnk?: number | null;
  // Detailed fields (when detailed=true)
  dtStart?: string | null;
  dtFinish?: string | null;
  gates?: import('@c123-live-mini/shared').PublicGate[] | null;
  courseGateCount?: number | null;
  // Previous run detailed fields (BR races with detailed=true)
  prevDtStart?: string | null;
  prevDtFinish?: string | null;
  prevGates?: import('@c123-live-mini/shared').PublicGate[] | null;
}

/**
 * Event list response
 */
interface EventsListResponse {
  events: PublicEvent[];
}

/**
 * Event detail response
 */
interface EventDetailResponse {
  event: PublicEventDetail;
  classes: PublicClass[];
  races: PublicRace[];
}

/**
 * Race results response
 */
export interface ResultsResponse {
  race: {
    raceId: string;
    classId: string;
    raceType: string;
    raceStatus: number;
  };
  results: ResultEntry[];
}

/**
 * Startlist response
 */
interface StartlistResponse {
  race: {
    raceId: string;
    classId: string;
    raceType: string;
    raceStatus: number;
  };
  startlist: PublicStartlistEntry[];
}

/**
 * Categories response
 */
interface CategoriesResponse {
  categories: PublicAggregatedCategory[];
}

// --- API Functions ---

/**
 * Get list of all events
 */
export async function getEvents(): Promise<EventListItem[]> {
  const response = await fetchApi<EventsListResponse>('/events');
  return response.events;
}

/**
 * Get event details with classes and races
 */
export async function getEventDetails(
  eventId: string
): Promise<EventDetailResponse> {
  return fetchApi<EventDetailResponse>(`/events/${eventId}`);
}

/**
 * Get results for a specific race
 */
export async function getEventResults(
  eventId: string,
  raceId: string,
  options?: { catId?: string; detailed?: boolean }
): Promise<ResultsResponse> {
  const params = new URLSearchParams();
  if (options?.catId) params.set('catId', options.catId);
  if (options?.detailed) params.set('detailed', 'true');

  const queryString = params.toString();
  const endpoint = `/events/${eventId}/results/${raceId}${queryString ? `?${queryString}` : ''}`;

  return fetchApi<ResultsResponse>(endpoint);
}

/**
 * Get startlist for a specific race
 */
export async function getStartlist(
  eventId: string,
  raceId: string
): Promise<StartlistEntry[]> {
  const response = await fetchApi<StartlistResponse>(
    `/events/${eventId}/startlist/${raceId}`
  );
  return response.startlist;
}

/**
 * Build a stable merge key for joining BR1 and BR2 startlist entries.
 *
 * Prefers `athleteId` (= ICFId from C123 XML, stable across re-ingests).
 * Falls back to `bib|catId|name` for participants without an ICF ID
 * (typical at local races).
 */
function startlistMergeKey(entry: StartlistEntry): string {
  if (entry.athleteId) return `aid:${entry.athleteId}`;
  return `fb:${entry.bib ?? '_'}|${entry.catId ?? '_'}|${entry.name}`;
}

/**
 * Union-merge startlists for BR1 and BR2 of the same race.
 *
 * - `queried` rows come first, in their existing `start_order` (typically
 *   BR2 in reverse-of-BR1 order — what spectators expect on the BR2 tab).
 * - Rows present only in `paired` (e.g. an athlete who DNS'd run 2 but
 *   ran run 1) are appended below, preserving the paired race's
 *   `start_order` so they render in a sensible sequence.
 *
 * Each output row has both `run1StartTime` and `run2StartTime` populated;
 * either may be `null` when the athlete only appears in one run.
 */
function mergeBrStartlists(
  queried: StartlistEntry[],
  paired: StartlistEntry[],
  queriedRunCode: 'BR1' | 'BR2'
): StartlistDisplayRow[] {
  const pairedByKey = new Map<string, StartlistEntry>();
  for (const entry of paired) {
    pairedByKey.set(startlistMergeKey(entry), entry);
  }

  const seen = new Set<string>();
  const rows: StartlistDisplayRow[] = [];

  for (const entry of queried) {
    const key = startlistMergeKey(entry);
    seen.add(key);
    const other = pairedByKey.get(key) ?? null;
    rows.push({
      ...entry,
      run1StartTime:
        queriedRunCode === 'BR1' ? entry.startTime : (other?.startTime ?? null),
      run2StartTime:
        queriedRunCode === 'BR2' ? entry.startTime : (other?.startTime ?? null),
    });
  }

  // Append paired-only rows (athletes present only in the paired run).
  for (const entry of paired) {
    const key = startlistMergeKey(entry);
    if (seen.has(key)) continue;
    rows.push({
      ...entry,
      run1StartTime:
        queriedRunCode === 'BR2' ? entry.startTime : null,
      run2StartTime:
        queriedRunCode === 'BR1' ? entry.startTime : null,
    });
  }

  return rows;
}

/**
 * Get startlist for a race, transparently merging both runs for BR races.
 *
 * - Non-BR race → identical to `getStartlist`.
 * - BR race → fetches the paired BR run in parallel and unions by
 *   athlete (see `mergeBrStartlists`). If the paired race fails (e.g.
 *   not yet ingested), the response degrades gracefully to the
 *   queried race's data only — `run1StartTime`/`run2StartTime` will
 *   contain whatever is known.
 */
export async function getStartlistMaybeBr(
  eventId: string,
  raceId: string
): Promise<StartlistDisplayRow[]> {
  const pairedRaceId = getPairedBrRaceId(raceId);

  if (!pairedRaceId) {
    // Non-BR race: identity (rows have no run1/run2 fields).
    return getStartlist(eventId, raceId);
  }

  const queriedRunCode: 'BR1' | 'BR2' = raceId.includes('_BR1_') ? 'BR1' : 'BR2';

  const [queried, paired] = await Promise.all([
    getStartlist(eventId, raceId),
    getStartlist(eventId, pairedRaceId).catch(() => [] as StartlistEntry[]),
  ]);

  return mergeBrStartlists(queried, paired, queriedRunCode);
}

/**
 * Get categories for an event
 */
export async function getCategories(
  eventId: string
): Promise<CategoryInfo[]> {
  const response = await fetchApi<CategoriesResponse>(
    `/events/${eventId}/categories`
  );
  return response.categories;
}

export type OnCourseEntry = PublicOnCourseEntry;

/**
 * OnCourse response
 */
interface OnCourseResponse {
  oncourse: PublicOnCourseEntry[];
}

/**
 * Get on-course entries for an event
 */
export async function getOnCourse(eventId: string): Promise<PublicOnCourseEntry[]> {
  const response = await fetchApi<OnCourseResponse>(
    `/events/${eventId}/oncourse`
  );
  return response.oncourse;
}
