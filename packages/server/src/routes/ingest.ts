import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import {
  createApiKeyAuth,
  type AuthenticatedRequest,
} from '../middleware/apiKeyAuth.js';
import { IngestService, type IngestResult } from '../services/IngestService.js';
import { getOnCourseStore } from '../services/OnCourseStore.js';
import type { OnCourseInput } from '@c123-live-mini/shared';
import { ingestXmlSchema, ingestOncourseSchema } from '../schemas/index.js';

/**
 * XML ingest request body
 */
interface IngestXmlBody {
  xml: string;
}

/**
 * XML ingest response
 */
interface IngestXmlResponse {
  imported: IngestResult['imported'];
}

/**
 * OnCourse ingest request body
 */
interface IngestOnCourseBody {
  oncourse: OnCourseInput[];
}

/**
 * OnCourse ingest response
 */
interface IngestOnCourseResponse {
  active: number;
}

/**
 * Register ingest routes
 */
export function registerIngestRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const apiKeyAuth = createApiKeyAuth(db);
  const ingestService = new IngestService(db);

  /**
   * POST /api/v1/ingest/xml
   * Ingest full XML export data
   */
  app.post<{
    Body: IngestXmlBody;
    Reply: IngestXmlResponse;
  }>(
    '/api/v1/ingest/xml',
    {
      schema: ingestXmlSchema,
      preHandler: apiKeyAuth,
    },
    async (request, reply) => {
      const { xml } = request.body;
      const authRequest = request as AuthenticatedRequest;

      if (!xml) {
        reply.code(400).send({
          error: 'Invalid request',
          message: 'Missing required field: xml',
        } as unknown as IngestXmlResponse);
        return;
      }

      const apiKey = request.headers['x-api-key'] as string;

      try {
        const result = await ingestService.ingestXml(xml, apiKey);
        return { imported: result.imported };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        // Check for specific error types
        if (message.includes('Invalid XML') || message.includes('missing')) {
          reply.code(400).send({
            error: 'Invalid request',
            message,
          } as unknown as IngestXmlResponse);
          return;
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/v1/ingest/oncourse
   * Update OnCourse data (from TCP stream)
   */
  app.post<{
    Body: IngestOnCourseBody;
    Reply: IngestOnCourseResponse;
  }>(
    '/api/v1/ingest/oncourse',
    {
      schema: ingestOncourseSchema,
      preHandler: apiKeyAuth,
    },
    async (request, reply) => {
      const { oncourse } = request.body;
      const authRequest = request as AuthenticatedRequest;

      if (!oncourse || !Array.isArray(oncourse)) {
        reply.code(400).send({
          error: 'Invalid request',
          message: 'Missing required field: oncourse (array)',
        } as unknown as IngestOnCourseResponse);
        return;
      }

      const eventId = authRequest.event?.eventId;
      if (!eventId) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Event not found for API key',
        } as unknown as IngestOnCourseResponse);
        return;
      }

      const onCourseStore = getOnCourseStore();

      // Process each OnCourse entry
      for (const entry of oncourse) {
        if (!entry.participantId || !entry.raceId || entry.bib === undefined) {
          continue; // Skip invalid entries
        }

        onCourseStore.add(eventId, entry);
      }

      // Cleanup finished competitors
      onCourseStore.cleanupFinished(eventId);

      // Return count of active competitors
      const active = onCourseStore.getActiveCount(eventId);

      return { active };
    }
  );
}
