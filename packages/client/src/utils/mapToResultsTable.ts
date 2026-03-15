/**
 * Mapper utility: API ResultEntry → rvp-design-system ResultEntry
 *
 * Converts race result data from the c123-live-mini API format to the
 * format expected by the ResultsTable component in @czechcanoe/rvp-design-system.
 *
 * Time units:
 *   API:  hundredths of a second (integer)
 *   DS:   seconds (float)
 */

import type { ResultEntry as ApiResultEntry } from '../services/api';
import type { ResultEntry as DSResultEntry } from '@czechcanoe/rvp-design-system';

/**
 * Valid status values accepted by the design system ResultsTable.
 */
type DSResultStatus = 'dns' | 'dnf' | 'dsq' | 'final' | 'provisional' | 'live';

const STATUS_MAP: Record<string, DSResultStatus> = {
  dns: 'dns',
  dnf: 'dnf',
  dsq: 'dsq',
  final: 'final',
  provisional: 'provisional',
  live: 'live',
};

/**
 * Convert hundredths of a second to seconds.
 * Returns undefined when the value is null or undefined.
 */
function hundredthsToSeconds(hundredths: number | null | undefined): number | undefined {
  if (hundredths == null) return undefined;
  return hundredths / 100;
}

/**
 * Parse a timeDiff string such as "+1.23" or "-0.50" into a numeric seconds value.
 * Returns undefined when the string is null, empty, or cannot be parsed.
 */
function parseTimeDiff(behind: string | null | undefined): number | undefined {
  if (!behind) return undefined;
  const parsed = parseFloat(behind.replace('+', ''));
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Map an API status string to a design-system ResultStatus union value.
 * Unknown / empty status strings are returned as undefined.
 */
function mapStatus(status: string | null | undefined): DSResultStatus | undefined {
  if (!status) return undefined;
  return STATUS_MAP[status.toLowerCase()] ?? undefined;
}

/**
 * Map a single API ResultEntry to the design-system ResultEntry format.
 *
 * @param result        - Source result from the API.
 * @param isBestRun     - True when the race is a BR (best-run) race containing two runs.
 * @param selectedCatId - When set, use category rank/diff instead of overall rank/diff.
 */
export function mapResultToDS(
  result: ApiResultEntry,
  isBestRun: boolean,
  selectedCatId?: string | null
): DSResultEntry {
  // --- Identity ---
  const id: string | number = result.athleteId ?? result.bib ?? '';
  const startNumber = result.bib ?? undefined;

  // --- Rank / time diff ---
  const useCategory = Boolean(selectedCatId);
  const rank = (useCategory ? result.catRnk : result.rnk) ?? undefined;
  const timeDiff = parseTimeDiff(useCategory ? result.catTotalBehind : result.totalBehind);

  // --- Status ---
  const status = mapStatus(result.status);

  // --- Times ---
  let run1Time: number | undefined;
  let run1Penalty: number | undefined;
  let run2Time: number | undefined;
  let run2Penalty: number | undefined;
  let totalTime: number | undefined;

  if (isBestRun) {
    // Server convention: primary run is BR2.
    //   result.time / result.pen / result.total  → Run 2 (current / primary)
    //   result.prevTime / result.prevPen / result.prevTotal → Run 1 (previous)
    // When only BR1 has been run, prevTotal is null and total holds Run 1 data.
    const hasBothRuns = result.prevTotal != null;

    if (hasBothRuns) {
      run1Time = hundredthsToSeconds(result.prevTime);
      run1Penalty = hundredthsToSeconds(result.prevPen);
      run2Time = hundredthsToSeconds(result.time);
      run2Penalty = hundredthsToSeconds(result.pen);
    } else {
      // Only Run 1 available — map to run1 slot.
      run1Time = hundredthsToSeconds(result.time);
      run1Penalty = hundredthsToSeconds(result.pen);
    }

    // Best-of-both-runs aggregate total (totalTotal), or fall back to the
    // single-run total when BR2 hasn't been ingested yet.
    totalTime = hundredthsToSeconds(result.totalTotal ?? result.total);
  } else {
    // Single-run race: straightforward mapping.
    run1Time = hundredthsToSeconds(result.time);
    run1Penalty = hundredthsToSeconds(result.pen);
    totalTime = hundredthsToSeconds(result.total);
  }

  return {
    id,
    rank,
    name: result.name,
    club: result.club ?? undefined,
    startNumber,
    run1Time,
    run1Penalty,
    run2Time,
    run2Penalty,
    totalTime,
    timeDiff,
    status,
    previousRank: result.prevRnk ?? undefined,
  };
}

/**
 * Map an array of API ResultEntry objects to design-system ResultEntry objects.
 *
 * @param results       - Source results from the API.
 * @param isBestRun     - True when the race is a BR (best-run) race.
 * @param selectedCatId - When set, use category rank/diff instead of overall rank/diff.
 */
export function mapResultsToDS(
  results: ApiResultEntry[],
  isBestRun: boolean,
  selectedCatId?: string | null
): DSResultEntry[] {
  return results.map((result) => mapResultToDS(result, isBestRun, selectedCatId));
}
