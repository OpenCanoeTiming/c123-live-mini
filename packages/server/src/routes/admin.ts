import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import type { EventStatus, PublicEventStatus } from '@c123-live-mini/shared';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { IngestRecordRepository } from '../db/repositories/IngestRecordRepository.js';
import { EventLifecycleService } from '../services/EventLifecycleService.js';
import { generateApiKey, isApiKeyValid } from '../utils/apiKey.js';
import { createApiKeyAuth, type AuthenticatedRequest } from '../middleware/apiKeyAuth.js';
import { createMasterKeyAuth } from '../middleware/masterKeyAuth.js';
import {
  createEventSchema,
  updateStatusSchema,
  adminEventsListSchema,
  adminDeleteEventSchema,
} from '../schemas/index.js';
import type { WebSocketManager } from '../services/WebSocketManager.js';

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
  imageData?: string;
}

/**
 * Create event response with validity info
 */
interface CreateEventResponse {
  id: number;
  eventId: string;
  apiKey: string;
  validity?: {
    validFrom?: string;
    validUntil?: string;
  };
}

/**
 * Parse base64 image data, stripping data URI prefix if present.
 * Returns the image buffer and content type.
 */
function parseImageData(imageData: string): {
  buffer: Buffer;
  contentType: string;
} {
  const dataUriMatch = imageData.match(
    /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
  );

  if (dataUriMatch) {
    return {
      buffer: Buffer.from(dataUriMatch[2], 'base64'),
      contentType: dataUriMatch[1],
    };
  }

  // Raw base64 without prefix — default to PNG
  return {
    buffer: Buffer.from(imageData, 'base64'),
    contentType: 'image/png',
  };
}

/**
 * Register admin routes
 */
export function registerAdminRoutes(
  app: FastifyInstance,
  db: Kysely<Database>,
  wsManager: WebSocketManager,
  masterPasswords: string[] = []
): void {
  const eventRepo = new EventRepository(db);
  const ingestRecordRepo = new IngestRecordRepository(db);
  const lifecycleService = new EventLifecycleService(db);
  const apiKeyAuth = createApiKeyAuth(db);
  const masterKeyAuth = createMasterKeyAuth(masterPasswords);

  /**
   * POST /api/v1/admin/events
   * Create a new event and return API key with validity info
   */
  app.post<{
    Body: CreateEventBody;
    Reply: CreateEventResponse;
  }>(
    '/api/v1/admin/events',
    { schema: createEventSchema, preHandler: masterKeyAuth },
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
        imageData,
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

      // Parse image if provided
      let image: Buffer | null = null;
      let imageContentType: string | null = null;
      if (imageData) {
        const parsed = parseImageData(imageData);
        image = parsed.buffer;
        imageContentType = parsed.contentType;
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
        image,
        image_content_type: imageContentType,
      });

      // Log event creation as ingest record
      await ingestRecordRepo.insert({
        eventId: id,
        sourceType: 'config',
        status: 'success',
        payloadSize: JSON.stringify(request.body).length,
        itemsProcessed: 1,
      });

      // Calculate validity window
      const validity = isApiKeyValid(startDate ?? null, endDate ?? null);

      reply.code(201);
      return {
        id,
        eventId,
        apiKey,
        validity: {
          validFrom: validity.validFrom?.toISOString(),
          validUntil: validity.validUntil?.toISOString(),
        },
      };
    }
  );

  /**
   * GET /api/v1/admin/events
   * List all events with API keys (for key recovery)
   */
  app.get(
    '/api/v1/admin/events',
    { schema: adminEventsListSchema, preHandler: masterKeyAuth },
    async () => {
      const events = await eventRepo.findAll();

      return {
        events: events.map((e) => ({
          eventId: e.event_id,
          mainTitle: e.main_title,
          subTitle: e.sub_title,
          location: e.location,
          startDate: e.start_date,
          endDate: e.end_date,
          discipline: e.discipline,
          status: e.status,
          apiKey: e.api_key,
          hasXmlData: e.has_xml_data === 1,
          hasImage: e.image !== null,
          createdAt: e.created_at,
        })),
      };
    }
  );

  /**
   * DELETE /api/v1/admin/events/:eventId
   * Delete an event and all related data (cascade)
   */
  app.delete<{ Params: { eventId: string } }>(
    '/api/v1/admin/events/:eventId',
    { schema: adminDeleteEventSchema, preHandler: masterKeyAuth },
    async (request, reply) => {
      const { eventId } = request.params;

      const event = await eventRepo.findByEventId(eventId);
      if (!event) {
        reply.code(404).send({
          error: 'NotFound',
          message: `Event not found: ${eventId}`,
        });
        return;
      }

      // Close WebSocket room before deletion
      try {
        wsManager.closeRoom(eventId, 1000, 'Event deleted');
      } catch {
        // Ignore WS cleanup errors
      }

      await eventRepo.delete(event.id);

      return { deleted: true, eventId };
    }
  );

  /**
   * PATCH /api/v1/admin/events/:eventId/status
   * Update event status (state transition)
   */
  app.patch<{
    Params: { eventId: string };
    Body: { status: EventStatus };
  }>(
    '/api/v1/admin/events/:eventId/status',
    {
      schema: updateStatusSchema,
      preHandler: apiKeyAuth,
    },
    async (request, reply) => {
      const authRequest = request as AuthenticatedRequest;
      const { eventId } = request.params;
      const { status: targetStatus } = request.body;

      // Verify event exists and matches authenticated event
      const event = await eventRepo.findByEventId(eventId);

      if (!event) {
        reply.code(404).send({
          error: 'NotFound',
          message: `Event not found: ${eventId}`,
        });
        return;
      }

      // Verify authenticated event matches request
      if (authRequest.event?.id !== event.id) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'API key does not match event',
        });
        return;
      }

      // Attempt state transition
      const result = await lifecycleService.transitionEvent(
        event.id,
        targetStatus
      );

      if (!result.success) {
        reply.code(400).send({
          error: 'InvalidTransition',
          message: result.error ?? 'Invalid state transition',
          currentStatus: result.previousStatus,
          requestedStatus: targetStatus,
          validTransitions: result.validTransitions,
        });
        return;
      }

      // Broadcast state change to WebSocket clients
      try {
        wsManager.broadcastDiff(eventId, {
          status: targetStatus as PublicEventStatus,
        });

        // If transitioning to official, close all WebSocket connections after grace period
        if (targetStatus === 'official') {
          wsManager.closeRoom(eventId, 1000, 'Event results are official');
        }
      } catch (broadcastError) {
        // Log broadcast errors but don't fail the state transition
        request.log.error(broadcastError, 'Failed to broadcast status change');
      }

      return {
        eventId,
        previousStatus: result.previousStatus,
        status: targetStatus,
        statusChangedAt: result.statusChangedAt,
      };
    }
  );
}
