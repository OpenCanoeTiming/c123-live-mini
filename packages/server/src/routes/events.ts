import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import type {
  PublicEvent,
  PublicEventDetail,
  PublicClass,
  PublicRace,
  PublicRaceType,
} from '@c123-live-mini/shared';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { eventsListSchema, eventDetailSchema } from '../schemas/index.js';

/**
 * Event list response (public API)
 */
interface EventListResponse {
  events: PublicEvent[];
}

/**
 * Event detail response (public API)
 */
interface EventDetailResponse {
  event: PublicEventDetail;
  classes: PublicClass[];
  races: PublicRace[];
}

/**
 * Route params for event detail
 */
interface EventParams {
  eventId: string;
}

/**
 * Register events routes
 */
export function registerEventsRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const eventRepo = new EventRepository(db);
  const classRepo = new ClassRepository(db);
  const raceRepo = new RaceRepository(db);

  /**
   * GET /api/v1/events
   * List all public events (excludes draft events)
   */
  app.get<{ Reply: EventListResponse }>(
    '/api/v1/events',
    { schema: eventsListSchema },
    async (_request, _reply) => {
      const events = await eventRepo.findPublic();

      return {
        events: events.map((e) => ({
          // No internal ID exposed
          eventId: e.event_id,
          mainTitle: e.main_title,
          subTitle: e.sub_title,
          location: e.location,
          startDate: e.start_date,
          endDate: e.end_date,
          discipline: e.discipline,
          status: e.status as PublicEvent['status'],
        })),
      };
    }
  );

  /**
   * GET /api/v1/events/:eventId
   * Get event details with classes and races
   * Returns 404 for draft events (treated as non-existent)
   */
  app.get<{ Params: EventParams; Reply: EventDetailResponse }>(
    '/api/v1/events/:eventId',
    { schema: eventDetailSchema },
    async (request, reply) => {
      const { eventId } = request.params;

      const event = await eventRepo.findByEventId(eventId);

      // Return 404 for non-existent or draft events
      if (!event || event.status === 'draft') {
        reply.code(404).send({
          error: 'NotFound',
          message: 'Event not found',
        } as unknown as EventDetailResponse);
        return;
      }

      // Get classes with categories
      const classesWithCategories =
        await classRepo.findByEventIdWithCategories(event.id);

      // Get races
      const races = await raceRepo.findByEventId(event.id);

      // Build class lookup for race classId resolution
      const classLookup = new Map(
        classesWithCategories.map((c) => [c.id, c.class_id])
      );

      return {
        event: {
          // No internal ID exposed
          eventId: event.event_id,
          mainTitle: event.main_title,
          subTitle: event.sub_title,
          location: event.location,
          facility: event.facility,
          startDate: event.start_date,
          endDate: event.end_date,
          discipline: event.discipline,
          status: event.status as PublicEventDetail['status'],
        },
        classes: classesWithCategories.map((c) => ({
          // No internal ID exposed
          classId: c.class_id,
          name: c.name,
          longTitle: c.long_title ?? null,
          categories: c.categories.map((cat) => ({
            // No internal ID exposed
            catId: cat.cat_id,
            name: cat.name,
            firstYear: cat.first_year,
            lastYear: cat.last_year,
          })),
        })),
        races: races.map((r) => ({
          // No internal ID exposed
          raceId: r.race_id,
          classId: r.class_id ? classLookup.get(r.class_id) ?? '' : '',
          // Use race_type (human-readable) instead of dis_id
          raceType: (r.race_type ?? 'unknown') as PublicRaceType,
          raceOrder: r.race_order,
          startTime: r.start_time,
          raceStatus: r.race_status,
        })),
      };
    }
  );
}
