import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Create classes table
  await db.schema
    .createTable('classes')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) =>
      col.notNull().references('events.id').onDelete('cascade')
    )
    .addColumn('class_id', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('long_title', 'text')
    .addUniqueConstraint('unique_event_class', ['event_id', 'class_id'])
    .execute();

  // Create categories table
  await db.schema
    .createTable('categories')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('class_id', 'integer', (col) =>
      col.notNull().references('classes.id').onDelete('cascade')
    )
    .addColumn('cat_id', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('first_year', 'integer')
    .addColumn('last_year', 'integer')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('categories').execute();
  await db.schema.dropTable('classes').execute();
}
