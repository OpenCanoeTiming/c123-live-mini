# Research: Ingest API

**Feature**: 005-ingest-api
**Date**: 2026-02-06

## Research Summary

This feature extends existing Ingest API infrastructure. Most technical decisions are already established from Feature #4 (Database Layer). This document focuses on new decisions required.

## Decision Log

### 1. API Key Validity Calculation

**Decision**: Calculate validity window from event dates stored in database

**Rationale**:
- Event `start_date` and `end_date` already stored in events table
- Key valid from: `start_date - 10 days`
- Key valid until: `end_date + 5 days`
- If dates are NULL, key is always valid (draft events)

**Implementation**:
- Add `isApiKeyValid(event)` function to `utils/apiKey.ts`
- Check validity in `apiKeyAuth.ts` middleware
- Return 401 with clear expiration message if expired

**Alternatives considered**:
- Store explicit `valid_from`/`valid_until` in events table → Rejected (redundant, dates already exist)
- Store validity period in separate api_keys table → Rejected (over-engineering for current scope)

---

### 2. Event Configuration Storage

**Decision**: Store configuration as JSON column in events table

**Rationale**:
- Configuration is event-specific and varies by event
- JSON provides flexibility for different settings
- SQLite supports JSON1 extension for querying if needed
- Simpler than separate configuration tables

**Configuration schema**:
```typescript
interface EventConfig {
  activeRaceId?: string;     // Currently active race for display
  displayMode?: 'simple' | 'detailed';
  showOnCourse?: boolean;
  // Future settings can be added without schema changes
}
```

**Implementation**:
- Add `config` column (TEXT/JSON) to events table via migration
- Add PATCH `/api/v1/admin/events/:eventId/config` endpoint
- Update EventRepository with config methods

**Alternatives considered**:
- Separate event_config table → Rejected (1:1 relationship, unnecessary join)
- Store each setting as separate column → Rejected (inflexible, requires migrations for new settings)

---

### 3. Live Results JSON Format

**Decision**: Use same structure as XML results, submitted as JSON array

**Rationale**:
- Consistency with existing XML result structure
- c123-server already parses TCP stream into structured data
- Reuse existing ResultRepository upsert logic

**JSON payload**:
```typescript
interface LiveResultInput {
  raceId: string;
  participantId: string;
  bib: number;
  time?: number;
  pen?: number;
  total?: number;
  status?: string;
  rnk?: number;
  gates?: GateTime[];
}
```

**Implementation**:
- Add POST `/api/v1/ingest/results` endpoint
- Reuse ResultRepository.upsert() with lookup by race/participant IDs
- Check hasXmlData before processing (FR-012)

**Alternatives considered**:
- Different format from XML results → Rejected (unnecessary complexity)
- Full result object required → Rejected (TCP provides incremental updates only)

---

### 4. Ingest Record Logging

**Decision**: Create `ingest_records` table with structured logging

**Rationale**:
- FR-011 requires logging all API requests for debugging/audit
- Structured table enables querying and reporting
- More useful than plain text logs for debugging ingestion issues

**Schema**:
```typescript
interface IngestRecordsTable {
  id: Generated<number>;
  event_id: number;
  source_type: 'xml' | 'json_oncourse' | 'json_results';
  status: 'success' | 'error';
  error_message: string | null;
  payload_size: number;
  items_processed: number;
  created_at: string;
}
```

**Implementation**:
- Add migration 008_create_ingest_records.ts
- Add IngestRecordRepository
- Log before/after each ingest operation in routes

**Alternatives considered**:
- File-based logging only → Rejected (hard to query, doesn't satisfy FR-011 intent)
- Log to external service → Rejected (over-engineering, adds dependency)

---

### 5. XML-First Data Requirement (FR-012)

**Decision**: Add `has_xml_data` flag to events table

**Rationale**:
- Need to track whether event has received initial XML
- JSON/TCP data ignored until XML provides structural foundation
- Simple boolean flag is sufficient

**Implementation**:
- Add `has_xml_data` column (INTEGER 0/1) to events table
- Set to 1 after first successful XML ingestion
- Check flag in oncourse and results ingest endpoints
- Return 200 OK with `{ ignored: true }` if no XML data (silent ignore per spec)

**Alternatives considered**:
- Check if any classes/participants exist → Rejected (less explicit, edge cases)
- Reject with error → Rejected (spec says "silently ignore")

---

## Technology Confirmation

All existing technology choices remain valid:

| Layer | Technology | Status |
|-------|------------|--------|
| API Framework | Fastify | ✅ Confirmed |
| Database | SQLite + Kysely | ✅ Confirmed |
| Validation | Zod + Fastify schemas | ✅ Confirmed |
| Logging | Pino (via Fastify) | ✅ Confirmed |
| Testing | Vitest | ✅ Confirmed |

## Dependencies

- Feature #4 (Database Layer): ✅ Completed and merged
- c123-protocol-docs: Reference for XML/JSON formats
- c123-server: Will be updated to use new endpoints (separate project)

## Open Questions

None - all clarifications resolved in spec phase.
