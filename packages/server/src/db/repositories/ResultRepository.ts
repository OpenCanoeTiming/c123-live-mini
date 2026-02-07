import type { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import type { Database, ResultsTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Repository for Result entity operations
 */
export class ResultRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Find a result by its internal ID
   */
  async findById(id: number): Promise<Selectable<ResultsTable> | undefined> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Find all results
   */
  async findAll(): Promise<Selectable<ResultsTable>[]> {
    return this.db.selectFrom('results').selectAll().execute();
  }

  /**
   * Insert a new result
   */
  async insert(data: Insertable<ResultsTable>): Promise<number> {
    const result = await this.db
      .insertInto('results')
      .values(data)
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Update a result
   */
  async update(id: number, data: Updateable<ResultsTable>): Promise<boolean> {
    const result = await this.db
      .updateTable('results')
      .set(data)
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  /**
   * Delete a result
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('results')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find a result by race ID and participant ID
   */
  async findByRaceAndParticipant(
    raceId: number,
    participantId: number
  ): Promise<Selectable<ResultsTable> | undefined> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('race_id', '=', raceId)
      .where('participant_id', '=', participantId)
      .executeTakeFirst();
  }

  /**
   * Find all results for a race, ordered by rank
   */
  async findByRaceId(raceId: number): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('race_id', '=', raceId)
      .orderBy('rnk', 'asc')
      .orderBy('rnk_order', 'asc')
      .execute();
  }

  /**
   * Find all results for an event
   */
  async findByEventId(eventId: number): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('event_id', '=', eventId)
      .execute();
  }

  /**
   * Find all results for a participant
   */
  async findByParticipantId(
    participantId: number
  ): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('participant_id', '=', participantId)
      .execute();
  }

  /**
   * Find results for a race ordered by start order (startlist)
   */
  async findStartlistByRaceId(
    raceId: number
  ): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('race_id', '=', raceId)
      .orderBy('start_order', 'asc')
      .execute();
  }

  /**
   * Create or update result by race_id + participant_id (upsert)
   */
  async upsert(
    eventId: number,
    raceId: number,
    data: Omit<Insertable<ResultsTable>, 'event_id' | 'race_id'>
  ): Promise<number> {
    const existing = await this.findByRaceAndParticipant(
      raceId,
      data.participant_id
    );
    if (existing) {
      const { participant_id, ...updateData } =
        data as Updateable<ResultsTable>;
      await this.update(existing.id, updateData);
      return existing.id;
    }
    return this.insert({ ...data, event_id: eventId, race_id: raceId });
  }

  /**
   * Delete all results for a race
   */
  async deleteByRaceId(raceId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('results')
      .where('race_id', '=', raceId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Delete all results for an event
   */
  async deleteByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('results')
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Count results by race
   */
  async countByRaceId(raceId: number): Promise<number> {
    const result = await this.db
      .selectFrom('results')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('race_id', '=', raceId)
      .executeTakeFirst();
    return Number(result?.count ?? 0);
  }

  /**
   * Find results for a race with participant data joined
   */
  async findByRaceIdWithParticipant(raceId: number): Promise<
    Array<
      Selectable<ResultsTable> & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .orderBy('results.rnk', 'asc')
      .orderBy('results.rnk_order', 'asc')
      .execute();
  }

  /**
   * Find startlist for a race with participant data joined
   */
  async findStartlistWithParticipant(raceId: number): Promise<
    Array<
      Pick<
        Selectable<ResultsTable>,
        'start_order' | 'bib' | 'start_time' | 'participant_id'
      > & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.participant_id',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .orderBy('results.start_order', 'asc')
      .execute();
  }

  /**
   * Find results with best run data for multi-run races (BR1/BR2)
   * Includes total_total and better_run_nr fields
   */
  async getResultsWithBestRun(raceId: number): Promise<
    Array<
      Selectable<ResultsTable> & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .orderBy('results.rnk', 'asc')
      .orderBy('results.rnk_order', 'asc')
      .execute();
  }

  /**
   * Find both BR1 and BR2 results for a specific participant
   * Returns results from both runs linked by class pattern
   */
  async getBothRunsForParticipant(
    eventId: number,
    participantId: number,
    classId: number
  ): Promise<
    Array<
      Selectable<ResultsTable> & {
        race_id_str: string;
        race_type: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('races', 'races.id', 'results.race_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'races.race_id as race_id_str',
        'races.race_type',
      ])
      .where('results.event_id', '=', eventId)
      .where('results.participant_id', '=', participantId)
      .where('races.class_id', '=', classId)
      .where((eb) =>
        eb.or([
          eb('races.race_type', '=', 'best-run-1'),
          eb('races.race_type', '=', 'best-run-2'),
        ])
      )
      .orderBy('races.race_type', 'asc')
      .execute();
  }

  /**
   * Find paired BR race (BR1 -> BR2 or BR2 -> BR1) by pattern
   * Race IDs follow pattern: {ClassId}_{RunCode}_{Day} where RunCode is BR1 or BR2
   */
  async findPairedBrRace(
    eventId: number,
    raceId: string
  ): Promise<{ id: number; race_id: string; race_type: string | null } | undefined> {
    // Extract class part and day from race_id (e.g., K1M-ZS_BR1_25 -> K1M-ZS, 25)
    const parts = raceId.split('_');
    if (parts.length < 3) return undefined;

    const classIdPart = parts[0];
    const runCode = parts[1];
    const dayPart = parts.slice(2).join('_');

    // Determine paired run code from race_id pattern
    let pairedRunCode: string;
    if (runCode === 'BR1') {
      pairedRunCode = 'BR2';
    } else if (runCode === 'BR2') {
      pairedRunCode = 'BR1';
    } else {
      return undefined; // Not a BR race
    }

    // Build paired race_id
    const pairedRaceId = `${classIdPart}_${pairedRunCode}_${dayPart}`;

    return this.db
      .selectFrom('races')
      .select(['id', 'race_id', 'race_type'])
      .where('event_id', '=', eventId)
      .where('race_id', '=', pairedRaceId)
      .executeTakeFirst();
  }

  /**
   * Get all results for both BR1 and BR2 races linked by class pattern
   * Useful for displaying combined results with best run indicated
   */
  async getLinkedBrResults(
    eventId: number,
    raceId: string
  ): Promise<
    Map<
      number,
      Array<
        Selectable<ResultsTable> & {
          race_id_str: string;
          race_type: string | null;
          family_name: string;
          given_name: string | null;
          club: string | null;
          noc: string | null;
          cat_id: string | null;
          participant_id_str: string;
          athlete_id: string | null;
        }
      >
    >
  > {
    // Extract class and day parts from race_id
    const parts = raceId.split('_');
    if (parts.length < 3) return new Map();

    const classIdPart = parts[0];
    const dayPart = parts.slice(2).join('_');

    // Find all BR races for this class and day (using race_id pattern)
    const br1RaceId = `${classIdPart}_BR1_${dayPart}`;
    const br2RaceId = `${classIdPart}_BR2_${dayPart}`;

    const results = await this.db
      .selectFrom('results')
      .innerJoin('races', 'races.id', 'results.race_id')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'races.race_id as race_id_str',
        'races.race_type',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.event_id', '=', eventId)
      .where((eb) =>
        eb.or([
          eb('races.race_id', '=', br1RaceId),
          eb('races.race_id', '=', br2RaceId),
        ])
      )
      .orderBy('races.race_type', 'asc')
      .orderBy('results.rnk', 'asc')
      .execute();

    // Group results by participant_id
    const grouped = new Map<
      number,
      Array<
        Selectable<ResultsTable> & {
          race_id_str: string;
          race_type: string | null;
          family_name: string;
          given_name: string | null;
          club: string | null;
          noc: string | null;
          cat_id: string | null;
          participant_id_str: string;
          athlete_id: string | null;
        }
      >
    >();

    for (const result of results) {
      const existing = grouped.get(result.participant_id) ?? [];
      existing.push(result);
      grouped.set(result.participant_id, existing);
    }

    return grouped;
  }

  /**
   * Find results for a race filtered by category ID
   * Returns only participants matching the specified category with their category rank
   */
  async filterByCatId(
    raceId: number,
    catId: string
  ): Promise<
    Array<
      Selectable<ResultsTable> & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .where('participants.cat_id', '=', catId)
      .orderBy('results.cat_rnk', 'asc')
      .orderBy('results.cat_rnk_order', 'asc')
      .execute();
  }
}
