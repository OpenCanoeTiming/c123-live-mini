// Event types
export type {
  Event,
  EventCreate,
  EventWithApiKey,
  EventStatus,
  Discipline,
} from './event.js';
export { VALID_TRANSITIONS, ALLOWED_INGEST } from './event.js';

// Class and Category types
export type {
  Class,
  ClassCreate,
  Category,
  CategoryCreate,
} from './class.js';

// Participant types
export type { Participant, ParticipantCreate } from './participant.js';
export { getParticipantDisplayName } from './participant.js';

// Race types
export type { Race, RaceCreate, RaceStatus, DisId, RaceType } from './race.js';
export { RACE_STATUS_NAMES } from './race.js';

// Result types
export type {
  Result,
  ResultCreate,
  ResultStatus,
  GatePenalty,
} from './result.js';
export { formatTime, formatPenalty } from './result.js';

// Course types
export type { Course, CourseCreate } from './course.js';
export { parseGateConfig } from './course.js';

// OnCourse types (real-time tracking, in-memory only)
export type { OnCourseEntry, OnCourseInput } from './oncourse.js';

// Public API types (client-facing, technology-transparent)
export type {
  PublicEventStatus,
  PublicRaceType,
  PublicGateType,
  PublicGate,
  PublicEvent,
  PublicEventDetail,
  PublicCategory,
  PublicClass,
  PublicAggregatedCategory,
  PublicRace,
  PublicParticipant,
  PublicStartlistEntry,
  PublicResult,
  PublicResultDetailed,
  PublicResultMultiRun,
  PublicOnCourseEntry,
} from './publicApi.js';
