import { promises as fs } from 'node:fs';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { Kysely, Migrator, SqliteDialect, FileMigrationProvider } from 'kysely';
import type { Database } from './schema.js';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/live-mini.db';

async function ensureDataDir(): Promise<void> {
  const dataDir = path.dirname(DATABASE_PATH);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function runMigrations(): Promise<void> {
  await ensureDataDir();

  const dialect = new SqliteDialect({
    database: new SQLite(DATABASE_PATH),
  });

  const db = new Kysely<Database>({ dialect });

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
    await db.destroy();
    process.exit(1);
  }

  if (!results || results.length === 0) {
    console.log('  No pending migrations');
  } else {
    console.log(`\nApplied ${results.length} migration(s)`);
  }

  await db.destroy();
  console.log('Done.');
}

// Run if executed directly
runMigrations().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
