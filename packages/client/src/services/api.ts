/**
 * API service for c123-live-mini
 *
 * Fetch wrapper for /api/v1 endpoints with error handling
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

/**
 * Event list item from API
 */
export interface EventListItem {
  id: number;
  eventId: string;
  mainTitle: string;
  subTitle: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
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
  id: number;
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
 * Category from API
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
  disId: string;
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
  participantId: string;
  name: string;
  club: string | null;
  noc: string | null;
  catId: string | null;
  catRnk: number | null;
  time: number | null;
  pen: number | null;
  total: number | null;
  totalBehind: string | null;
  status: string | null;
  gates?: number[];
  // Multi-run fields
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
    disId: string;
    raceStatus: number;
  };
  results: ResultEntry[];
}

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
