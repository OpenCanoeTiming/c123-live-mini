import type { Kysely, Insertable, Selectable } from 'kysely';
import type { Database, IngestRecordsTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Input for creating an ingest record
 */
export interface IngestRecordInput {
  eventId: number;
  sourceType: 'xml' | 'json_oncourse' | 'json_results' | 'config';
  status: 'success' | 'error';
  errorMessage?: string;
  payloadSize: number;
  itemsProcessed: number;
}

/**
 * Repository for IngestRecord entity operations
 */
export class IngestRecordRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Insert a new ingest record
   */
  async insert(input: IngestRecordInput): Promise<number> {
    this.logOperation('insert', {
      eventId: input.eventId,
      sourceType: input.sourceType,
      status: input.status,
    });

    const data: Insertable<IngestRecordsTable> = {
      event_id: input.eventId,
      source_type: input.sourceType,
      status: input.status,
      error_message: input.errorMessage ?? null,
      payload_size: input.payloadSize,
      items_processed: input.itemsProcessed,
    };

    const result = await this.db
      .insertInto('ingest_records')
      .values(data)
      .executeTakeFirstOrThrow();

    const id = Number(result.insertId);
    this.log.info('Ingest record created', {
      id,
      eventId: input.eventId,
      sourceType: input.sourceType,
      status: input.status,
    });
    return id;
  }

  /**
   * Find ingest records by event ID
   */
  async findByEventId(
    eventId: number
  ): Promise<Selectable<IngestRecordsTable>[]> {
    this.logOperation('findByEventId', { eventId });
    return this.db
      .selectFrom('ingest_records')
      .selectAll()
      .where('event_id', '=', eventId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * Find recent ingest records by event ID
   */
  async findRecentByEventId(
    eventId: number,
    limit: number = 10
  ): Promise<Selectable<IngestRecordsTable>[]> {
    this.logOperation('findRecentByEventId', { eventId, limit });
    return this.db
      .selectFrom('ingest_records')
      .selectAll()
      .where('event_id', '=', eventId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
  }

  /**
   * Count ingest records by event and source type
   */
  async countBySourceType(
    eventId: number,
    sourceType: IngestRecordInput['sourceType']
  ): Promise<number> {
    this.logOperation('countBySourceType', { eventId, sourceType });
    const result = await this.db
      .selectFrom('ingest_records')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('event_id', '=', eventId)
      .where('source_type', '=', sourceType)
      .executeTakeFirst();
    return Number(result?.count ?? 0);
  }
}
