import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import { ResultRepository } from '../../src/db/repositories/ResultRepository.js';
import { BrCombinedService } from '../../src/services/BrCombinedService.js';

describe('BrCombinedService', () => {
  let db: Kysely<DatabaseSchema>;
  let resultRepo: ResultRepository;
  let service: BrCombinedService;
  let eventId: number;

  beforeEach(async () => {
    const dialect = new SqliteDialect({ database: new Database(':memory:') });
    db = new Kysely<DatabaseSchema>({ dialect });

    // Create minimal schema
    await db.schema
      .createTable('events')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'text', (col) => col.notNull().unique())
      .addColumn('main_title', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
      .addColumn('has_xml_data', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('created_at', 'text', (col) => col.defaultTo('2026-01-01T00:00:00Z'))
      .addColumn('status_changed_at', 'text')
      .execute();

    await db.schema
      .createTable('classes')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('class_id', 'text', (col) => col.notNull())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('long_title', 'text')
      .execute();

    await db.schema
      .createTable('participants')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('participant_id', 'text', (col) => col.notNull())
      .addColumn('class_id', 'integer')
      .addColumn('event_bib', 'integer')
      .addColumn('athlete_id', 'text')
      .addColumn('family_name', 'text', (col) => col.notNull())
      .addColumn('given_name', 'text')
      .addColumn('noc', 'text')
      .addColumn('club', 'text')
      .addColumn('cat_id', 'text')
      .addColumn('is_team', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('member1', 'text')
      .addColumn('member2', 'text')
      .addColumn('member3', 'text')
      .execute();

    await db.schema
      .createTable('races')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('race_id', 'text', (col) => col.notNull())
      .addColumn('class_id', 'integer')
      .addColumn('race_type', 'text')
      .addColumn('race_order', 'integer')
      .addColumn('start_time', 'text')
      .addColumn('start_interval', 'text')
      .addColumn('course_nr', 'integer')
      .addColumn('race_status', 'integer', (col) => col.notNull().defaultTo(0))
      .execute();

    await db.schema
      .createTable('results')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('race_id', 'integer', (col) => col.notNull())
      .addColumn('participant_id', 'integer', (col) => col.notNull())
      .addColumn('start_order', 'integer')
      .addColumn('bib', 'integer')
      .addColumn('start_time', 'text')
      .addColumn('status', 'text')
      .addColumn('dt_start', 'text')
      .addColumn('dt_finish', 'text')
      .addColumn('time', 'integer')
      .addColumn('gates', 'text')
      .addColumn('pen', 'integer')
      .addColumn('total', 'integer')
      .addColumn('rnk', 'integer')
      .addColumn('rnk_order', 'integer')
      .addColumn('cat_rnk', 'integer')
      .addColumn('cat_rnk_order', 'integer')
      .addColumn('total_behind', 'text')
      .addColumn('cat_total_behind', 'text')
      .addColumn('prev_time', 'integer')
      .addColumn('prev_pen', 'integer')
      .addColumn('prev_total', 'integer')
      .addColumn('prev_rnk', 'integer')
      .addColumn('total_total', 'integer')
      .addColumn('better_run_nr', 'integer')
      .addColumn('heat_nr', 'integer')
      .addColumn('round_nr', 'integer')
      .addColumn('qualified', 'text')
      .execute();

    resultRepo = new ResultRepository(db);
    service = new BrCombinedService(resultRepo);

    // Seed event, class, participants, and BR races
    const ev = await db.insertInto('events').values({
      event_id: 'TEST.001', main_title: 'Test', status: 'running', has_xml_data: 1,
    }).returning('id').executeTakeFirstOrThrow();
    eventId = ev.id;

    const cls = await db.insertInto('classes').values({
      event_id: eventId, class_id: 'K1M_ST', name: 'K1 Men',
    }).returning('id').executeTakeFirstOrThrow();

    await db.insertInto('participants').values([
      { event_id: eventId, participant_id: 'P1', class_id: cls.id, event_bib: 1, family_name: 'Alpha', given_name: 'Ann', club: 'Club A', cat_id: 'U23' },
      { event_id: eventId, participant_id: 'P2', class_id: cls.id, event_bib: 2, family_name: 'Beta', given_name: 'Bob', club: 'Club B', cat_id: 'SEN' },
      { event_id: eventId, participant_id: 'P3', class_id: cls.id, event_bib: 3, family_name: 'Gamma', given_name: 'Gus', club: 'Club C', cat_id: 'U23' },
    ]).execute();

    await db.insertInto('races').values([
      { event_id: eventId, race_id: 'K1M_ST_BR1_6', class_id: cls.id, race_type: 'best-run-1' },
      { event_id: eventId, race_id: 'K1M_ST_BR2_6', class_id: cls.id, race_type: 'best-run-2' },
    ]).execute();
  });

  afterEach(async () => {
    await db.destroy();
  });

  /** Helper to get race DB id */
  async function getRaceId(raceIdStr: string): Promise<number> {
    const r = await db.selectFrom('races').select('id').where('race_id', '=', raceIdStr).executeTakeFirstOrThrow();
    return r.id;
  }

  /** Helper to get participant DB id */
  async function getParticipantId(pid: string): Promise<number> {
    const p = await db.selectFrom('participants').select('id').where('participant_id', '=', pid).executeTakeFirstOrThrow();
    return p.id;
  }

  /** Seed BR1+BR2 results for a participant */
  async function seedResults(pid: string, br1: { time: number; pen: number; total: number; rnk?: number; status?: string } | null, br2: { time: number; pen: number; total: number; rnk?: number; status?: string } | null) {
    const participantId = await getParticipantId(pid);
    const br1RaceId = await getRaceId('K1M_ST_BR1_6');
    const br2RaceId = await getRaceId('K1M_ST_BR2_6');

    if (br1) {
      await db.insertInto('results').values({
        event_id: eventId, race_id: br1RaceId, participant_id: participantId,
        bib: (await db.selectFrom('participants').select('event_bib').where('id', '=', participantId).executeTakeFirstOrThrow()).event_bib,
        time: br1.time, pen: br1.pen, total: br1.total, rnk: br1.rnk ?? null, status: br1.status ?? null,
      }).execute();
    }
    if (br2) {
      await db.insertInto('results').values({
        event_id: eventId, race_id: br2RaceId, participant_id: participantId,
        bib: (await db.selectFrom('participants').select('event_bib').where('id', '=', participantId).executeTakeFirstOrThrow()).event_bib,
        time: br2.time, pen: br2.pen, total: br2.total, rnk: br2.rnk ?? null, status: br2.status ?? null,
      }).execute();
    }
  }

  it('should combine BR1+BR2 and pick better run', async () => {
    // P1: BR1=8500, BR2=9000 → BR1 better (totalTotal=8500)
    await seedResults('P1', { time: 8300, pen: 200, total: 8500 }, { time: 8800, pen: 200, total: 9000 });
    // P2: BR1=9200, BR2=8800 → BR2 better (totalTotal=8800)
    await seedResults('P2', { time: 9000, pen: 200, total: 9200 }, { time: 8600, pen: 200, total: 8800 });

    const results = await service.computeCombined(eventId, 'K1M_ST_BR1_6');

    expect(results).toHaveLength(2);
    // Sorted by totalTotal: P1 (8500) first, P2 (8800) second
    expect(results[0].bib).toBe(1);
    expect(results[0].totalTotal).toBe(8500);
    expect(results[0].betterRunNr).toBe(1);
    expect(results[0].rnk).toBe(1);
    expect(results[0].totalBehind).toBe('0.00');

    expect(results[1].bib).toBe(2);
    expect(results[1].totalTotal).toBe(8800);
    expect(results[1].betterRunNr).toBe(2);
    expect(results[1].rnk).toBe(2);
    expect(results[1].totalBehind).toBe('+3.00');
  });

  it('should include prev_ fields from BR1 when both runs exist', async () => {
    await seedResults('P1',
      { time: 8300, pen: 200, total: 8500, rnk: 1 },
      { time: 8800, pen: 400, total: 9200 },
    );

    const results = await service.computeCombined(eventId, 'K1M_ST_BR2_6');

    expect(results[0].prevTime).toBe(8300);
    expect(results[0].prevPen).toBe(200);
    expect(results[0].prevTotal).toBe(8500);
    expect(results[0].prevRnk).toBe(1);
    // Primary = BR2
    expect(results[0].time).toBe(8800);
    expect(results[0].pen).toBe(400);
  });

  it('should handle single run only (BR1 exists, no BR2)', async () => {
    await seedResults('P1', { time: 8300, pen: 200, total: 8500 }, null);

    const results = await service.computeCombined(eventId, 'K1M_ST_BR1_6');

    expect(results).toHaveLength(1);
    expect(results[0].totalTotal).toBe(8500);
    expect(results[0].betterRunNr).toBe(1);
    expect(results[0].prevTime).toBeNull();
    expect(results[0].prevPen).toBeNull();
  });

  it('should handle DSQ on one run — use other run as best', async () => {
    // P1: BR1=DSQ, BR2=9000 → BR2 is the only clean run
    await seedResults('P1',
      { time: 8300, pen: 200, total: 8500, status: 'DSQ' },
      { time: 8800, pen: 200, total: 9000 },
    );

    const results = await service.computeCombined(eventId, 'K1M_ST_BR1_6');

    expect(results[0].totalTotal).toBe(9000);
    expect(results[0].betterRunNr).toBe(2);
    expect(results[0].status).toBeNull(); // has a clean run → no combined status
  });

  it('should show DSQ status when both runs are DSQ', async () => {
    await seedResults('P1',
      { time: 8300, pen: 200, total: 8500, status: 'DSQ' },
      { time: 8800, pen: 200, total: 9000, status: 'DSQ' },
    );

    const results = await service.computeCombined(eventId, 'K1M_ST_BR1_6');

    expect(results[0].totalTotal).toBeNull();
    expect(results[0].betterRunNr).toBeNull();
    expect(results[0].status).toBe('DSQ');
    expect(results[0].rnk).toBeNull();
  });

  it('should recalculate catRnk per category', async () => {
    // P1 (U23): best=8500, P3 (U23): best=9500, P2 (SEN): best=9000
    await seedResults('P1', { time: 8300, pen: 200, total: 8500 }, { time: 9000, pen: 200, total: 9200 });
    await seedResults('P2', { time: 8800, pen: 200, total: 9000 }, { time: 9500, pen: 200, total: 9700 });
    await seedResults('P3', { time: 9300, pen: 200, total: 9500 }, { time: 10000, pen: 200, total: 10200 });

    const results = await service.computeCombined(eventId, 'K1M_ST_BR1_6');

    // Overall: P1=8500 (#1), P2=9000 (#2), P3=9500 (#3)
    expect(results[0].rnk).toBe(1);
    expect(results[1].rnk).toBe(2);
    expect(results[2].rnk).toBe(3);

    // U23 category: P1=8500 (catRnk=1), P3=9500 (catRnk=2)
    const u23 = results.filter(r => r.catId === 'U23');
    expect(u23[0].catRnk).toBe(1);
    expect(u23[0].catTotalBehind).toBe('0.00');
    expect(u23[1].catRnk).toBe(2);
    expect(u23[1].catTotalBehind).toBe('+10.00');

    // SEN category: P2=9000 (catRnk=1)
    const sen = results.filter(r => r.catId === 'SEN');
    expect(sen[0].catRnk).toBe(1);
    expect(sen[0].catTotalBehind).toBe('0.00');
  });

  it('should filter by catId when provided', async () => {
    await seedResults('P1', { time: 8300, pen: 200, total: 8500 }, { time: 9000, pen: 200, total: 9200 });
    await seedResults('P2', { time: 8800, pen: 200, total: 9000 }, { time: 9500, pen: 200, total: 9700 });

    const results = await service.computeCombined(eventId, 'K1M_ST_BR1_6', 'U23');

    // Only P1 is U23
    expect(results).toHaveLength(1);
    expect(results[0].bib).toBe(1);
  });

  it('should work when queried via either BR1 or BR2 raceId', async () => {
    await seedResults('P1', { time: 8300, pen: 200, total: 8500 }, { time: 9000, pen: 200, total: 9200 });

    const viaBr1 = await service.computeCombined(eventId, 'K1M_ST_BR1_6');
    const viaBr2 = await service.computeCombined(eventId, 'K1M_ST_BR2_6');

    expect(viaBr1).toEqual(viaBr2);
  });
});
