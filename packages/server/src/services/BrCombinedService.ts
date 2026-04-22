import type { ResultRepository } from '../db/repositories/ResultRepository.js';
import type { PublicGate } from '@c123-live-mini/shared';

export interface CombinedBrResult {
  rnk: number | null;
  bib: number | null;
  athleteId: string | null;
  name: string;
  club: string | null;
  noc: string | null;
  catId: string | null;
  catRnk: number | null;
  time: number | null;
  pen: number | null;
  total: number | null;
  totalBehind: string | null;
  catTotalBehind: string | null;
  /**
   * Combined row status — cleared to `null` as soon as the participant has
   * at least one clean run (so they stay rankable). Only populated when
   * BOTH runs are DNF/DNS/DSQ (or the single existing run is). Used for
   * the overall row badge and for sort/rank behaviour.
   */
  status: string | null;
  /**
   * Status of BR1 specifically, regardless of BR2.
   * `null` when BR1 was clean OR when BR1 does not yet exist.
   * Use this to render the Run 1 cell independently of the combined status.
   * (#162)
   */
  prevStatus: string | null;
  /**
   * Status of BR2 when both runs exist; when only BR1 exists this mirrors
   * BR1's status (there is no "previous" run to distinguish).
   * Use this to render the Run 2 cell independently of the combined status.
   * (#162)
   */
  currStatus: string | null;
  betterRunNr: number | null;
  totalTotal: number | null;
  prevTime: number | null;
  prevPen: number | null;
  prevTotal: number | null;
  prevRnk: number | null;
  // Gate data — same convention as times: primary=BR2, prev=BR1 (chronological)
  dtStart?: string | null;
  dtFinish?: string | null;
  gates?: PublicGate[] | null;
  prevDtStart?: string | null;
  prevDtFinish?: string | null;
  prevGates?: PublicGate[] | null;
}

/**
 * Parse a gates JSON string into PublicGate array, returning null on failure.
 */
function parseGates(gatesJson: string | null | undefined): PublicGate[] | null {
  if (!gatesJson) return null;
  try {
    return JSON.parse(gatesJson) as PublicGate[];
  } catch {
    return null;
  }
}

function formatName(familyName: string, givenName: string | null): string {
  if (!givenName) return familyName;
  return `${familyName} ${givenName}`;
}

export class BrCombinedService {
  constructor(private resultRepo: ResultRepository) {}

