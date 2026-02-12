import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add status_changed_at column to events table
  await sql`ALTER TABLE events ADD COLUMN status_changed_at TEXT`.execute(db);

  // Backfill existing events with created_at
  await sql`UPDATE events SET status_changed_at = created_at`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // SQLite doesn't support DROP COLUMN in older versions
  // Create new table without the column, copy data, drop old, rename
  await sql`
    CREATE TABLE events_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      main_title TEXT NOT NULL,
      sub_title TEXT,
      location TEXT,
      facility TEXT,
      start_date TEXT,
      end_date TEXT,
      discipline TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      api_key TEXT UNIQUE,
      config TEXT,
      has_xml_data INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db);

  await sql`
    INSERT INTO events_backup
    SELECT id, event_id, main_title, sub_title, location, facility,
           start_date, end_date, discipline, status, api_key, config,
           has_xml_data, created_at
    FROM events
  `.execute(db);

  await sql`DROP TABLE events`.execute(db);
  await sql`ALTER TABLE events_backup RENAME TO events`.execute(db);
}
