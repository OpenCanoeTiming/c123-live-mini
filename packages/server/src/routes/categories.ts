import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { categoriesSchema } from '../schemas/index.js';

/**
 * Category entry in response
 */
interface CategoryEntry {
  catId: string;
  name: string;
  firstYear: number | null;
  lastYear: number | null;
  classIds: string[];
}

/**
 * Categories response
 */
interface CategoriesResponse {
  categories: CategoryEntry[];
}

/**
 * Route params
 */
interface CategoriesParams {
  eventId: string;
}

/**
 * Register categories routes
 */
export function registerCategoriesRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const eventRepo = new EventRepository(db);
  const classRepo = new ClassRepository(db);

  /**
   * GET /api/v1/events/:eventId/categories
   * Get all unique categories for an event
   */
  app.get<{
    Params: CategoriesParams;
    Reply: CategoriesResponse;
  }>(
    '/api/v1/events/:eventId/categories',
    { schema: categoriesSchema },
    async (request, reply) => {
    const { eventId } = request.params;

    // Find event - return 404 for non-existent or draft events
    const event = await eventRepo.findByEventId(eventId);
    if (!event || event.status === 'draft') {
      reply.code(404).send({
        error: 'NotFound',
        message: 'Event not found',
      } as unknown as CategoriesResponse);
      return;
    }

    // Get all unique categories for the event
    const categories = await classRepo.getCategoriesForEvent(event.id);

    return {
      categories,
    };
  });
}
