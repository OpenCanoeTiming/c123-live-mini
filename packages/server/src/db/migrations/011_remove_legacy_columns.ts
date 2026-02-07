/**
 * Migration 011: Remove Legacy Columns
 *
 * Removes deprecated columns that were kept for backward compatibility:
 * - participants.icf_id (replaced by athlete_id)
 * - races.dis_id (replaced by race_type)
 *
 * These columns are no longer needed as all code now uses the abstracted fields.
 *
 * Reference: specs/006-client-api cleanup
 */

import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // SQLite 3.35.0+ supports ALTER TABLE DROP COLUMN
  // For older versions, we'd need to recreate tables

  // 1. Drop icf_id from participants
  await sql`ALTER TABLE participants DROP COLUMN icf_id`.execute(db);

  // 2. Drop dis_id from races
  await sql`ALTER TABLE races DROP COLUMN dis_id`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Re-add the columns (without data - this is a one-way migration)
  await sql`ALTER TABLE participants ADD COLUMN icf_id TEXT`.execute(db);
  await sql`ALTER TABLE races ADD COLUMN dis_id TEXT`.execute(db);

  // Note: Data cannot be restored. This migration should only be rolled back
  // in development, not production.
}
