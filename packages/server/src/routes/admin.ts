import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { generateApiKey } from '../utils/apiKey.js';
import { createEventSchema } from '../schemas/index.js';

/**
 * Create event request body
 */
interface CreateEventBody {
  eventId: string;
  mainTitle: string;
  subTitle?: string;
  location?: string;
  facility?: string;
  startDate?: string;
  endDate?: string;
  discipline?: string;
}

/**
 * Create event response
 */
interface CreateEventResponse {
  id: number;
  eventId: string;
  apiKey: string;
}

/**
 * Register admin routes
 */
export function registerAdminRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const eventRepo = new EventRepository(db);

  /**
   * POST /api/v1/admin/events
   * Create a new event and return API key
   */
  app.post<{
    Body: CreateEventBody;
    Reply: CreateEventResponse;
  }>(
    '/api/v1/admin/events',
    { schema: createEventSchema },
    async (request, reply) => {
    const {
      eventId,
      mainTitle,
      subTitle,
      location,
      facility,
      startDate,
      endDate,
      discipline,
    } = request.body;

    // Validate required fields
    if (!eventId) {
      reply.code(400).send({
        error: 'Invalid request',
        message: 'Missing required field: eventId',
      } as unknown as CreateEventResponse);
      return;
    }

    if (!mainTitle) {
      reply.code(400).send({
        error: 'Invalid request',
        message: 'Missing required field: mainTitle',
      } as unknown as CreateEventResponse);
      return;
    }

    // Check if event already exists
    const existing = await eventRepo.findByEventId(eventId);
    if (existing) {
      reply.code(409).send({
        error: 'Conflict',
        message: `Event already exists: ${eventId}`,
      } as unknown as CreateEventResponse);
      return;
    }

    // Generate API key
    const apiKey = generateApiKey();

    // Create event
    const id = await eventRepo.insert({
      event_id: eventId,
      main_title: mainTitle,
      sub_title: subTitle ?? null,
      location: location ?? null,
      facility: facility ?? null,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      discipline: discipline ?? null,
      status: 'draft',
      api_key: apiKey,
      has_xml_data: 0,
    });

    reply.code(201);
    return {
      id,
      eventId,
      apiKey,
    };
  });
}
