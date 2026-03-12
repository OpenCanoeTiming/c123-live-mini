import type { XmlResult, ParsedResult } from './types.js';

/**
 * Ensure value is an array
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse optional number from string or number
 */
function parseOptionalInt(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'string' ? parseInt(value.trim(), 10) : value;
  return isNaN(num) ? null : num;
}

/**
 * Parse gates string to array of numbers
 * Format: "  0  0  2  0  0  0  50  0  ..."
 * Values: 0 = clean, 2 = touch, 50 = missed
 */
function parseGates(gatesStr: string | undefined): number[] | null {
  if (!gatesStr || gatesStr.trim() === '') return null;

  // Split by whitespace and filter out empty strings
  const values = gatesStr
    .trim()
    .split(/\s+/)
    .filter((v) => v !== '')
    .map((v) => parseInt(v, 10))
    .filter((v) => !isNaN(v));

  return values.length > 0 ? values : null;
}

/**
 * Parse status - empty means OK (completed)
 */
function parseStatus(status: string | undefined): string | null {
  if (!status || status.trim() === '') return null;
  const trimmed = status.trim().toUpperCase();
  // Only accept known status codes
  if (['DNS', 'DNF', 'DSQ', 'CAP'].includes(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Detect whether XML time values are in milliseconds or centiseconds.
 *
 * C123 XML declares TimeMode=Points100 but actual data may be in milliseconds:
 * - Milliseconds: Time=76990 (76.990s), Pen=2 (2s), Total=78990 (76990+2*1000)
 * - Centiseconds: Time=7699 (76.99s), Pen=200 (2s), Total=7899 (7699+200)
 *
 * Returns 'ms' if milliseconds detected, 'cs' if centiseconds, null if undetermined.
 */
export function detectTimeMode(results: ParsedResult[]): 'ms' | 'cs' | null {
  // Strategy 1: Find a result with Time, Pen > 0, and Total all present
  for (const r of results) {
    if (r.time != null && r.pen != null && r.pen > 0 && r.total != null) {
      // Check ms mode: Total === Time + Pen * 1000 (Pen is in whole seconds)
      if (r.total === r.time + r.pen * 1000) {
        return 'ms';
      }
      // Check cs mode: Total === Time + Pen (Pen already in centiseconds)
      if (r.total === r.time + r.pen) {
        return 'cs';
      }
    }
  }

  // Strategy 2: If no results with penalties, check magnitude across all timed results.
  //
  // Slalom time ranges:
  //   centiseconds: 6000–15000 cs  (60s–150s, including DSQ/slow runs)
  //   milliseconds: 60000–200000 ms (60s–200s)
  //
  // Threshold of 20000 cleanly separates the two ranges with a large gap.
  // A legitimate cs value above 20000 would mean >200 seconds — impossible in slalom.
  // A legitimate ms value below 20000 would mean <20 seconds — also impossible.
  //
  // Check all timed results and require consensus: if ANY time exceeds the threshold,
  // report ms. If we have at least one result below the threshold, report cs.
  let hasTimedResult = false;
  for (const r of results) {
    if (r.time != null && r.time > 0) {
      hasTimedResult = true;
      if (r.time > 20000) {
        return 'ms';
      }
    }
  }

  if (hasTimedResult) {
    return 'cs';
  }

  return null;
}

/**
 * Normalize all time values in results to centiseconds.
 * - ms mode: time/total fields ÷ 10, pen fields × 100
 * - cs mode: no conversion needed
 */
export function normalizeTimesToCentiseconds(results: ParsedResult[]): ParsedResult[] {
  const mode = detectTimeMode(results);

  if (!mode || mode === 'cs') {
    return results; // Already in centiseconds or undetermined
  }

  // ms mode: convert
  return results.map((r) => ({
    ...r,
    time: r.time != null ? Math.round(r.time / 10) : null,
    total: r.total != null ? Math.round(r.total / 10) : null,
    pen: r.pen != null ? r.pen * 100 : null,
    prevTime: r.prevTime != null ? Math.round(r.prevTime / 10) : null,
    prevTotal: r.prevTotal != null ? Math.round(r.prevTotal / 10) : null,
    prevPen: r.prevPen != null ? r.prevPen * 100 : null,
    totalTotal: r.totalTotal != null ? Math.round(r.totalTotal / 10) : null,
  }));
}

/**
 * Parse Results section from XML
 */
export function parseResults(
  results: XmlResult | XmlResult[] | undefined
): ParsedResult[] {
  const resultsArray = ensureArray(results);

  return resultsArray.map((r) => ({
    raceId: r.RaceId,
    participantId: r.Id,
    startOrder: parseOptionalInt(r.StartOrder),
    bib: parseOptionalInt(r.Bib),
    startTime: r.StartTime || null,
    status: parseStatus(r.Status),
    dtStart: r.dtStart || null,
    dtFinish: r.dtFinish || null,
    time: parseOptionalInt(r.Time),
    gates: parseGates(r.Gates),
    pen: parseOptionalInt(r.Pen),
    total: parseOptionalInt(r.Total),
    rnk: parseOptionalInt(r.Rnk),
    rnkOrder: parseOptionalInt(r.RnkOrder),
    catRnk: parseOptionalInt(r.CatRnk),
    catRnkOrder: parseOptionalInt(r.CatRnkOrder),
    totalBehind: r.TotalBehind || null,
    catTotalBehind: r.catTotalBehind || null,
    prevTime: parseOptionalInt(r.PrevTime),
    prevPen: parseOptionalInt(r.PrevPen),
    prevTotal: parseOptionalInt(r.PrevTotal),
    prevRnk: parseOptionalInt(r.PrevRnk),
    totalTotal: parseOptionalInt(r.TotalTotal),
    betterRunNr: parseOptionalInt(r.BetterRunNr),
    heatNr: parseOptionalInt(r.HeatNr),
    roundNr: parseOptionalInt(r.RoundNr),
    qualified: r.Qualified || null,
  }));
}
