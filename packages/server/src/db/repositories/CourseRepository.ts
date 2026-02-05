import type { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import type { Database, CoursesTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Repository for Course entity operations
 */
export class CourseRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Find a course by its internal ID
   */
  async findById(id: number): Promise<Selectable<CoursesTable> | undefined> {
    return this.db
      .selectFrom('courses')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Find all courses
   */
  async findAll(): Promise<Selectable<CoursesTable>[]> {
    return this.db.selectFrom('courses').selectAll().execute();
  }

  /**
   * Insert a new course
   */
  async insert(data: Insertable<CoursesTable>): Promise<number> {
    const result = await this.db
      .insertInto('courses')
      .values(data)
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Update a course
   */
  async update(id: number, data: Updateable<CoursesTable>): Promise<boolean> {
    const result = await this.db
      .updateTable('courses')
      .set(data)
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  /**
   * Delete a course
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('courses')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find a course by event ID and course number
   */
  async findByEventAndCourseNr(
    eventId: number,
    courseNr: number
  ): Promise<Selectable<CoursesTable> | undefined> {
    return this.db
      .selectFrom('courses')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('course_nr', '=', courseNr)
      .executeTakeFirst();
  }

  /**
   * Find all courses for an event
   */
  async findByEventId(eventId: number): Promise<Selectable<CoursesTable>[]> {
    return this.db
      .selectFrom('courses')
      .selectAll()
      .where('event_id', '=', eventId)
      .orderBy('course_nr', 'asc')
      .execute();
  }

  /**
   * Create or update course by event_id + course_nr (upsert)
   */
  async upsert(
    eventId: number,
    data: Omit<Insertable<CoursesTable>, 'event_id'>
  ): Promise<number> {
    const existing = await this.findByEventAndCourseNr(eventId, data.course_nr);
    if (existing) {
      const { course_nr, ...updateData } = data as Updateable<CoursesTable>;
      await this.update(existing.id, updateData);
      return existing.id;
    }
    return this.insert({ ...data, event_id: eventId });
  }

  /**
   * Delete all courses for an event
   */
  async deleteByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('courses')
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Count courses by event
   */
  async countByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .selectFrom('courses')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result?.count ?? 0);
  }
}
