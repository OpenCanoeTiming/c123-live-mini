import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import type { EventStatus } from '@c123-live-mini/shared';
import { registerIngestRoutes } from '../../src/routes/ingest.js';
import { registerConfigRoutes } from '../../src/routes/config.js';
import { EventRepository } from '../../src/db/repositories/EventRepository.js';
import { WebSocketManager } from '../../src/services/WebSocketManager.js';

describe('Ingestion State Guards', () => {
  let app: FastifyInstance;
  let db: Kysely<DatabaseSchema>;
  let wsManager: WebSocketManager;
  let eventRepo: EventRepository;
  let testApiKey: string;
  let testEventId: string;
  let eventDbId: number;

  beforeEach(async () => {
    // Create in-memory database
    const dialect = new SqliteDialect({
      database: new Database(':memory:'),
    });
    db = new Kysely<DatabaseSchema>({ dialect });

    // Create minimal tables for testing
    await db.schema
      .createTable('events')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'text', (col) => col.notNull().unique())
      .addColumn('main_title', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
      .addColumn('status_changed_at', 'text')
      .addColumn('api_key', 'text', (col) => col.unique())
      .addColumn('config', 'text')
      .addColumn('has_xml_data', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('start_date', 'text')
      .addColumn('end_date', 'text')
      .addColumn('created_at', 'text', (col) =>
        col.notNull().defaultTo('2026-02-12T00:00:00.000Z')
      )
      .execute();

    await db.schema
      .createTable('ingest_records')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('source_type', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('error_message', 'text')
      .addColumn('payload_size', 'integer', (col) => col.notNull())
      .addColumn('items_processed', 'integer', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) =>
        col.notNull().defaultTo('2026-02-12T00:00:00.000Z')
      )
      .execute();

    // Create minimal tables for result ingestion
    await db.schema
      .createTable('participants')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('participant_id', 'text', (col) => col.notNull())
      .addColumn('class_id', 'integer')
      .addColumn('family_name', 'text', (col) => col.notNull())
      .addColumn('given_name', 'text')
      .execute();

    await db.schema
      .createTable('races')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('race_id', 'text', (col) => col.notNull())
      .addColumn('class_id', 'integer')
      .addColumn('race_status', 'integer', (col) => col.notNull().defaultTo(0))
      .execute();

    await db.schema
      .createTable('results')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull())
      .addColumn('race_id', 'integer', (col) => col.notNull())
      .addColumn('participant_id', 'integer', (col) => col.notNull())
      .addColumn('bib', 'integer')
      .addColumn('time', 'integer')
      .addColumn('pen', 'integer')
      .addColumn('total', 'integer')
      .addColumn('status', 'text')
      .addColumn('rnk', 'integer')
      .addColumn('gates', 'text')
      .execute();

    // Create Fastify app and register routes
    app = Fastify();
    wsManager = new WebSocketManager();
    registerIngestRoutes(app, db, wsManager);
    registerConfigRoutes(app, db);

    // Create test event
    eventRepo = new EventRepository(db);
    testApiKey = 'test-api-key-12345';
    testEventId = 'TEST.001';

    // Set dates to ensure API key is valid (today ± 7 days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 1);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 1);

    eventDbId = await eventRepo.insert({
      event_id: testEventId,
      main_title: 'Test Event',
      status: 'draft',
      status_changed_at: new Date().toISOString(),
      api_key: testApiKey,
      has_xml_data: 1, // Assume XML ingested for non-draft tests
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });
  });

  afterEach(async () => {
    wsManager.shutdown();
    await app.close();
    await db.destroy();
  });

  describe('All 5 states × 3 ingest types (15 combinations)', () => {
    const states: Array<{
      status: EventStatus;
      xml: 'allowed' | 'blocked';
      oncourse: 'allowed' | 'blocked';
      results: 'allowed' | 'blocked';
    }> = [
      { status: 'draft', xml: 'allowed', oncourse: 'blocked', results: 'blocked' },
      { status: 'startlist', xml: 'allowed', oncourse: 'blocked', results: 'blocked' },
      { status: 'running', xml: 'allowed', oncourse: 'allowed', results: 'allowed' },
      { status: 'finished', xml: 'allowed', oncourse: 'blocked', results: 'allowed' },
      { status: 'official', xml: 'blocked', oncourse: 'blocked', results: 'blocked' },
    ];

    for (const { status, xml, oncourse, results } of states) {
      describe(`State: ${status}`, () => {
        beforeEach(async () => {
          await eventRepo.updateStatusWithTimestamp(
            eventDbId,
            status,
            new Date().toISOString()
          );
        });

        it(`should ${xml === 'allowed' ? 'allow' : 'block'} XML ingestion`, async () => {
          const res = await app.inject({
            method: 'POST',
            url: '/api/v1/ingest/xml',
            headers: {
              'x-api-key': testApiKey,
              'content-type': 'application/json',
            },
            payload: { xml: '<event><EventInfo></EventInfo></event>' },
          });

          if (xml === 'allowed') {
            // Accept 200 or 400 (400 if XML parsing fails, but not state-blocked)
            expect([200, 400]).toContain(res.statusCode);
            if (res.statusCode === 403) {
              throw new Error(`Expected XML to be allowed in ${status} state, but got 403`);
            }
          } else {
            expect(res.statusCode).toBe(403);
            const body = JSON.parse(res.body);
            expect(body.error).toBe('Forbidden');
            expect(body.message).toContain('xml');
            expect(body.message).toContain(status);
          }
        });

        it(`should ${oncourse === 'allowed' ? 'allow' : 'block'} oncourse ingestion`, async () => {
          const res = await app.inject({
            method: 'POST',
            url: '/api/v1/ingest/oncourse',
            headers: {
              'x-api-key': testApiKey,
              'content-type': 'application/json',
            },
            payload: {
              oncourse: [
                {
                  participantId: 'P1',
                  raceId: 'R1',
                  bib: 1,
                  name: 'Test',
                  club: 'Test Club',
                  position: 1,
                  gates: [],
                  dtStart: '2026-02-12T10:00:00.000Z',
                  dtFinish: null,
                  time: 0,
                  pen: 0,
                },
              ],
            },
          });

          if (oncourse === 'allowed') {
            expect(res.statusCode).toBe(200);
          } else {
            expect(res.statusCode).toBe(403);
            const body = JSON.parse(res.body);
            expect(body.error).toBe('Forbidden');
            expect(body.message).toContain('json_oncourse');
            expect(body.message).toContain(status);
          }
        });

        it(`should ${results === 'allowed' ? 'allow' : 'block'} results ingestion`, async () => {
          const res = await app.inject({
            method: 'POST',
            url: '/api/v1/ingest/results',
            headers: {
              'x-api-key': testApiKey,
              'content-type': 'application/json',
            },
            payload: {
              results: [
                {
                  raceId: 'R1',
                  participantId: 'P1',
                  bib: 1,
                  time: 100000,
                  pen: 0,
                  total: 100000,
                  status: 'finished',
                  rnk: 1,
                  gates: [],
                },
              ],
            },
          });

          if (results === 'allowed') {
            expect(res.statusCode).toBe(200);
          } else {
            expect(res.statusCode).toBe(403);
            const body = JSON.parse(res.body);
            expect(body.error).toBe('Forbidden');
            expect(body.message).toContain('json_results');
            expect(body.message).toContain(status);
          }
        });
      });
    }
  });

  describe('Config endpoint state guard', () => {
    it('should allow config ingest in draft state', async () => {
      await eventRepo.updateStatusWithTimestamp(
        eventDbId,
        'draft',
        new Date().toISOString()
      );

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/config`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: {
          activeRaceId: 'R1',
          displayMode: 'simple',
          showOnCourse: false,
        },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should block config ingest in non-draft states', async () => {
      const nonDraftStates: EventStatus[] = ['startlist', 'running', 'finished', 'official'];

      for (const status of nonDraftStates) {
        await eventRepo.updateStatusWithTimestamp(
          eventDbId,
          status,
          new Date().toISOString()
        );

        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/events/${testEventId}/config`,
          headers: {
            'x-api-key': testApiKey,
            'content-type': 'application/json',
          },
          payload: {
            activeRaceId: 'R1',
            displayMode: 'simple',
            showOnCourse: false,
          },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.body);
        expect(body.error).toBe('Forbidden');
        expect(body.message).toContain('config');
        expect(body.message).toContain(status);
      }
    });
  });
});
