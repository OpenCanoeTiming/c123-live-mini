/**
 * Migration 010: Data Abstraction
 *
 * Adds technology-transparent columns to support the Client API:
 * - races.race_type: Human-readable race type label (from dis_id)
 * - participants.athlete_id: Technology-transparent athlete identifier (from icf_id)
 *
 * Also backfills existing data and transforms gates to self-describing format.
 *
 * Reference: specs/006-client-api/data-model.md
 */

import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Mapping from dis_id to race_type
 */
const DIS_ID_TO_RACE_TYPE: Record<string, string> = {
  BR1: 'best-run-1',
  BR2: 'best-run-2',
  TSR: 'training',
  SR: 'seeding',
  QUA: 'qualification',
  SEM: 'semifinal',
  FIN: 'final',
  XT: 'cross-trial',
  X4: 'cross-heat',
  XS: 'cross-semifinal',
  XF: 'cross-final',
  XER: 'cross-extra',
};

/**
 * Map gate config character to gate type string
 */
function charToGateType(char: string): string {
  switch (char) {
    case 'N':
      return 'normal';
    case 'R':
      return 'reverse';
    case 'S':
      return 'normal'; // Start gate treated as normal
    default:
      return 'unknown';
  }
}

/**
 * Transform legacy gate string to self-describing format
 */
function transformGateString(
  gatesStr: string,
  gateConfig: string | null
): string {
  // Gate string is single-digit penalties: "0000000000000000020"
  const gateChars = gateConfig?.split('').filter((c) => c !== 'S') ?? [];

  const gates = gatesStr.split('').map((p, i) => {
    const penalty = parseInt(p, 10);
    return {
      number: i + 1,
      type: i < gateChars.length ? charToGateType(gateChars[i]) : 'unknown',
      // 5 in legacy format means 50 (missed gate)
      penalty: penalty === 5 ? 50 : penalty,
    };
  });

  return JSON.stringify(gates);
}

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Add race_type column to races table
  await sql`ALTER TABLE races ADD COLUMN race_type TEXT`.execute(db);

  // 2. Backfill race_type from dis_id
  for (const [disId, raceType] of Object.entries(DIS_ID_TO_RACE_TYPE)) {
    await sql`UPDATE races SET race_type = ${raceType} WHERE dis_id = ${disId}`.execute(
      db
    );
  }
  // Set unknown for any unmatched
  await sql`UPDATE races SET race_type = 'unknown' WHERE race_type IS NULL`.execute(
    db
  );

  // 3. Add athlete_id column to participants table
  await sql`ALTER TABLE participants ADD COLUMN athlete_id TEXT`.execute(db);

  // 4. Backfill athlete_id from icf_id
  await sql`UPDATE participants SET athlete_id = icf_id`.execute(db);

  // 5. Transform existing gates data to self-describing format
  // This requires a custom approach since SQLite can't do complex JSON transforms
  // We'll query results with their course configs and update them
  const results = await sql<{
    id: number;
    gates: string | null;
    race_id: number;
  }>`
    SELECT r.id, r.gates, r.race_id
    FROM results r
    WHERE r.gates IS NOT NULL
  `.execute(db);

  // Get all courses keyed by event_id and course_nr
  const courses = await sql<{
    event_id: number;
    course_nr: number;
    gate_config: string | null;
  }>`SELECT event_id, course_nr, gate_config FROM courses`.execute(db);

  const courseMap = new Map<string, string | null>();
  for (const c of courses.rows) {
    courseMap.set(`${c.event_id}-${c.course_nr}`, c.gate_config);
  }

  // Get race info to find course_nr
  const races = await sql<{
    id: number;
    event_id: number;
    course_nr: number | null;
  }>`SELECT id, event_id, course_nr FROM races`.execute(db);

  const raceMap = new Map<number, { event_id: number; course_nr: number | null }>();
  for (const r of races.rows) {
    raceMap.set(r.id, { event_id: r.event_id, course_nr: r.course_nr });
  }

  // Transform each result's gates
  for (const result of results.rows) {
    if (!result.gates) continue;

    // Check if already in new format (starts with [{ )
    if (result.gates.startsWith('[{')) continue;

    // Check if it's a legacy digit string format
    if (!/^\d+$/.test(result.gates)) {
      // It's already JSON array of numbers, skip for now
      // These will need course config lookup at read time
      continue;
    }

    const raceInfo = raceMap.get(result.race_id);
    if (!raceInfo || raceInfo.course_nr === null) continue;

    const gateConfig = courseMap.get(
      `${raceInfo.event_id}-${raceInfo.course_nr}`
    ) ?? null;
    const transformed = transformGateString(result.gates, gateConfig);

    await sql`UPDATE results SET gates = ${transformed} WHERE id = ${result.id}`.execute(
      db
    );
  }

  // 6. Create indexes for the new columns
  await sql`CREATE INDEX IF NOT EXISTS idx_races_race_type ON races(race_type)`.execute(
    db
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_participants_athlete_id ON participants(athlete_id)`.execute(
    db
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop indexes
  await sql`DROP INDEX IF EXISTS idx_participants_athlete_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_races_race_type`.execute(db);

  // Note: SQLite doesn't support DROP COLUMN directly
  // We'd need to recreate the tables, which is complex
  // For now, just leave the columns (they'll be ignored if not used)
}
