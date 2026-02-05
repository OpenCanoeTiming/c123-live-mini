import type { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import type { Database, ClassesTable, CategoriesTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Repository for Class entity operations
 */
export class ClassRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Find a class by its internal ID
   */
  async findById(id: number): Promise<Selectable<ClassesTable> | undefined> {
    return this.db
      .selectFrom('classes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Find all classes
   */
  async findAll(): Promise<Selectable<ClassesTable>[]> {
    return this.db.selectFrom('classes').selectAll().execute();
  }

  /**
   * Insert a new class
   */
  async insert(data: Insertable<ClassesTable>): Promise<number> {
    const result = await this.db
      .insertInto('classes')
      .values(data)
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Update a class
   */
  async update(id: number, data: Updateable<ClassesTable>): Promise<boolean> {
    const result = await this.db
      .updateTable('classes')
      .set(data)
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  /**
   * Delete a class
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('classes')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find a class by event ID and class ID
   */
  async findByEventAndClassId(
    eventId: number,
    classId: string
  ): Promise<Selectable<ClassesTable> | undefined> {
    return this.db
      .selectFrom('classes')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('class_id', '=', classId)
      .executeTakeFirst();
  }

  /**
   * Find all classes for an event
   */
  async findByEventId(eventId: number): Promise<Selectable<ClassesTable>[]> {
    return this.db
      .selectFrom('classes')
      .selectAll()
      .where('event_id', '=', eventId)
      .orderBy('class_id', 'asc')
      .execute();
  }

  /**
   * Find all classes with their categories for an event
   */
  async findByEventIdWithCategories(
    eventId: number
  ): Promise<
    Array<Selectable<ClassesTable> & { categories: Selectable<CategoriesTable>[] }>
  > {
    const classes = await this.findByEventId(eventId);
    const classIds = classes.map((c) => c.id);

    if (classIds.length === 0) {
      return [];
    }

    const categories = await this.db
      .selectFrom('categories')
      .selectAll()
      .where('class_id', 'in', classIds)
      .execute();

    const categoriesByClassId = new Map<number, Selectable<CategoriesTable>[]>();
    for (const cat of categories) {
      const existing = categoriesByClassId.get(cat.class_id) || [];
      existing.push(cat);
      categoriesByClassId.set(cat.class_id, existing);
    }

    return classes.map((cls) => ({
      ...cls,
      categories: categoriesByClassId.get(cls.id) || [],
    }));
  }

  /**
   * Create or update class by event_id + class_id (upsert)
   */
  async upsert(
    eventId: number,
    data: Omit<Insertable<ClassesTable>, 'event_id'>
  ): Promise<number> {
    const existing = await this.findByEventAndClassId(eventId, data.class_id);
    if (existing) {
      const { class_id, ...updateData } = data as Updateable<ClassesTable>;
      await this.update(existing.id, updateData);
      return existing.id;
    }
    return this.insert({ ...data, event_id: eventId });
  }

  /**
   * Delete all classes for an event
   */
  async deleteByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('classes')
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  // Category methods

  /**
   * Insert a category for a class
   */
  async insertCategory(
    classId: number,
    data: Omit<Insertable<CategoriesTable>, 'class_id'>
  ): Promise<number> {
    const result = await this.db
      .insertInto('categories')
      .values({ ...data, class_id: classId })
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Find categories by class ID
   */
  async findCategoriesByClassId(
    classId: number
  ): Promise<Selectable<CategoriesTable>[]> {
    return this.db
      .selectFrom('categories')
      .selectAll()
      .where('class_id', '=', classId)
      .execute();
  }

  /**
   * Delete all categories for a class
   */
  async deleteCategoriesByClassId(classId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('categories')
      .where('class_id', '=', classId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Get all unique categories for an event with class information
   * Aggregates categories across all classes in the event
   */
  async getCategoriesForEvent(
    eventId: number
  ): Promise<
    Array<{
      catId: string;
      name: string;
      firstYear: number | null;
      lastYear: number | null;
      classIds: string[];
    }>
  > {
    const categories = await this.db
      .selectFrom('categories')
      .innerJoin('classes', 'classes.id', 'categories.class_id')
      .select([
        'categories.cat_id',
        'categories.name',
        'categories.first_year',
        'categories.last_year',
        'classes.class_id',
      ])
      .where('classes.event_id', '=', eventId)
      .orderBy('categories.cat_id', 'asc')
      .execute();

    // Aggregate by cat_id (same category may appear in multiple classes)
    const aggregated = new Map<
      string,
      {
        catId: string;
        name: string;
        firstYear: number | null;
        lastYear: number | null;
        classIds: string[];
      }
    >();

    for (const cat of categories) {
      const existing = aggregated.get(cat.cat_id);
      if (existing) {
        existing.classIds.push(cat.class_id);
      } else {
        aggregated.set(cat.cat_id, {
          catId: cat.cat_id,
          name: cat.name,
          firstYear: cat.first_year,
          lastYear: cat.last_year,
          classIds: [cat.class_id],
        });
      }
    }

    return Array.from(aggregated.values());
  }
}
