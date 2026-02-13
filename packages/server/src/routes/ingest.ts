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
import type {
  OnCourseInput,
  EventStatus,
  PublicEventDetail,
  PublicClass,
  PublicRace,
  PublicAggregatedCategory,
  PublicOnCourseEntry,
} from '@c123-live-mini/shared';
import { ALLOWED_INGEST } from '@c123-live-mini/shared';
import type { LiveResultInput } from '../types/ingest.js';
import {
  ingestXmlSchema,
  ingestOncourseSchema,
  ingestResultsSchema,
} from '../schemas/index.js';
import type { WebSocketManager } from '../services/WebSocketManager.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { ResultRepository } from '../db/repositories/ResultRepository.js';

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
  db: Kysely<Database>,
  wsManager: WebSocketManager
): void {
  const apiKeyAuth = createApiKeyAuth(db);
  const ingestService = new IngestService(db);
  const resultIngestService = new ResultIngestService(db);
  const ingestRecordRepo = new IngestRecordRepository(db);
  const eventRepo = new EventRepository(db);
  const classRepo = new ClassRepository(db);
  const raceRepo = new RaceRepository(db);
  const resultRepo = new ResultRepository(db);

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
      const eventStatus = authRequest.event?.status as EventStatus;
      if (!ALLOWED_INGEST[eventStatus]?.includes('xml')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: `Data type 'xml' not accepted in '${eventStatus}' state`,
        } as unknown as IngestXmlResponse);
        return;
      }

      const apiKey = request.headers['x-api-key'] as string;

      try {
        // MERGE INTEGRATION (Feature #5): IngestService handles XML import and merging
        // The merge strategy is configurable per event (ARCHITECTURE.md).
        // Default: XML authoritative for structure, TCP authoritative for results.
        const result = await ingestService.ingestXml(xml, apiKey);

        // Broadcast full state to WebSocket clients after XML import
        // DECISION: Use `full` message for XML import (FR-005)
        // Rationale: XML import changes event structure (classes, races, categories).
        // A diff would be massive, so sending complete state is more efficient.
        // The broadcasted state reflects the MERGED data from all sources.
        const eventId = authRequest.event?.eventId;
        const eventDbId = authRequest.event?.id;
        if (eventId && eventDbId) {
          try {
            const event = await eventRepo.findByEventId(eventId);
            if (event) {
              const classes = await classRepo.findByEventId(event.id);
              const races = await raceRepo.findByEventId(event.id);
              const categories = await classRepo.getCategoriesForEvent(event.id);

              wsManager.broadcastFull(eventId, {
                event: {
                  eventId: event.event_id,
                  mainTitle: event.main_title,
                  subTitle: event.sub_title,
                  location: event.location,
                  startDate: event.start_date,
                  endDate: event.end_date,
                  discipline: event.discipline,
                  status: event.status as PublicEventDetail['status'],
                  facility: event.facility,
                },
                classes: classes.map((cls) => ({
                  classId: cls.class_id,
                  name: cls.name,
                  longTitle: cls.long_title,
                  categories: cls.categories.map((cat) => ({
                    catId: cat.cat_id,
                    name: cat.name,
                    firstYear: cat.first_year,
                    lastYear: cat.last_year,
                  })),
                })) as PublicClass[],
                races: races.map((race) => ({
                  raceId: race.race_id,
                  classId: race.class_id,
                  raceType: race.race_type as PublicRace['raceType'],
                  raceOrder: race.race_order,
                  startTime: race.start_time,
                  raceStatus: race.race_status,
                })),
                categories: categories as PublicAggregatedCategory[],
              });
            }
          } catch (broadcastError) {
            // Log broadcast errors but don't fail the ingestion
            request.log.error('Failed to broadcast XML import:', broadcastError);
          }
        }

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
      const eventStatus = authRequest.event?.status as EventStatus;
      if (!ALLOWED_INGEST[eventStatus]?.includes('json_oncourse')) {
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

      // Broadcast oncourse updates to WebSocket clients
      // DECISION: Use `diff` message for oncourse updates (FR-004)
      // Rationale: OnCourse changes are incremental (1-3 entries at a time).
      // Sending only changed entries is ~100-500 bytes vs full state 5-50KB (SC-003).
      try {
        const publicOncourse = onCourseStore.getByEvent(eventId) as PublicOnCourseEntry[];
        wsManager.broadcastDiff(eventId, { oncourse: publicOncourse });
      } catch (broadcastError) {
        // Log broadcast errors but don't fail the ingestion
        request.log.error('Failed to broadcast oncourse update:', broadcastError);
      }

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
      const eventStatus = authRequest.event?.status as EventStatus;
      if (!ALLOWED_INGEST[eventStatus]?.includes('json_results')) {
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
      // MERGE INTEGRATION (Feature #5): ResultIngestService handles result merging
      // Merge strategy: TCP results overwrite XML results (configurable per event).
      const result = await resultIngestService.ingestResults(
        eventDbId,
        results,
        payloadSize
      );

      // Broadcast result updates to WebSocket clients
      // DECISION: Use `diff` message for result updates (FR-004)
      // Rationale: Result changes are typically 1-5 entries per message (~200-1000 bytes).
      // Much smaller than full state (5-50KB). Satisfies SC-003 (80% reduction).
      // FALLBACK: If diff composition fails, use `refresh` signal (FR-006) to trigger client re-fetch.
      const eventId = authRequest.event?.eventId;
      if (eventId && result.updated > 0) {
        try {
          // Fetch MERGED results for each race that was updated
          // CRITICAL: We broadcast the final merged state, not the raw input.
          // This ensures clients always see the correct merged data (Feature #5).
          const raceIds = [...new Set(results.map((r) => r.raceId))];

          for (const raceId of raceIds) {
            const race = await raceRepo.findByRaceId(raceId);
            if (race) {
              const dbResults = await resultRepo.findByRaceId(race.id);
              const publicResults = dbResults.map((r) => ({
                rnk: r.rnk,
                bib: r.bib,
                athleteId: r.athlete_id,
                name: r.name,
                club: r.club,
                noc: r.noc,
                catId: r.cat_id,
                catRnk: r.cat_rnk,
                time: r.time,
                pen: r.pen,
                total: r.total,
                totalBehind: r.total_behind,
                catTotalBehind: r.cat_total_behind,
                status: r.status,
              }));

              wsManager.broadcastDiff(eventId, {
                results: publicResults,
                raceId,
              });
            }
          }
        } catch (broadcastError) {
          // Log broadcast errors but don't fail the ingestion
          request.log.error('Failed to broadcast result update:', broadcastError);
          // FALLBACK: Send refresh signal if diff composition fails (FR-006)
          try {
            wsManager.broadcastRefresh(eventId);
          } catch (refreshError) {
            request.log.error('Failed to send refresh signal:', refreshError);
          }
        }
      }

      return { updated: result.updated };
    }
  );
}
