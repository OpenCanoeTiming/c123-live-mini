import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import {
  createApiKeyAuth,
  type AuthenticatedRequest,
} from '../middleware/apiKeyAuth.js';
import { IngestService, type IngestResult } from '../services/IngestService.js';
import { ResultIngestService } from '../services/ResultIngestService.js';
import { IngestRecordRepository } from '../db/repositories/IngestRecordRepository.js';
import { getOnCourseStore } from '../services/OnCourseStore.js';
import type { OnCourseInput } from '@c123-live-mini/shared';
import { ALLOWED_INGEST } from '@c123-live-mini/shared';
import type { LiveResultInput } from '../types/ingest.js';
import {
  ingestXmlSchema,
  ingestOncourseSchema,
  ingestResultsSchema,
} from '../schemas/index.js';

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
  ignored?: boolean;
}

/**
 * Results ingest request body
 */
interface IngestResultsBody {
  results: LiveResultInput[];
}

/**
 * Results ingest response
 */
interface IngestResultsResponse {
  updated: number;
  ignored?: boolean;
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
  const resultIngestService = new ResultIngestService(db);
  const ingestRecordRepo = new IngestRecordRepository(db);

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

      // State-dependent ingestion guard
      const eventStatus = authRequest.event?.status;
      if (eventStatus && !ALLOWED_INGEST[eventStatus]?.includes('xml')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: `Data type 'xml' not accepted in '${eventStatus}' state`,
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
   * Note: Data is silently ignored if no XML has been ingested yet
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

      // State-dependent ingestion guard
      const eventStatus = authRequest.event?.status;
      if (eventStatus && !ALLOWED_INGEST[eventStatus]?.includes('json_oncourse')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: `Data type 'json_oncourse' not accepted in '${eventStatus}' state`,
        } as unknown as IngestOnCourseResponse);
        return;
      }

      const eventId = authRequest.event?.eventId;
      const eventDbId = authRequest.event?.id;
      const hasXmlData = authRequest.event?.hasXmlData;

      if (!eventId || !eventDbId) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Event not found for API key',
        } as unknown as IngestOnCourseResponse);
        return;
      }

      // Check if XML has been ingested - silently ignore if not
      if (!hasXmlData) {
        // Log the ignored ingestion
        await ingestRecordRepo.insert({
          eventId: eventDbId,
          sourceType: 'json_oncourse',
          status: 'success',
          payloadSize: JSON.stringify(request.body).length,
          itemsProcessed: 0,
        });

        return { active: 0, ignored: true };
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

      // Log successful ingestion
      await ingestRecordRepo.insert({
        eventId: eventDbId,
        sourceType: 'json_oncourse',
        status: 'success',
        payloadSize: JSON.stringify(request.body).length,
        itemsProcessed: oncourse.length,
      });

      return { active };
    }
  );

  /**
   * POST /api/v1/ingest/results
   * Ingest live result updates (from TCP stream)
   * Note: Data is silently ignored if no XML has been ingested yet
   */
  app.post<{
    Body: IngestResultsBody;
    Reply: IngestResultsResponse;
  }>(
    '/api/v1/ingest/results',
    {
      schema: ingestResultsSchema,
      preHandler: apiKeyAuth,
    },
    async (request, reply) => {
      const { results } = request.body;
      const authRequest = request as AuthenticatedRequest;

      if (!results || !Array.isArray(results)) {
        reply.code(400).send({
          error: 'Invalid request',
          message: 'Missing required field: results (array)',
        } as unknown as IngestResultsResponse);
        return;
      }

      // State-dependent ingestion guard
      const eventStatus = authRequest.event?.status;
      if (eventStatus && !ALLOWED_INGEST[eventStatus]?.includes('json_results')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: `Data type 'json_results' not accepted in '${eventStatus}' state`,
        } as unknown as IngestResultsResponse);
        return;
      }

      const eventDbId = authRequest.event?.id;
      const hasXmlData = authRequest.event?.hasXmlData;

      if (!eventDbId) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Event not found for API key',
        } as unknown as IngestResultsResponse);
        return;
      }

      // Check if XML has been ingested - silently ignore if not
      if (!hasXmlData) {
        // Log the ignored ingestion
        await ingestRecordRepo.insert({
          eventId: eventDbId,
          sourceType: 'json_results',
          status: 'success',
          payloadSize: JSON.stringify(request.body).length,
          itemsProcessed: 0,
        });

        return { updated: 0, ignored: true };
      }

      const payloadSize = JSON.stringify(request.body).length;
      const result = await resultIngestService.ingestResults(
        eventDbId,
        results,
        payloadSize
      );

      return { updated: result.updated };
    }
  );
}
