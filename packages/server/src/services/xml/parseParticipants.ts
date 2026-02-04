import type { XmlParticipant, ParsedParticipant } from './types.js';

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
 * Parse boolean from string or boolean
 */
function parseBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

/**
 * Parse Participants section from XML
 */
export function parseParticipants(
  participants: XmlParticipant | XmlParticipant[] | undefined
): ParsedParticipant[] {
  const participantArray = ensureArray(participants);

  return participantArray.map((p) => ({
    participantId: p.Id,
    classId: p.ClassId,
    eventBib: parseOptionalInt(p.EventBib),
    icfId: p.ICFId || null,
    familyName: p.FamilyName,
    givenName: p.GivenName || null,
    noc: p.NOC || null,
    club: p.Club || null,
    catId: p.CatId || null,
    isTeam: parseBoolean(p.IsTeam),
    member1: p.Member1 || null,
    member2: p.Member2 || null,
    member3: p.Member3 || null,
  }));
}
