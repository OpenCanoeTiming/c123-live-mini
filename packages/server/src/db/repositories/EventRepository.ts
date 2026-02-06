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
    this.logOperation('findById', { id });
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
    this.logOperation('findAll');
    return this.db.selectFrom('events').selectAll().execute();
  }

  /**
   * Insert a new event
   */
  async insert(data: Insertable<EventsTable>): Promise<number> {
    this.logOperation('insert', { eventId: data.event_id });
    const result = await this.db
      .insertInto('events')
      .values(data)
      .executeTakeFirstOrThrow();
    const id = Number(result.insertId);
    this.log.info('Event created', { id, eventId: data.event_id });
    return id;
  }

  /**
   * Update an event
   */
  async update(id: number, data: Updateable<EventsTable>): Promise<boolean> {
    this.logOperation('update', { id });
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
    this.logOperation('delete', { id });
    const result = await this.db
      .deleteFrom('events')
      .where('id', '=', id)
      .executeTakeFirst();
    const deleted = Number(result.numDeletedRows) > 0;
    if (deleted) {
      this.log.info('Event deleted', { id });
    }
    return deleted;
  }

  /**
   * Find an event by its C123 event ID
   */
  async findByEventId(
    eventId: string
  ): Promise<Selectable<EventsTable> | undefined> {
    this.logOperation('findByEventId', { eventId });
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
    this.logOperation('findByApiKey');
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
    this.logOperation('findPublic');
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
    this.logOperation('upsert', { eventId: data.event_id });
    const existing = await this.findByEventId(data.event_id);
    if (existing) {
      const { event_id, api_key, created_at, ...updateData } =
        data as Updateable<EventsTable>;
      await this.update(existing.id, updateData);
      this.log.info('Event updated', { id: existing.id, eventId: data.event_id });
      return existing.id;
    }
    return this.insert(data);
  }

  /**
   * Get event config as JSON string
   */
  async getConfig(id: number): Promise<string | null> {
    this.logOperation('getConfig', { id });
    const event = await this.findById(id);
    return event?.config ?? null;
  }

  /**
   * Update event config JSON
   */
  async updateConfig(id: number, configJson: string): Promise<boolean> {
    this.logOperation('updateConfig', { id });
    return this.update(id, { config: configJson });
  }

  /**
   * Check if event has XML data ingested
   */
  async hasXmlData(id: number): Promise<boolean> {
    this.logOperation('hasXmlData', { id });
    const event = await this.findById(id);
    return event?.has_xml_data === 1;
  }

  /**
   * Set has_xml_data flag to true
   */
  async setHasXmlData(id: number): Promise<boolean> {
    this.logOperation('setHasXmlData', { id });
    return this.update(id, { has_xml_data: 1 });
  }
}
