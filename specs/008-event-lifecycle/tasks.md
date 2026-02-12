# Tasks: Event Lifecycle

**Input**: Design documents from `/specs/008-event-lifecycle/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/, research.md, quickstart.md

**Tests**: Tests included — state machine logic requires comprehensive validation to meet SC-002 (100% invalid transitions rejected).

**Organization**: Tasks grouped by user story. US1 and US2 are combined (both P1, same implementation — state machine + endpoint).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema changes, shared types, and migration

- [X] T001 Add `status_changed_at` column to EventsTable interface in `packages/server/src/db/schema.ts`
- [X] T002 Create migration `packages/server/src/db/migrations/012_add_status_changed_at.ts` — ALTER TABLE events ADD COLUMN status_changed_at TEXT, backfill with created_at
- [X] T003 [P] Add `VALID_TRANSITIONS` and `ALLOWED_INGEST` constants to `packages/shared/src/types/event.ts` per data-model.md
- [X] T004 [P] Add `updateStatusSchema` to `packages/server/src/schemas/index.ts` — JSON schema for PATCH status request body (status field, enum of 5 states)

**Checkpoint**: Schema updated, shared constants available, migration ready ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state machine service and repository method that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Add `updateStatusWithTimestamp(id: number, status: string, statusChangedAt: string): Promise<boolean>` method to `packages/server/src/db/repositories/EventRepository.ts`
- [X] T006 Extend `AuthenticatedRequest.event` with `status: string` field in `packages/server/src/middleware/apiKeyAuth.ts` — add `status: event.status` to the resolved event object
- [X] T007 Create `packages/server/src/services/EventLifecycleService.ts` — state machine service with methods: `validateTransition(currentStatus, targetStatus)` returning `{valid, error?}`, and `transitionEvent(eventId, targetStatus, db)` orchestrating validation + persistence + timestamp. Import `VALID_TRANSITIONS` from shared types.

**Checkpoint**: Foundation ready — state machine validates transitions, repository persists them, middleware exposes status ✅

---

## Phase 3: User Story 1+2 - Advance Event Through Lifecycle + Enforce Valid Transitions (Priority: P1) 🎯 MVP

**Goal**: Timekeeper can transition events through all 5 lifecycle states via admin API. Invalid transitions are rejected with descriptive errors including current state, requested state, and valid transitions list.

**Independent Test**: Create event, transition draft→startlist→running→finished→official (all succeed). Attempt draft→running, official→draft, running→running (all rejected with error details).

### Tests for User Story 1+2

- [X] T008 [P] [US1] Unit tests for state machine validation in `packages/server/tests/unit/EventLifecycleService.test.ts` — test all 25 state combinations (5×5), verify 6 valid transitions pass, 19 invalid transitions fail with correct error details, same-state transitions rejected (FR-011)
- [X] T009 [P] [US2] Integration tests for admin status endpoint in `packages/server/tests/integration/admin-status.test.ts` — test PATCH /api/v1/admin/events/:eventId/status: full lifecycle happy path, invalid transitions return 400 with error body per contract, non-existent event returns 404, missing API key returns 401, backward corrections (finished→running, startlist→draft)

### Implementation for User Story 1+2

- [X] T010 [US1] Add PATCH `/api/v1/admin/events/:eventId/status` endpoint to `packages/server/src/routes/admin.ts` — authenticate via API key, resolve event by eventId, call EventLifecycleService.transitionEvent(), return `{eventId, previousStatus, status, statusChangedAt}` on success, return 400 with `{error, message, currentStatus, requestedStatus, validTransitions}` on invalid transition per contracts/admin-status.yaml
- [X] T011 [US1] Register admin status route in server app setup (likely `packages/server/src/app.ts` or equivalent) — ensure PATCH route is registered alongside existing admin routes (already registered)

**Checkpoint**: MVP complete — events can be transitioned through full lifecycle, invalid transitions rejected. Verify with quickstart.md curl examples. ✅

---

## Phase 4: User Story 3 - Public Visibility Based on State (Priority: P2)

**Goal**: Public API already excludes draft events (existing behavior). This phase verifies existing behavior is correct and ensures status field is included in all public responses (FR-008).

**Independent Test**: Create events in each of the 5 states. GET /api/v1/events returns only non-draft events. Each returned event includes status field matching its current state.

### Implementation for User Story 3

- [X] T012 [US3] Verify and document that existing public routes in `packages/server/src/routes/events.ts` correctly exclude draft events and include status field — ✅ Verified: `findPublic()` filters draft events, status field included in responses (lines 58, 70, 121)
- [X] T013 [US3] Verify all other public routes (`packages/server/src/routes/results.ts`, `startlist.ts`, `oncourse.ts`, `categories.ts`) return 404 for draft events — ✅ Verified: All 5 routes have `event.status === 'draft'` checks

**Checkpoint**: Public visibility behavior confirmed correct across all public endpoints ✅

---

## Phase 5: User Story 4 - State-Dependent Data Ingestion (Priority: P2)

**Goal**: Ingest routes enforce state-dependent rules — each data type is only accepted in allowed states per FR-009. Official events reject all ingestion.

**Independent Test**: Create event, transition to each state, attempt all 3 ingest types (XML, oncourse, results) at each state. Verify only allowed combinations succeed per ingestion rules table in data-model.md.

### Tests for User Story 4

- [X] T014 [P] [US4] Integration tests for ingestion state guards in `packages/server/tests/integration/ingest-state-guards.test.ts` — test all 5 states × 3 ingest types (15 combinations), verify allowed ones return 200, blocked ones return 403 with message indicating state restriction. Test config ingest in draft (allowed) and non-draft (blocked).

### Implementation for User Story 4

- [X] T015 [US4] Add state-dependent ingestion guard to `packages/server/src/routes/ingest.ts` — at the top of each ingest handler (xml, oncourse, results), check `authRequest.event.status` against `ALLOWED_INGEST` map from shared types. If source type not in allowed list for current state, return 403 `{error: "Forbidden", message: "Data type '{sourceType}' not accepted in '{status}' state"}`. Apply same guard to config endpoint in `packages/server/src/routes/config.ts`.

**Checkpoint**: All ingestion routes respect state rules. Official events are fully frozen. ✅

---

## Phase 6: WebSocket Notification

**Purpose**: Notify connected spectators when event state changes (FR-012)

- [X] T016 After successful state transition in `packages/server/src/routes/admin.ts`, add TODO comment for WebSocket notification. WebSocket infrastructure not yet implemented. Comment specifies the expected interface: emit `diff` message with `{type: "diff", data: {status: newStatus}}` to all clients connected to the event.

**Checkpoint**: TODO comment added for future WebSocket integration ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, validation, cleanup

- [X] T017 [P] Validate quickstart.md scenarios end-to-end — ✅ All 82 tests passing (35 unit + 26 integration + 21 existing)
- [X] T018 [P] Ensure migration 012 runs correctly on fresh database and on existing database with events — ✅ Migration 012 applied successfully, adds status_changed_at column with backfill

**Checkpoint**: Feature complete and validated ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema + types must exist) — BLOCKS all user stories
- **US1+US2 (Phase 3)**: Depends on Phase 2 — MVP delivery
- **US3 (Phase 4)**: Depends on Phase 2 only — can run in parallel with Phase 3
- **US4 (Phase 5)**: Depends on Phase 2 (needs status in middleware) — can run in parallel with Phase 3
- **WS Notification (Phase 6)**: Depends on Phase 3 (needs working endpoint)
- **Polish (Phase 7)**: Depends on all previous phases

### User Story Dependencies

- **US1+US2 (P1)**: Can start after Phase 2 — core MVP, no dependencies on other stories
- **US3 (P2)**: Can start after Phase 2 — independent of US1/US2 (verifies existing behavior)
- **US4 (P2)**: Can start after Phase 2 — independent of US1/US2 (adds guards to existing routes)

### Within Each User Story

- Tests written and failing before implementation
- Service/model changes before route changes
- Core implementation before integration

### Parallel Opportunities

- T003 + T004 can run in parallel (different files)
- T008 + T009 can run in parallel (different test files)
- Phase 4 (US3) + Phase 5 (US4) can run in parallel after Phase 2
- T017 + T018 can run in parallel

---

## Parallel Example: Phase 1

```bash
# After T001+T002 (sequential - schema then migration):
Task: "T003 - Add VALID_TRANSITIONS and ALLOWED_INGEST to packages/shared/src/types/event.ts"
Task: "T004 - Add updateStatusSchema to packages/server/src/schemas/index.ts"
```

## Parallel Example: After Phase 2

```bash
# US1+US2 tests can run in parallel:
Task: "T008 - Unit tests for EventLifecycleService"
Task: "T009 - Integration tests for admin status endpoint"

# US3 and US4 can run in parallel (independent stories):
Task: "Phase 4 (US3) - Verify public visibility"
Task: "Phase 5 (US4) - Add ingestion state guards"
```

---

## Implementation Strategy

### MVP First (US1+US2 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007)
3. Complete Phase 3: US1+US2 (T008-T011)
4. **STOP and VALIDATE**: Run quickstart.md curl examples
5. Deploy/demo if ready — events can now progress through lifecycle

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1+US2 → Test independently → **MVP!** (events have lifecycle)
3. US3 → Verify public visibility → Deploy
4. US4 → Add ingestion guards → Deploy (full state enforcement)
5. WS Notification → Real-time state updates → Deploy
6. Polish → Validate end-to-end → Feature complete

---

## Notes

- US1 and US2 are combined because they share identical implementation (state machine service + admin endpoint)
- US3 is mostly verification — existing code already hides draft events (Feature #6)
- The WebSocket notification (Phase 6) is separated because WS infrastructure may not exist yet
- Total: 18 tasks across 7 phases
- [P] tasks = different files, no dependencies
