import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('events')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'text', (col) => col.notNull().unique())
    .addColumn('main_title', 'text', (col) => col.notNull())
    .addColumn('sub_title', 'text')
    .addColumn('location', 'text')
    .addColumn('facility', 'text')
    .addColumn('start_date', 'text')
    .addColumn('end_date', 'text')
    .addColumn('discipline', 'text')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
    .addColumn('api_key', 'text', (col) => col.unique())
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('events').execute();
}
