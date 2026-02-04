import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { Database } from './schema.js';

const DEFAULT_DATABASE_PATH = './data/live-mini.db';

/**
 * Create a new database connection
 *
 * @param dbPath - Path to the SQLite database file
 * @returns Kysely database instance
 */
export function createDatabase(dbPath?: string): Kysely<Database> {
  const path = dbPath ?? process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;

  // Ensure directory exists
  mkdirSync(dirname(path), { recursive: true });

  const dialect = new SqliteDialect({
    database: new SQLite(path),
  });

  return new Kysely<Database>({ dialect });
}

// Default database instance (legacy support)
const dialect = new SqliteDialect({
  database: new SQLite(DEFAULT_DATABASE_PATH),
});

export const db = new Kysely<Database>({ dialect });

export function getDb(): Kysely<Database> {
  return db;
}

export async function closeDb(): Promise<void> {
  await db.destroy();
}
