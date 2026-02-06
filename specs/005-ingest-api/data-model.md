# Data Model: Ingest API

**Feature**: 005-ingest-api
**Date**: 2026-02-06

## Schema Changes

This feature extends the existing database schema from Feature #4.

### Modified Tables

#### events (extension)

Add columns to existing `events` table:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `config` | TEXT | Yes | NULL | JSON configuration object |
| `has_xml_data` | INTEGER | No | 0 | Flag: 1 if XML has been ingested |

```sql
-- Migration 008_add_event_config.ts
ALTER TABLE events ADD COLUMN config TEXT;
ALTER TABLE events ADD COLUMN has_xml_data INTEGER NOT NULL DEFAULT 0;
```

### New Tables

#### ingest_records

Audit log for all ingestion operations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | Auto | Primary key |
| `event_id` | INTEGER | No | - | FK to events.id |
| `source_type` | TEXT | No | - | 'xml', 'json_oncourse', 'json_results' |
| `status` | TEXT | No | - | 'success', 'error' |
| `error_message` | TEXT | Yes | NULL | Error details if failed |
| `payload_size` | INTEGER | No | 0 | Request payload size in bytes |
| `items_processed` | INTEGER | No | 0 | Number of items processed |
| `created_at` | TEXT | No | - | ISO 8601 timestamp |

```sql
-- Migration 009_create_ingest_records.ts
CREATE TABLE ingest_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('xml', 'json_oncourse', 'json_results')),
  status TEXT NOT NULL CHECK(status IN ('success', 'error')),
  error_message TEXT,
  payload_size INTEGER NOT NULL DEFAULT 0,
  items_processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ingest_records_event_id ON ingest_records(event_id);
CREATE INDEX idx_ingest_records_created_at ON ingest_records(created_at);
```

## TypeScript Interfaces

### Schema Updates

```typescript
// db/schema.ts additions

export interface EventsTable {
  // ... existing fields ...
  config: string | null;        // JSON string
  has_xml_data: number;         // 0 or 1
}

export interface IngestRecordsTable {
  id: Generated<number>;
  event_id: number;
  source_type: 'xml' | 'json_oncourse' | 'json_results';
  status: 'success' | 'error';
  error_message: string | null;
  payload_size: number;
  items_processed: number;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface Database {
  // ... existing tables ...
  ingest_records: IngestRecordsTable;
}
```

### Domain Types

```typescript
// types/event.ts

export interface EventConfig {
  activeRaceId?: string;
  displayMode?: 'simple' | 'detailed';
  showOnCourse?: boolean;
}

export type EventStatus = 'draft' | 'startlist' | 'running' | 'finished' | 'official';
```

```typescript
// types/ingest.ts

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

export interface IngestRecordInput {
  eventId: number;
  sourceType: 'xml' | 'json_oncourse' | 'json_results';
  status: 'success' | 'error';
  errorMessage?: string;
  payloadSize: number;
  itemsProcessed: number;
}
```

## Entity Relationships

```
┌─────────────────┐
│     events      │
├─────────────────┤
│ id (PK)         │
│ event_id        │
│ api_key         │
│ config          │◄── JSON blob
│ has_xml_data    │
│ start_date      │◄── Used for key validity
│ end_date        │◄── Used for key validity
│ ...             │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│ ingest_records  │
├─────────────────┤
│ id (PK)         │
│ event_id (FK)   │
│ source_type     │
│ status          │
│ error_message   │
│ payload_size    │
│ items_processed │
│ created_at      │
└─────────────────┘
```

## Validation Rules

### API Key Validity

```typescript
function isApiKeyValid(event: EventsTable): { valid: boolean; reason?: string } {
  const now = new Date();

  // If no dates set, key is always valid (draft event)
  if (!event.start_date && !event.end_date) {
    return { valid: true };
  }

  // Calculate validity window
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;

  // Valid from: 10 days before start
  if (startDate) {
    const validFrom = new Date(startDate);
    validFrom.setDate(validFrom.getDate() - 10);
    if (now < validFrom) {
      return { valid: false, reason: `Key not yet valid. Valid from ${validFrom.toISOString()}` };
    }
  }

  // Valid until: 5 days after end
  if (endDate) {
    const validUntil = new Date(endDate);
    validUntil.setDate(validUntil.getDate() + 5);
    if (now > validUntil) {
      return { valid: false, reason: `Key expired on ${validUntil.toISOString()}` };
    }
  }

  return { valid: true };
}
```

### Event Configuration

```typescript
const eventConfigSchema = z.object({
  activeRaceId: z.string().optional(),
  displayMode: z.enum(['simple', 'detailed']).optional(),
  showOnCourse: z.boolean().optional(),
}).strict();
```

## State Transitions

### Event has_xml_data

```
┌───────────────────┐     First XML     ┌───────────────────┐
│  has_xml_data = 0 │ ─────────────────► │  has_xml_data = 1 │
│  (no structure)   │     ingestion      │  (ready for TCP)  │
└───────────────────┘                    └───────────────────┘
         │                                        │
         │ JSON/TCP data                          │ JSON/TCP data
         ▼                                        ▼
    Silently ignored                         Processed normally
```

## Migration Sequence

1. `008_add_event_config.ts` - Add config and has_xml_data to events
2. `009_create_ingest_records.ts` - Create ingest_records table

Both migrations are backwards-compatible (additive only).
