import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('races')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) =>
      col.notNull().references('events.id').onDelete('cascade')
    )
    .addColumn('race_id', 'text', (col) => col.notNull())
    .addColumn('class_id', 'integer', (col) =>
      col.references('classes.id').onDelete('set null')
    )
    .addColumn('dis_id', 'text', (col) => col.notNull())
    .addColumn('race_order', 'integer')
    .addColumn('start_time', 'text')
    .addColumn('start_interval', 'text')
    .addColumn('course_nr', 'integer')
    .addColumn('race_status', 'integer', (col) => col.notNull().defaultTo(1))
    .addUniqueConstraint('unique_event_race', ['event_id', 'race_id'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('races').execute();
}
