import type { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import type { Database, RacesTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Repository for Race entity operations
 */
export class RaceRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Find a race by its internal ID
   */
  async findById(id: number): Promise<Selectable<RacesTable> | undefined> {
    return this.db
      .selectFrom('races')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Find all races
   */
  async findAll(): Promise<Selectable<RacesTable>[]> {
    return this.db.selectFrom('races').selectAll().execute();
  }

  /**
   * Insert a new race
   */
  async insert(data: Insertable<RacesTable>): Promise<number> {
    const result = await this.db
      .insertInto('races')
      .values(data)
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Update a race
   */
  async update(id: number, data: Updateable<RacesTable>): Promise<boolean> {
    const result = await this.db
      .updateTable('races')
      .set(data)
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  /**
   * Delete a race
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('races')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find a race by event ID and race ID
   */
  async findByEventAndRaceId(
    eventId: number,
    raceId: string
  ): Promise<Selectable<RacesTable> | undefined> {
    return this.db
      .selectFrom('races')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('race_id', '=', raceId)
      .executeTakeFirst();
  }

  /**
   * Find all races for an event
   */
  async findByEventId(eventId: number): Promise<Selectable<RacesTable>[]> {
    return this.db
      .selectFrom('races')
      .selectAll()
      .where('event_id', '=', eventId)
      .orderBy('race_order', 'asc')
      .execute();
  }

  /**
   * Find all races for a class
   */
  async findByClassId(classId: number): Promise<Selectable<RacesTable>[]> {
    return this.db
      .selectFrom('races')
      .selectAll()
      .where('class_id', '=', classId)
      .orderBy('race_order', 'asc')
      .execute();
  }

  /**
   * Find races by status (e.g., find all live/running races)
   */
  async findByStatus(
    eventId: number,
    status: number
  ): Promise<Selectable<RacesTable>[]> {
    return this.db
      .selectFrom('races')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('race_status', '=', status)
      .orderBy('race_order', 'asc')
      .execute();
  }

  /**
   * Create or update race by event_id + race_id (upsert)
   */
  async upsert(
    eventId: number,
    data: Omit<Insertable<RacesTable>, 'event_id'>
  ): Promise<number> {
    const existing = await this.findByEventAndRaceId(eventId, data.race_id);
    if (existing) {
      const { race_id, ...updateData } = data as Updateable<RacesTable>;
      await this.update(existing.id, updateData);
      return existing.id;
    }
    return this.insert({ ...data, event_id: eventId });
  }

  /**
   * Delete all races for an event
   */
  async deleteByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('races')
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Update race status
   */
  async updateStatus(id: number, status: number): Promise<boolean> {
    return this.update(id, { race_status: status });
  }

  /**
   * Count races by event
   */
  async countByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .selectFrom('races')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result?.count ?? 0);
  }
}
