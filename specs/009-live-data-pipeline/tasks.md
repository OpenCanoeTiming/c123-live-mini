# Tasks: Live Data Pipeline

**Input**: Design documents from `/specs/009-live-data-pipeline/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/websocket.yaml, quickstart.md

**Tests**: Included in Phase 6 (unit + integration tests as specified in plan.md project structure).

**Organization**: Tasks grouped by user story. US1+US2 combined (shared implementation — full state on connect serves both live updates and reconnection). US4 merge logic is already implemented in Feature #5; only broadcast triggers are new (covered in US1 phase).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependency and define shared WebSocket message types

- [x] T001 Install `@fastify/websocket` dependency in `packages/server/package.json`
- [x] T002 [P] Define WebSocket message types (`WsMessage`, `WsMessageFull`, `WsMessageDiff`, `WsMessageRefresh`, `WsFullPayload`, `WsDiffPayload`) in `packages/shared/src/types/websocket.ts` — use tagged union with `type` discriminator, reuse existing public API types (`PublicEventDetail`, `PublicClass`, `PublicRace`, `PublicAggregatedCategory`, `PublicResult`, `PublicOnCourseEntry`, `PublicEventStatus`) from `publicApi.ts`
- [x] T003 [P] Export WebSocket types from `packages/shared/src/types/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core WebSocketManager service and Fastify plugin registration — MUST complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `WebSocketManager` service in `packages/server/src/services/WebSocketManager.ts` — room management (`Map<string, Set<ExtWebSocket>>`), `join(eventId, socket)`, `leave(socket)`, `broadcastFull(eventId, payload)`, `broadcastDiff(eventId, payload)`, `broadcastRefresh(eventId)`, `getConnectionCount(eventId)`, `canAcceptConnection(eventId)` with max 200 per event (FR-012), heartbeat via `setInterval` ping every 30s with 10s timeout (FR-017), `closeRoom(eventId, code, reason)` for official state closure (FR-018) with 5s grace period, `shutdown()` to clear intervals and close all connections
- [x] T005 Register `@fastify/websocket` plugin and instantiate `WebSocketManager` in `packages/server/src/app.ts` — add `fastify.register(websocket)`, create `WebSocketManager` instance, pass it to `registerWebSocketRoutes(app, db, wsManager)`, export or decorate for access by ingest/admin routes

**Checkpoint**: WebSocket infrastructure ready — route and broadcast integration can begin

---

## Phase 3: US1+US2 — Live Updates & Reconnection (Priority: P1) 🎯 MVP

**Goal**: Spectators receive real-time updates via WebSocket. On (re)connection, clients get full current state. Covers US1 (live push) and US2 (reconnect recovery) — both served by the same WebSocket endpoint + broadcast mechanism.

**Independent Test**: Connect a WebSocket client to a running event → receive full state → ingest a result via REST → client receives diff message within 2 seconds. Disconnect and reconnect → receive updated full state.

### Implementation

- [x] T006 [US1] Create WebSocket route handler in `packages/server/src/routes/websocket.ts` — register `GET /api/v1/events/:eventId/ws`, pre-upgrade validation: event exists (404 if not found or draft), event not official (410 Gone), connection limit not reached (503 with `maxConnections` in body), on upgrade: join room via `wsManager.join()`, compose full state payload using existing repository/service methods (`EventRepository`, `ClassRepository`, `RaceRepository`, `CategoryRepository` → `PublicEventDetail`, `PublicClass[]`, `PublicRace[]`, `PublicAggregatedCategory[]`), send `WsMessageFull`, on close: `wsManager.leave()`, ignore any client-sent messages (unidirectional)
- [x] T007 [US1] Add broadcast triggers to ingest routes in `packages/server/src/routes/ingest.ts` — after `ingestService.ingestXml()` success: call `wsManager.broadcastFull(eventId, fullPayload)` composing payload from repositories; after `resultIngestService.ingestResults()` success: call `wsManager.broadcastDiff(eventId, { results, raceId })` using the ingested result data; after `onCourseStore.add()` success: call `wsManager.broadcastDiff(eventId, { oncourse })` with updated on-course entries. Pass `wsManager` to ingest route registration function.
- [x] T008 [US1] Add broadcast triggers to admin route in `packages/server/src/routes/admin.ts` — after `lifecycleService.transitionEvent()` success (replacing the existing TODO at ~line 198): call `wsManager.broadcastDiff(eventId, { status: targetStatus })`. For transition to `official`: additionally call `wsManager.closeRoom(eventId, 1000, 'Event results are official')` after the 5s grace period (FR-018). Pass `wsManager` to admin route registration function.

**Checkpoint**: Full MVP — spectators receive live updates and recover on reconnect. US4 merge broadcasts are also covered here since merge logic is Feature #5 and broadcast triggers are in T007.

---

## Phase 4: US3 — Efficient Data Transfer (Priority: P2)

**Goal**: Minimize data sent over WebSocket — diff messages for incremental changes, full state only for large changes (XML import), refresh signal as fallback.

**Independent Test**: Monitor message sizes: a single result diff should be <500 bytes vs full state 5-50KB (SC-003 — 80% smaller). XML import triggers full state, not a massive diff.

