import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { ParticipantRepository } from '../db/repositories/ParticipantRepository.js';
import { ResultRepository } from '../db/repositories/ResultRepository.js';
import { CourseRepository } from '../db/repositories/CourseRepository.js';
import type { LiveResultInput, ResultsIngestResult } from '../types/ingest.js';
import { createLogger } from '../utils/logger.js';
import { transformTcpGates, gatesToJson } from '../utils/gateTransform.js';

const log = createLogger('ResultIngestService');

/**
 * Service for ingesting live results from TCP stream via JSON
 */
export class ResultIngestService {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  /**
   * Ingest live results from JSON.
   *
   * #157: The loop runs inside a single SQLite transaction so all SELECTs and
   * UPSERTs share one fsync instead of ~3-4 per result. On Railway's network
   * volume each autocommit fsync is ~30ms; without this wrapping an 80-result
   * payload would block the Node event loop for several seconds, causing
   * cascading client timeouts and the "bumpy oncourse" perception (OnCourse
   * POSTs queue in TCP buffer until the event loop unblocks, then flush in a
   * burst).
   */
  async ingestResults(
    eventId: number,
    results: LiveResultInput[],
    _payloadSize: number
  ): Promise<ResultsIngestResult> {
    return this.db.transaction().execute(async (trx) => {
      const raceRepo = new RaceRepository(trx as unknown as Kysely<Database>);
      const participantRepo = new ParticipantRepository(trx as unknown as Kysely<Database>);
      const resultRepo = new ResultRepository(trx as unknown as Kysely<Database>);
      const courseRepo = new CourseRepository(trx as unknown as Kysely<Database>);

      let updated = 0;

      for (const input of results) {
        const race = await raceRepo.findByEventAndRaceId(eventId, input.raceId);
        if (!race) {
          log.debug('Skipping result for unknown race', {
            eventId,
            raceId: input.raceId,
            bib: input.bib,
          });
          continue;
        }

        const participant = await participantRepo.findByEventAndParticipantId(
          eventId,
          input.participantId
        );
        if (!participant) {
          log.debug('Skipping result for unknown participant', {
            eventId,
            participantId: input.participantId,
            bib: input.bib,
          });
          continue;
        }

        // Transform gates to self-describing format if provided
        let gatesJson: string | undefined;
        if (input.gates && input.gates.length > 0) {
          let gateConfig: string | null = null;
          if (race.course_nr !== null) {
            const course = await courseRepo.findByEventAndCourseNr(
              eventId,
              race.course_nr
            );
            gateConfig = course?.gate_config ?? null;
          }
          const transformedGates = transformTcpGates(input.gates, gateConfig);
          gatesJson = gatesToJson(transformedGates);
        }

        await resultRepo.upsert(eventId, race.id, {
          participant_id: participant.id,
          bib: input.bib,
          time: input.time ?? null,
          pen: input.pen ?? null,
          total: input.total ?? null,
          status: input.status || null,
          rnk: input.rnk ?? null,
          gates: gatesJson ?? null,
        });

        updated++;
      }

      // Note: ingest_records audit was removed for 'json_results' (#157).
      // At race peak the audit insert itself was another autocommit fsync per
      // push, and the table grew ~1k rows per race with no operational value.
      return { updated, ignored: false };
    });
  }
}
