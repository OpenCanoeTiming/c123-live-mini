import type { Kysely, Transaction } from 'kysely';
import type { Database } from '../db/schema.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { ParticipantRepository } from '../db/repositories/ParticipantRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { ResultRepository } from '../db/repositories/ResultRepository.js';
import { CourseRepository } from '../db/repositories/CourseRepository.js';
import { IngestRecordRepository } from '../db/repositories/IngestRecordRepository.js';
import {
  parseC123Xml,
  validateParsedData,
  type ParsedC123Data,
} from './xml/index.js';
import { normalizeTimesToCentiseconds } from './xml/parseResults.js';
import { mapDisIdToRaceType } from '../utils/raceTypes.js';
import { transformGates, gatesToJson } from '../utils/gateTransform.js';

/**
 * Result of XML ingestion
 */
export interface IngestResult {
  eventId: number;
  imported: {
    participants: number;
    classes: number;
    races: number;
    results: number;
    courses: number;
  };
}

/**
 * Service for ingesting C123 XML data into the database
 */
export class IngestService {
  private readonly db: Kysely<Database>;
  private readonly eventRepo: EventRepository;
  private readonly classRepo: ClassRepository;
  private readonly participantRepo: ParticipantRepository;
  private readonly raceRepo: RaceRepository;
  private readonly resultRepo: ResultRepository;
  private readonly courseRepo: CourseRepository;
  private readonly ingestRecordRepo: IngestRecordRepository;

  constructor(db: Kysely<Database>) {
    this.db = db;
    this.eventRepo = new EventRepository(db);
    this.classRepo = new ClassRepository(db);
    this.participantRepo = new ParticipantRepository(db);
    this.raceRepo = new RaceRepository(db);
    this.resultRepo = new ResultRepository(db);
    this.courseRepo = new CourseRepository(db);
    this.ingestRecordRepo = new IngestRecordRepository(db);
  }

  /**
   * Ingest XML data for an event
   *
   * @param xmlString - C123 XML content
   * @param apiKey - API key of the event (for authorization)
   * @returns Import statistics
   * @throws Error if XML is invalid or event not found
   */
  async ingestXml(xmlString: string, apiKey: string): Promise<IngestResult> {
    const payloadSize = xmlString.length;
    const t0 = performance.now();
    const lap = (label: string) => {
      const ms = (performance.now() - t0).toFixed(0);
      process.stderr.write(`[IngestTiming] ${ms}ms — ${label}\n`);
    };

    // Parse XML
    const parsed = parseC123Xml(xmlString);
    lap('parseXml');

    // Validate parsed data
    const errors = validateParsedData(parsed);
    if (errors.length > 0) {
      throw new Error(`Invalid XML data: ${errors.join(', ')}`);
    }

    // Find event by API key
    const event = await this.eventRepo.findByApiKey(apiKey);
    if (!event) {
      throw new Error('Event not found for API key');
    }
    lap('findEvent');

    // Note: XML EventId is intentionally NOT checked against event_id.
    // Pairing is done via API key. This allows eventId in live-mini to be
    // independent (e.g. national race number) from C123 EventId.

    // Update event metadata from XML (but preserve admin-set mainTitle)
    if (parsed.event) {
      await this.eventRepo.update(event.id, {
        sub_title: parsed.event.subTitle,
        location: parsed.event.location,
        facility: parsed.event.facility,
        start_date: parsed.event.startDate,
        end_date: parsed.event.endDate,
        discipline: parsed.event.discipline,
      });
    }
    lap('updateEventMeta');

    // 5. Normalize time units (auto-detect ms vs cs from XML)
    parsed.results = normalizeTimesToCentiseconds(parsed.results);
    lap('normalizeTimesToCs');

    // Import all data inside a single SQLite transaction.
    // Without this, each upsert autocommits (fsync per write) which is
    // extremely slow on network-mounted volumes (Railway).
    const result = await this.db.transaction().execute(async (trx) => {
      // Create transactional repository instances
      const txEventRepo = new EventRepository(trx as unknown as Kysely<Database>);
      const txClassRepo = new ClassRepository(trx as unknown as Kysely<Database>);
      const txParticipantRepo = new ParticipantRepository(trx as unknown as Kysely<Database>);
      const txRaceRepo = new RaceRepository(trx as unknown as Kysely<Database>);
      const txResultRepo = new ResultRepository(trx as unknown as Kysely<Database>);
      const txCourseRepo = new CourseRepository(trx as unknown as Kysely<Database>);
      const txIngestRecordRepo = new IngestRecordRepository(trx as unknown as Kysely<Database>);

      const imported = {
        participants: 0,
        classes: 0,
        races: 0,
        results: 0,
        courses: 0,
      };

      // 1. Import classes first (needed for participants and races)
      const classIdMap = await this.importClasses(event.id, parsed, txClassRepo);
      imported.classes = parsed.classes.length;
      lap(`importClasses (${parsed.classes.length})`);

      // 2. Import participants (needs class IDs)
      const participantIdMap = await this.importParticipants(
        event.id,
        parsed,
        classIdMap,
        txParticipantRepo
      );
      imported.participants = parsed.participants.length;
      lap(`importParticipants (${parsed.participants.length})`);

      // 3. Import races (needs class IDs)
      const raceIdMap = await this.importRaces(event.id, parsed, classIdMap, txRaceRepo);
      imported.races = parsed.races.length;
      lap(`importRaces (${parsed.races.length})`);

      // 4. Import courses (needed for gate transformation in results)
      const courseConfigMap = await this.importCourses(event.id, parsed, txCourseRepo);
      imported.courses = parsed.courses.length;
      lap(`importCourses (${parsed.courses.length})`);

      // 6. Import results (needs race, participant IDs, and course configs)
      await this.importResults(event.id, parsed, raceIdMap, participantIdMap, courseConfigMap, txResultRepo);
      imported.results = parsed.results.length;
      lap(`importResults (${parsed.results.length})`);

      // 7. C123 XML is a full event snapshot, so absence means deletion.
      // Without this pass, dropping a competitor leaves stale rows on clients.
      await this.pruneStale(event.id, parsed, raceIdMap, participantIdMap, {
        classRepo: txClassRepo,
        participantRepo: txParticipantRepo,
        raceRepo: txRaceRepo,
        resultRepo: txResultRepo,
        courseRepo: txCourseRepo,
      });
      lap('pruneStale');

      // 8. Set has_xml_data flag (enables JSON/TCP ingestion)
      await txEventRepo.setHasXmlData(event.id);

      // 9. Log successful ingestion
      const totalItems =
        imported.classes +
        imported.participants +
        imported.races +
        imported.results +
        imported.courses;

      await txIngestRecordRepo.insert({
        eventId: event.id,
        sourceType: 'xml',
        status: 'success',
        payloadSize,
        itemsProcessed: totalItems,
      });

      lap(`done (total ${totalItems} items)`);

      return { eventId: event.id, imported } as IngestResult;
    });

    return result;
  }