  async computeCombined(
    eventId: number,
    raceId: string,
    catId?: string,
    includeGates = false
  ): Promise<CombinedBrResult[]> {
    // 1. Get linked BR results from DB
    const linkedResults = await this.resultRepo.getLinkedBrResults(eventId, raceId);

    const results: CombinedBrResult[] = [];

    // 2. For each participant, combine BR1+BR2
    for (const [, runs] of linkedResults) {
      if (runs.length === 0) continue;

      const firstRun = runs[0];

      // Filter by category if requested
      if (catId && firstRun.cat_id !== catId) continue;

      const br1 = runs.find((r) => r.race_type === 'best-run-1');
      const br2 = runs.find((r) => r.race_type === 'best-run-2');

      // Calculate totalTotal and betterRunNr
      let totalTotal: number | null = null;
      let betterRunNr: number | null = null;

      if (br1?.total != null && br2?.total != null && !br1.status && !br2.status) {
        // Both runs completed successfully
        if (br1.total <= br2.total) {
          totalTotal = br1.total;
          betterRunNr = 1;
        } else {
          totalTotal = br2.total;
          betterRunNr = 2;
        }
      } else if (br1?.total != null && !br1.status) {
        totalTotal = br1.total;
        betterRunNr = 1;
      } else if (br2?.total != null && !br2.status) {
        totalTotal = br2.total;
        betterRunNr = 2;
      }

      const hasBothRuns = br1 != null && br2 != null;
      const infoSource = br2 ?? br1;
      if (!infoSource) continue;

      // BUG 4 FIX: Combined status logic
      // If betterRunNr is set (at least one clean run), status should be null
      // Only show status (DSQ etc.) when NO clean run exists
      const combinedStatus = betterRunNr != null ? null : (infoSource.status || null);

      // #162: Per-run status fields. The combined `status` above is cleared
      // to null as soon as a participant has one clean run, which makes the
      // client unable to distinguish "BR1 DNF + BR2 clean" from
      // "only BR2 ran". prevStatus/currStatus surface the raw per-run status
      // so the Run 1 / Run 2 cells can be rendered independently.
      const prevStatus: string | null = hasBothRuns ? (br1!.status || null) : null;
      const currStatus: string | null = hasBothRuns
        ? (br2!.status || null)
        : (infoSource.status || null);

      const entry: CombinedBrResult = {
        rnk: null, // will be recalculated
        bib: infoSource.bib,
        athleteId: infoSource.athlete_id,
        name: formatName(infoSource.family_name, infoSource.given_name),
        club: infoSource.club,
        noc: infoSource.noc,
        catId: infoSource.cat_id,
        catRnk: null, // will be recalculated
        // Primary run: BR2 when both exist, else BR1
        time: hasBothRuns ? (br2!.time ?? null) : (br1?.time ?? null),
        pen: hasBothRuns ? (br2!.pen ?? null) : (br1?.pen ?? null),
        total: hasBothRuns ? (br2!.total ?? null) : (br1?.total ?? null),
        totalBehind: null, // will be recalculated
        catTotalBehind: null, // will be recalculated
        status: combinedStatus,
        prevStatus,
        currStatus,
        betterRunNr,
        totalTotal,
        // Previous run: BR1 data when both exist, null when only one run
        prevTime: hasBothRuns ? (br1!.time ?? null) : null,
        prevPen: hasBothRuns ? (br1!.pen ?? null) : null,
        prevTotal: hasBothRuns ? (br1!.total ?? null) : null,
        prevRnk: hasBothRuns ? (br1!.rnk ?? null) : null,
      };

      // Attach gate data — same chronological convention as times: primary=BR2, prev=BR1
      if (includeGates) {
        const run2 = hasBothRuns ? br2 : (br1 ?? null);
        entry.dtStart = run2?.dt_start ?? null;
        entry.dtFinish = run2?.dt_finish ?? null;
        entry.gates = parseGates(run2?.gates);

        const run1 = hasBothRuns ? br1 : null;
        entry.prevDtStart = run1?.dt_start ?? null;
        entry.prevDtFinish = run1?.dt_finish ?? null;
        entry.prevGates = parseGates(run1?.gates);
      }

      results.push(entry);
    }

    // 3. Sort by totalTotal (best time first)
    results.sort((a, b) => {
      if (a.totalTotal == null && b.totalTotal == null) return 0;
      if (a.totalTotal == null) return 1;
      if (b.totalTotal == null) return -1;
      return a.totalTotal - b.totalTotal;
    });

    // 4. Recalculate rnk + totalBehind from sorted position
    const leaderTotal = results.find((r) => r.totalTotal != null)?.totalTotal ?? null;
    let rank = 1;
    for (const r of results) {
      if (leaderTotal == null || r.totalTotal == null) {
        r.totalBehind = null;
        r.rnk = null;
      } else {
        const diff = r.totalTotal - leaderTotal;
        r.totalBehind = diff === 0 ? '0.00' : `+${(diff / 100).toFixed(2)}`;
        r.rnk = rank++;
      }
    }

    // 5. BUG 2 FIX: Recalculate catRnk + catTotalBehind per category
    // Group by catId and compute per-category ranking
    const catGroups = new Map<string, CombinedBrResult[]>();
    for (const r of results) {
      if (r.catId) {
        const group = catGroups.get(r.catId) ?? [];
        group.push(r);
        catGroups.set(r.catId, group);
      }
    }

    for (const [, catResults] of catGroups) {
      // catResults are already sorted by totalTotal (from global sort)
      const catLeaderTotal = catResults.find((r) => r.totalTotal != null)?.totalTotal ?? null;
      let catRank = 1;
      for (const r of catResults) {
        if (catLeaderTotal == null || r.totalTotal == null) {
          r.catRnk = null;
          r.catTotalBehind = null;
        } else {
          const diff = r.totalTotal - catLeaderTotal;
          r.catTotalBehind = diff === 0 ? '0.00' : `+${(diff / 100).toFixed(2)}`;
          r.catRnk = catRank++;
        }
      }
    }

    return results;
  }
}
