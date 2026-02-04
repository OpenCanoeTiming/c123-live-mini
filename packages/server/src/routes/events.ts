import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';

/**
 * Event list response
 */
interface EventListResponse {
  events: Array<{
    id: number;
    eventId: string;
    mainTitle: string;
    subTitle: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
  }>;
}

/**
 * Event detail response
 */
interface EventDetailResponse {
  event: {
    id: number;
    eventId: string;
    mainTitle: string;
    subTitle: string | null;
    location: string | null;
    facility: string | null;
    startDate: string | null;
    endDate: string | null;
    discipline: string | null;
    status: string;
  };
  classes: Array<{
    classId: string;
    name: string;
    categories: Array<{
      catId: string;
      name: string;
      firstYear: number | null;
      lastYear: number | null;
    }>;
  }>;
  races: Array<{
    raceId: string;
    classId: string | null;
    disId: string;
    raceOrder: number | null;
    startTime: string | null;
    raceStatus: number;
  }>;
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
   * List all public events
   */
  app.get<{ Reply: EventListResponse }>(
    '/api/v1/events',
    async (_request, _reply) => {
      const events = await eventRepo.findPublic();

      return {
        events: events.map((e) => ({
          id: e.id,
          eventId: e.event_id,
          mainTitle: e.main_title,
          subTitle: e.sub_title,
          location: e.location,
          startDate: e.start_date,
          endDate: e.end_date,
          status: e.status,
        })),
      };
    }
  );

  /**
   * GET /api/v1/events/:eventId
   * Get event details with classes and races
   */
  app.get<{ Params: EventParams; Reply: EventDetailResponse }>(
    '/api/v1/events/:eventId',
    async (request, reply) => {
      const { eventId } = request.params;

      const event = await eventRepo.findByEventId(eventId);
      if (!event) {
        reply.code(404).send({
          error: 'Not found',
          message: `Event not found: ${eventId}`,
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
          id: event.id,
          eventId: event.event_id,
          mainTitle: event.main_title,
          subTitle: event.sub_title,
          location: event.location,
          facility: event.facility,
          startDate: event.start_date,
          endDate: event.end_date,
          discipline: event.discipline,
          status: event.status,
        },
        classes: classesWithCategories.map((c) => ({
          classId: c.class_id,
          name: c.name,
          categories: c.categories.map((cat) => ({
            catId: cat.cat_id,
            name: cat.name,
            firstYear: cat.first_year,
            lastYear: cat.last_year,
          })),
        })),
        races: races.map((r) => ({
          raceId: r.race_id,
          classId: r.class_id ? classLookup.get(r.class_id) ?? null : null,
          disId: r.dis_id,
          raceOrder: r.race_order,
          startTime: r.start_time,
          raceStatus: r.race_status,
        })),
      };
    }
  );
}