  /**
   * Import classes and categories
   */
  private async importClasses(
    eventId: number,
    parsed: ParsedC123Data,
    classRepo: ClassRepository = this.classRepo
  ): Promise<Map<string, number>> {
    const classIdMap = new Map<string, number>();

    for (const cls of parsed.classes) {
      // Upsert class
      const classDbId = await classRepo.upsert(eventId, {
        class_id: cls.classId,
        name: cls.name,
        long_title: cls.longTitle,
      });
      classIdMap.set(cls.classId, classDbId);

      // Delete existing categories for this class and re-insert
      await classRepo.deleteCategoriesByClassId(classDbId);

      for (const cat of cls.categories) {
        await classRepo.insertCategory(classDbId, {
          cat_id: cat.catId,
          name: cat.name,
          first_year: cat.firstYear,
          last_year: cat.lastYear,
        });
      }
    }

    return classIdMap;
  }

  /**
   * Import participants
   */
  private async importParticipants(
    eventId: number,
    parsed: ParsedC123Data,
    classIdMap: Map<string, number>,
    participantRepo: ParticipantRepository = this.participantRepo
  ): Promise<Map<string, number>> {
    const participantIdMap = new Map<string, number>();

    for (const p of parsed.participants) {
      const classDbId = classIdMap.get(p.classId) ?? null;

      const participantDbId = await participantRepo.upsert(eventId, {
        participant_id: p.participantId,
        class_id: classDbId,
        event_bib: p.eventBib,
        athlete_id: p.icfId,
        family_name: p.familyName,
        given_name: p.givenName,
        noc: p.noc,
        club: p.club,
        cat_id: p.catId,
        is_team: p.isTeam ? 1 : 0,
        member1: p.member1,
        member2: p.member2,
        member3: p.member3,
      });
      participantIdMap.set(p.participantId, participantDbId);
    }

    return participantIdMap;
  }

  /**
   * Import races from schedule
   */
  private async importRaces(
    eventId: number,
    parsed: ParsedC123Data,
    classIdMap: Map<string, number>,
    raceRepo: RaceRepository = this.raceRepo
  ): Promise<Map<string, number>> {
    const raceIdMap = new Map<string, number>();

    for (const race of parsed.races) {
      const classDbId = classIdMap.get(race.classId) ?? null;

      const raceDbId = await raceRepo.upsert(eventId, {
        race_id: race.raceId,
        class_id: classDbId,
        race_type: mapDisIdToRaceType(race.disId),
        race_order: race.raceOrder,
        start_time: race.startTime,
        start_interval: race.startInterval,
        course_nr: race.courseNr,
        race_status: race.raceStatus,
      });
      raceIdMap.set(race.raceId, raceDbId);
    }

    return raceIdMap;
  }

