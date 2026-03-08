import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect, Migrator } from 'kysely';
import type { Migration, MigrationProvider } from 'kysely';
import type { Database } from './schema.js';
import * as m001 from './migrations/001_create_events.js';
import * as m002 from './migrations/002_create_classes.js';
import * as m003 from './migrations/003_create_participants.js';
import * as m004 from './migrations/004_create_races.js';
import * as m005 from './migrations/005_create_results.js';
import * as m006 from './migrations/006_create_courses.js';
import * as m007 from './migrations/007_create_indexes.js';
import * as m008 from './migrations/008_add_event_config.js';
import * as m009 from './migrations/009_create_ingest_records.js';
import * as m010 from './migrations/010_data_abstraction.js';
import * as m011 from './migrations/011_remove_legacy_columns.js';
import * as m012 from './migrations/012_add_status_changed_at.js';

const migrations: Record<string, Migration> = {
  '001_create_events': m001,
  '002_create_classes': m002,
  '003_create_participants': m003,
  '004_create_races': m004,
  '005_create_results': m005,
  '006_create_courses': m006,
  '007_create_indexes': m007,
  '008_add_event_config': m008,
  '009_create_ingest_records': m009,
  '010_data_abstraction': m010,
  '011_remove_legacy_columns': m011,
  '012_add_status_changed_at': m012,
};

class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations;
  }
}

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
mkdirSync(dirname(DEFAULT_DATABASE_PATH), { recursive: true });
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
    provider: new StaticMigrationProvider(),
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
