import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { isApiKeyValid } from '../utils/apiKey.js';

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
    hasXmlData: boolean;
    status: string;
  };
}

/**
 * Create API key authentication middleware
 *
 * Verifies X-API-Key header, checks validity window, and attaches event to request
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

    // Check API key validity window based on event dates
    const validity = isApiKeyValid(event.start_date, event.end_date);
    if (!validity.valid) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: validity.reason ?? 'API key is not valid at this time',
      });
      return;
    }

    // Attach event info to request
    request.event = {
      id: event.id,
      eventId: event.event_id,
      hasXmlData: event.has_xml_data === 1,
      status: event.status,
    };
  };
}
