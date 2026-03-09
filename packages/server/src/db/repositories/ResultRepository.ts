import type { Kysely, Insertable, Selectable, Updateable } from 'kysely';
import type { Database, ResultsTable } from '../schema.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Repository for Result entity operations
 */
export class ResultRepository extends BaseRepository {
  constructor(db: Kysely<Database>) {
    super(db);
  }

  /**
   * Find a result by its internal ID
   */
  async findById(id: number): Promise<Selectable<ResultsTable> | undefined> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Find all results
   */
  async findAll(): Promise<Selectable<ResultsTable>[]> {
    return this.db.selectFrom('results').selectAll().execute();
  }

  /**
   * Insert a new result
   */
  async insert(data: Insertable<ResultsTable>): Promise<number> {
    const result = await this.db
      .insertInto('results')
      .values(data)
      .executeTakeFirstOrThrow();
    return Number(result.insertId);
  }

  /**
   * Update a result
   */
  async update(id: number, data: Updateable<ResultsTable>): Promise<boolean> {
    const result = await this.db
      .updateTable('results')
      .set(data)
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  /**
   * Delete a result
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom('results')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Find a result by race ID and participant ID
   */
  async findByRaceAndParticipant(
    raceId: number,
    participantId: number
  ): Promise<Selectable<ResultsTable> | undefined> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('race_id', '=', raceId)
      .where('participant_id', '=', participantId)
      .executeTakeFirst();
  }

