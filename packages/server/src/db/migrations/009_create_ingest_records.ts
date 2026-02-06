import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Create ingest_records table for audit logging
  await sql`
    CREATE TABLE ingest_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL CHECK(source_type IN ('xml', 'json_oncourse', 'json_results', 'config')),
      status TEXT NOT NULL CHECK(status IN ('success', 'error')),
      error_message TEXT,
      payload_size INTEGER NOT NULL DEFAULT 0,
      items_processed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db);

  // Create indexes for common queries
  await sql`CREATE INDEX idx_ingest_records_event_id ON ingest_records(event_id)`.execute(
    db
  );
  await sql`CREATE INDEX idx_ingest_records_created_at ON ingest_records(created_at)`.execute(
    db
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_ingest_records_created_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_ingest_records_event_id`.execute(db);
  await sql`DROP TABLE IF EXISTS ingest_records`.execute(db);
}
