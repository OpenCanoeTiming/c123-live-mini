import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { CourseRepository } from '../db/repositories/CourseRepository.js';
import { getOnCourseStore } from '../services/OnCourseStore.js';
import type { PublicOnCourseEntry, PublicGate } from '@c123-live-mini/shared';
import { transformGates } from '../utils/gateTransform.js';
import { oncourseSchema } from '../schemas/index.js';

/**
 * OnCourse route parameters
 */
interface OnCourseParams {
  eventId: string;
}

/**
 * OnCourse response (public API)
 */
interface OnCourseResponse {
  oncourse: PublicOnCourseEntry[];
}

/**
 * Error response
 */
interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Register OnCourse routes
 */
export function registerOnCourseRoutes(
  app: FastifyInstance,
  db: Kysely<Database>
): void {
  const eventRepo = new EventRepository(db);
  const raceRepo = new RaceRepository(db);
  const courseRepo = new CourseRepository(db);
  const onCourseStore = getOnCourseStore();

  /**
   * GET /api/v1/events/:eventId/oncourse
   * Get competitors currently on course (real-time)
   */
  app.get<{
    Params: OnCourseParams;
    Reply: OnCourseResponse | ErrorResponse;
  }>(
    '/api/v1/events/:eventId/oncourse',
    { schema: oncourseSchema },
    async (request, reply) => {
    const { eventId } = request.params;

    // Verify event exists - return 404 for non-existent or draft events
    const event = await eventRepo.findByEventId(eventId);
    if (!event || event.status === 'draft') {
      reply.code(404).send({
        error: 'NotFound',
        message: 'Event not found',
      });
      return;
    }

    // Get active OnCourse entries
    const rawOncourse = onCourseStore.getAll(eventId);

    // Build course config lookup for gate transformation
    const courseConfigs = new Map<number, string | null>();

    // Transform to public format
    const oncourse: PublicOnCourseEntry[] = [];
    for (const entry of rawOncourse) {
      // Look up race to get course config for gate transformation
      let gateConfig: string | null = null;
      const race = await raceRepo.findByEventAndRaceId(event.id, entry.raceId);
      if (race?.course_nr) {
        if (!courseConfigs.has(race.course_nr)) {
          const course = await courseRepo.findByEventAndCourseNr(
            event.id,
            race.course_nr
          );
          courseConfigs.set(race.course_nr, course?.gate_config ?? null);
        }
        gateConfig = courseConfigs.get(race.course_nr) ?? null;
      }

      // Transform positional gates to self-describing format
      const gates: PublicGate[] = entry.gates
        ? transformGates(entry.gates as number[], gateConfig)
        : [];

      // Strip participantId, transform gates
      oncourse.push({
        raceId: entry.raceId,
        bib: entry.bib,
        name: entry.name,
        club: entry.club,
        position: entry.position,
        gates,
        completed: entry.completed,
        dtStart: entry.dtStart,
        dtFinish: entry.dtFinish,
        time: entry.time,
        pen: entry.pen,
        total: entry.total,
        rank: entry.rank,
        ttbDiff: entry.ttbDiff,
        ttbName: entry.ttbName,
      });
    }

    return { oncourse };
  });
}
