import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import { registerAdminRoutes } from '../../src/routes/admin.js';
import { EventRepository } from '../../src/db/repositories/EventRepository.js';

describe('Admin Status Endpoint - PATCH /api/v1/admin/events/:eventId/status', () => {
  let app: FastifyInstance;
  let db: Kysely<DatabaseSchema>;
  let eventRepo: EventRepository;
  let testApiKey: string;
  let testEventId: string;

  beforeEach(async () => {
    // Create in-memory database
    const dialect = new SqliteDialect({
      database: new Database(':memory:'),
    });
    db = new Kysely<DatabaseSchema>({ dialect });

    // Create tables
    await db.schema
      .createTable('events')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'text', (col) => col.notNull().unique())
      .addColumn('main_title', 'text', (col) => col.notNull())
      .addColumn('sub_title', 'text')
      .addColumn('location', 'text')
      .addColumn('facility', 'text')
      .addColumn('start_date', 'text')
      .addColumn('end_date', 'text')
      .addColumn('discipline', 'text')
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
      .addColumn('status_changed_at', 'text')
      .addColumn('api_key', 'text', (col) => col.unique())
      .addColumn('config', 'text')
      .addColumn('has_xml_data', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('created_at', 'text', (col) =>
        col.notNull().defaultTo('2026-02-12T00:00:00.000Z')
      )
      .execute();

    // Create Fastify app and register routes
    app = Fastify();
    registerAdminRoutes(app, db);

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

    await eventRepo.insert({
      event_id: testEventId,
      main_title: 'Test Event',
      sub_title: null,
      location: null,
      facility: null,
      discipline: null,
      status: 'draft',
      status_changed_at: new Date().toISOString(),
      api_key: testApiKey,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      has_xml_data: 0,
    });
  });

  afterEach(async () => {
    await app.close();
    await db.destroy();
  });

  describe('Full lifecycle happy path', () => {
    it('should transition event through all states: draft → startlist → running → finished → official', async () => {
      // Draft → Startlist
      const res1 = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'startlist' },
      });

      expect(res1.statusCode).toBe(200);
      const body1 = JSON.parse(res1.body);
      expect(body1.eventId).toBe(testEventId);
      expect(body1.previousStatus).toBe('draft');
      expect(body1.status).toBe('startlist');
      expect(body1.statusChangedAt).toBeDefined();

      // Startlist → Running
      const res2 = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'running' },
      });

      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.body);
      expect(body2.previousStatus).toBe('startlist');
      expect(body2.status).toBe('running');

      // Running → Finished
      const res3 = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'finished' },
      });

      expect(res3.statusCode).toBe(200);
      const body3 = JSON.parse(res3.body);
      expect(body3.previousStatus).toBe('running');
      expect(body3.status).toBe('finished');

      // Finished → Official
      const res4 = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'official' },
      });

      expect(res4.statusCode).toBe(200);
      const body4 = JSON.parse(res4.body);
      expect(body4.previousStatus).toBe('finished');
      expect(body4.status).toBe('official');
    });
  });

  describe('Invalid transitions', () => {
    it('should reject draft → running and return 400 with error details', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'running' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('InvalidTransition');
      expect(body.message).toContain(`Cannot transition from 'draft' to 'running'`);
      expect(body.currentStatus).toBe('draft');
      expect(body.requestedStatus).toBe('running');
      expect(body.validTransitions).toEqual(['startlist']);
    });

    it('should reject official → draft (no reverse from terminal state)', async () => {
      // First transition to official
      await eventRepo.updateStatusWithTimestamp(
        1,
        'official',
        new Date().toISOString()
      );

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'draft' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('InvalidTransition');
      expect(body.validTransitions).toEqual([]);
    });

    it('should reject same-state transition (running → running)', async () => {
      // First transition to running
      await eventRepo.updateStatusWithTimestamp(
        1,
        'running',
        new Date().toISOString()
      );

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'running' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('InvalidTransition');
    });
  });

  describe('Backward corrections', () => {
    it('should allow finished → running (correction)', async () => {
      // Set event to finished
      await eventRepo.updateStatusWithTimestamp(
        1,
        'finished',
        new Date().toISOString()
      );

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'running' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.previousStatus).toBe('finished');
      expect(body.status).toBe('running');
    });

    it('should allow startlist → draft (retract startlist)', async () => {
      // Set event to startlist
      await eventRepo.updateStatusWithTimestamp(
        1,
        'startlist',
        new Date().toISOString()
      );

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'draft' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.previousStatus).toBe('startlist');
      expect(body.status).toBe('draft');
    });
  });

  describe('Error cases', () => {
    it('should return 404 for non-existent event', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/events/NONEXISTENT/status',
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { status: 'running' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 for missing API key', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'content-type': 'application/json',
        },
        payload: { status: 'startlist' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for invalid API key', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${testEventId}/status`,
        headers: {
          'x-api-key': 'invalid-key',
          'content-type': 'application/json',
        },
        payload: { status: 'startlist' },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
