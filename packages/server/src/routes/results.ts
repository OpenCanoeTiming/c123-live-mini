import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { ResultRepository } from '../db/repositories/ResultRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';

/**
 * Result entry in response
 */
interface ResultEntry {
  rnk: number | null;
  bib: number | null;
  participantId: string;
  name: string;
  club: string | null;
  noc: string | null;
  catId: string | null;
  catRnk: number | null;
  time: number | null;
  pen: number | null;
  total: number | null;
  totalBehind: string | null;
  status: string | null;
  gates?: number[];
}

/**
 * Results response
 */
interface ResultsResponse {
  race: {
    raceId: string;
    classId: string | null;
    disId: string;
    raceStatus: number;
  };
  results: ResultEntry[];
}

/**
 * Route params
 */
interface ResultsParams {
  eventId: string;
  raceId: string;
}

/**
 * Query params
 */
interface ResultsQuery {
  catId?: string;
  detailed?: string;
}

/**
 * Format name from family and given name
 */
function formatName(familyName: string, givenName: string | null): string {
  if (!givenName) return familyName;
  return `${familyName} ${givenName}`;
}

/**
 * Register results routes
 */
export function registerResultsRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const eventRepo = new EventRepository(db);
  const raceRepo = new RaceRepository(db);
  const resultRepo = new ResultRepository(db);
  const classRepo = new ClassRepository(db);

  /**
   * GET /api/v1/events/:eventId/results/:raceId
   * Get results for a specific race
   */
  app.get<{
    Params: ResultsParams;
    Querystring: ResultsQuery;
    Reply: ResultsResponse;
  }>('/api/v1/events/:eventId/results/:raceId', async (request, reply) => {
    const { eventId, raceId } = request.params;
    const { catId, detailed } = request.query;
    const includeGates = detailed === 'true' || detailed === '1';

    // Find event
    const event = await eventRepo.findByEventId(eventId);
    if (!event) {
      reply.code(404).send({
        error: 'Not found',
        message: `Event not found: ${eventId}`,
      } as unknown as ResultsResponse);
      return;
    }

    // Find race
    const race = await raceRepo.findByEventAndRaceId(event.id, raceId);
    if (!race) {
      reply.code(404).send({
        error: 'Not found',
        message: `Race not found: ${raceId}`,
      } as unknown as ResultsResponse);
      return;
    }

    // Get class ID string for response
    let classIdStr: string | null = null;
    if (race.class_id) {
      const cls = await classRepo.findById(race.class_id);
      classIdStr = cls?.class_id ?? null;
    }

    // Get results with participant data
    let results = await resultRepo.findByRaceIdWithParticipant(race.id);

    // Filter by category if requested
    if (catId) {
      results = results.filter((r) => r.cat_id === catId);
    }

    return {
      race: {
        raceId: race.race_id,
        classId: classIdStr,
        disId: race.dis_id,
        raceStatus: race.race_status,
      },
      results: results.map((r) => {
        const entry: ResultEntry = {
          rnk: r.rnk,
          bib: r.bib,
          participantId: r.participant_id_str,
          name: formatName(r.family_name, r.given_name),
          club: r.club,
          noc: r.noc,
          catId: r.cat_id,
          catRnk: r.cat_rnk,
          time: r.time,
          pen: r.pen,
          total: r.total,
          totalBehind: r.total_behind,
          status: r.status,
        };

        if (includeGates && r.gates) {
          try {
            entry.gates = JSON.parse(r.gates);
          } catch {
            // Invalid JSON, skip gates
          }
        }

        return entry;
      }),
    };
  });
}