  /**
   * Import results
   */
  private async importResults(
    eventId: number,
    parsed: ParsedC123Data,
    raceIdMap: Map<string, number>,
    participantIdMap: Map<string, number>,
    courseConfigMap: Map<number, string | null>,
    resultRepo: ResultRepository = this.resultRepo
  ): Promise<void> {
    // Build map from raceId to courseNr for gate transformation
    const raceCourseMap = new Map<string, number | null>();
    for (const race of parsed.races) {
      raceCourseMap.set(race.raceId, race.courseNr);
    }

    for (const result of parsed.results) {
      const raceDbId = raceIdMap.get(result.raceId);
      const participantDbId = participantIdMap.get(result.participantId);

      if (!raceDbId || !participantDbId) {
        // Skip results for unknown races or participants
        continue;
      }

      // Transform gates to self-describing format if available
      let gatesJson: string | null = null;
      if (result.gates && result.gates.length > 0) {
        const courseNr = raceCourseMap.get(result.raceId);
        const gateConfig = courseNr !== null && courseNr !== undefined
          ? courseConfigMap.get(courseNr) ?? null
          : null;
        const transformedGates = transformGates(result.gates, gateConfig);
        gatesJson = gatesToJson(transformedGates);
      }

      await resultRepo.upsert(eventId, raceDbId, {
        participant_id: participantDbId,
        start_order: result.startOrder,
        bib: result.bib,
        start_time: result.startTime,
        status: result.status,
        dt_start: result.dtStart,
        dt_finish: result.dtFinish,
        time: result.time,
        gates: gatesJson,
        pen: result.pen,
        total: result.total,
        rnk: result.rnk,
        rnk_order: result.rnkOrder,
        cat_rnk: result.catRnk,
        cat_rnk_order: result.catRnkOrder,
        total_behind: result.totalBehind,
        cat_total_behind: result.catTotalBehind,
        prev_time: result.prevTime,
        prev_pen: result.prevPen,
        prev_total: result.prevTotal,
        prev_rnk: result.prevRnk,
        total_total: result.totalTotal,
        better_run_nr: result.betterRunNr,
        heat_nr: result.heatNr,
        round_nr: result.roundNr,
        qualified: result.qualified,
      });
    }
  }

  // Order matters: per-race result pruning runs before race deletion so it
  // only touches races still in the XML; race/participant deletion then
  // cascades any remaining stale results.
  private async pruneStale(
    eventId: number,
    parsed: ParsedC123Data,
    raceIdMap: Map<string, number>,
    participantIdMap: Map<string, number>,
    repos: {
      classRepo: ClassRepository;
      participantRepo: ParticipantRepository;
      raceRepo: RaceRepository;
      resultRepo: ResultRepository;
      courseRepo: CourseRepository;
    }
  ): Promise<void> {
    const xmlResultsByRace = new Map<string, Set<string>>();
    for (const r of parsed.results) {
      const set = xmlResultsByRace.get(r.raceId) ?? new Set<string>();
      set.add(r.participantId);
      xmlResultsByRace.set(r.raceId, set);
    }

    for (const race of parsed.races) {
      const raceDbId = raceIdMap.get(race.raceId);
      if (raceDbId === undefined) continue;
      const keepParticipants = xmlResultsByRace.get(race.raceId) ?? new Set<string>();
      const keepDbIds: number[] = [];
      for (const pid of keepParticipants) {
        const pDbId = participantIdMap.get(pid);
        if (pDbId !== undefined) keepDbIds.push(pDbId);
      }
      await repos.resultRepo.deleteByRaceIdNotInParticipants(raceDbId, keepDbIds);
    }

    await repos.raceRepo.deleteByEventIdNotIn(
      eventId,
      parsed.races.map((r) => r.raceId)
    );

    await repos.participantRepo.deleteByEventIdNotIn(
      eventId,
      parsed.participants.map((p) => p.participantId)
    );

    await repos.classRepo.deleteByEventIdNotIn(
      eventId,
      parsed.classes.map((c) => c.classId)
    );

    await repos.courseRepo.deleteByEventIdNotIn(
      eventId,
      parsed.courses.map((c) => c.courseNr)
    );
  }

  /**
   * Import courses
   * @returns Map of course_nr to gate_config for gate transformation
   */
  private async importCourses(
    eventId: number,
    parsed: ParsedC123Data,
    courseRepo: CourseRepository = this.courseRepo
  ): Promise<Map<number, string | null>> {
    const courseConfigMap = new Map<number, string | null>();

    for (const course of parsed.courses) {
      await courseRepo.upsert(eventId, {
        course_nr: course.courseNr,
        nr_gates: course.nrGates,
        gate_config: course.gateConfig,
      });
      courseConfigMap.set(course.courseNr, course.gateConfig);
    }

    return courseConfigMap;
  }
}
