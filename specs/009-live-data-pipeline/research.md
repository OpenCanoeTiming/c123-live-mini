# Research: Live Data Pipeline

**Feature**: 009-live-data-pipeline | **Date**: 2026-02-12

## R1: WebSocket Library for Fastify

**Decision**: Use `@fastify/websocket` (official Fastify plugin wrapping `ws` library).

**Rationale**: Official Fastify ecosystem plugin providing thin wrapper over the battle-tested `ws` library. Integrates with Fastify's routing, hooks (preValidation, onRequest), and plugin encapsulation. Provides access to raw `ws.WebSocket` instances for full control over ping/pong, connection management, and broadcasting.

**Alternatives considered**:
- **Socket.IO**: Higher-level abstraction with rooms, namespaces, and fallbacks. Overkill for unidirectional server-to-client pushes. Adds client-side dependency and proprietary protocol overhead.
- **Raw ws library**: Would work but loses Fastify route integration, hook lifecycle, and parameter parsing from route paths.
- **Server-Sent Events (SSE)**: Simpler protocol but lacks binary frame support and standard ping/pong. WebSocket is already specified in ARCHITECTURE.md.

## R2: Connection Management Pattern (Per-Event Rooms)

**Decision**: `Map<eventId, Set<WebSocket>>` room pattern managed by a `WebSocketManager` service singleton.

**Rationale**: The spec requires per-event broadcasting (FR-013). A simple Map of Sets provides O(1) room lookup and O(n) broadcast where n = clients per event. No external dependency needed. The manager tracks connection count per event for FR-012 (max connections) and provides clean broadcast API for ingest routes.

**Alternatives considered**:
- **Socket.IO rooms**: Built-in room management but brings unnecessary Socket.IO dependency.
- **Per-connection metadata tracking**: Store eventId on each socket and iterate all sockets for broadcast — O(total connections) instead of O(event connections). Wasteful.

## R3: WebSocket Message Format

**Decision**: JSON messages with `type` discriminator field and optional `data` payload, using the same data structures as the Client API.

```typescript
type WsMessage =
  | { type: 'full'; data: FullStatePayload }
  | { type: 'diff'; data: DiffPayload }
  | { type: 'refresh' };
```

**Rationale**: Tagged union enables TypeScript exhaustive checking on both server and client. The `data` field reuses existing public API types (PublicResult, PublicOnCourseEntry, etc.) so the frontend needs no separate data model for WebSocket messages. The `refresh` type has no data — it's a signal to re-fetch via REST.

**Alternatives considered**:
- **JSON-RPC**: Adds request/response semantics unnecessary for unidirectional push.
- **Protocol Buffers**: Binary efficiency gained is minimal for the small payloads in this system (single results, on-course updates).
- **JSON Patch (RFC 6902)**: Complex path-based operations require the client to maintain a full state tree and apply patches — more error-prone than entity upsert.

## R4: Diff Content Strategy

**Decision**: Diffs contain changed entities grouped by data type (`results`, `oncourse`, `status`). Frontend upserts by entity ID.

```typescript
interface DiffPayload {
  results?: PublicResult[];      // Changed/new results for a race
  oncourse?: PublicOnCourseEntry[]; // Updated on-course entries
  status?: PublicEventStatus;    // Event state change
  raceId?: string;               // Context: which race the results belong to
}
```

**Rationale**: Sending complete entity objects (not partial field updates) keeps the frontend logic simple — just replace the object matching the ID. This satisfies SC-003 (80% smaller than full state) since a single result object is ~200 bytes vs a full state of 5-50KB. The `raceId` field provides context for result diffs.

**Alternatives considered**:
- **Partial field updates**: Smaller payload but requires complex merge logic on the frontend and risks inconsistent state if a field update is missed.
- **Full section replacement**: Sending the complete results array for any change defeats the purpose of diffs.

## R5: Heartbeat/Keepalive Strategy

**Decision**: Server-initiated ping/pong with 30-second interval and 10-second timeout. Uses `ws` library's built-in ping/pong frame support.

**Rationale**: 30s interval balances between detecting stale connections quickly and minimizing overhead. The `ws` library handles pong responses automatically on the protocol level — we just need to track `isAlive` flag per connection. This is the canonical pattern from ws documentation.

**Alternatives considered**:
- **Application-level heartbeat**: Custom JSON ping/pong messages — adds complexity vs native WebSocket frames and requires client implementation.
- **TCP keepalive only**: OS-level keepalive intervals are typically 2+ hours, far too slow for our 200-connection limit and 8-hour reliability goal.

## R6: Broadcast Trigger Integration

**Decision**: Ingest routes call `WebSocketManager.broadcast()` after successful data processing. No pub/sub or event emitter middleware.

**Rationale**: Direct function call is the simplest approach for a single-instance server. The ingest routes already know the eventId and the type of data that changed. Adding an event emitter layer between ingest and broadcast adds indirection without benefit at this scale.

**Flow**:
1. Ingest route processes data → DB updated
2. Ingest route calls `wsManager.broadcastDiff(eventId, diffPayload)` or `wsManager.broadcastFull(eventId)`
3. WebSocketManager serializes and sends to all connections in the event room

**Alternatives considered**:
- **EventEmitter pattern**: Decouples ingest from WebSocket but adds indirection. Useful if multiple consumers needed, but we only have one (WebSocket broadcast).
- **Database triggers**: SQLite doesn't support async notification well, and Kysely doesn't expose change hooks.
- **Polling-based change detection**: Client polls for changes — defeats the purpose of WebSocket.

## R7: Full State Payload Composition

**Decision**: Reuse existing Client API service logic to compose the full state payload. The full state message contains the same data a client would get by calling all REST endpoints for that event.

```typescript
interface FullStatePayload {
  event: PublicEventDetail;
  classes: PublicClass[];
  races: PublicRace[];
  categories: PublicAggregatedCategory[];
  // Results and oncourse are fetched per-race by the frontend
  // Full state just signals the frontend to re-fetch everything
}
```

**Rationale**: On closer analysis, sending all results for all races in a single full state message would be very large for multi-race events. Instead, the `full` message sends event structure (metadata, classes, races, categories) and the frontend re-fetches race-specific data (results, startlist, oncourse) via REST for the currently viewed race. This keeps the full state message manageable and reuses existing REST endpoints.

**Alternatives considered**:
- **Include all results in full state**: Could be 100KB+ for large events with many races. Wasteful when user is viewing only one race.
- **Lazy loading with full state containing only changed race**: Requires tracking which races changed — essentially becomes a diff again.

## R8: Official State Connection Closure

**Decision**: When event transitions to "official", broadcast the state change diff, wait 5 seconds, then close all connections for that event with WebSocket close code 1000 (Normal Closure) and reason "Event results are official".

**Rationale**: 5-second grace period ensures all clients receive and process the final diff before disconnection. Using standard close code 1000 tells the client this is intentional, not an error. The frontend can display "Results are official" and not attempt reconnection.

**Alternatives considered**:
- **Immediate close**: Risk of client not receiving the final state update.
- **Keep connections open**: Wastes server resources for events that will never receive updates again.
- **Close code 1001 (Going Away)**: Could trigger automatic reconnection in some client libraries.
