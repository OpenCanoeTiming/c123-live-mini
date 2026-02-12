/**
 * Participant (athlete or team) in an event
 */
export interface Participant {
  /** Internal database ID */
  id: number;
  /** C123 participant ID (e.g., 60070.C1M.ZS) */
  participantId: string;
  /** Class internal ID */
  classId: number | null;
  /** Event bib number */
  eventBib: number | null;
  /** ICF registration number (legacy, kept for backward compatibility) */
  icfId: string | null;
  /** Technology-transparent athlete identifier */
  athleteId: string | null;
  /** Last name */
  familyName: string;
  /** First name */
  givenName: string | null;
  /** Country code (NOC) */
  noc: string | null;
  /** Club name */
  club: string | null;
  /** Age category code */
  catId: string | null;
  /** True if this is a team entry */
  isTeam: boolean;
  /** Team member 1 participant ID */
  member1: string | null;
  /** Team member 2 participant ID */
  member2: string | null;
  /** Team member 3 participant ID */
  member3: string | null;
}

/**
 * Participant display name helper
 */
export function getParticipantDisplayName(participant: Participant): string {
  const givenName = participant.givenName || '';
  return `${participant.familyName} ${givenName}`.trim();
}

/**
 * Participant data for creation
 */
export interface ParticipantCreate {
  participantId: string;
  classId?: number | null;
  eventBib?: number | null;
  icfId?: string | null;
  athleteId?: string | null;
  familyName: string;
  givenName?: string | null;
  noc?: string | null;
  club?: string | null;
  catId?: string | null;
  isTeam?: boolean;
  member1?: string | null;
  member2?: string | null;
  member3?: string | null;
}
