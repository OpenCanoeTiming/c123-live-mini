/**
 * Seed Data for c123-live-mini
 *
 * Source: c123-protocol-docs/samples/2024-LODM-fin.xml (LODM 2024)
 * Feature: 004-database-layer
 *
 * This module provides demo data for development and testing.
 * Data is extracted from real competition results.
 */

import type { Insertable } from 'kysely';
import type {
  EventsTable,
  ClassesTable,
  ParticipantsTable,
  RacesTable,
  ResultsTable,
  CoursesTable,
} from './schema.js';

// =============================================================================
// SEED DATA TYPES - TypeScript types for seed data structures
// =============================================================================

/**
 * Seed class data without event_id (added during insertion)
 */
export type SeedClass = Omit<Insertable<ClassesTable>, 'event_id'>;

/**
 * Seed course data without event_id (added during insertion)
 */
export type SeedCourse = Omit<Insertable<CoursesTable>, 'event_id'>;

/**
 * Seed race data with class_ref for lookup during insertion
 * event_id and class_id are resolved during insertion
 * dis_id is C123 source data - gets mapped to race_type during insertion
 */
export type SeedRace = Omit<Insertable<RacesTable>, 'event_id' | 'class_id'> & {
  /** Reference to class_id string for lookup */
  class_ref: string;
  /** C123 discipline ID (source data) - mapped to race_type during insertion */
  dis_id: string;
};

/**
 * Seed participant data with class_ref for lookup during insertion
 * event_id and class_id are resolved during insertion
 * icf_id is C123 source data - gets mapped to athlete_id during insertion
 */
export type SeedParticipant = Omit<Insertable<ParticipantsTable>, 'event_id' | 'class_id'> & {
  /** Reference to class_id string for lookup */
  class_ref: string;
  /** C123 ICF ID (source data) - mapped to athlete_id during insertion */
  icf_id: string;
};

/**
 * Seed result data with refs for lookup during insertion
 * All IDs are resolved during insertion from reference strings
 */
export type SeedResult = {
  /** Reference to participant_id string for lookup */
  participant_ref: string;
  /** Reference to race_id string for lookup */
  race_ref: string;
  start_order: number;
  bib: number;
  start_time: string;
  /** Result status: null = OK, 'DNS', 'DNF', 'DSQ', 'CAP' */
  status: string | null;
  dt_start: string | null;
  dt_finish: string | null;
  /** Time in hundredths of seconds */
  time: number | null;
  /** Gate penalties as string (25-char) */
  gates: string | null;
  /** Penalty time in hundredths */
  pen: number | null;
  /** Total time (time + pen) in hundredths */
  total: number | null;
  /** Overall rank */
  rnk: number | null;
  /** Rank order for display */
  rnk_order: number | null;
  /** Time behind leader (e.g., "+0.85") */
  total_behind: string | null;
};

/**
 * Result status type - valid values for result status field
 */
export type ResultStatus = 'DNS' | 'DNF' | 'DSQ' | 'CAP' | null;

// =============================================================================
// TEST CONSTANTS - Deterministic values for test assertions
// =============================================================================

/**
 * Seed Data Test Constants
 *
 * These constants provide deterministic values that tests can rely on
 * for assertions. All values correspond to real data from LODM 2024.
 */

// --- Event Constants ---
/** Known seed event ID for test assertions */
export const SEED_EVENT_ID = 'CZE2.2024062500';
export const SEED_EVENT_TITLE = 'Hry XI. letní olympiády dětí a mládeže 2024';
export const SEED_EVENT_LOCATION = 'České Budějovice';
export const SEED_EVENT_STATUS = 'finished';

// --- Count Constants ---
/** Expected entity counts */
export const SEED_CLASS_COUNT = 2;
export const SEED_PARTICIPANT_COUNT = 20;
export const SEED_K1M_PARTICIPANT_COUNT = 10;
export const SEED_K1W_PARTICIPANT_COUNT = 10;
export const SEED_RACE_COUNT = 2;
export const SEED_RESULT_COUNT = 20;
export const SEED_COURSE_COUNT = 1;

// --- Class Constants ---
export const SEED_CLASS_K1M_ID = 'K1M-ZS';
export const SEED_CLASS_K1W_ID = 'K1W-ZS';

// --- Race Constants ---
export const SEED_RACE_K1M_ID = 'K1M-ZS_BR1_25';
export const SEED_RACE_K1W_ID = 'K1W-ZS_BR1_25';

