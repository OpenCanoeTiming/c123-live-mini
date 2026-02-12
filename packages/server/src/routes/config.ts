import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import {
  createApiKeyAuth,
  type AuthenticatedRequest,
} from '../middleware/apiKeyAuth.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { IngestRecordRepository } from '../db/repositories/IngestRecordRepository.js';
import type { EventStatus } from '@c123-live-mini/shared';
import { ALLOWED_INGEST } from '@c123-live-mini/shared';
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
 * Error response
 */
interface ErrorResponse {
  error: string;
  message: string;
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
    Reply: EventConfigResponse | ErrorResponse;
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
      // The API key auth already validated the event exists
      if (authRequest.event?.eventId !== eventId) {
        reply.code(404).send({
          error: 'Not found',
          message: `Event not found: ${eventId}`,
        });
        return;
      }

      // Get config from the authenticated event's database record
      const configJson = await eventRepo.getConfig(authRequest.event.id);
      const config = parseEventConfig(configJson);
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
    Reply: EventConfigResponse | ErrorResponse;
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
      // The API key auth already validated the event exists
      if (!authRequest.event || authRequest.event.eventId !== eventId) {
        reply.code(404).send({
          error: 'Not found',
          message: `Event not found: ${eventId}`,
        });
        return;
      }

      // State-dependent ingestion guard - config only allowed in draft state
      const eventStatus = authRequest.event.status as EventStatus;
      if (!ALLOWED_INGEST[eventStatus]?.includes('config')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: `Data type 'config' not accepted in '${eventStatus}' state`,
        });
        return;
      }

      const eventDbId = authRequest.event.id;

      // Validate the incoming config update
      const validationResult = eventConfigSchema.safeParse(request.body);
      if (!validationResult.success) {
        reply.code(400).send({
          error: 'Invalid request',
          message: validationResult.error.issues[0]?.message ?? 'Invalid config',
        });
        return;
      }

      // Merge with existing config
      const existingConfigJson = await eventRepo.getConfig(eventDbId);
      const existingConfig = parseEventConfig(existingConfigJson);
      const newConfig = mergeEventConfig(existingConfig, validationResult.data);

      // Save the updated config
      const configJson = serializeEventConfig(newConfig);
      await eventRepo.updateConfig(eventDbId, configJson);

      // Log the config update
      await ingestRecordRepo.insert({
        eventId: eventDbId,
        sourceType: 'config',
        status: 'success',
        payloadSize: JSON.stringify(request.body).length,
        itemsProcessed: 1,
      });

      return newConfig;
    }
  );
}
