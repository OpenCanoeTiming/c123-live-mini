import type { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import type { Database, ParticipantsTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Repository for Participant entity operations
 */
export class ParticipantRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Find a participant by its internal ID
   */
  async findById(
    id: number
  ): Promise<Selectable<ParticipantsTable> | undefined> {
    return this.db
      .selectFrom('participants')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Find all participants
   */
  async findAll(): Promise<Selectable<ParticipantsTable>[]> {
    return this.db.selectFrom('participants').selectAll().execute();
  }

  /**
   * Insert a new participant
   */
  async insert(data: Insertable<ParticipantsTable>): Promise<number> {
    const result = await this.db
      .insertInto('participants')
      .values(data)
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Update a participant
   */
  async update(
    id: number,
    data: Updateable<ParticipantsTable>
  ): Promise<boolean> {
    const result = await this.db
      .updateTable('participants')
      .set(data)
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  /**
   * Delete a participant
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('participants')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find a participant by event ID and participant ID
   */
  async findByEventAndParticipantId(
    eventId: number,
    participantId: string
  ): Promise<Selectable<ParticipantsTable> | undefined> {
    return this.db
      .selectFrom('participants')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('participant_id', '=', participantId)
      .executeTakeFirst();
  }

  /**
   * Find all participants for an event
   */
  async findByEventId(
    eventId: number
  ): Promise<Selectable<ParticipantsTable>[]> {
    return this.db
      .selectFrom('participants')
      .selectAll()
      .where('event_id', '=', eventId)
      .orderBy('family_name', 'asc')
      .execute();
  }

  /**
   * Find all participants for a class
   */
  async findByClassId(
    classId: number
  ): Promise<Selectable<ParticipantsTable>[]> {
    return this.db
      .selectFrom('participants')
      .selectAll()
      .where('class_id', '=', classId)
      .orderBy('family_name', 'asc')
      .execute();
  }

  /**
   * Find participant by event bib number
   */
  async findByEventBib(
    eventId: number,
    bib: number
  ): Promise<Selectable<ParticipantsTable> | undefined> {
    return this.db
      .selectFrom('participants')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('event_bib', '=', bib)
      .executeTakeFirst();
  }

  /**
   * Create or update participant by event_id + participant_id (upsert)
   */
  async upsert(
    eventId: number,
    data: Omit<Insertable<ParticipantsTable>, 'event_id'>
  ): Promise<number> {
    const existing = await this.findByEventAndParticipantId(
      eventId,
      data.participant_id
    );
    if (existing) {
      const { participant_id, ...updateData } =
        data as Updateable<ParticipantsTable>;
      await this.update(existing.id, updateData);
      return existing.id;
    }
    return this.insert({ ...data, event_id: eventId });
  }

  /**
   * Delete all participants for an event
   */
  async deleteByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('participants')
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Count participants by event
   */
  async countByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .selectFrom('participants')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result?.count ?? 0);
  }
}