// --- Winner Constants (for result verification) ---
/** K1M-ZS winner: Adam REZEK - Rank 1, total time 74630 (74.63s) */
export const SEED_WINNER_K1M_ID = '23128.K1M.ZS';
export const SEED_WINNER_K1M_TIME = 74630;
export const SEED_WINNER_K1M_NAME = 'REZEK Adam';

/** K1W-ZS winner: Terezie FUCHSOVÁ - Rank 1, total time 76050 (76.05s) */
export const SEED_WINNER_K1W_ID = '108047.K1W.ZS';
export const SEED_WINNER_K1W_TIME = 76050;
export const SEED_WINNER_K1W_NAME = 'FUCHSOVÁ Terezie';

// --- Status Test Constants (for result status verification) ---
/** DNS example: Jan KUDĚJ - Did Not Start */
export const SEED_DNS_PARTICIPANT_ID = '60090.K1M.ZS';
export const SEED_DNS_PARTICIPANT_NAME = 'KUDĚJ Jan';

/** DNF example: Valerie SAMKOVÁ - Did Not Finish */
export const SEED_DNF_PARTICIPANT_ID = '61003.K1W.ZS';
export const SEED_DNF_PARTICIPANT_NAME = 'SAMKOVÁ Valerie';

/** DSQ example: Tobiáš KOVÁČ - Disqualified (missed gate) */
export const SEED_DSQ_PARTICIPANT_ID = '48024.K1M.ZS';
export const SEED_DSQ_PARTICIPANT_NAME = 'KOVÁČ Tobiáš';

// --- Result Status Type Counts (for coverage verification) ---
/** Expected result counts by status */
export const SEED_STATUS_OK_COUNT = 17; // null status = OK
export const SEED_STATUS_DNS_COUNT = 1;
export const SEED_STATUS_DNF_COUNT = 1;
export const SEED_STATUS_DSQ_COUNT = 1;

// --- Course Constants ---
export const SEED_COURSE_NR = 1;
export const SEED_COURSE_GATES = 24;
export const SEED_COURSE_CONFIG = 'NNRNSNNRNSRNNNSRNNNSRRNS';

// =============================================================================
// EVENT DATA
// =============================================================================

export const seedEvent: Insertable<EventsTable> = {
  event_id: SEED_EVENT_ID,
  main_title: 'Hry XI. letní olympiády dětí a mládeže 2024',
  sub_title: 'Vodní slalom a sjezd',
  location: 'České Budějovice',
  facility: 'Areál Lídy Polesné',
  start_date: '2024-06-25',
  end_date: '2024-06-27',
  discipline: 'Slalom',
  status: 'finished',
  api_key: 'seed-demo-key-not-for-production',
  has_xml_data: 1,
};

// =============================================================================
// CLASS DATA
// =============================================================================

export const seedClasses: SeedClass[] = [
  {
    class_id: 'K1M-ZS',
    name: 'K1M ZS',
    long_title: 'K1 Muži - Základní školy',
  },
  {
    class_id: 'K1W-ZS',
    name: 'K1W ZS',
    long_title: 'K1 Ženy - Základní školy',
  },
];

// =============================================================================
// COURSE DATA
// =============================================================================

export const seedCourse: SeedCourse = {
  course_nr: 1,
  nr_gates: 24,
  gate_config: 'NNRNSNNRNSRNNNSRNNNSRRNS',
};

// =============================================================================
// RACE DATA
// =============================================================================

export const seedRaces: SeedRace[] = [
  {
    race_id: 'K1M-ZS_BR1_25',
    class_ref: 'K1M-ZS',
    dis_id: 'BR1',
    race_order: 10,
    start_time: '2024-06-25T13:30:00+02:00',
    start_interval: '1:00',
    course_nr: 1,
    race_status: 11, // Final (official results)
  },
  {
    race_id: 'K1W-ZS_BR1_25',
    class_ref: 'K1W-ZS',
    dis_id: 'BR1',
    race_order: 12,
    start_time: '2024-06-25T14:23:00+02:00',
    start_interval: '1:00',
    course_nr: 1,
    race_status: 11, // Final (official results)
  },
];

// =============================================================================
// PARTICIPANT DATA - K1M-ZS (10 participants)
// =============================================================================

