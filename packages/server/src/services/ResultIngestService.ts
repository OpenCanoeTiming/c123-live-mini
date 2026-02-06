import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { ParticipantRepository } from '../db/repositories/ParticipantRepository.js';
import { ResultRepository } from '../db/repositories/ResultRepository.js';
import { IngestRecordRepository } from '../db/repositories/IngestRecordRepository.js';
import type { LiveResultInput, ResultsIngestResult } from '../types/ingest.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('ResultIngestService');

/**
 * Service for ingesting live results from TCP stream via JSON
 */
export class ResultIngestService {
  private readonly raceRepo: RaceRepository;
  private readonly participantRepo: ParticipantRepository;
  private readonly resultRepo: ResultRepository;
  private readonly ingestRecordRepo: IngestRecordRepository;

  constructor(db: Kysely<Database>) {
    this.raceRepo = new RaceRepository(db);
    this.participantRepo = new ParticipantRepository(db);
    this.resultRepo = new ResultRepository(db);
    this.ingestRecordRepo = new IngestRecordRepository(db);
  }

  /**
   * Ingest live results from JSON
   *
   * @param eventId - Internal event ID
   * @param results - Array of result updates
   * @param payloadSize - Size of original request payload
   * @returns Number of results updated
   */
  async ingestResults(
    eventId: number,
    results: LiveResultInput[],
    payloadSize: number
  ): Promise<ResultsIngestResult> {
    let updated = 0;

    for (const input of results) {
      // Find the race by race_id string
      const race = await this.raceRepo.findByEventAndRaceId(
        eventId,
        input.raceId
      );
      if (!race) {
        log.debug('Skipping result for unknown race', {
          eventId,
          raceId: input.raceId,
          bib: input.bib,
        });
        continue;
      }

      // Find the participant by participant_id string
      const participant = await this.participantRepo.findByEventAndParticipantId(
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

      // Prepare gates JSON if provided
      const gatesJson = input.gates ? JSON.stringify(input.gates) : undefined;

      // Upsert the result
      await this.resultRepo.upsert(eventId, race.id, {
        participant_id: participant.id,
        bib: input.bib,
        time: input.time ?? null,
        pen: input.pen ?? null,
        total: input.total ?? null,
        status: input.status ?? null,
        rnk: input.rnk ?? null,
        gates: gatesJson ?? null,
      });

      updated++;
    }

    // Log the ingestion
    await this.ingestRecordRepo.insert({
      eventId,
      sourceType: 'json_results',
      status: 'success',
      payloadSize,
      itemsProcessed: updated,
    });

    return { updated, ignored: false };
  }
}
