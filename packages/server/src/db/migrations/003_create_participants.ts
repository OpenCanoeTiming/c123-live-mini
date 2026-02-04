import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('participants')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) =>
      col.notNull().references('events.id').onDelete('cascade')
    )
    .addColumn('participant_id', 'text', (col) => col.notNull())
    .addColumn('class_id', 'integer', (col) =>
      col.references('classes.id').onDelete('set null')
    )
    .addColumn('event_bib', 'integer')
    .addColumn('icf_id', 'text')
    .addColumn('family_name', 'text', (col) => col.notNull())
    .addColumn('given_name', 'text')
    .addColumn('noc', 'text')
    .addColumn('club', 'text')
    .addColumn('cat_id', 'text')
    .addColumn('is_team', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('member1', 'text')
    .addColumn('member2', 'text')
    .addColumn('member3', 'text')
    .addUniqueConstraint('unique_event_participant', [
      'event_id',
      'participant_id',
    ])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('participants').execute();
}
