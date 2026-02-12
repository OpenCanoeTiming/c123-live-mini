import { describe, it, expect, beforeEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseSchema } from '../../src/db/schema.js';
import { EventLifecycleService } from '../../src/services/EventLifecycleService.js';
import { EventRepository } from '../../src/db/repositories/EventRepository.js';
import type { EventStatus } from '@c123-live-mini/shared';

describe('EventLifecycleService - State Machine Validation', () => {
  let db: Kysely<DatabaseSchema>;
  let service: EventLifecycleService;
  let eventRepo: EventRepository;

  beforeEach(async () => {
    // Create in-memory database for testing
    const dialect = new SqliteDialect({
      database: new Database(':memory:'),
    });

    db = new Kysely<DatabaseSchema>({ dialect });

    // Create minimal events table for testing
    await db.schema
      .createTable('events')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'text', (col) => col.notNull().unique())
      .addColumn('main_title', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
      .addColumn('status_changed_at', 'text')
      .addColumn('created_at', 'text', (col) =>
        col.notNull().defaultTo('2026-02-12T00:00:00.000Z')
      )
      .execute();

    service = new EventLifecycleService(db);
    eventRepo = new EventRepository(db);
  });

  describe('validateTransition - All 25 state combinations (5×5)', () => {
    const states: EventStatus[] = [
      'draft',
      'startlist',
      'running',
      'finished',
      'official',
    ];

    // Valid transitions (6 total)
    const validTransitions: Array<[EventStatus, EventStatus]> = [
      ['draft', 'startlist'], // Forward: publish startlist
      ['startlist', 'running'], // Forward: start timing
      ['running', 'finished'], // Forward: race complete
      ['finished', 'official'], // Forward: confirm results
      ['finished', 'running'], // Backward: correction - premature finish
      ['startlist', 'draft'], // Backward: correction - retract startlist
    ];

    // Test all 6 valid transitions
    it.each(validTransitions)(
      'should allow transition from %s to %s',
      (from, to) => {
        const result = service.validateTransition(from, to);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    );

    // Test all invalid transitions (19 total: 25 - 6 valid)
    const invalidTransitions: Array<[EventStatus, EventStatus]> = [];
    for (const from of states) {
      for (const to of states) {
        const isValid = validTransitions.some(
          ([vFrom, vTo]) => vFrom === from && vTo === to
        );
        if (!isValid) {
          invalidTransitions.push([from, to]);
        }
      }
    }

    it.each(invalidTransitions)(
      'should reject transition from %s to %s',
      (from, to) => {
        const result = service.validateTransition(from, to);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain(`Cannot transition from '${from}' to '${to}'`);
        expect(result.validTransitions).toBeDefined();
      }
    );

    // Test same-state transitions (FR-011: same-state transitions rejected)
    it.each(states)(
      'should reject same-state transition (%s → %s)',
      (state) => {
        const result = service.validateTransition(state, state);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }
    );

    // Test terminal state (official has no valid transitions)
    it('should reject all transitions from official state', () => {
      for (const target of states) {
        const result = service.validateTransition('official', target);
        expect(result.valid).toBe(false);
        if (target !== 'official') {
          expect(result.error).toContain('none');
        }
      }
    });
  });

  describe('transitionEvent - Integration with database', () => {
    it('should successfully transition event through full lifecycle', async () => {
      // Create event in draft state
      const eventId = await eventRepo.insert({
        event_id: 'TEST.001',
        main_title: 'Test Event',
        status: 'draft',
        status_changed_at: new Date().toISOString(),
      });

      // Draft → Startlist
      const result1 = await service.transitionEvent(eventId, 'startlist', db);
      expect(result1.success).toBe(true);
      expect(result1.previousStatus).toBe('draft');
      expect(result1.statusChangedAt).toBeDefined();

      // Startlist → Running
      const result2 = await service.transitionEvent(eventId, 'running', db);
      expect(result2.success).toBe(true);
      expect(result2.previousStatus).toBe('startlist');

      // Running → Finished
      const result3 = await service.transitionEvent(eventId, 'finished', db);
      expect(result3.success).toBe(true);
      expect(result3.previousStatus).toBe('running');

      // Finished → Official
      const result4 = await service.transitionEvent(eventId, 'official', db);
      expect(result4.success).toBe(true);
      expect(result4.previousStatus).toBe('finished');

      // Verify final state
      const event = await eventRepo.findById(eventId);
      expect(event?.status).toBe('official');
    });

    it('should reject invalid transitions and return error details', async () => {
      const eventId = await eventRepo.insert({
        event_id: 'TEST.002',
        main_title: 'Test Event 2',
        status: 'draft',
        status_changed_at: new Date().toISOString(),
      });

      // Attempt draft → running (invalid)
      const result = await service.transitionEvent(eventId, 'running', db);
      expect(result.success).toBe(false);
      expect(result.error).toContain(`Cannot transition from 'draft' to 'running'`);
      expect(result.validTransitions).toEqual(['startlist']);
      expect(result.previousStatus).toBe('draft');

      // Verify state unchanged
      const event = await eventRepo.findById(eventId);
      expect(event?.status).toBe('draft');
    });

    it('should support backward corrections', async () => {
      // Create event in finished state
      const eventId = await eventRepo.insert({
        event_id: 'TEST.003',
        main_title: 'Test Event 3',
        status: 'finished',
        status_changed_at: new Date().toISOString(),
      });

      // Finished → Running (correction)
      const result = await service.transitionEvent(eventId, 'running', db);
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('finished');

      const event = await eventRepo.findById(eventId);
      expect(event?.status).toBe('running');
    });

    it('should return error for non-existent event', async () => {
      const result = await service.transitionEvent(99999, 'running', db);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });
  });
});
