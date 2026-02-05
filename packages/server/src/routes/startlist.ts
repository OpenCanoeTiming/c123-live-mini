import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { ResultRepository } from '../db/repositories/ResultRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { startlistSchema } from '../schemas/index.js';

/**
 * Startlist entry
 */
interface StartlistEntry {
  startOrder: number | null;
  bib: number | null;
  participantId: string;
  name: string;
  club: string | null;
  noc: string | null;
  startTime: string | null;
}

/**
 * Startlist response
 */
interface StartlistResponse {
  race: {
    raceId: string;
    classId: string | null;
    startTime: string | null;
  };
  startlist: StartlistEntry[];
}

/**
 * Route params
 */
interface StartlistParams {
  eventId: string;
  raceId: string;
}

/**
 * Format name from family and given name
 */
function formatName(familyName: string, givenName: string | null): string {
  if (!givenName) return familyName;
  return `${familyName} ${givenName}`;
}

/**
 * Register startlist routes
 */
export function registerStartlistRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const eventRepo = new EventRepository(db);
  const raceRepo = new RaceRepository(db);
  const resultRepo = new ResultRepository(db);
  const classRepo = new ClassRepository(db);

  /**
   * GET /api/v1/events/:eventId/startlist/:raceId
   * Get startlist for a specific race
   */
  app.get<{
    Params: StartlistParams;
    Reply: StartlistResponse;
  }>(
    '/api/v1/events/:eventId/startlist/:raceId',
    { schema: startlistSchema },
    async (request, reply) => {
    const { eventId, raceId } = request.params;

    // Find event
    const event = await eventRepo.findByEventId(eventId);
    if (!event) {
      reply.code(404).send({
        error: 'Not found',
        message: `Event not found: ${eventId}`,
      } as unknown as StartlistResponse);
      return;
    }

    // Find race
    const race = await raceRepo.findByEventAndRaceId(event.id, raceId);
    if (!race) {
      reply.code(404).send({
        error: 'Not found',
        message: `Race not found: ${raceId}`,
      } as unknown as StartlistResponse);
      return;
    }

    // Get class ID string for response
    let classIdStr: string | null = null;
    if (race.class_id) {
      const cls = await classRepo.findById(race.class_id);
      classIdStr = cls?.class_id ?? null;
    }

    // Get startlist with participant data
    const startlist = await resultRepo.findStartlistWithParticipant(race.id);

    return {
      race: {
        raceId: race.race_id,
        classId: classIdStr,
        startTime: race.start_time,
      },
      startlist: startlist.map((s) => ({
        startOrder: s.start_order,
        bib: s.bib,
        participantId: s.participant_id_str,
        name: formatName(s.family_name, s.given_name),
        club: s.club,
        noc: s.noc,
        startTime: s.start_time,
      })),
    };
  });
}
