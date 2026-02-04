import type { Kysely, Insertable, Updateable, Selectable } from 'kysely';
import type { Database, EventsTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Repository for Event entity operations
 */
export class EventRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Find an event by its internal ID
   */
  async findById(id: number): Promise<Selectable<EventsTable> | undefined> {
    return this.db
      .selectFrom('events')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Find all events
   */
  async findAll(): Promise<Selectable<EventsTable>[]> {
    return this.db.selectFrom('events').selectAll().execute();
  }

  /**
   * Insert a new event
   */
  async insert(data: Insertable<EventsTable>): Promise<number> {
    const result = await this.db
      .insertInto('events')
      .values(data)
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Update an event
   */
  async update(id: number, data: Updateable<EventsTable>): Promise<boolean> {
    const result = await this.db
      .updateTable('events')
      .set(data)
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  /**
   * Delete an event
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('events')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find an event by its C123 event ID
   */
  async findByEventId(
    eventId: string
  ): Promise<Selectable<EventsTable> | undefined> {
    return this.db
      .selectFrom('events')
      .selectAll()
      .where('event_id', '=', eventId)
      .executeTakeFirst();
  }

  /**
   * Find an event by its API key
   */
  async findByApiKey(
    apiKey: string
  ): Promise<Selectable<EventsTable> | undefined> {
    return this.db
      .selectFrom('events')
      .selectAll()
      .where('api_key', '=', apiKey)
      .executeTakeFirst();
  }

  /**
   * Find all public events (non-draft status)
   */
  async findPublic(): Promise<Selectable<EventsTable>[]> {
    return this.db
      .selectFrom('events')
      .selectAll()
      .where('status', '!=', 'draft')
      .orderBy('start_date', 'desc')
      .execute();
  }

  /**
   * Update event status
   */
  async updateStatus(id: number, status: string): Promise<boolean> {
    return this.update(id, { status });
  }

  /**
   * Create or update event by event_id (upsert)
   */
  async upsert(data: Insertable<EventsTable>): Promise<number> {
    const existing = await this.findByEventId(data.event_id);
    if (existing) {
      const { event_id, api_key, created_at, ...updateData } =
        data as Updateable<EventsTable>;
      await this.update(existing.id, updateData);
      return existing.id;
    }
    return this.insert(data);
  }
}
