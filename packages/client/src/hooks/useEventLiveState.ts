/**
 * useEventLiveState Reducer Hook
 *
 * Manages client-side live state for a single event, applying WebSocket messages
 * and REST data updates via a reducer pattern.
 *
 * State includes:
 * - Event details, classes, races, categories (structure)
 * - Results by race ID (cached)
 * - On-course entries (event-wide)
 * - Detailed run data (cached for expanded rows)
 *
 * Actions:
 * - SET_INITIAL: Load initial REST data
 * - WS_FULL: Replace entire event structure
 * - WS_DIFF: Apply incremental updates (upsert results, replace oncourse)
 * - WS_REFRESH: Clear cached state
 * - SET_RESULTS: Cache results for a race
 * - SET_ONCOURSE: Update oncourse entries
 * - CACHE_DETAILED: Store detailed run data
 */

import { useReducer } from 'react';
import type {
  PublicEventDetail,
  PublicClass,
  PublicRace,
  PublicAggregatedCategory,
  PublicResult,
  PublicOnCourseEntry,
  PublicResultDetailed,
  WsFullPayload,
  WsDiffPayload,
} from '@c123-live-mini/shared';

/**
 * Detailed run data for expanded rows
 */
export interface RunDetailData {
  time: number | null;
  pen: number | null;
  total: number | null;
  gates: PublicResultDetailed['gates'];
  // Previous run data (for BR races)
  prevTime?: number | null;
  prevPen?: number | null;
  prevTotal?: number | null;
  prevGates?: PublicResultDetailed['gates'];
}

/**
 * Live state for a single event
 */
export interface EventLiveState {
  event: PublicEventDetail | null;
  classes: PublicClass[];
  races: PublicRace[];
  categories: PublicAggregatedCategory[];
  resultsByRace: Record<string, PublicResult[]>;
  oncourse: PublicOnCourseEntry[];
  detailedCache: Record<string, RunDetailData>; // Key: `${raceId}-${bib}`
}

/**
 * Initial empty state
 */
const initialState: EventLiveState = {
  event: null,
  classes: [],
  races: [],
  categories: [],
  resultsByRace: {},
  oncourse: [],
  detailedCache: {},
};

/**
 * Action types for state updates
 */
export type EventLiveStateAction =
  | { type: 'SET_INITIAL'; payload: { event: PublicEventDetail; classes: PublicClass[]; races: PublicRace[]; categories: PublicAggregatedCategory[] } }
  | { type: 'WS_FULL'; payload: WsFullPayload }
  | { type: 'WS_DIFF'; payload: WsDiffPayload }
  | { type: 'WS_REFRESH' }
  | { type: 'SET_RESULTS'; payload: { raceId: string; results: PublicResult[] } }
  | { type: 'SET_ONCOURSE'; payload: PublicOnCourseEntry[] }
  | { type: 'CACHE_DETAILED'; payload: { raceId: string; bib: number; detail: RunDetailData } };

/**
 * Upsert results by bib into existing race results
 */
function upsertResults(existing: PublicResult[], updates: PublicResult[]): PublicResult[] {
  const resultMap = new Map<number, PublicResult>();

  // Add existing results — skip entries without a valid bib
  existing.forEach((result) => {
    if (result.bib != null) {
      resultMap.set(result.bib, result);
    }
  });

  // Upsert updates — skip entries without a valid bib
  updates.forEach((result) => {
    if (result.bib != null) {
      resultMap.set(result.bib, result);
    }
  });

  // Convert back to array and sort by rank
  return Array.from(resultMap.values()).sort((a, b) => {
    if (a.rnk === null) return 1;
    if (b.rnk === null) return -1;
    return a.rnk - b.rnk;
  });
}

/**
 * Reducer for event live state
 */
function eventLiveStateReducer(state: EventLiveState, action: EventLiveStateAction): EventLiveState {
  switch (action.type) {
    case 'SET_INITIAL': {
      const { event, classes, races, categories } = action.payload;
      return {
        ...state,
        event,
        classes,
        races,
        categories,
      };
    }

    case 'WS_FULL': {
      const { event, classes, races, categories } = action.payload;
      return {
        ...state,
        // Preserve imageUrl from initial REST fetch (not sent via WS)
        event: { ...event, imageUrl: event.imageUrl ?? state.event?.imageUrl ?? null },
        classes,
        races,
        categories,
        // HACK(stale-results): Keep resultsByRace and detailedCache to avoid flash/scroll
        // reset and a blank "Detail není k dispozici" panel for open detail rows.
        // Trade-off: non-selected races and previously-cached detail rows may hold stale
        // data until the page-level handler re-fetches.
        // Upgrade path: "fetch first" — await re-fetch before dispatching WS_FULL.
        // See #82 (resultsByRace) and #182 (detailedCache).
      };
    }

    case 'WS_DIFF': {
      const { results, raceId, oncourse, status } = action.payload;
      let newState = { ...state };

      // Update results for specific race (upsert by bib)
      if (results && raceId) {
        const existingResults = newState.resultsByRace[raceId] || [];
        newState.resultsByRace = {
          ...newState.resultsByRace,
          [raceId]: upsertResults(existingResults, results),
        };
      }

      // Replace oncourse entries with the full snapshot from server
      if (oncourse) {
        newState.oncourse = oncourse;
      }

      // Update event status
      if (status && newState.event) {
        newState.event = {
          ...newState.event,
          status,
        };

        // Clear oncourse when event finishes
        if (status === 'finished' || status === 'official') {
          newState.oncourse = [];
        }
      }

      return newState;
    }

    case 'WS_REFRESH': {
      // Clear oncourse only. Keep resultsByRace and detailedCache to avoid a flash
      // of empty state in the table or the open detail panel — the page-level handler
      // re-fetches both. See #82 (resultsByRace) and #182 (detailedCache).
      return {
        ...state,
        oncourse: [],
      };
    }

    case 'SET_RESULTS': {
      const { raceId, results } = action.payload;
      return {
        ...state,
        resultsByRace: {
          ...state.resultsByRace,
          [raceId]: results,
        },
      };
    }

    case 'SET_ONCOURSE': {
      return {
        ...state,
        oncourse: action.payload,
      };
    }

    case 'CACHE_DETAILED': {
      const { raceId, bib, detail } = action.payload;
      const key = `${raceId}-${bib}`;
      return {
        ...state,
        detailedCache: {
          ...state.detailedCache,
          [key]: detail,
        },
      };
    }

    default:
      return state;
  }
}

/**
 * Custom hook for managing event live state with reducer
 */
export function useEventLiveState() {
  return useReducer(eventLiveStateReducer, initialState);
}
