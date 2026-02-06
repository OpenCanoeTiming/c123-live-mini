/**
 * Live result entry from TCP stream (JSON format)
 */
export interface LiveResultInput {
  raceId: string;
  participantId: string;
  bib: number;
  time?: number;
  pen?: number;
  total?: number;
  status?: string;
  rnk?: number;
  gates?: Array<{
    gate: number;
    time?: number;
    pen?: number;
  }>;
}

/**
 * Ingest record input for logging
 */
export interface IngestRecordInput {
  eventId: number;
  sourceType: 'xml' | 'json_oncourse' | 'json_results' | 'config';
  status: 'success' | 'error';
  errorMessage?: string;
  payloadSize: number;
  itemsProcessed: number;
}

/**
 * Result of results ingestion
 */
export interface ResultsIngestResult {
  updated: number;
  ignored: boolean;
}

/**
 * Result of OnCourse ingestion
 */
export interface OnCourseIngestResult {
  active: number;
  ignored: boolean;
}
