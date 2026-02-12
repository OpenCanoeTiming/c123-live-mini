import type { Generated, ColumnType } from 'kysely';

export interface EventsTable {
  id: Generated<number>;
  event_id: string;
  main_title: string;
  sub_title: string | null;
  location: string | null;
  facility: string | null;
  start_date: string | null;
  end_date: string | null;
  discipline: string | null;
  status: string;
  api_key: string | null;
  config: string | null;
  has_xml_data: number;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  status_changed_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface ClassesTable {
  id: Generated<number>;
  event_id: number;
  class_id: string;
  name: string;
  long_title: string | null;
}

export interface CategoriesTable {
  id: Generated<number>;
  class_id: number;
  cat_id: string;
  name: string;
  first_year: number | null;
  last_year: number | null;
}

export interface ParticipantsTable {
  id: Generated<number>;
  event_id: number;
  participant_id: string;
  class_id: number | null;
  event_bib: number | null;
  /** Technology-transparent athlete identifier */
  athlete_id: string | null;
  family_name: string;
  given_name: string | null;
  noc: string | null;
  club: string | null;
  cat_id: string | null;
  is_team: number;
  member1: string | null;
  member2: string | null;
  member3: string | null;
}

export interface RacesTable {
  id: Generated<number>;
  event_id: number;
  race_id: string;
  class_id: number | null;
  /** Human-readable race type (e.g., best-run-1, qualification, final) */
  race_type: string | null;
  race_order: number | null;
  start_time: string | null;
  start_interval: string | null;
  course_nr: number | null;
  race_status: number;
}

export interface ResultsTable {
  id: Generated<number>;
  event_id: number;
  race_id: number;
  participant_id: number;
  start_order: number | null;
  bib: number | null;
  start_time: string | null;
  status: string | null;
  dt_start: string | null;
  dt_finish: string | null;
  time: number | null;
  gates: string | null;
  pen: number | null;
  total: number | null;
  rnk: number | null;
  rnk_order: number | null;
  cat_rnk: number | null;
  cat_rnk_order: number | null;
  total_behind: string | null;
  cat_total_behind: string | null;
  prev_time: number | null;
  prev_pen: number | null;
  prev_total: number | null;
  prev_rnk: number | null;
  total_total: number | null;
  better_run_nr: number | null;
  heat_nr: number | null;
  round_nr: number | null;
  qualified: string | null;
}

export interface CoursesTable {
  id: Generated<number>;
  event_id: number;
  course_nr: number;
  nr_gates: number | null;
  gate_config: string | null;
}

export interface IngestRecordsTable {
  id: Generated<number>;
  event_id: number;
  source_type: 'xml' | 'json_oncourse' | 'json_results' | 'config';
  status: 'success' | 'error';
  error_message: string | null;
  payload_size: number;
  items_processed: number;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface Database {
  events: EventsTable;
  classes: ClassesTable;
  categories: CategoriesTable;
  participants: ParticipantsTable;
  races: RacesTable;
  results: ResultsTable;
  courses: CoursesTable;
  ingest_records: IngestRecordsTable;
}
