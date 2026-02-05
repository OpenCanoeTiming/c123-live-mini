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
