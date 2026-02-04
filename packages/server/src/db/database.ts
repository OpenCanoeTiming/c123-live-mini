import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { Database } from './schema.js';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/live-mini.db';

const dialect = new SqliteDialect({
  database: new SQLite(DATABASE_PATH),
});

export const db = new Kysely<Database>({ dialect });

export function getDb(): Kysely<Database> {
  return db;
}

export async function closeDb(): Promise<void> {
  await db.destroy();
}
