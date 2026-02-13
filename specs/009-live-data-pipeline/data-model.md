# Data Model: Live Data Pipeline

**Feature**: 009-live-data-pipeline | **Date**: 2026-02-12

## No DB Schema Changes

This feature does not add new database tables or columns. All WebSocket state is managed in-memory:
- Connection tracking: `Map<eventId, Set<WebSocket>>` in WebSocketManager
- On-course data: Already in-memory via OnCourseStore (Feature #5)
- Merge logic: Already implemented in IngestService and ResultIngestService (Feature #5)

The feature adds WebSocket broadcast triggers to existing ingest flows and a new WebSocket endpoint.

## WebSocket Message Types

### Message Envelope

All WebSocket messages use a tagged union with `type` discriminator:

```typescript
// packages/shared/src/types/websocket.ts

type WsMessageType = 'full' | 'diff' | 'refresh';

interface WsMessageFull {
  type: 'full';
  data: WsFullPayload;
}

interface WsMessageDiff {
  type: 'diff';
  data: WsDiffPayload;
}

interface WsMessageRefresh {
  type: 'refresh';
}

type WsMessage = WsMessageFull | WsMessageDiff | WsMessageRefresh;
```

### Full State Payload

Sent on initial connection (FR-003) and after large changes like XML import (FR-005):

```typescript
interface WsFullPayload {
  event: PublicEventDetail;
  classes: PublicClass[];
  races: PublicRace[];
  categories: PublicAggregatedCategory[];
}
```

**Note**: Full state contains event structure only. The frontend fetches race-specific data (results, startlist, oncourse) via REST for the currently viewed race. This keeps the full state message manageable for multi-race events.

### Diff Payload

Sent for incremental updates (FR-004):

```typescript
interface WsDiffPayload {
  /** Updated results (upsert by bib + raceId) */
  results?: PublicResult[];
  /** Context: which race the results belong to */
  raceId?: string;
  /** Updated on-course entries (upsert by bib + raceId) */
  oncourse?: PublicOnCourseEntry[];
  /** Event state change */
  status?: PublicEventStatus;
}
```

**Diff semantics**: Each field is optional. Only changed data sections are included. Frontend applies diffs by upserting entities matching the composite key (bib + raceId for results/oncourse).

## WebSocket Manager (In-Memory State)

```typescript
// Tracks all active WebSocket connections grouped by event

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;     // Heartbeat tracking
  eventId: string;      // Which event this client is watching
}

class WebSocketManager {
  // Room tracking: eventId → Set of connected sockets
  private rooms: Map<string, Set<ExtWebSocket>>;

  // Configuration
  private maxConnectionsPerEvent: number;  // FR-012, default 200
  private heartbeatInterval: number;       // FR-017, default 30s
  private heartbeatTimeout: number;        // FR-017, default 10s
  private officialGracePeriod: number;     // FR-018, default 5s
}
```

## Integration Points

### Ingest Route → WebSocket Broadcast

| Ingest Endpoint | Trigger | Message Type | Diff Content |
|----------------|---------|--------------|--------------|
| `POST /ingest/xml` | XML import complete | `full` | N/A (full state) |
| `POST /ingest/results` | Result upserted | `diff` | `{ results, raceId }` |
| `POST /ingest/oncourse` | OnCourse updated | `diff` | `{ oncourse }` |
| `PATCH /admin/.../status` | State transition | `diff` | `{ status }` |
| `PATCH /admin/.../status` (→ official) | Official transition | `diff` + close | `{ status }` then disconnect |

### WebSocket Route

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/events/:eventId/ws` | None (public) | WebSocket upgrade, joins event room |

**Connection flow**:
1. Client connects to `/api/v1/events/:eventId/ws`
2. Server validates event exists and is not draft/official
3. Server checks connection limit (FR-012)
4. Server upgrades to WebSocket, adds to event room
5. Server sends `full` state message immediately (FR-003)
6. Server sends `diff` messages as data changes occur
7. On disconnect: remove from room, clean up

### Connection Rejection Rules

| Condition | Behavior |
|-----------|----------|
| Event not found | Reject with 404 before upgrade |
| Event in draft state | Reject with 404 (not publicly visible) |
| Event in official state | Reject with 410 Gone (no more updates) |
| Room at max capacity | Reject with 503 Service Unavailable |

## Merge Strategy Configuration

The merge strategy is already implemented in IngestService (Feature #5). This feature adds no new merge logic — it only broadcasts the results of existing merge operations via WebSocket.

The configurable strategy from FR-009 is documented in ARCHITECTURE.md and implemented as:
- **Default**: XML authoritative for structure, TCP authoritative for results
- **Configuration**: Via event config endpoint (existing)
- **Future**: Alternative strategies can be added without changing WebSocket logic
