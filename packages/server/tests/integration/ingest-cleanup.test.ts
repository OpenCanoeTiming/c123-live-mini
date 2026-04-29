import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kysely, SqliteDialect, Migrator, type MigrationProvider } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import { IngestService } from '../../src/services/IngestService.js';

import * as m001 from '../../src/db/migrations/001_create_events.js';
import * as m002 from '../../src/db/migrations/002_create_classes.js';
import * as m003 from '../../src/db/migrations/003_create_participants.js';
import * as m004 from '../../src/db/migrations/004_create_races.js';
import * as m005 from '../../src/db/migrations/005_create_results.js';
import * as m006 from '../../src/db/migrations/006_create_courses.js';
import * as m007 from '../../src/db/migrations/007_create_indexes.js';
import * as m008 from '../../src/db/migrations/008_add_event_config.js';
import * as m009 from '../../src/db/migrations/009_create_ingest_records.js';
import * as m010 from '../../src/db/migrations/010_data_abstraction.js';
import * as m011 from '../../src/db/migrations/011_remove_legacy_columns.js';
import * as m012 from '../../src/db/migrations/012_add_status_changed_at.js';
import * as m013 from '../../src/db/migrations/013_add_event_image.js';

const inMemoryMigrationProvider: MigrationProvider = {
  async getMigrations() {
    return {
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
      '013_add_event_image': m013,
    };
  },
};

/**
 * Build a minimal-but-valid C123 XML payload for testing.
 *
 * - participants: list of {id, family} entries (all in class K1M)
 * - resultParticipantIds: which participants appear in race R1's results
 *   (subset of participants — empty means no results yet)
 */
function buildXml(opts: {
  participants: Array<{ id: string; family: string }>;
  resultParticipantIds: string[];
  raceIds?: string[];
}): string {
  const raceIds = opts.raceIds ?? ['R1'];
  const participantTags = opts.participants
    .map(
      (p) =>
        `<Participants><Id>${p.id}</Id><ClassId>K1M</ClassId><FamilyName>${p.family}</FamilyName></Participants>`
    )
    .join('\n');
  const scheduleTags = raceIds
    .map(
      (rid) =>
        `<Schedule><RaceId>${rid}</RaceId><ClassId>K1M</ClassId><DisId>BR1</DisId></Schedule>`
    )
    .join('\n');
  const resultTags = opts.resultParticipantIds
    .map(
      (pid, i) =>
        `<Results><RaceId>R1</RaceId><Id>${pid}</Id><Bib>${i + 1}</Bib></Results>`
    )
    .join('\n');

  return `<?xml version="1.0"?>
<Canoe123Data>
  <Events>
    <EventId>EV1</EventId>
    <MainTitle>Test Event</MainTitle>
  </Events>
  <Classes>
    <ClassId>K1M</ClassId>
    <Class>K1M</Class>
  </Classes>
  ${participantTags}
  ${scheduleTags}
  ${resultTags}
</Canoe123Data>`;
}

async function setupTestDb(): Promise<{
  db: Kysely<DatabaseSchema>;
  close: () => Promise<void>;
}> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const dialect = new SqliteDialect({ database: sqlite });
  const db = new Kysely<DatabaseSchema>({ dialect });

  const migrator = new Migrator({ db, provider: inMemoryMigrationProvider });

  const { error, results } = await migrator.migrateToLatest();
  if (error) {
    throw new Error(`Migration failed: ${String(error)}`);
  }
  if (results?.some((r) => r.status === 'Error')) {
    throw new Error('Some migrations failed');
  }

  return { db, close: () => db.destroy() };
}

const TEST_API_KEY = 'test-key-156';

async function seedEvent(db: Kysely<DatabaseSchema>): Promise<number> {
  const result = await db
    .insertInto('events')
    .values({
      event_id: 'EV1',
      main_title: 'Test Event',
      status: 'startlist',
      api_key: TEST_API_KEY,
      has_xml_data: 0,
    })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

describe('Ingest cleanup of stale records (#156)', () => {
  let db: Kysely<DatabaseSchema>;
  let close: () => Promise<void>;
  let ingestService: IngestService;
  let eventDbId: number;

  beforeEach(async () => {
    ({ db, close } = await setupTestDb());
    eventDbId = await seedEvent(db);
    ingestService = new IngestService(db);
  });

  afterEach(async () => {
    await close();
  });

  it('removes a competitor that was dropped from a race in the new XML', async () => {
    // First push: race R1 has competitors 1, 2, 3
    await ingestService.ingestXml(
      buildXml({
        participants: [
          { id: '1', family: 'Alpha' },
          { id: '2', family: 'Beta' },
          { id: '3', family: 'Gamma' },
        ],
        resultParticipantIds: ['1', '2', '3'],
      }),
      TEST_API_KEY
    );

    const beforeResults = await db
      .selectFrom('results')
      .selectAll()
      .where('event_id', '=', eventDbId)
      .execute();
    expect(beforeResults).toHaveLength(3);

    // Second push: race R1 now has only competitors 1, 2 (3 was removed from race)
    // Participant 3 still exists in event roster.
    await ingestService.ingestXml(
      buildXml({
        participants: [
          { id: '1', family: 'Alpha' },
          { id: '2', family: 'Beta' },
          { id: '3', family: 'Gamma' },
        ],
        resultParticipantIds: ['1', '2'],
      }),
      TEST_API_KEY
    );

    const afterResults = await db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select(['participants.participant_id'])
      .where('results.event_id', '=', eventDbId)
      .execute();

    expect(afterResults.map((r) => r.participant_id).sort()).toEqual(['1', '2']);
  });

  it('removes a participant entirely when dropped from event roster', async () => {
    await ingestService.ingestXml(
      buildXml({
        participants: [
          { id: '1', family: 'Alpha' },
          { id: '2', family: 'Beta' },
        ],
        resultParticipantIds: ['1', '2'],
      }),
      TEST_API_KEY
    );

    // Second push: participant 2 entirely removed from event
    await ingestService.ingestXml(
      buildXml({
        participants: [{ id: '1', family: 'Alpha' }],
        resultParticipantIds: ['1'],
      }),
      TEST_API_KEY
    );

    const participants = await db
      .selectFrom('participants')
      .select(['participant_id'])
      .where('event_id', '=', eventDbId)
      .execute();
    expect(participants.map((p) => p.participant_id)).toEqual(['1']);

    // Their results should be cascade-deleted
    const results = await db
      .selectFrom('results')
      .selectAll()
      .where('event_id', '=', eventDbId)
      .execute();
    expect(results).toHaveLength(1);
  });

  it('removes a race entirely when dropped from schedule', async () => {
    await ingestService.ingestXml(
      buildXml({
        participants: [{ id: '1', family: 'Alpha' }],
        resultParticipantIds: ['1'],
        raceIds: ['R1', 'R2'],
      }),
      TEST_API_KEY
    );

    const beforeRaces = await db
      .selectFrom('races')
      .select(['race_id'])
      .where('event_id', '=', eventDbId)
      .execute();
    expect(beforeRaces.map((r) => r.race_id).sort()).toEqual(['R1', 'R2']);

    // R2 dropped from schedule
    await ingestService.ingestXml(
      buildXml({
        participants: [{ id: '1', family: 'Alpha' }],
        resultParticipantIds: ['1'],
        raceIds: ['R1'],
      }),
      TEST_API_KEY
    );

    const afterRaces = await db
      .selectFrom('races')
      .select(['race_id'])
      .where('event_id', '=', eventDbId)
      .execute();
    expect(afterRaces.map((r) => r.race_id)).toEqual(['R1']);
  });
});
