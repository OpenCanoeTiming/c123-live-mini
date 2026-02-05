import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';

/**
 * API Key header name
 */
export const API_KEY_HEADER = 'x-api-key';

/**
 * Extended request with authenticated event
 */
export interface AuthenticatedRequest extends FastifyRequest {
  event?: {
    id: number;
    eventId: string;
  };
}

/**
 * Create API key authentication middleware
 *
 * Verifies X-API-Key header and attaches event to request
 */
export function createApiKeyAuth(db: Kysely<Database>) {
  const eventRepo = new EventRepository(db);

  return async function apiKeyAuth(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    const apiKey = request.headers[API_KEY_HEADER];

    if (!apiKey || Array.isArray(apiKey)) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid X-API-Key header',
      });
      return;
    }

    const event = await eventRepo.findByApiKey(apiKey);

    if (!event) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
      return;
    }

    // Attach event info to request
    request.event = {
      id: event.id,
      eventId: event.event_id,
    };
  };
}
