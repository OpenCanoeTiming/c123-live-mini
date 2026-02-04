import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import {
  createApiKeyAuth,
  type AuthenticatedRequest,
} from '../middleware/apiKeyAuth.js';
import { IngestService, type IngestResult } from '../services/IngestService.js';

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
}
