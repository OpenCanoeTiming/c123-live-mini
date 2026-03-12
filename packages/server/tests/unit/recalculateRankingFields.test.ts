import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import { ResultRepository } from '../../src/db/repositories/ResultRepository.js';

describe('ResultRepository.recalculateRankingFields', () => {
  let db: Kysely<DatabaseSchema>;
  let resultRepo: ResultRepository;
  let eventId: number;
  let raceDbId: number;

  beforeEach(async () => {
    const dialect = new SqliteDialect({ database: new Database(':memory:') });
    db = new Kysely<DatabaseSchema>({ dialect });

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

    // Seed event and race
    const ev = await db.insertInto('events').values({
      event_id: 'TEST.001', main_title: 'Test', status: 'running', has_xml_data: 1,
    }).returning('id').executeTakeFirstOrThrow();
    eventId = ev.id;

    const race = await db.insertInto('races').values({
      event_id: eventId, race_id: 'K1M_ST_QUA_1', race_type: 'qualification',
    }).returning('id').executeTakeFirstOrThrow();
    raceDbId = race.id;
  });

  afterEach(async () => {
    await db.destroy();
  });

  /** Insert a participant + result, return result id */
  async function seedResult(pid: string, bib: number, total: number | null, opts?: { status?: string; catId?: string }): Promise<number> {
    const p = await db.insertInto('participants').values({
      event_id: eventId, participant_id: pid, event_bib: bib,
      family_name: `Name${bib}`, cat_id: opts?.catId ?? null,
    }).returning('id').executeTakeFirstOrThrow();

    const r = await db.insertInto('results').values({
      event_id: eventId, race_id: raceDbId, participant_id: p.id,
      bib, total, status: opts?.status ?? null,
    }).returning('id').executeTakeFirstOrThrow();

    return r.id;
  }

  /** Read result row by id */
  async function getResult(id: number) {
    return db.selectFrom('results').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
  }

  it('should assign rnk and totalBehind based on total', async () => {
    const r1 = await seedResult('P1', 1, 8500); // 85.00s — leader
    const r2 = await seedResult('P2', 2, 9200); // 92.00s
    const r3 = await seedResult('P3', 3, 8800); // 88.00s

    await resultRepo.recalculateRankingFields(raceDbId);

    const res1 = await getResult(r1);
    const res2 = await getResult(r2);
    const res3 = await getResult(r3);

    expect(res1.rnk).toBe(1);
    expect(res1.total_behind).toBe('0.00');

    expect(res3.rnk).toBe(2); // 8800 < 9200
    expect(res3.total_behind).toBe('+3.00');

    expect(res2.rnk).toBe(3);
    expect(res2.total_behind).toBe('+7.00');
  });

  it('should assign null rnk for DNS/DNF/DSQ', async () => {
    const r1 = await seedResult('P1', 1, 8500);
    const r2 = await seedResult('P2', 2, null, { status: 'DNS' });
    const r3 = await seedResult('P3', 3, 9000, { status: 'DSQ' });

    await resultRepo.recalculateRankingFields(raceDbId);

    const res1 = await getResult(r1);
    const res2 = await getResult(r2);
    const res3 = await getResult(r3);

    expect(res1.rnk).toBe(1);
    expect(res1.total_behind).toBe('0.00');

    expect(res2.rnk).toBeNull();
    expect(res2.total_behind).toBeNull();

    expect(res3.rnk).toBeNull(); // has status → not rankable
    expect(res3.total_behind).toBeNull();
  });

  it('should assign null rnk for null total (no status)', async () => {
    const r1 = await seedResult('P1', 1, 8500);
    const r2 = await seedResult('P2', 2, null); // on course, no total yet

    await resultRepo.recalculateRankingFields(raceDbId);

    const res1 = await getResult(r1);
    const res2 = await getResult(r2);

    expect(res1.rnk).toBe(1);
    expect(res2.rnk).toBeNull();
  });

  it('should compute category rankings independently', async () => {
    const r1 = await seedResult('P1', 1, 8500, { catId: 'U23' });
    const r2 = await seedResult('P2', 2, 9000, { catId: 'SEN' });
    const r3 = await seedResult('P3', 3, 9200, { catId: 'U23' });

    await resultRepo.recalculateRankingFields(raceDbId);

    const res1 = await getResult(r1);
    const res2 = await getResult(r2);
    const res3 = await getResult(r3);

    // U23: P1=8500 (cat_rnk=1), P3=9200 (cat_rnk=2)
    expect(res1.cat_rnk).toBe(1);
    expect(res1.cat_total_behind).toBe('0.00');
    expect(res3.cat_rnk).toBe(2);
    expect(res3.cat_total_behind).toBe('+7.00');

    // SEN: P2=9000 (cat_rnk=1)
    expect(res2.cat_rnk).toBe(1);
    expect(res2.cat_total_behind).toBe('0.00');
  });

  it('should handle empty race (no results)', async () => {
    // Should not throw
    await resultRepo.recalculateRankingFields(raceDbId);
  });

  it('should handle all DNS (no rankable results)', async () => {
    const r1 = await seedResult('P1', 1, null, { status: 'DNS' });
    const r2 = await seedResult('P2', 2, null, { status: 'DNS' });

    await resultRepo.recalculateRankingFields(raceDbId);

    const res1 = await getResult(r1);
    const res2 = await getResult(r2);

    expect(res1.rnk).toBeNull();
    expect(res2.rnk).toBeNull();
  });
});
