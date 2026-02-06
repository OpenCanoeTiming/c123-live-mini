import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import {
  createApiKeyAuth,
  type AuthenticatedRequest,
} from '../middleware/apiKeyAuth.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { IngestRecordRepository } from '../db/repositories/IngestRecordRepository.js';
import {
  eventConfigSchema,
  parseEventConfig,
  serializeEventConfig,
  mergeEventConfig,
  type EventConfig,
} from '../schemas/eventConfig.js';
import { getEventConfigSchema, updateEventConfigSchema } from '../schemas/index.js';

/**
 * Event config params
 */
interface EventConfigParams {
  eventId: string;
}

/**
 * Event config response
 */
interface EventConfigResponse extends EventConfig {}

/**
 * Register config routes
 */
export function registerConfigRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const apiKeyAuth = createApiKeyAuth(db);
  const eventRepo = new EventRepository(db);
  const ingestRecordRepo = new IngestRecordRepository(db);

  /**
   * GET /api/v1/admin/events/:eventId/config
   * Get current event configuration
   */
  app.get<{
    Params: EventConfigParams;
    Reply: EventConfigResponse;
  }>(
    '/api/v1/admin/events/:eventId/config',
    {
      schema: getEventConfigSchema,
      preHandler: apiKeyAuth,
    },
    async (request, reply) => {
      const { eventId } = request.params;
      const authRequest = request as AuthenticatedRequest;

      // Verify the event ID matches the authenticated event
      if (authRequest.event?.eventId !== eventId) {
        reply.code(404).send({
          error: 'Not found',
          message: `Event not found: ${eventId}`,
        } as unknown as EventConfigResponse);
        return;
      }

      const event = await eventRepo.findByEventId(eventId);
      if (!event) {
        reply.code(404).send({
          error: 'Not found',
          message: `Event not found: ${eventId}`,
        } as unknown as EventConfigResponse);
        return;
      }

      // Parse and return config
      const config = parseEventConfig(event.config);
      return config;
    }
  );

  /**
   * PATCH /api/v1/admin/events/:eventId/config
   * Update event configuration
   */
  app.patch<{
    Params: EventConfigParams;
    Body: Partial<EventConfig>;
    Reply: EventConfigResponse;
  }>(
    '/api/v1/admin/events/:eventId/config',
    {
      schema: updateEventConfigSchema,
      preHandler: apiKeyAuth,
    },
    async (request, reply) => {
      const { eventId } = request.params;
      const authRequest = request as AuthenticatedRequest;

      // Verify the event ID matches the authenticated event
      if (authRequest.event?.eventId !== eventId) {
        reply.code(404).send({
          error: 'Not found',
          message: `Event not found: ${eventId}`,
        } as unknown as EventConfigResponse);
        return;
      }

      const event = await eventRepo.findByEventId(eventId);
      if (!event) {
        reply.code(404).send({
          error: 'Not found',
          message: `Event not found: ${eventId}`,
        } as unknown as EventConfigResponse);
        return;
      }

      // Validate the incoming config update
      const validationResult = eventConfigSchema.safeParse(request.body);
      if (!validationResult.success) {
        reply.code(400).send({
          error: 'Invalid request',
          message: validationResult.error.issues[0]?.message ?? 'Invalid config',
        } as unknown as EventConfigResponse);
        return;
      }

      // Merge with existing config
      const existingConfig = parseEventConfig(event.config);
      const newConfig = mergeEventConfig(existingConfig, validationResult.data);

      // Save the updated config
      const configJson = serializeEventConfig(newConfig);
      await eventRepo.updateConfig(event.id, configJson);

      // Log the config update
      await ingestRecordRepo.insert({
        eventId: event.id,
        sourceType: 'config',
        status: 'success',
        payloadSize: JSON.stringify(request.body).length,
        itemsProcessed: 1,
      });

      return newConfig;
    }
  );
}
