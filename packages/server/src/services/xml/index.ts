import { XMLParser } from 'fast-xml-parser';
import type { C123Data, ParsedC123Data } from './types.js';
import { parseEvents } from './parseEvents.js';
import { parseClasses } from './parseClasses.js';
import { parseParticipants } from './parseParticipants.js';
import { parseSchedule } from './parseSchedule.js';
import { parseResults } from './parseResults.js';
import { parseCourseData } from './parseCourseData.js';

// Re-export types
export type {
  ParsedC123Data,
  ParsedEvent,
  ParsedClass,
  ParsedCategory,
  ParsedParticipant,
  ParsedRace,
  ParsedResult,
  ParsedCourse,
} from './types.js';

/**
 * Parser options for fast-xml-parser
 */
const parserOptions = {
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
  // Don't convert numbers automatically - we handle conversion in parsers
  numberParseOptions: {
    leadingZeros: false,
    hex: false,
    skipLike: /.*/,
  },
};

/**
 * Parse C123 XML string into structured data
 *
 * @param xmlString - The XML content as string
 * @returns Parsed data structure
 * @throws Error if XML is invalid
 */
export function parseC123Xml(xmlString: string): ParsedC123Data {
  const parser = new XMLParser(parserOptions);

  let parsed: { Canoe123Data?: C123Data };
  try {
    parsed = parser.parse(xmlString);
  } catch (error) {
    throw new Error(
      `Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  const data = parsed.Canoe123Data;
  if (!data) {
    throw new Error('Invalid C123 XML: missing Canoe123Data root element');
  }

  return {
    event: parseEvents(data.Events),
    classes: parseClasses(data.Classes),
    participants: parseParticipants(data.Participants),
    races: parseSchedule(data.Schedule),
    results: parseResults(data.Results),
    courses: parseCourseData(data.CourseData),
  };
}

/**
 * Validate that parsed data has minimum required content
 */
export function validateParsedData(data: ParsedC123Data): string[] {
  const errors: string[] = [];

  if (!data.event) {
    errors.push('Missing event data');
  }

  if (data.classes.length === 0) {
    errors.push('No classes found');
  }

  if (data.participants.length === 0) {
    errors.push('No participants found');
  }

  if (data.races.length === 0) {
    errors.push('No races found in schedule');
  }

  return errors;
}
