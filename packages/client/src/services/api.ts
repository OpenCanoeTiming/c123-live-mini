/**
 * API service for c123-live-mini
 *
 * Fetch wrapper for /api/v1 endpoints with error handling.
 * Types match Feature #6 Client API responses.
 */

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

// --- Types ---

/**
 * Event list item from API
 */
export interface EventListItem {
  eventId: string;
  mainTitle: string;
  subTitle: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  discipline: string | null;
  status: string;
}

/**
 * Event list response
 */
interface EventsListResponse {
  events: EventListItem[];
}

/**
 * Event detail from API
 */
export interface EventDetail {
  eventId: string;
  mainTitle: string;
  subTitle: string | null;
  location: string | null;
  facility: string | null;
  startDate: string | null;
  endDate: string | null;
  discipline: string | null;
  status: string;
}

/**
 * Category from API (class-level)
 */
export interface Category {
  catId: string;
  name: string;
  firstYear: number | null;
  lastYear: number | null;
}

/**
 * Class from API
 */
export interface ClassInfo {
  classId: string;
  name: string;
  categories: Category[];
}

/**
 * Race from API
 */
export interface RaceInfo {
  raceId: string;
  classId: string | null;
  raceType: string;
  raceOrder: number | null;
  startTime: string | null;
  raceStatus: number;
}

/**
 * Event detail response
 */
interface EventDetailResponse {
  event: EventDetail;
  classes: ClassInfo[];
  races: RaceInfo[];
}

/**
 * Result entry from API
 */
export interface ResultEntry {
  rnk: number | null;
  bib: number | null;
  athleteId: string | null;
  name: string;
  club: string | null;
  noc: string | null;
  catId: string | null;
  catRnk: number | null;
  catTotalBehind: string | null;
  time: number | null;
  pen: number | null;
  total: number | null;
  totalBehind: string | null;
  status: string | null;
  // Multi-run (best-run) fields
  betterRunNr?: number | null;
  totalTotal?: number | null;
  prevTime?: number | null;
  prevPen?: number | null;
  prevTotal?: number | null;
  prevRnk?: number | null;
}

/**
 * Race results response
 */
export interface ResultsResponse {
  race: {
    raceId: string;
    classId: string | null;
    raceType: string;
    raceStatus: number;
  };
  results: ResultEntry[];
}

/**
 * Startlist entry from API
 */
export interface StartlistEntry {
  bib: number | null;
  athleteId: string | null;
  name: string;
  club: string | null;
  noc: string | null;
  catId: string | null;
  startNr: number | null;
  startTime: string | null;
}

/**
 * Startlist response
 */
interface StartlistResponse {
  race: {
    raceId: string;
    classId: string | null;
    raceType: string;
    raceStatus: number;
  };
  startlist: StartlistEntry[];
}

/**
 * Category info from /categories endpoint
 */
export interface CategoryInfo {
  catId: string;
  name: string;
  classIds: string[];
}

/**
 * Categories response
 */
interface CategoriesResponse {
  categories: CategoryInfo[];
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
