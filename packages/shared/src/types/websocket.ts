/**
 * WebSocket Message Types
 *
 * Defines the structure of real-time messages pushed from server to client.
 * All WebSocket communication is unidirectional (server → client).
 *
 * Message types:
 * - full: Complete event state (on connect, after XML import)
 * - diff: Incremental changes (result update, oncourse change, state transition)
 * - refresh: Signal to discard cache and re-fetch via REST API
 *
 * Reference: specs/009-live-data-pipeline/data-model.md
 */

import type {
  PublicEventDetail,
  PublicClass,
  PublicRace,
  PublicAggregatedCategory,
  PublicResult,
  PublicOnCourseEntry,
  PublicEventStatus,
} from './publicApi.js';

/**
 * WebSocket message type discriminator
 */
export type WsMessageType = 'full' | 'diff' | 'refresh';

/**
 * Full state payload - sent on initial connection and after large changes (XML import)
 *
 * Contains event structure only. Frontend fetches race-specific data (results, startlist, oncourse)
 * via REST for the currently viewed race.
 */
export interface WsFullPayload {
  /** Complete event details */
  event: PublicEventDetail;
  /** All classes with categories */
  classes: PublicClass[];
  /** All races with schedule */
  races: PublicRace[];
  /** Aggregated categories for filtering */
  categories: PublicAggregatedCategory[];
}

/**
 * Diff payload - sent for incremental updates
 *
 * Each field is optional. Only changed data sections are included.
 * Frontend applies diffs by upserting entities matching the composite key (bib + raceId).
 */
export interface WsDiffPayload {
  /** Updated results (upsert by bib + raceId) */
  results?: PublicResult[];
  /** Context: which race the results belong to */
  raceId?: string;
  /** Updated on-course entries (upsert by bib + raceId) */
  oncourse?: PublicOnCourseEntry[];
  /** Event state change */
  status?: PublicEventStatus;
}

/**
 * Full state message - sent on connection and after XML import
 */
export interface WsMessageFull {
  type: 'full';
  data: WsFullPayload;
}

/**
 * Diff message - sent for incremental updates
 */
export interface WsMessageDiff {
  type: 'diff';
  data: WsDiffPayload;
}

/**
 * Refresh message - fallback signal to re-fetch via REST
 */
export interface WsMessageRefresh {
  type: 'refresh';
}

/**
 * Tagged union of all WebSocket message types
 *
 * Enables TypeScript exhaustive checking on both server and client.
 */
export type WsMessage = WsMessageFull | WsMessageDiff | WsMessageRefresh;
