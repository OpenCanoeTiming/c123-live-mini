/**
 * XML Parser Types
 *
 * Types representing the C123 XML export structure.
 * These are intermediate types used for parsing, not the domain types.
 */

/**
 * Root element of C123 XML export
 */
export interface C123Data {
  Events?: XmlEvent | XmlEvent[];
  Participants?: XmlParticipant | XmlParticipant[];
  Classes?: XmlClass | XmlClass[];
  Schedule?: XmlSchedule | XmlSchedule[];
  Results?: XmlResult | XmlResult[];
  CourseData?: XmlCourse | XmlCourse[];
}

/**
 * Event metadata from XML
 */
export interface XmlEvent {
  EventId: string;
  MainTitle: string;
  SubTitle?: string;
  Location?: string;
  Country?: string;
  Facility?: string;
  StartDate?: string;
  EndDate?: string;
  CanoeDiscipline?: string;
  TimeMode?: string;
}

/**
 * Participant from XML
 */
export interface XmlParticipant {
  Id: string;
  ClassId: string;
  EventBib?: string | number;
  ICFId?: string;
  FamilyName: string;
  GivenName?: string;
  NOC?: string;
  Club?: string;
  CatId?: string;
  IsTeam?: string | boolean;
  Member1?: string;
  Member2?: string;
  Member3?: string;
}

/**
 * Class (category) from XML
 */
export interface XmlClass {
  ClassId: string;
  Class: string;
  LongTitle?: string;
  Categories?: XmlCategory | XmlCategory[];
}

/**
 * Category within a class from XML
 */
export interface XmlCategory {
  CatId: string;
  Category: string;
  FirstYear?: string | number;
  LastYear?: string | number;
}

/**
 * Schedule entry from XML
 */
export interface XmlSchedule {
  RaceId: string;
  RaceOrder?: string | number;
  StartTime?: string;
  ClassId: string;
  DisId: string;
  StartInterval?: string;
  CourseNr?: string | number;
  RaceStatus?: string | number;
}

/**
 * Result from XML
 */
export interface XmlResult {
  RaceId: string;
  Id: string;
  StartOrder?: string | number;
  Bib?: string | number;
  StartTime?: string;
  Status?: string;
  dtStart?: string;
  dtFinish?: string;
  Time?: string | number;
  Gates?: string;
  Pen?: string | number;
  Total?: string | number;
  TotalBehind?: string;
  catTotalBehind?: string;
  Rnk?: string | number;
  RnkOrder?: string | number;
  CatRnk?: string | number;
  CatRnkOrder?: string | number;
  PrevTime?: string | number;
  PrevPen?: string | number;
  PrevTotal?: string | number;
  PrevRnk?: string | number;
  TotalTotal?: string | number;
  BetterRunNr?: string | number;
  HeatNr?: string | number;
  RoundNr?: string | number;
  Qualified?: string;
}

/**
 * Course data from XML
 */
export interface XmlCourse {
  CourseNr: string | number;
  CourseConfig?: string;
}

/**
 * Parsed data output types
 */

export interface ParsedEvent {
  eventId: string;
  mainTitle: string;
  subTitle: string | null;
  location: string | null;
  facility: string | null;
  startDate: string | null;
  endDate: string | null;
  discipline: string | null;
}

export interface ParsedClass {
  classId: string;
  name: string;
  longTitle: string | null;
  categories: ParsedCategory[];
}

export interface ParsedCategory {
  catId: string;
  name: string;
  firstYear: number | null;
  lastYear: number | null;
}

export interface ParsedParticipant {
  participantId: string;
  classId: string;
  eventBib: number | null;
  icfId: string | null;
  familyName: string;
  givenName: string | null;
  noc: string | null;
  club: string | null;
  catId: string | null;
  isTeam: boolean;
  member1: string | null;
  member2: string | null;
  member3: string | null;
}

export interface ParsedRace {
  raceId: string;
  classId: string;
  disId: string;
  raceOrder: number | null;
  startTime: string | null;
  startInterval: string | null;
  courseNr: number | null;
  raceStatus: number;
}

export interface ParsedResult {
  raceId: string;
  participantId: string;
  startOrder: number | null;
  bib: number | null;
  startTime: string | null;
  status: string | null;
  dtStart: string | null;
  dtFinish: string | null;
  time: number | null;
  gates: number[] | null;
  pen: number | null;
  total: number | null;
  rnk: number | null;
  rnkOrder: number | null;
  catRnk: number | null;
  catRnkOrder: number | null;
  totalBehind: string | null;
  catTotalBehind: string | null;
  prevTime: number | null;
  prevPen: number | null;
  prevTotal: number | null;
  prevRnk: number | null;
  totalTotal: number | null;
  betterRunNr: number | null;
  heatNr: number | null;
  roundNr: number | null;
  qualified: string | null;
}

export interface ParsedCourse {
  courseNr: number;
  nrGates: number | null;
  gateConfig: string | null;
}

/**
 * Full parsed XML result
 */
export interface ParsedC123Data {
  event: ParsedEvent | null;
  classes: ParsedClass[];
  participants: ParsedParticipant[];
  races: ParsedRace[];
  results: ParsedResult[];
  courses: ParsedCourse[];
}
