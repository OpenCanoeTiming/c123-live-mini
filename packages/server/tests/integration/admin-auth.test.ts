import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import { registerAdminRoutes } from '../../src/routes/admin.js';
import { registerEventsRoutes } from '../../src/routes/events.js';
import { EventRepository } from '../../src/db/repositories/EventRepository.js';
import { WebSocketManager } from '../../src/services/WebSocketManager.js';

const MASTER_KEY = 'test-master-key-secret';

/** Helper to create in-memory DB with events table */
async function createTestDb(): Promise<Kysely<DatabaseSchema>> {
  const dialect = new SqliteDialect({
    database: new Database(':memory:'),
  });
  const db = new Kysely<DatabaseSchema>({ dialect });

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
    .addColumn('image', 'blob')
    .addColumn('image_content_type', 'text')
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

  return db;
}

describe('Admin Auth - Master Key Protection', () => {
  let app: FastifyInstance;
  let db: Kysely<DatabaseSchema>;
  let wsManager: WebSocketManager;

  beforeEach(async () => {
    db = await createTestDb();
    app = Fastify();
    wsManager = new WebSocketManager();
    registerAdminRoutes(app, db, wsManager, [MASTER_KEY]);
  });

  afterEach(async () => {
    wsManager.shutdown();
    await app.close();
    await db.destroy();
  });

  describe('POST /api/v1/admin/events', () => {
    it('should reject without master key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/events',
        headers: { 'content-type': 'application/json' },
        payload: { eventId: 'TEST.001', mainTitle: 'Test' },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error).toBe('Unauthorized');
    });

    it('should reject with wrong master key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/events',
        headers: {
          'content-type': 'application/json',
          'x-master-key': 'wrong-key',
        },
        payload: { eventId: 'TEST.001', mainTitle: 'Test' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should accept with correct master key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/events',
        headers: {
          'content-type': 'application/json',
          'x-master-key': MASTER_KEY,
        },
        payload: { eventId: 'TEST.001', mainTitle: 'Test Event' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.eventId).toBe('TEST.001');
      expect(body.apiKey).toBeDefined();
      expect(body.apiKey.length).toBe(64);
    });
  });

  describe('GET /api/v1/admin/events', () => {
    it('should reject without master key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/events',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should list events with API keys', async () => {
      // Create an event first
      const eventRepo = new EventRepository(db);
      await eventRepo.insert({
        event_id: 'TEST.001',
        main_title: 'Test Event',
        status: 'draft',
        api_key: 'secret-api-key',
        has_xml_data: 0,
        image: null,
        image_content_type: null,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/events',
        headers: { 'x-master-key': MASTER_KEY },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.events).toHaveLength(1);
      expect(body.events[0].eventId).toBe('TEST.001');
      expect(body.events[0].apiKey).toBe('secret-api-key');
    });
  });

  describe('DELETE /api/v1/admin/events/:eventId', () => {
    it('should reject without master key', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/events/TEST.001',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent event', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/events/NONEXISTENT',
        headers: { 'x-master-key': MASTER_KEY },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should delete event', async () => {
      const eventRepo = new EventRepository(db);
      await eventRepo.insert({
        event_id: 'TEST.DEL',
        main_title: 'To Delete',
        status: 'draft',
        api_key: 'del-key',
        has_xml_data: 0,
        image: null,
        image_content_type: null,
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/events/TEST.DEL',
        headers: { 'x-master-key': MASTER_KEY },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.deleted).toBe(true);
      expect(body.eventId).toBe('TEST.DEL');

      // Verify event is gone
      const event = await eventRepo.findByEventId('TEST.DEL');
      expect(event).toBeUndefined();
    });
  });
});

describe('Admin Auth - No Master Passwords (dev mode)', () => {
  let app: FastifyInstance;
  let db: Kysely<DatabaseSchema>;
  let wsManager: WebSocketManager;

  beforeEach(async () => {
    db = await createTestDb();
    app = Fastify();
    wsManager = new WebSocketManager();
    // Empty master passwords array = no auth required
    registerAdminRoutes(app, db, wsManager, []);
  });

  afterEach(async () => {
    wsManager.shutdown();
    await app.close();
    await db.destroy();
  });

  it('should allow event creation without master key when no passwords configured', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/events',
      headers: { 'content-type': 'application/json' },
      payload: { eventId: 'DEV.001', mainTitle: 'Dev Event' },
    });

    expect(res.statusCode).toBe(201);
  });
});

describe('Event Image', () => {
  let app: FastifyInstance;
  let db: Kysely<DatabaseSchema>;
  let wsManager: WebSocketManager;

  beforeEach(async () => {
    db = await createTestDb();
    app = Fastify();
    wsManager = new WebSocketManager();
    registerAdminRoutes(app, db, wsManager, [MASTER_KEY]);
    registerEventsRoutes(app, db);
  });

  afterEach(async () => {
    wsManager.shutdown();
    await app.close();
    await db.destroy();
  });

  it('should store and serve image from data URI', async () => {
    // 1x1 red PNG as base64
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
    const dataUri = `data:image/png;base64,${pngBase64}`;

    // Create event with image
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/events',
      headers: {
        'content-type': 'application/json',
        'x-master-key': MASTER_KEY,
      },
      payload: {
        eventId: 'IMG.001',
        mainTitle: 'Image Event',
        imageData: dataUri,
      },
    });

    expect(createRes.statusCode).toBe(201);

    // Transition to startlist so it's public
    const eventRepo = new EventRepository(db);
    await eventRepo.updateStatusWithTimestamp(
      1,
      'startlist',
      new Date().toISOString()
    );

    // Serve image
    const imageRes = await app.inject({
      method: 'GET',
      url: '/api/v1/events/IMG.001/image',
    });

    expect(imageRes.statusCode).toBe(200);
    expect(imageRes.headers['content-type']).toBe('image/png');
    expect(imageRes.headers['cache-control']).toBe('public, max-age=86400');
  });

  it('should return 404 for event without image', async () => {
    const eventRepo = new EventRepository(db);
    await eventRepo.insert({
      event_id: 'NO-IMG',
      main_title: 'No Image',
      status: 'startlist',
      api_key: 'key123',
      has_xml_data: 0,
      image: null,
      image_content_type: null,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events/NO-IMG/image',
    });

    expect(res.statusCode).toBe(404);
  });

  it('should include imageUrl in event list when image exists', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

    // Create event with image and set to startlist
    const eventRepo = new EventRepository(db);
    await eventRepo.insert({
      event_id: 'LIST.001',
      main_title: 'Listed Event',
      status: 'startlist',
      api_key: 'list-key',
      has_xml_data: 0,
      image: Buffer.from(pngBase64, 'base64'),
      image_content_type: 'image/png',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.events[0].imageUrl).toBe('/api/v1/events/LIST.001/image');
  });

  it('should return null imageUrl when no image', async () => {
    const eventRepo = new EventRepository(db);
    await eventRepo.insert({
      event_id: 'LIST.002',
      main_title: 'No Image Event',
      status: 'startlist',
      api_key: 'list-key-2',
      has_xml_data: 0,
      image: null,
      image_content_type: null,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/events',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.events[0].imageUrl).toBeNull();
  });
});
