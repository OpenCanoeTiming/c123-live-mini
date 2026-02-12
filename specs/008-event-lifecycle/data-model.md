# Data Model: Event Lifecycle

**Feature**: 008-event-lifecycle | **Date**: 2026-02-12

## DB Schema Changes (Migration 010)

### events table — add `status_changed_at` column

```sql
ALTER TABLE events ADD COLUMN status_changed_at TEXT;
-- Backfill existing events with created_at
UPDATE events SET status_changed_at = created_at;
```

**Purpose**: Records when the last state transition occurred (FR-006). Updated atomically with each status change.

## State Machine Definition

### States

| State | Description | Public Visibility | Data Ingestion |
|-------|-------------|-------------------|----------------|
| `draft` | Event created, configuration in progress | Hidden | XML + config only |
| `startlist` | Startlist published, ready to begin | Visible | XML only |
| `running` | Live timing active | Visible | All types (XML, results, on-course) |
| `finished` | Race complete, unofficial results | Visible | XML + results corrections |
| `official` | Final confirmed results (terminal) | Visible | None |

### Valid Transitions

```text
draft ──────► startlist ──────► running ──────► finished ──────► official
                │                  ▲                │
                │                  │                │
                ▼                  └────────────────┘
              draft           (correction: finished → running)
        (unpublish startlist)
```

| From | To | Direction | Use Case |
|------|----|-----------|----------|
| draft | startlist | Forward | Publish startlist |
| startlist | running | Forward | Start timing |
| running | finished | Forward | Race complete |
| finished | official | Forward | Confirm results |
| finished | running | Backward (correction) | Premature finish |
| startlist | draft | Backward (correction) | Retract startlist |

### Ingestion Rules by State

| State | XML | Config | OnCourse | Results |
|-------|-----|--------|----------|---------|
| draft | ✅ | ✅ | ❌ | ❌ |
| startlist | ✅ | ❌ | ❌ | ❌ |
| running | ✅ | ❌ | ✅ | ✅ |
| finished | ✅ | ❌ | ❌ | ✅ |
| official | ❌ | ❌ | ❌ | ❌ |

## Shared Types Changes

### EventStatus (existing — no change)

```typescript
// packages/shared/src/types/event.ts — already defined
export type EventStatus = 'draft' | 'startlist' | 'running' | 'finished' | 'official';
```

### New: State Transition Types

```typescript
// packages/shared/src/types/event.ts — additions

/** Map of valid transitions: current state → allowed next states */
export const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['startlist'],
  startlist: ['running', 'draft'],
  running: ['finished'],
  finished: ['official', 'running'],
  official: [],
};

/** Map of allowed ingest source types per event state */
export const ALLOWED_INGEST: Record<EventStatus, string[]> = {
  draft: ['xml', 'config'],
  startlist: ['xml'],
  running: ['xml', 'json_oncourse', 'json_results'],
  finished: ['xml', 'json_results'],
  official: [],
};
```

### AuthenticatedRequest Extension

```typescript
// packages/server/src/middleware/apiKeyAuth.ts — extend event info
export interface AuthenticatedRequest extends FastifyRequest {
  event?: {
    id: number;
    eventId: string;
    hasXmlData: boolean;
    status: string;  // ← NEW: event status for state-dependent checks
  };
}
```

## EventsTable Schema Update

```typescript
// packages/server/src/db/schema.ts — addition
export interface EventsTable {
  // ... existing fields ...
  status_changed_at: ColumnType<string, string | undefined, string | undefined>; // ← NEW
}
```
