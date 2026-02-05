# Data Model: Technical PoC

**Feature**: 003-technical-poc
**Date**: 2026-02-05

## Overview

Minimal data model for PoC validation. Intentionally simple to verify the database layer works correctly.

## Entities

### Event

Represents a timing event (race/competition).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier |
| name | TEXT | NOT NULL | Event name |
| status | TEXT | NOT NULL, DEFAULT 'draft' | Event status |
| created_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |

**Status Values**: `draft`, `active`, `finished`

### MockResult

Represents a single timing result for testing purposes.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier |
| event_id | INTEGER | NOT NULL, FOREIGN KEY → Event(id) | Parent event |
| athlete_name | TEXT | NOT NULL | Athlete display name |
| time_ms | INTEGER | NULL | Time in milliseconds (null = DNS/DNF) |
| penalty_seconds | INTEGER | NOT NULL, DEFAULT 0 | Penalty time in seconds |
| created_at | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp |

## Relationships

```
Event (1) ──────< (N) MockResult
```

- One Event has many MockResults
- Deleting an Event cascades to delete its MockResults

## TypeScript Types

```typescript
// Database schema types (Kysely)
interface Database {
  events: EventTable;
  mock_results: MockResultTable;
}

interface EventTable {
  id: Generated<number>;
  name: string;
  status: 'draft' | 'active' | 'finished';
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

interface MockResultTable {
  id: Generated<number>;
  event_id: number;
  athlete_name: string;
  time_ms: number | null;
  penalty_seconds: Generated<number>;
  created_at: Generated<string>;
}

// API response types
interface Event {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'finished';
  createdAt: string;
  updatedAt: string;
}

interface MockResult {
  id: number;
  eventId: number;
  athleteName: string;
  timeMs: number | null;
  penaltySeconds: number;
  createdAt: string;
}
```

## Migration

### 001_initial_schema.ts

```typescript
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('events')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createTable('mock_results')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) =>
      col.notNull().references('events.id').onDelete('cascade'))
    .addColumn('athlete_name', 'text', (col) => col.notNull())
    .addColumn('time_ms', 'integer')
    .addColumn('penalty_seconds', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('mock_results').execute();
  await db.schema.dropTable('events').execute();
}
```

## Validation Rules

### Event
- `name`: Non-empty string, max 200 characters
- `status`: Must be one of: draft, active, finished

### MockResult
- `athlete_name`: Non-empty string, max 100 characters
- `time_ms`: Positive integer or null
- `penalty_seconds`: Non-negative integer
- `event_id`: Must reference existing Event
