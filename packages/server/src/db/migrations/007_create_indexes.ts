import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Results indexes - most frequently queried
  await db.schema
    .createIndex('idx_results_race')
    .on('results')
    .column('race_id')
    .execute();

  await db.schema
    .createIndex('idx_results_participant')
    .on('results')
    .column('participant_id')
    .execute();

  await db.schema
    .createIndex('idx_results_event_race')
    .on('results')
    .columns(['event_id', 'race_id'])
    .execute();

  // Participants indexes
  await db.schema
    .createIndex('idx_participants_event')
    .on('participants')
    .column('event_id')
    .execute();

  await db.schema
    .createIndex('idx_participants_class')
    .on('participants')
    .column('class_id')
    .execute();

  // Races indexes
  await db.schema
    .createIndex('idx_races_event')
    .on('races')
    .column('event_id')
    .execute();

  await db.schema
    .createIndex('idx_races_class')
    .on('races')
    .column('class_id')
    .execute();

  // Classes index
  await db.schema
    .createIndex('idx_classes_event')
    .on('classes')
    .column('event_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('idx_classes_event').execute();
  await db.schema.dropIndex('idx_races_class').execute();
  await db.schema.dropIndex('idx_races_event').execute();
  await db.schema.dropIndex('idx_participants_class').execute();
  await db.schema.dropIndex('idx_participants_event').execute();
  await db.schema.dropIndex('idx_results_event_race').execute();
  await db.schema.dropIndex('idx_results_participant').execute();
  await db.schema.dropIndex('idx_results_race').execute();
}
