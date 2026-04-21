/**
 * Shared types and utilities for c123-live-mini
 */

import pkg from '../package.json' with { type: 'json' };

// Re-export all types from types module
export * from './types/index.js';

/**
 * Version of the shared package. Read from package.json so it stays in sync
 * with the published version automatically.
 */
export const SHARED_VERSION: string = pkg.version;
