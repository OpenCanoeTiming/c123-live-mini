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
        participant_id_str: string;
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
        'participants.participant_id as participant_id_str',
      ])
      .where('results.race_id', '=', raceId)
      .orderBy('results.start_order', 'asc')
      .execute();
  }
}
