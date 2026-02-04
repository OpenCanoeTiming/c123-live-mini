import type { Kysely } from 'kysely';
import type { Database } from '../schema.js';

/**
 * Base repository with database connection
 * Provides access to Kysely instance for derived repositories
 */
export abstract class BaseRepository {
  protected readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }
}