  /**
   * Find all results for a race, ordered by rank
   */
  async findByRaceId(raceId: number): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('race_id', '=', raceId)
      .orderBy('rnk', 'asc')
      .orderBy('rnk_order', 'asc')
      .execute();
  }

  /**
   * Find all results for an event
   */
  async findByEventId(eventId: number): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('event_id', '=', eventId)
      .execute();
  }

  /**
   * Find all results for a participant
   */
  async findByParticipantId(
    participantId: number
  ): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('participant_id', '=', participantId)
      .execute();
  }

  /**
   * Find results for a race ordered by start order (startlist)
   */
  async findStartlistByRaceId(
    raceId: number
  ): Promise<Selectable<ResultsTable>[]> {
    return this.db
      .selectFrom('results')
      .selectAll()
      .where('race_id', '=', raceId)
      .orderBy('start_order', 'asc')
      .execute();
  }

  /**
   * Create or update result by race_id + participant_id (upsert)
   */
  async upsert(
    eventId: number,
    raceId: number,
    data: Omit<Insertable<ResultsTable>, 'event_id' | 'race_id'>
  ): Promise<number> {
    const existing = await this.findByRaceAndParticipant(
      raceId,
      data.participant_id
    );
    if (existing) {
      const { participant_id, ...updateData } =
        data as Updateable<ResultsTable>;
      await this.update(existing.id, updateData);
      return existing.id;
    }
    return this.insert({ ...data, event_id: eventId, race_id: raceId });
  }

  /**
   * Delete all results for a race
   */
  async deleteByRaceId(raceId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('results')
      .where('race_id', '=', raceId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Delete all results for an event
   */
  async deleteByEventId(eventId: number): Promise<number> {
    const result = await this.db
      .deleteFrom('results')
      .where('event_id', '=', eventId)
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  /**
   * Count results by race
   */
  async countByRaceId(raceId: number): Promise<number> {
    const result = await this.db
      .selectFrom('results')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('race_id', '=', raceId)
      .executeTakeFirst();
    return Number(result?.count ?? 0);
  }

  /**
   * Find results for a race with participant data joined
   */
  async findByRaceIdWithParticipant(raceId: number): Promise<
    Array<
      Selectable<ResultsTable> & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .orderBy('results.rnk', 'asc')
      .orderBy('results.rnk_order', 'asc')
      .execute();
  }

  /**
   * Find startlist for a race with participant data joined
   */
  async findStartlistWithParticipant(raceId: number): Promise<
    Array<
      Pick<
        Selectable<ResultsTable>,
        'start_order' | 'bib' | 'start_time' | 'participant_id'
      > & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.participant_id',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .orderBy('results.start_order', 'asc')
      .execute();
  }

  /**
   * Find results with best run data for multi-run races (BR1/BR2)
   * Includes total_total and better_run_nr fields
   */
  async getResultsWithBestRun(raceId: number): Promise<
    Array<
      Selectable<ResultsTable> & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .orderBy('results.rnk', 'asc')
      .orderBy('results.rnk_order', 'asc')
      .execute();
  }

  /**
   * Find both BR1 and BR2 results for a specific participant
   * Returns results from both runs linked by class pattern
   */
  async getBothRunsForParticipant(
    eventId: number,
    participantId: number,
    classId: number
  ): Promise<
    Array<
      Selectable<ResultsTable> & {
        race_id_str: string;
        race_type: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('races', 'races.id', 'results.race_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'races.race_id as race_id_str',
        'races.race_type',
      ])
      .where('results.event_id', '=', eventId)
      .where('results.participant_id', '=', participantId)
      .where('races.class_id', '=', classId)
      .where((eb) =>
        eb.or([
          eb('races.race_type', '=', 'best-run-1'),
          eb('races.race_type', '=', 'best-run-2'),
        ])
      )
      .orderBy('races.race_type', 'asc')
      .execute();
  }

  /**
   * Find paired BR race (BR1 -> BR2 or BR2 -> BR1) by pattern
   * Race IDs follow pattern: {ClassId}_{RunCode}_{Day} where RunCode is BR1 or BR2
   */
  async findPairedBrRace(
    eventId: number,
    raceId: string
  ): Promise<{ id: number; race_id: string; race_type: string | null } | undefined> {
    // Use regex to handle classId with underscores (e.g., K1M_ST_BR1_6 -> classPrefix=K1M_ST, runCode=BR1, suffix=6)
    const match = raceId.match(/^(.+)_(BR[12])_(.+)$/);
    if (!match) return undefined;

    const classPrefix = match[1];
    const runCode = match[2];
    const suffix = match[3];

    // Determine paired run code from race_id pattern
    const pairedRunCode = runCode === 'BR1' ? 'BR2' : 'BR1';

    // Build paired race_id
    const pairedRaceId = `${classPrefix}_${pairedRunCode}_${suffix}`;

    return this.db
      .selectFrom('races')
      .select(['id', 'race_id', 'race_type'])
      .where('event_id', '=', eventId)
      .where('race_id', '=', pairedRaceId)
      .executeTakeFirst();
  }

  /**
   * Get all results for both BR1 and BR2 races linked by class pattern
   * Useful for displaying combined results with best run indicated
   */
  async getLinkedBrResults(
    eventId: number,
    raceId: string
  ): Promise<
    Map<
      number,
      Array<
        Selectable<ResultsTable> & {
          race_id_str: string;
          race_type: string | null;
          family_name: string;
          given_name: string | null;
          club: string | null;
          noc: string | null;
          cat_id: string | null;
          participant_id_str: string;
          athlete_id: string | null;
        }
      >
    >
  > {
    // Extract class prefix and suffix from race_id
    // Format: {classId}_BR{N}_{suffix} where classId can contain underscores
    // e.g. K1M_ST_BR1_6 → prefix="K1M_ST", suffix="6"
    const br1Match = raceId.match(/^(.+)_BR1_(.+)$/);
    const br2Match = raceId.match(/^(.+)_BR2_(.+)$/);
    const match = br1Match ?? br2Match;
    if (!match) return new Map();

    const classPrefix = match[1];
    const suffix = match[2];

    // Find all BR races for this class and suffix
    const br1RaceId = `${classPrefix}_BR1_${suffix}`;
    const br2RaceId = `${classPrefix}_BR2_${suffix}`;

    const results = await this.db
      .selectFrom('results')
      .innerJoin('races', 'races.id', 'results.race_id')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'races.race_id as race_id_str',
        'races.race_type',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.event_id', '=', eventId)
      .where((eb) =>
        eb.or([
          eb('races.race_id', '=', br1RaceId),
          eb('races.race_id', '=', br2RaceId),
        ])
      )
      .orderBy('races.race_type', 'asc')
      .orderBy('results.rnk', 'asc')
      .execute();

    // Group results by participant_id
    const grouped = new Map<
      number,
      Array<
        Selectable<ResultsTable> & {
          race_id_str: string;
          race_type: string | null;
          family_name: string;
          given_name: string | null;
          club: string | null;
          noc: string | null;
          cat_id: string | null;
          participant_id_str: string;
          athlete_id: string | null;
        }
      >
    >();

    for (const result of results) {
      const existing = grouped.get(result.participant_id) ?? [];
      existing.push(result);
      grouped.set(result.participant_id, existing);
    }

    return grouped;
  }

  /**
   * Recalculate ranking fields for all results in a standard (non-BR) race.
   *
   * Updates in-place (DB write per row):
   *   - rnk           — overall rank (1-based, null for DNS/DNF/DSQ/CAP or no total)
   *   - rnk_order     — tie-breaking order (position in sorted list, null for unranked)
   *   - total_behind  — gap to leader: "0.00" for leader, "+X.XX" for others (seconds, 2 dp)
   *   - cat_rnk       — rank within category group
   *   - cat_rnk_order — tie-breaking order within category
   *   - cat_total_behind — gap to category leader
   *
   * Times are stored in centiseconds. Behind = diff_cs / 100 → formatted string.
   * Athletes with a non-null/non-empty status or null total receive null ranks/behind.
   */
  async recalculateRankingFields(raceId: number): Promise<void> {
    // Fetch all current results for this race
    const rows = await this.db
      .selectFrom('results')
      .select([
        'id',
        'total',
        'status',
        'participant_id',
      ])
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select(['participants.cat_id'])
      .where('results.race_id', '=', raceId)
      .execute();

    // Determine which athletes are rankable (have a total and no disqualifying status)
    type RowShape = (typeof rows)[number];
    const isRankable = (r: RowShape) => r.total != null && !r.status;

    // Sort rankable athletes by total ascending; non-rankable go to the end
    const sorted = [...rows].sort((a, b) => {
      const aRankable = isRankable(a);
      const bRankable = isRankable(b);
      if (aRankable && bRankable) return (a.total as number) - (b.total as number);
      if (aRankable) return -1;
      if (bRankable) return 1;
      return 0;
    });

    // Overall ranking pass
    const leaderTotal = sorted.find(isRankable)?.total ?? null;
    let rank = 1;
    let rnkOrder = 1;

    // Maps id → computed fields for batch update
    const rankData = new Map<number, {
      rnk: number | null;
      rnk_order: number | null;
      total_behind: string | null;
    }>();

    for (const r of sorted) {
      if (!isRankable(r)) {
        rankData.set(r.id, { rnk: null, rnk_order: null, total_behind: null });
        continue;
      }
      const diff = (r.total as number) - (leaderTotal as number);
      const behind = diff === 0 ? '0.00' : `+${(diff / 100).toFixed(2)}`;
      rankData.set(r.id, { rnk: rank++, rnk_order: rnkOrder++, total_behind: behind });
    }

    // Category ranking pass — group rankable athletes by cat_id
    const catGroups = new Map<string, RowShape[]>();
    for (const r of sorted) {
      if (!isRankable(r) || !r.cat_id) continue;
      const group = catGroups.get(r.cat_id) ?? [];
      group.push(r);
      catGroups.set(r.cat_id, group);
    }

    const catRankData = new Map<number, {
      cat_rnk: number | null;
      cat_rnk_order: number | null;
      cat_total_behind: string | null;
    }>();

    // Default: null for everyone
    for (const r of rows) {
      catRankData.set(r.id, { cat_rnk: null, cat_rnk_order: null, cat_total_behind: null });
    }

    for (const [, catRows] of catGroups) {
      // catRows already sorted by total ascending (inherited from global sort)
      const catLeaderTotal = catRows[0]?.total ?? null;
      let catRank = 1;
      let catRnkOrder = 1;
      for (const r of catRows) {
        const diff = (r.total as number) - (catLeaderTotal as number);
        const behind = diff === 0 ? '0.00' : `+${(diff / 100).toFixed(2)}`;
        catRankData.set(r.id, {
          cat_rnk: catRank++,
          cat_rnk_order: catRnkOrder++,
          cat_total_behind: behind,
        });
      }
    }

    // Write all updates to DB
    for (const r of rows) {
      const rank_ = rankData.get(r.id);
      const cat_ = catRankData.get(r.id);
      await this.db
        .updateTable('results')
        .set({
          rnk: rank_?.rnk ?? null,
          rnk_order: rank_?.rnk_order ?? null,
          total_behind: rank_?.total_behind ?? null,
          cat_rnk: cat_?.cat_rnk ?? null,
          cat_rnk_order: cat_?.cat_rnk_order ?? null,
          cat_total_behind: cat_?.cat_total_behind ?? null,
        })
        .where('id', '=', r.id)
        .execute();
    }
  }

  /**
   * Find results for a race filtered by category ID
   * Returns only participants matching the specified category with their category rank
   */
  async filterByCatId(
    raceId: number,
    catId: string
  ): Promise<
    Array<
      Selectable<ResultsTable> & {
        family_name: string;
        given_name: string | null;
        club: string | null;
        noc: string | null;
        cat_id: string | null;
        participant_id_str: string;
        athlete_id: string | null;
      }
    >
  > {
    return this.db
      .selectFrom('results')
      .innerJoin('participants', 'participants.id', 'results.participant_id')
      .select([
        'results.id',
        'results.event_id',
        'results.race_id',
        'results.participant_id',
        'results.start_order',
        'results.bib',
        'results.start_time',
        'results.status',
        'results.dt_start',
        'results.dt_finish',
        'results.time',
        'results.gates',
        'results.pen',
        'results.total',
        'results.rnk',
        'results.rnk_order',
        'results.cat_rnk',
        'results.cat_rnk_order',
        'results.total_behind',
        'results.cat_total_behind',
        'results.prev_time',
        'results.prev_pen',
        'results.prev_total',
        'results.prev_rnk',
        'results.total_total',
        'results.better_run_nr',
        'results.heat_nr',
        'results.round_nr',
        'results.qualified',
        'participants.family_name',
        'participants.given_name',
        'participants.club',
        'participants.noc',
        'participants.cat_id',
        'participants.participant_id as participant_id_str',
        'participants.athlete_id',
      ])
      .where('results.race_id', '=', raceId)
      .where('participants.cat_id', '=', catId)
      .orderBy('results.cat_rnk', 'asc')
      .orderBy('results.cat_rnk_order', 'asc')
      .execute();
  }
}
