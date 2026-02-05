import type { Kysely } from 'kysely';
import type { Database } from '../schema.js';
import { type Logger, createLogger } from '../../utils/logger.js';

/**
 * Base repository with database connection and logging
 * Provides access to Kysely instance and logger for derived repositories
 */
export abstract class BaseRepository {
  protected readonly db: Kysely<Database>;
  protected readonly log: Logger;

  constructor(db: Kysely<Database>) {
    this.db = db;
    this.log = createLogger(this.constructor.name);
  }

  /**
   * Log a repository operation
   */
  protected logOperation(
    operation: string,
    data?: Record<string, unknown>
  ): void {
    this.log.debug(`${operation}`, data);
  }
}
