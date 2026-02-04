/**
 * Shared types and utilities for c123-live-mini
 */

/**
 * Event status in the timing system
 */
export type EventStatus = 'draft' | 'running' | 'finished';

/**
 * Basic event information shared between server and client
 */
export interface Event {
  id: string;
  name: string;
  status: EventStatus;
}

/**
 * Version of the shared package for debugging
 */
export const SHARED_VERSION = '0.0.1';