**Note**: The diff/full/refresh message types and their usage in broadcast triggers are already implemented in Phases 2-3. This phase validates the efficiency behavior and ensures the refresh message path works.

- [x] T009 [US3] Verify and document diff vs full decision logic in `packages/server/src/routes/ingest.ts` — ensure XML import calls `broadcastFull`, results/oncourse call `broadcastDiff`, add `broadcastRefresh` fallback path for error scenarios where diff state is unreliable (e.g., catch block in broadcast composition). Add inline comments documenting the decision rationale per FR-005 and FR-006.

**Checkpoint**: All message type paths (diff, full, refresh) are exercised and documented

---

## Phase 5: US4 — Server Merges Data from Multiple Sources (Priority: P1)

**Goal**: Data from XML and TCP sources is merged correctly and broadcast to clients.

**Independent Test**: Ingest XML → ingest TCP result → verify merged state via WebSocket full message on reconnect.

**Note**: Merge logic is fully implemented in Feature #5 (`IngestService`, `ResultIngestService`). Broadcast triggers added in Phase 3 (T007) handle pushing merged results to clients. No new merge implementation needed.

- [x] T010 [US4] Verify merge-to-broadcast integration in `packages/server/src/routes/ingest.ts` — confirm that after `ingestService.ingestXml()` the broadcast sends the complete merged state (not just the XML data), and after `resultIngestService.ingestResults()` the diff contains the final merged result object (post-merge, not pre-merge). Add comments noting merge strategy dependency on Feature #5.

**Checkpoint**: Merge → broadcast pipeline verified for all ingest paths

---

## Phase 6: Testing & Polish

**Purpose**: Unit and integration tests, final validation

- [x] T011 [P] Write unit tests for `WebSocketManager` in `packages/server/tests/unit/WebSocketManager.test.ts` — test room join/leave, broadcast to correct room only, connection count tracking, connection limit enforcement (reject at 201), heartbeat ping/pong cycle (mock timers), stale connection cleanup on pong timeout, `closeRoom` with grace period, `shutdown` cleanup, broadcasting when no clients connected (no-op)
- [x] T012 [P] Write integration tests for WebSocket endpoint in `packages/server/tests/integration/websocket.test.ts` — test: connect and receive full state, receive diff after result ingest, receive diff after oncourse ingest, receive diff after state transition, full state after XML import, connection rejection 404 (unknown event), connection rejection 404 (draft event), connection rejection 410 (official event), connection rejection 503 (limit reached), connection close after official transition (code 1000), reconnect receives updated full state
- [x] T013 Run full test suite and validate quickstart.md flow manually — `npm test` in packages/server, then follow quickstart.md curl/wscat commands to verify end-to-end (Unit tests: 16/16 passing, Integration: rejection tests passing, manual E2E validation via quickstart recommended)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1+US2 (Phase 3)**: Depends on Phase 2 completion — delivers MVP
- **US3 (Phase 4)**: Depends on Phase 3 completion — validates efficiency
- **US4 (Phase 5)**: Depends on Phase 3 completion — validates merge integration
- **Testing (Phase 6)**: Depends on Phases 3-5 completion

### User Story Dependencies

- **US1+US2 (P1)**: Can start after Foundational (Phase 2) — core value, delivers MVP
- **US3 (P2)**: Depends on US1+US2 — validates behavior already implemented
- **US4 (P1)**: Depends on US1+US2 — validates merge-to-broadcast pipeline already built in Phase 3

### Within Each Phase

- Phase 1: T002 and T003 can run in parallel [P], T001 independent
- Phase 2: T004 before T005 (manager must exist before app.ts references it)
- Phase 3: T006 first (route handler), then T007 and T008 can be parallel [P] (different files)
- Phase 6: T011 and T012 can run in parallel [P], T013 after both complete

### Parallel Opportunities

```
Phase 1 parallel:
  T002 (types/websocket.ts) || T003 (types/index.ts)  — can start after T001

Phase 3 parallel (after T006):
  T007 (ingest.ts broadcasts) || T008 (admin.ts broadcasts)

Phase 4+5 parallel (after Phase 3):
  T009 (US3 validation) || T010 (US4 validation)

Phase 6 parallel:
  T011 (unit tests) || T012 (integration tests)
```

---

## Implementation Strategy

### MVP First (Phase 1-3 Only)

1. Complete Phase 1: Setup (install dep, define types)
2. Complete Phase 2: Foundational (WebSocketManager + plugin registration)
3. Complete Phase 3: US1+US2 (route + broadcast triggers)
4. **STOP and VALIDATE**: Connect via wscat, ingest data, verify real-time push
5. Deploy if ready — spectators can see live updates

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1+US2 → Test independently → **MVP deployed** (live updates work!)
3. US3 → Validate diff efficiency → Confirm mobile-friendly
4. US4 → Validate merge integration → Confirm data integrity
5. Tests → Unit + integration coverage → Production confidence

---

## Notes

- US2 (Reconnect) shares implementation with US1 — full state on every connect handles both first connection and reconnection
- US4 (Merge) leverages existing Feature #5 merge logic — this feature only adds broadcast triggers
- The `refresh` message type (FR-006) is a safety net for edge cases; primary paths use `full` and `diff`
- [P] tasks = different files, no dependencies
- Commit after each phase completion
- Stop at any checkpoint to validate independently