export const seedParticipantsK1M: SeedParticipant[] = [
  {
    participant_id: '23128.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 13,
    icf_id: '23128',
    family_name: 'REZEK',
    given_name: 'Adam',
    noc: 'JCK',
    club: 'SKVSČB',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '119238.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 17,
    icf_id: '119238',
    family_name: 'MALÝ',
    given_name: 'Tomáš',
    noc: 'OLK',
    club: 'Olomouc',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '9069.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 8,
    icf_id: '9069',
    family_name: 'KOLÁŘ',
    given_name: 'Lukáš',
    noc: 'PHA',
    club: 'USK Pha',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '11052.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 10,
    icf_id: '11052',
    family_name: 'FOLTÍN',
    given_name: 'Radim',
    noc: 'SCK',
    club: 'KK Brand',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '9164.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 21,
    icf_id: '9164',
    family_name: 'KRATOCHVÍL',
    given_name: 'Devi',
    noc: 'SCK',
    club: 'USK Pha',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '119252.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 6,
    icf_id: '119252',
    family_name: 'NOVOTNÝ',
    given_name: 'Pavel',
    noc: 'OLK',
    club: 'Olomouc',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '39001.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 9,
    icf_id: '39001',
    family_name: 'FRANZ',
    given_name: 'Tadeáš',
    noc: 'PLK',
    club: 'Loko Plz',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '121053.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 5,
    icf_id: '121053',
    family_name: 'HORÁK',
    given_name: 'Jakub',
    noc: 'MSK',
    club: 'KK Opava',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '48024.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 11,
    icf_id: '48024',
    family_name: 'KOVÁČ',
    given_name: 'Tobiáš',
    noc: 'USK',
    club: 'Klášter.',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    // Modified to DNS for testing
    participant_id: '60090.K1M.ZS',
    class_ref: 'K1M-ZS',
    event_bib: 12,
    icf_id: '60090',
    family_name: 'KUDĚJ',
    given_name: 'Jan',
    noc: 'KHK',
    club: 'Trutnov',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
];

// =============================================================================
// PARTICIPANT DATA - K1W-ZS (10 participants)
// =============================================================================

export const seedParticipantsK1W: SeedParticipant[] = [
  {
    participant_id: '108047.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 3,
    icf_id: '108047',
    family_name: 'FUCHSOVÁ',
    given_name: 'Terezie',
    noc: 'JMK',
    club: 'VSDK',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '23176.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 2,
    icf_id: '23176',
    family_name: 'HYBRANTOVÁ',
    given_name: 'Anna',
    noc: 'JCK',
    club: 'SKVSČB',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '119246.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 6,
    icf_id: '119246',
    family_name: 'KAŠPARŮ',
    given_name: 'Emma',
    noc: 'OLK',
    club: 'Olomouc',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '43028.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 4,
    icf_id: '43028',
    family_name: 'STÁRKOVÁ',
    given_name: 'Anna',
    noc: 'LBK',
    club: 'Č.Lípa',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '57158.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 7,
    icf_id: '57158',
    family_name: 'ČAPSKÁ',
    given_name: 'Valerie',
    noc: 'PAK',
    club: 'Pardub.',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '45023.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 1,
    icf_id: '45023',
    family_name: 'INDRUCHOVÁ',
    given_name: 'Daniela',
    noc: 'KHK',
    club: 'KVS HK',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '9109.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 8,
    icf_id: '9109',
    family_name: 'JUMROVÁ',
    given_name: 'Johana',
    noc: 'PHA',
    club: 'USK Pha',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '39040.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 9,
    icf_id: '39040',
    family_name: 'ŠTULCOVÁ',
    given_name: 'Valentýna',
    noc: 'PLK',
    club: 'Loko Plz',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    participant_id: '11079.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 10,
    icf_id: '11079',
    family_name: 'VACULOVÁ',
    given_name: 'Silvie',
    noc: 'SCK',
    club: 'KK Brand',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
  {
    // Modified to DNF for testing
    participant_id: '61003.K1W.ZS',
    class_ref: 'K1W-ZS',
    event_bib: 12,
    icf_id: '61003',
    family_name: 'SAMKOVÁ',
    given_name: 'Valerie',
    noc: 'KHK',
    club: 'Třebech.',
    cat_id: null,
    is_team: 0,
    member1: null,
    member2: null,
    member3: null,
  },
];

// =============================================================================
// RESULT DATA - K1M-ZS BR1 (10 results)
// =============================================================================

export const seedResultsK1M: SeedResult[] = [
  {
    participant_ref: '23128.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 13,
    bib: 13,
    start_time: '13:42:00',
    status: null, // OK
    dt_start: '13:42:02.710',
    dt_finish: '13:43:17.340',
    time: 74630, // 74.63s
    gates: '0000000000000000000',
    pen: 0,
    total: 74630,
    rnk: 1,
    rnk_order: 1,
    total_behind: '0.00',
  },
  {
    participant_ref: '119238.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 17,
    bib: 17,
    start_time: '13:46:00',
    status: null, // OK
    dt_start: '13:46:04.350',
    dt_finish: '13:47:17.830',
    time: 73480, // 73.48s
    gates: '0000000000000000020',
    pen: 200, // 2s penalty
    total: 75480,
    rnk: 2,
    rnk_order: 2,
    total_behind: '+0.85',
  },
  {
    participant_ref: '9069.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 8,
    bib: 8,
    start_time: '13:37:00',
    status: null, // OK
    dt_start: '13:36:59.460',
    dt_finish: '13:38:18.060',
    time: 78600, // 78.60s
    gates: '0000000000000000000',
    pen: 0,
    total: 78600,
    rnk: 3,
    rnk_order: 3,
    total_behind: '+3.97',
  },
  {
    participant_ref: '11052.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 10,
    bib: 10,
    start_time: '13:39:00',
    status: null, // OK
    dt_start: '13:39:00.310',
    dt_finish: '13:40:16.210',
    time: 75900, // 75.90s
    gates: '0200000000000200000',
    pen: 400, // 4s penalty
    total: 79900,
    rnk: 4,
    rnk_order: 4,
    total_behind: '+5.27',
  },
  {
    participant_ref: '9164.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 21,
    bib: 21,
    start_time: '13:50:00',
    status: null, // OK
    dt_start: '13:49:59.570',
    dt_finish: '13:51:20.480',
    time: 80910, // 80.91s
    gates: '0000000200000000000',
    pen: 200, // 2s penalty
    total: 82910,
    rnk: 5,
    rnk_order: 5,
    total_behind: '+8.28',
  },
  {
    participant_ref: '119252.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 6,
    bib: 6,
    start_time: '13:35:00',
    status: null, // OK
    dt_start: '13:35:03.830',
    dt_finish: '13:36:25.300',
    time: 81470, // 81.47s
    gates: '0200000000000000000',
    pen: 200, // 2s penalty
    total: 83470,
    rnk: 6,
    rnk_order: 6,
    total_behind: '+8.84',
  },
  {
    participant_ref: '39001.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 9,
    bib: 9,
    start_time: '13:38:00',
    status: null, // OK
    dt_start: '13:38:01.260',
    dt_finish: '13:39:24.900',
    time: 83640, // 83.64s
    gates: '0000000000000000000',
    pen: 0,
    total: 83640,
    rnk: 7,
    rnk_order: 7,
    total_behind: '+9.01',
  },
  {
    participant_ref: '121053.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 5,
    bib: 5,
    start_time: '13:34:00',
    status: null, // OK
    dt_start: '13:34:01.060',
    dt_finish: '13:35:29.850',
    time: 88790, // 88.79s
    gates: '0000000000000000000',
    pen: 0,
    total: 88790,
    rnk: 8,
    rnk_order: 8,
    total_behind: '+14.16',
  },
  {
    // DSQ example for testing (gate missed intentionally)
    participant_ref: '48024.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 11,
    bib: 11,
    start_time: '13:40:00',
    status: 'DSQ',
    dt_start: '13:40:01.380',
    dt_finish: '13:41:33.800',
    time: 92420, // 92.42s
    gates: '0000000020000005000', // gate 15 missed
    pen: 5200, // 50s + 2s penalty
    total: 97620,
    rnk: null, // DSQ = no rank
    rnk_order: 9,
    total_behind: null,
  },
  {
    // DNS example for testing
    participant_ref: '60090.K1M.ZS',
    race_ref: 'K1M-ZS_BR1_25',
    start_order: 12,
    bib: 12,
    start_time: '13:41:00',
    status: 'DNS',
    dt_start: null,
    dt_finish: null,
    time: null,
    gates: null,
    pen: null,
    total: null,
    rnk: null,
    rnk_order: 10,
    total_behind: null,
  },
];

// =============================================================================
// RESULT DATA - K1W-ZS BR1 (10 results)
// =============================================================================

export const seedResultsK1W: SeedResult[] = [
  {
    participant_ref: '108047.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 3,
    bib: 3,
    start_time: '14:25:00',
    status: null, // OK
    dt_start: '14:25:00.120',
    dt_finish: '14:26:16.170',
    time: 76050, // 76.05s
    gates: '0000000000000000000',
    pen: 0,
    total: 76050,
    rnk: 1,
    rnk_order: 1,
    total_behind: '0.00',
  },
  {
    participant_ref: '23176.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 2,
    bib: 2,
    start_time: '14:24:00',
    status: null, // OK
    dt_start: '14:24:00.710',
    dt_finish: '14:25:22.530',
    time: 81820, // 81.82s
    gates: '0000000000000000000',
    pen: 0,
    total: 81820,
    rnk: 2,
    rnk_order: 2,
    total_behind: '+5.77',
  },
  {
    participant_ref: '119246.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 6,
    bib: 6,
    start_time: '14:28:00',
    status: null, // OK
    dt_start: '14:28:00.890',
    dt_finish: '14:29:26.170',
    time: 85280, // 85.28s
    gates: '0000000000000000000',
    pen: 0,
    total: 85280,
    rnk: 3,
    rnk_order: 3,
    total_behind: '+9.23',
  },
  {
    participant_ref: '43028.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 4,
    bib: 4,
    start_time: '14:26:00',
    status: null, // OK
    dt_start: '14:26:00.340',
    dt_finish: '14:27:31.540',
    time: 91200, // 91.20s
    gates: '0200000000000000000',
    pen: 200, // 2s penalty
    total: 93200,
    rnk: 4,
    rnk_order: 4,
    total_behind: '+17.15',
  },
  {
    participant_ref: '57158.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 7,
    bib: 7,
    start_time: '14:29:00',
    status: null, // OK
    dt_start: '14:29:01.220',
    dt_finish: '14:30:34.980',
    time: 93760, // 93.76s
    gates: '0000000000000000000',
    pen: 0,
    total: 93760,
    rnk: 5,
    rnk_order: 5,
    total_behind: '+17.71',
  },
  {
    participant_ref: '45023.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 1,
    bib: 1,
    start_time: '14:23:00',
    status: null, // OK
    dt_start: '14:23:00.940',
    dt_finish: '14:24:36.130',
    time: 95190, // 95.19s
    gates: '0000000002000000000',
    pen: 200, // 2s penalty
    total: 97190,
    rnk: 6,
    rnk_order: 6,
    total_behind: '+21.14',
  },
  {
    participant_ref: '9109.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 8,
    bib: 8,
    start_time: '14:30:00',
    status: null, // OK
    dt_start: '14:30:00.580',
    dt_finish: '14:31:39.270',
    time: 98690, // 98.69s
    gates: '0000000000000000000',
    pen: 0,
    total: 98690,
    rnk: 7,
    rnk_order: 7,
    total_behind: '+22.64',
  },
  {
    participant_ref: '39040.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 9,
    bib: 9,
    start_time: '14:31:00',
    status: null, // OK
    dt_start: '14:31:01.110',
    dt_finish: '14:32:45.890',
    time: 104780, // 104.78s
    gates: '0200000020000000000',
    pen: 400, // 4s penalty
    total: 108780,
    rnk: 8,
    rnk_order: 8,
    total_behind: '+32.73',
  },
  {
    participant_ref: '11079.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 10,
    bib: 10,
    start_time: '14:32:00',
    status: null, // OK
    dt_start: '14:32:00.670',
    dt_finish: '14:33:52.410',
    time: 111740, // 111.74s
    gates: '0000000000200000000',
    pen: 200, // 2s penalty
    total: 113740,
    rnk: 9,
    rnk_order: 9,
    total_behind: '+37.69',
  },
  {
    // DNF example for testing
    participant_ref: '61003.K1W.ZS',
    race_ref: 'K1W-ZS_BR1_25',
    start_order: 12,
    bib: 12,
    start_time: '14:34:00',
    status: 'DNF',
    dt_start: '14:34:00.450',
    dt_finish: null,
    time: null,
    gates: null,
    pen: null,
    total: null,
    rnk: null,
    rnk_order: 10,
    total_behind: null,
  },
];
