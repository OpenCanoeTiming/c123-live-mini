import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('results')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) =>
      col.notNull().references('events.id').onDelete('cascade')
    )
    .addColumn('race_id', 'integer', (col) =>
      col.notNull().references('races.id').onDelete('cascade')
    )
    .addColumn('participant_id', 'integer', (col) =>
      col.notNull().references('participants.id').onDelete('cascade')
    )
    .addColumn('start_order', 'integer')
    .addColumn('bib', 'integer')
    .addColumn('start_time', 'text')
    .addColumn('status', 'text')
    .addColumn('dt_start', 'text')
    .addColumn('dt_finish', 'text')
    .addColumn('time', 'integer')
    .addColumn('gates', 'text')
    .addColumn('pen', 'integer')
    .addColumn('total', 'integer')
    .addColumn('rnk', 'integer')
    .addColumn('rnk_order', 'integer')
    .addColumn('cat_rnk', 'integer')
    .addColumn('cat_rnk_order', 'integer')
    .addColumn('total_behind', 'text')
    .addColumn('cat_total_behind', 'text')
    .addColumn('prev_time', 'integer')
    .addColumn('prev_pen', 'integer')
    .addColumn('prev_total', 'integer')
    .addColumn('prev_rnk', 'integer')
    .addColumn('total_total', 'integer')
    .addColumn('better_run_nr', 'integer')
    .addColumn('heat_nr', 'integer')
    .addColumn('round_nr', 'integer')
    .addColumn('qualified', 'text')
    .addUniqueConstraint('unique_race_participant', ['race_id', 'participant_id'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('results').execute();
}
