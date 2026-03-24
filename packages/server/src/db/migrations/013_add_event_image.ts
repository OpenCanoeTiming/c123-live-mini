import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE events ADD COLUMN image BLOB`.execute(db);
  await sql`ALTER TABLE events ADD COLUMN image_content_type TEXT`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // SQLite doesn't support DROP COLUMN before 3.35.0
  // These columns will remain but be unused if rolled back
}
