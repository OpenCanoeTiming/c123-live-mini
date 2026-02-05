import { mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect, Migrator, FileMigrationProvider } from 'kysely';
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

/**
 * Run database migrations
 *
 * @param db - Kysely database instance
 * @returns Promise that resolves when migrations complete
 */
export async function runMigrations(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(
        path.dirname(new URL(import.meta.url).pathname),
        'migrations'
      ),
    }),
  });

  console.log('Running migrations...');

  const { error, results } = await migrator.migrateToLatest();

  if (results) {
    for (const result of results) {
      if (result.status === 'Success') {
        console.log(`  ✓ ${result.migrationName}`);
      } else if (result.status === 'Error') {
        console.error(`  ✗ ${result.migrationName} - ${result.status}`);
      }
    }
  }

  if (error) {
    console.error('Migration failed:', error);
    throw error;
  }

  if (!results || results.length === 0) {
    console.log('  No pending migrations');
  } else {
    console.log(`Applied ${results.length} migration(s)`);
  }
}
