import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('courses')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) =>
      col.notNull().references('events.id').onDelete('cascade')
    )
    .addColumn('course_nr', 'integer', (col) => col.notNull())
    .addColumn('nr_gates', 'integer')
    .addColumn('gate_config', 'text')
    .addUniqueConstraint('unique_event_course', ['event_id', 'course_nr'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('courses').execute();
}
