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
  options?: { catId?: string; detailed?: boolean; includeAllRuns?: boolean }
): Promise<ResultsResponse> {
  const params = new URLSearchParams();
  if (options?.catId) params.set('catId', options.catId);
  if (options?.detailed) params.set('detailed', 'true');
  if (options?.includeAllRuns) params.set('includeAllRuns', 'true');

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
