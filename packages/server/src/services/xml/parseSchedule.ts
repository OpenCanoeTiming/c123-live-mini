import type { XmlSchedule, ParsedRace } from './types.js';

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
 * Parse Schedule section from XML (maps to races)
 */
export function parseSchedule(
  schedule: XmlSchedule | XmlSchedule[] | undefined
): ParsedRace[] {
  const scheduleArray = ensureArray(schedule);

  return scheduleArray.map((s) => ({
    raceId: s.RaceId,
    classId: s.ClassId,
    disId: s.DisId,
    raceOrder: parseOptionalInt(s.RaceOrder),
    startTime: s.StartTime || null,
    startInterval: s.StartInterval || null,
    courseNr: parseOptionalInt(s.CourseNr),
    raceStatus: parseOptionalInt(s.RaceStatus) ?? 1,
  }));
}
