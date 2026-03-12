import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import type { PublicGate, PublicRaceType } from '@c123-live-mini/shared';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { ResultRepository } from '../db/repositories/ResultRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { CourseRepository } from '../db/repositories/CourseRepository.js';
import { resultsSchema } from '../schemas/index.js';
import { BrCombinedService } from '../services/BrCombinedService.js';

/**
 * Result entry in response
 */
interface ResultEntry {
  rnk: number | null;
  bib: number | null;
  athleteId: string | null;
  name: string;
  club: string | null;
  noc: string | null;
  catId: string | null;
  catRnk: number | null;
  time: number | null;
  pen: number | null;
  total: number | null;
  totalBehind: string | null;
  catTotalBehind: string | null;
  status: string | null;
  // Detailed mode fields
  dtStart?: string | null;
  dtFinish?: string | null;
  gates?: PublicGate[] | null;
  courseGateCount?: number | null;
  // Multi-run fields (BR1/BR2)
  betterRunNr?: number | null;
  totalTotal?: number | null;
  prevTime?: number | null;
  prevPen?: number | null;
  prevTotal?: number | null;
  prevRnk?: number | null;
}

/**
 * Run entry for multi-run response
 */
interface RunEntry {
  runNr: 1 | 2;
  raceId: string;
  time: number | null;
  pen: number | null;
  total: number | null;
  rnk: number | null;
  gates?: PublicGate[] | null;
}

/**
 * Multi-run result entry (when includeAllRuns=true)
 */
interface MultiRunResultEntry extends Omit<ResultEntry, 'gates'> {
  runs: RunEntry[];
}

/**
 * Results response
 */
interface ResultsResponse {
  race: {
    raceId: string;
    classId: string | null;
    raceType: PublicRaceType;
    raceStatus: number;
  };
  results: ResultEntry[] | MultiRunResultEntry[];
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
  const courseRepo = new CourseRepository(db);
  const brCombinedService = new BrCombinedService(resultRepo);

  /**
   * GET /api/v1/events/:eventId/results/:raceId
   * Get results for a specific race
   */
  app.get<{
    Params: ResultsParams;
    Querystring: ResultsQuery;
    Reply: ResultsResponse;
  }>(
    '/api/v1/events/:eventId/results/:raceId',
    { schema: resultsSchema },
    async (request, reply) => {
    const { eventId, raceId } = request.params;
    const { catId, detailed } = request.query;
    const includeGates = detailed === 'true' || detailed === '1';

    // Find event - return 404 for non-existent or draft events
    const event = await eventRepo.findByEventId(eventId);
    if (!event || event.status === 'draft') {
      reply.code(404).send({
        error: 'NotFound',
        message: 'Event not found',
      } as unknown as ResultsResponse);
      return;
    }

    // Find race
    const race = await raceRepo.findByEventAndRaceId(event.id, raceId);
    if (!race) {
      reply.code(404).send({
        error: 'NotFound',
        message: 'Race not found',
      } as unknown as ResultsResponse);
      return;
    }

    // Get course gate count for detailed mode
    let courseGateCount: number | null = null;
    if (includeGates && race.course_nr) {
      const course = await courseRepo.findByEventAndCourseNr(
        event.id,
        race.course_nr
      );
      courseGateCount = course?.nr_gates ?? null;
    }

    // Get class ID string for response
    let classIdStr: string | null = null;
    if (race.class_id) {
      const cls = await classRepo.findById(race.class_id);
      classIdStr = cls?.class_id ?? null;
    }

    // Detect BR race — auto-enable combined mode
    // Server is the single authority on BR combined computation
    const isBrRace = race.race_type === 'best-run-1' || race.race_type === 'best-run-2';

    if (isBrRace) {
      // Always return combined data for BR races (no includeAllRuns needed)
      const combinedResults = await brCombinedService.computeCombined(
        event.id, race.race_id, catId, includeGates
      );

      return {
        race: {
          raceId: race.race_id,
          classId: classIdStr,
          raceType: (race.race_type ?? 'unknown') as PublicRaceType,
          raceStatus: race.race_status,
        },
        results: combinedResults.map((r) => {
          const entry: ResultEntry = {
            rnk: r.rnk,
            bib: r.bib,
            athleteId: r.athleteId,
            name: r.name,
            club: r.club,
            noc: r.noc,
            catId: r.catId,
            catRnk: r.catRnk,
            time: r.time,
            pen: r.pen,
            total: r.total,
            totalBehind: r.totalBehind,
            catTotalBehind: r.catTotalBehind,
            status: r.status,
            betterRunNr: r.betterRunNr,
            totalTotal: r.totalTotal,
            prevTime: r.prevTime,
            prevPen: r.prevPen,
            prevTotal: r.prevTotal,
            prevRnk: r.prevRnk,
          };

          if (includeGates) {
            entry.dtStart = r.dtStart ?? null;
            entry.dtFinish = r.dtFinish ?? null;
            entry.courseGateCount = courseGateCount;
            entry.gates = r.gates ?? null;
          }

          return entry;
        }),
      };
    }

    // Standard mode: get results for single race
    // Use filterByCatId for category filtering (sorted by catRnk)
    // or getResultsWithBestRun for all results (sorted by rnk)
    const results = catId
      ? await resultRepo.filterByCatId(race.id, catId)
      : await resultRepo.getResultsWithBestRun(race.id);

    return {
      race: {
        raceId: race.race_id,
        classId: classIdStr,
        raceType: (race.race_type ?? 'unknown') as PublicRaceType,
        raceStatus: race.race_status,
      },
      results: results.map((r) => {
        const entry: ResultEntry = {
          rnk: r.rnk,
          bib: r.bib,
          athleteId: r.athlete_id,
          name: formatName(r.family_name, r.given_name),
          club: r.club,
          noc: r.noc,
          catId: r.cat_id,
          catRnk: r.cat_rnk,
          time: r.time,
          pen: r.pen,
          total: r.total,
          totalBehind: r.total_behind,
          catTotalBehind: r.cat_total_behind,
          status: r.status || null,
        };

        // Detailed mode fields
        if (includeGates) {
          entry.dtStart = r.dt_start;
          entry.dtFinish = r.dt_finish;
          entry.courseGateCount = courseGateCount;

          if (r.gates) {
            try {
              entry.gates = JSON.parse(r.gates) as PublicGate[];
            } catch {
              // Invalid JSON, set gates to null
              entry.gates = null;
            }
          } else {
            entry.gates = null;
          }
        }

        return entry;
      }),
    };
  });
}
