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
  includeAllRuns?: string;
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
    const { catId, detailed, includeAllRuns } = request.query;
    const includeGates = detailed === 'true' || detailed === '1';
    const showAllRuns = includeAllRuns === 'true' || includeAllRuns === '1';

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

    // Check if this is a BR race and includeAllRuns is requested
    const isBrRace = race.race_type === 'best-run-1' || race.race_type === 'best-run-2';

    if (showAllRuns && isBrRace) {
      // Multi-run mode: get linked BR1/BR2 results
      const linkedResults = await resultRepo.getLinkedBrResults(
        event.id,
        race.race_id
      );

      // Build multi-run response sorted by best total
      const multiRunResults: MultiRunResultEntry[] = [];

      for (const [, runs] of linkedResults) {
        if (runs.length === 0) continue;

        // Use first run for participant info
        const firstRun = runs[0];

        // Filter by category if requested
        if (catId && firstRun.cat_id !== catId) continue;

        // Build runs array
        const runsArray: RunEntry[] = runs.map((r) => {
          const runEntry: RunEntry = {
            runNr: r.race_type === 'best-run-1' ? 1 : 2,
            raceId: r.race_id_str,
            time: r.time,
            pen: r.pen,
            total: r.total,
            rnk: r.rnk,
          };

          if (includeGates && r.gates) {
            try {
              runEntry.gates = JSON.parse(r.gates);
            } catch {
              // Invalid JSON, skip gates
            }
          }

          return runEntry;
        });

        // Calculate totalTotal and betterRunNr if both runs exist
        let totalTotal: number | null = null;
        let betterRunNr: number | null = null;

        const br1 = runs.find((r) => r.race_type === 'best-run-1');
        const br2 = runs.find((r) => r.race_type === 'best-run-2');

        if (
          br1?.total != null &&
          br2?.total != null &&
          !br1.status &&
          !br2.status
        ) {
          // Both runs completed successfully
          if (br1.total <= br2.total) {
            totalTotal = br1.total;
            betterRunNr = 1;
          } else {
            totalTotal = br2.total;
            betterRunNr = 2;
          }
        } else if (br1?.total != null && !br1.status) {
          totalTotal = br1.total;
          betterRunNr = 1;
        } else if (br2?.total != null && !br2.status) {
          totalTotal = br2.total;
          betterRunNr = 2;
        }

        // Use BR2 result data if available (contains prev_ fields), else BR1
        const primaryResult = br2 ?? br1;
        if (!primaryResult) continue;

        multiRunResults.push({
          rnk: primaryResult.rnk,
          bib: primaryResult.bib,
          athleteId: primaryResult.athlete_id,
          name: formatName(primaryResult.family_name, primaryResult.given_name),
          club: primaryResult.club,
          noc: primaryResult.noc,
          catId: primaryResult.cat_id,
          catRnk: primaryResult.cat_rnk,
          time: primaryResult.time,
          pen: primaryResult.pen,
          total: primaryResult.total,
          totalBehind: primaryResult.total_behind,
          catTotalBehind: primaryResult.cat_total_behind,
          status: primaryResult.status,
          betterRunNr,
          totalTotal,
          prevTime: primaryResult.prev_time,
          prevPen: primaryResult.prev_pen,
          prevTotal: primaryResult.prev_total,
          prevRnk: primaryResult.prev_rnk,
          runs: runsArray,
        });
      }

      // Sort by totalTotal (best time first), then by rnk
      multiRunResults.sort((a, b) => {
        if (a.totalTotal == null && b.totalTotal == null) return 0;
        if (a.totalTotal == null) return 1;
        if (b.totalTotal == null) return -1;
        return a.totalTotal - b.totalTotal;
      });

      return {
        race: {
          raceId: race.race_id,
          classId: classIdStr,
          raceType: (race.race_type ?? 'unknown') as PublicRaceType,
          raceStatus: race.race_status,
        },
        results: multiRunResults,
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
          status: r.status,
        };

        // Include multi-run fields for BR races
        if (isBrRace) {
          entry.betterRunNr = r.better_run_nr;
          entry.totalTotal = r.total_total;
          entry.prevTime = r.prev_time;
          entry.prevPen = r.prev_pen;
          entry.prevTotal = r.prev_total;
          entry.prevRnk = r.prev_rnk;
        }

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
