import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { getOnCourseStore } from '../services/OnCourseStore.js';
import type { OnCourseEntry } from '@c123-live-mini/shared';

/**
 * OnCourse route parameters
 */
interface OnCourseParams {
  eventId: string;
}

/**
 * OnCourse response
 */
interface OnCourseResponse {
  oncourse: OnCourseEntry[];
}

/**
 * Error response
 */
interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Register OnCourse routes
 */
export function registerOnCourseRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const eventRepo = new EventRepository(db);
  const onCourseStore = getOnCourseStore();

  /**
   * GET /api/v1/events/:eventId/oncourse
   * Get competitors currently on course (real-time)
   */
  app.get<{
    Params: OnCourseParams;
    Reply: OnCourseResponse | ErrorResponse;
  }>('/api/v1/events/:eventId/oncourse', async (request, reply) => {
    const { eventId } = request.params;

    // Verify event exists
    const event = await eventRepo.findByEventId(eventId);
    if (!event) {
      reply.code(404).send({
        error: 'Not found',
        message: `Event not found: ${eventId}`,
      });
      return;
    }

    // Get active OnCourse entries
    const oncourse = onCourseStore.getAll(eventId);

    return { oncourse };
  });
}
