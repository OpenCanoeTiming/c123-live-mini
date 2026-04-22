/**
 * Integration test for #162 — per-run DNF/DNS status in BR combined results.
 *
 * Verifies the fields `prevStatus` and `currStatus` make it through the
 * GET /api/v1/events/:eventId/results/:raceId endpoint (including the
 * Fastify response schema) when querying a BR2 race.
 *
 * Before the fix, the client relied on `prevTotal` as a proxy for
 * "both runs exist" and had no signal at all for per-run DNF, so a BR1
 * DNF + BR2 clean row rendered with Run 1 showing BR2's time and Run 2
 * showing a dash.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import { registerResultsRoutes } from '../../src/routes/results.js';

describe('#162 — per-run DNF/DNS surfaces through the results API', () => {
  let app: FastifyInstance;
  let db: Kysely<DatabaseSchema>;
  let eventId: number;

  beforeEach(async () => {
    const dialect = new SqliteDialect({ database: new Database(':memory:') });
    db = new Kysely<DatabaseSchema>({ dialect });

    await db.schema.createTable('events')
      .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
      .addColumn('event_id', 'text', c => c.notNull().unique())
      .addColumn('main_title', 'text', c => c.notNull())
      .addColumn('status', 'text', c => c.notNull().defaultTo('draft'))
      .addColumn('has_xml_data', 'integer', c => c.notNull().defaultTo(0))
      .addColumn('created_at', 'text', c => c.defaultTo('2026-01-01T00:00:00Z'))
      .addColumn('status_changed_at', 'text')
      .execute();

    await db.schema.createTable('classes')
      .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', c => c.notNull())
      .addColumn('class_id', 'text', c => c.notNull())
      .addColumn('name', 'text', c => c.notNull())
      .addColumn('long_title', 'text')
      .execute();

    await db.schema.createTable('participants')
      .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', c => c.notNull())
      .addColumn('participant_id', 'text', c => c.notNull())
      .addColumn('class_id', 'integer')
      .addColumn('event_bib', 'integer')
      .addColumn('athlete_id', 'text')
      .addColumn('family_name', 'text', c => c.notNull())
      .addColumn('given_name', 'text')
      .addColumn('noc', 'text')
      .addColumn('club', 'text')
      .addColumn('cat_id', 'text')
      .addColumn('is_team', 'integer', c => c.notNull().defaultTo(0))
      .addColumn('member1', 'text')
      .addColumn('member2', 'text')
      .addColumn('member3', 'text')
      .execute();

    await db.schema.createTable('races')
      .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', c => c.notNull())
      .addColumn('race_id', 'text', c => c.notNull())
      .addColumn('class_id', 'integer')
      .addColumn('race_type', 'text')
      .addColumn('race_order', 'integer')
      .addColumn('start_time', 'text')
      .addColumn('start_interval', 'text')
      .addColumn('course_nr', 'integer')
      .addColumn('race_status', 'integer', c => c.notNull().defaultTo(0))
      .execute();

    await db.schema.createTable('courses')
      .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', c => c.notNull())
      .addColumn('course_nr', 'integer', c => c.notNull())
      .addColumn('nr_gates', 'integer')
      .addColumn('gate_config', 'text')
      .execute();

    await db.schema.createTable('results')
      .addColumn('id', 'integer', c => c.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', c => c.notNull())
      .addColumn('race_id', 'integer', c => c.notNull())
      .addColumn('participant_id', 'integer', c => c.notNull())
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

    // Seed event, class, races, participants
    const ev = await db.insertInto('events').values({
      event_id: 'TEST.162', main_title: 'Test', status: 'running', has_xml_data: 1,
    }).returning('id').executeTakeFirstOrThrow();
    eventId = ev.id;

    const cls = await db.insertInto('classes').values({
      event_id: eventId, class_id: 'K1M_ST', name: 'K1 Men',
    }).returning('id').executeTakeFirstOrThrow();

    await db.insertInto('participants').values([
      // BR1 DNF + BR2 clean
      { event_id: eventId, participant_id: 'P1', class_id: cls.id, event_bib: 1, family_name: 'Alpha', given_name: 'A', club: 'X', cat_id: 'SEN' },
      // BR1 clean + BR2 DNF
      { event_id: eventId, participant_id: 'P2', class_id: cls.id, event_bib: 2, family_name: 'Beta', given_name: 'B', club: 'X', cat_id: 'SEN' },
      // Both DNS (combined status expected)
      { event_id: eventId, participant_id: 'P3', class_id: cls.id, event_bib: 3, family_name: 'Gamma', given_name: 'G', club: 'X', cat_id: 'SEN' },
    ]).execute();

    const br1 = await db.insertInto('races').values({
      event_id: eventId, race_id: 'K1M_ST_BR1_6', class_id: cls.id, race_type: 'best-run-1', race_status: 5,
    }).returning('id').executeTakeFirstOrThrow();
    const br2 = await db.insertInto('races').values({
      event_id: eventId, race_id: 'K1M_ST_BR2_6', class_id: cls.id, race_type: 'best-run-2', race_status: 3,
    }).returning('id').executeTakeFirstOrThrow();

    const [p1, p2, p3] = await db.selectFrom('participants').select('id').execute();

    // P1: BR1 DNF, BR2 clean (9000)
    await db.insertInto('results').values({
      event_id: eventId, race_id: br1.id, participant_id: p1.id, bib: 1,
      time: null, pen: 0, total: null, status: 'DNF', rnk: null,
    }).execute();
    await db.insertInto('results').values({
      event_id: eventId, race_id: br2.id, participant_id: p1.id, bib: 1,
      time: 8800, pen: 200, total: 9000, status: null, rnk: 1,
    }).execute();

    // P2: BR1 clean (10866), BR2 DNF
    await db.insertInto('results').values({
      event_id: eventId, race_id: br1.id, participant_id: p2.id, bib: 2,
      time: 10466, pen: 4, total: 10866, status: null, rnk: 1,
    }).execute();
    await db.insertInto('results').values({
      event_id: eventId, race_id: br2.id, participant_id: p2.id, bib: 2,
      time: null, pen: 0, total: null, status: 'DNF', rnk: null,
    }).execute();

    // P3: both DNS
    await db.insertInto('results').values({
      event_id: eventId, race_id: br1.id, participant_id: p3.id, bib: 3,
      time: null, pen: 0, total: null, status: 'DNS', rnk: null,
    }).execute();
    await db.insertInto('results').values({
      event_id: eventId, race_id: br2.id, participant_id: p3.id, bib: 3,
      time: null, pen: 0, total: null, status: 'DNS', rnk: null,
    }).execute();

    app = Fastify();
    registerResultsRoutes(app, db);
  });

  afterEach(async () => {
    await app.close();
    await db.destroy();
  });

  it('BR1 DNF + BR2 clean → response carries prevStatus=DNF, currStatus=null', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events/TEST.162/results/K1M_ST_BR2_6',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const p1 = body.results.find((r: { bib: number }) => r.bib === 1);
    expect(p1).toBeDefined();
    // Combined `status` stays null so the row keeps its rank.
    expect(p1.status).toBeNull();
    // Per-run fields (the fix)
    expect(p1.prevStatus).toBe('DNF');
    expect(p1.currStatus).toBeNull();
    // Primary fields = BR2 (the clean run) so ranking still works.
    expect(p1.total).toBe(9000);
    expect(p1.betterRunNr).toBe(2);
    // prevTotal is still null (BR1 DNF had no total) — but the client now
    // has prevStatus to disambiguate from "BR1 doesn't exist".
    expect(p1.prevTotal).toBeNull();
  });

  it('BR1 clean + BR2 DNF → response carries prevStatus=null, currStatus=DNF', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events/TEST.162/results/K1M_ST_BR2_6',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const p2 = body.results.find((r: { bib: number }) => r.bib === 2);
    expect(p2).toBeDefined();
    expect(p2.status).toBeNull();
    expect(p2.prevStatus).toBeNull();
    expect(p2.currStatus).toBe('DNF');
    expect(p2.prevTotal).toBe(10866);
    expect(p2.betterRunNr).toBe(1);
  });

  it('both DNS → combined status set AND per-run fields populated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events/TEST.162/results/K1M_ST_BR2_6',
    });

    const body = JSON.parse(res.body);
    const p3 = body.results.find((r: { bib: number }) => r.bib === 3);
    expect(p3).toBeDefined();
    expect(p3.status).toBe('DNS'); // infoSource (BR2) when no clean run
    expect(p3.prevStatus).toBe('DNS');
    expect(p3.currStatus).toBe('DNS');
    expect(p3.betterRunNr).toBeNull();
  });
});
