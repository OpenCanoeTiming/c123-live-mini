#!/usr/bin/env tsx
/**
 * Database Seed Script
 *
 * Populates the database with demo data from LODM 2024 competition.
 * Idempotent: can be run multiple times, clears and re-inserts data.
 *
 * Usage:
 *   npm run seed           # From packages/server
 *   npm run seed           # From repository root (via workspace)
 *
 * @see seed-data.ts for the source data
 * @see specs/004-database-layer/quickstart.md for usage documentation
 */

import { createDatabase, runMigrations } from './database.js';
import { EventRepository } from './repositories/EventRepository.js';
import { ClassRepository } from './repositories/ClassRepository.js';
import { ParticipantRepository } from './repositories/ParticipantRepository.js';
import { RaceRepository } from './repositories/RaceRepository.js';
import { ResultRepository } from './repositories/ResultRepository.js';
import { CourseRepository } from './repositories/CourseRepository.js';
import {
  seedEvent,
  seedClasses,
  seedCourse,
  seedRaces,
  seedParticipantsK1M,
  seedParticipantsK1W,
  seedResultsK1M,
  seedResultsK1W,
  SEED_EVENT_ID,
  SEED_PARTICIPANT_COUNT,
  SEED_RACE_COUNT,
  SEED_RESULT_COUNT,
  SEED_COURSE_CONFIG,
} from './seed-data.js';
import { mapDisIdToRaceType } from '../utils/raceTypes.js';
import { transformGates, gatesToJson } from '../utils/gateTransform.js';

async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  // Initialize database
  const db = createDatabase();

  // Run migrations first
  await runMigrations(db);
  console.log('');

  // Initialize repositories
  const eventRepo = new EventRepository(db);
  const classRepo = new ClassRepository(db);
  const participantRepo = new ParticipantRepository(db);
  const raceRepo = new RaceRepository(db);
  const resultRepo = new ResultRepository(db);
  const courseRepo = new CourseRepository(db);

  // Check if seed event already exists
  const existingEvent = await eventRepo.findByEventId(SEED_EVENT_ID);

  // Clear existing seed data (idempotent)
  if (existingEvent) {
    console.log('🧹 Clearing existing seed data...');
    await resultRepo.deleteByEventId(existingEvent.id);
    await raceRepo.deleteByEventId(existingEvent.id);
    await participantRepo.deleteByEventId(existingEvent.id);
    await courseRepo.deleteByEventId(existingEvent.id);
    await classRepo.deleteByEventId(existingEvent.id);
    await eventRepo.delete(existingEvent.id);
    console.log('   Cleared existing event and related data\n');
  }

  // Insert event
  console.log('📝 Inserting seed data...');
  const eventId = await eventRepo.insert(seedEvent);
  console.log(`   ✓ Event: ${seedEvent.main_title}`);

  // Insert classes and track their IDs
  const classIdMap = new Map<string, number>();
  for (const cls of seedClasses) {
    const id = await classRepo.insert({ ...cls, event_id: eventId });
    classIdMap.set(cls.class_id, id);
  }
  console.log(`   ✓ Classes: ${seedClasses.length} inserted`);

  // Insert course
  await courseRepo.insert({ ...seedCourse, event_id: eventId });
  console.log(`   ✓ Course: ${seedCourse.nr_gates} gates`);

  // Insert races and track their IDs
  const raceIdMap = new Map<string, number>();
  for (const race of seedRaces) {
    const { class_ref, ...raceData } = race;
    const classId = classIdMap.get(class_ref);
    const id = await raceRepo.insert({
      ...raceData,
      event_id: eventId,
      class_id: classId ?? null,
      // Map dis_id to human-readable race_type
      race_type: mapDisIdToRaceType(race.dis_id),
    });
    raceIdMap.set(race.race_id, id);
  }
  console.log(`   ✓ Races: ${seedRaces.length} inserted`);

  // Insert participants and track their IDs
  const participantIdMap = new Map<string, number>();
  const allParticipants = [...seedParticipantsK1M, ...seedParticipantsK1W];
  for (const participant of allParticipants) {
    const { class_ref, ...participantData } = participant;
    const classId = classIdMap.get(class_ref);
    const id = await participantRepo.insert({
      ...participantData,
      event_id: eventId,
      class_id: classId ?? null,
      // Write athlete_id from icf_id for technology-transparent access
      athlete_id: participant.icf_id,
    });
    participantIdMap.set(participant.participant_id, id);
  }
  console.log(`   ✓ Participants: ${allParticipants.length} inserted`);

  // Insert results
  const allResults = [...seedResultsK1M, ...seedResultsK1W];
  for (const result of allResults) {
    const { participant_ref, race_ref, gates, ...resultData } = result;
    const raceId = raceIdMap.get(race_ref);
    const participantId = participantIdMap.get(participant_ref);

    if (raceId === undefined || participantId === undefined) {
      console.warn(`   ⚠ Skipping result: missing race or participant reference`);
      continue;
    }

    // Transform gates to self-describing format
    let gatesJson: string | null = null;
    if (gates) {
      const transformedGates = transformGates(gates, SEED_COURSE_CONFIG);
      gatesJson = gatesToJson(transformedGates);
    }

    await resultRepo.insert({
      ...resultData,
      gates: gatesJson,
      event_id: eventId,
      race_id: raceId,
      participant_id: participantId,
    });
  }
  console.log(`   ✓ Results: ${allResults.length} inserted`);

  // Verification
  console.log('\n🔍 Verifying seed data...');
  const verifyEvent = await eventRepo.findByEventId(SEED_EVENT_ID);
  if (!verifyEvent) {
    throw new Error('Verification failed: Event not found');
  }

  const participantCount = await participantRepo.countByEventId(verifyEvent.id);
  const raceCount = await raceRepo.countByEventId(verifyEvent.id);
  const classes = await classRepo.findByEventId(verifyEvent.id);
  const courses = await courseRepo.findByEventId(verifyEvent.id);

  // Count results across all races
  let resultCount = 0;
  const races = await raceRepo.findByEventId(verifyEvent.id);
  for (const race of races) {
    resultCount += await resultRepo.countByRaceId(race.id);
  }

  console.log(`   Event ID: ${verifyEvent.event_id}`);
  console.log(`   Classes: ${classes.length}`);
  console.log(`   Courses: ${courses.length}`);
  console.log(`   Participants: ${participantCount}`);
  console.log(`   Races: ${raceCount}`);
  console.log(`   Results: ${resultCount}`);

  // Validate counts
  const errors: string[] = [];
  if (participantCount !== SEED_PARTICIPANT_COUNT) {
    errors.push(`Expected ${SEED_PARTICIPANT_COUNT} participants, got ${participantCount}`);
  }
  if (raceCount !== SEED_RACE_COUNT) {
    errors.push(`Expected ${SEED_RACE_COUNT} races, got ${raceCount}`);
  }
  if (resultCount !== SEED_RESULT_COUNT) {
    errors.push(`Expected ${SEED_RESULT_COUNT} results, got ${resultCount}`);
  }

  if (errors.length > 0) {
    console.error('\n❌ Verification failed:');
    for (const error of errors) {
      console.error(`   - ${error}`);
    }
    await db.destroy();
    process.exit(1);
  }

  console.log('\n✅ Seed completed successfully!');
  console.log(`   Database: ${process.env.DATABASE_PATH ?? './data/live-mini.db'}`);

  await db.destroy();
}

// Run seed
seed().catch((error) => {
  console.error('\n❌ Seed failed:', error);
  process.exit(1);
});
