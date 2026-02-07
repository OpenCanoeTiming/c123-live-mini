# Tasks: Client API

**Input**: Design documents from `/specs/006-client-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml

**Organization**: Tasks are grouped by user story. Phase 2 (Data Layer Abstraction) is a foundational prerequisite that extends ingest from #005.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Shared infrastructure — types, utilities, schemas

- [x] T001 Create race type mapping utility with dis_id → human-readable label mapping per research.md R1 in `packages/server/src/utils/raceTypes.ts`
- [x] T002 [P] Create public API response type definitions (PublicEvent, PublicRace, PublicResult, PublicGate, PublicParticipant, PublicOnCourseEntry, PublicAggregatedCategory) per data-model.md in `packages/shared/src/types/publicApi.ts`
- [x] T003 [P] Create gate transformation utility — function to merge positional penalty array + gate_config string into PublicGate[] objects per research.md R2 in `packages/server/src/utils/gateTransform.ts`

**Checkpoint**: Shared utilities ready for ingest and route changes

---

## Phase 2: Data Layer Abstraction (Extends #005)

**Purpose**: DB schema migration + ingest transformation so database stores technology-agnostic data

**⚠️ CRITICAL**: All user story work depends on this phase. This extends the ingest layer from Feature #5.

- [x] T004 Create Kysely migration 010 — add `race_type` TEXT column to races table, add `athlete_id` TEXT column to participants table, per data-model.md schema changes in `packages/server/src/db/migrations/010_data_abstraction.ts`
- [x] T005 Write backfill logic in migration 010 — populate `race_type` from `dis_id` using R1 mapping, copy `icf_id` to `athlete_id`, transform existing `results.gates` from positional arrays to self-describing objects using course.gate_config
- [x] T006 Update DB schema types — add `race_type` to RacesTable, add `athlete_id` to ParticipantsTable in `packages/server/src/db/schema.ts`
- [x] T007 Update shared types — add `raceType` to Race interface in `packages/shared/src/types/race.ts`, add `athleteId` to Participant interface in `packages/shared/src/types/participant.ts`
- [x] T008 Update RaceRepository — include `race_type` in all query results and upsert methods in `packages/server/src/db/repositories/RaceRepository.ts` (uses selectAll which includes new column)
- [x] T009 [P] Update ParticipantRepository — include `athlete_id` in all query results and upsert methods in `packages/server/src/db/repositories/ParticipantRepository.ts` (uses selectAll which includes new column)
- [x] T010 Update IngestService (XML) — map dis_id → race_type when upserting races, write athlete_id when upserting participants, transform gates + gate_config → self-describing PublicGate[] format before storing results in `packages/server/src/services/IngestService.ts`
- [x] T011 Update ResultIngestService (TCP) — transform incoming gate data to self-describing format using stored course config before upserting results in `packages/server/src/services/ResultIngestService.ts`
- [x] T012 Update OnCourseStore — gate transformation handled at read time (oncourse route) rather than store time for simplicity
- [x] T013 Update seed data — use race_type values, athlete_id field, and self-describing gate format in `packages/server/src/db/seed.ts`

**Checkpoint**: Database stores abstracted data. Ingest transforms C123 → agnostic format. Run seed + verify DB contents.

---

## Phase 3: User Story 1 — Browse Public Events (Priority: P1) 🎯 MVP

**Goal**: Spectators can see a list of active events with clean, ID-free responses

**Independent Test**: `curl /api/v1/events` returns only non-draft events with no internal IDs, ordered by start date

### Implementation

- [x] T014 [US1] Update events list route — strip internal `id`, `api_key`, `config`, `has_xml_data`, `created_at` from response; ensure only non-draft events returned; use consistent envelope `{ events: [...] }` in `packages/server/src/routes/events.ts`
- [x] T015 [US1] Verify draft filtering — ensure `findPublic()` correctly excludes draft events and orders by start_date desc in `packages/server/src/routes/events.ts`

**Checkpoint**: Events list endpoint returns clean public data, no draft events, no internal IDs

---

## Phase 4: User Story 2 — View Event Details and Race Schedule (Priority: P1)

**Goal**: Spectators can view full event structure with classes, categories, races (with human-readable race types)

**Independent Test**: `curl /api/v1/events/:eventId` returns event metadata + classes with categories + races with `raceType` labels, no internal IDs. 404 for draft/non-existent events.

### Implementation

- [x] T016 [US2] Update event detail route — strip internal IDs from event, classes, categories, and races; include `raceType` from DB (not dis_id); return 404 for draft events; add facility field; use envelope `{ event, classes, races }` in `packages/server/src/routes/events.ts`
- [x] T017 [US2] Ensure race responses include raceType field — map race_type column to response, exclude dis_id, start_interval, course_nr from public response in `packages/server/src/routes/events.ts`

**Checkpoint**: Event detail returns complete structure with human-readable race types

---

## Phase 5: User Story 3 — View Race Results (Priority: P1)

**Goal**: Spectators can view results ranked by time, filter by category, view detailed gate penalties with timestamps, view both BR runs

**Independent Test**: `curl /api/v1/events/:eventId/results/:raceId` returns ranked results with athleteId. `?detailed=true` adds self-describing gates + timestamps. `?catId=ZS` filters by category. `?includeAllRuns=true` shows both BR runs.

### Implementation

- [x] T018 [US3] Update results route standard mode — strip internal IDs, use athleteId from DB, exclude participant_id; format name from family_name + given_name; include catRnk and catTotalBehind in `packages/server/src/routes/results.ts`
- [x] T019 [US3] Update results route detailed mode — when `?detailed=true`, include dtStart, dtFinish, gates (already self-describing from DB), courseGateCount (lookup from courses table) in `packages/server/src/routes/results.ts`
- [x] T020 [US3] Verify category filtering — ensure `?catId` param uses `filterByCatId` with correct category-specific rankings (catRnk, catTotalBehind) in `packages/server/src/routes/results.ts`
- [x] T021 [US3] Verify multi-run mode — ensure `?includeAllRuns=true` correctly pairs BR1/BR2 via `getLinkedBrResults`, includes betterRunNr, totalTotal, prev* fields in `packages/server/src/routes/results.ts`
- [x] T022 [US3] Handle edge cases — DNS/DNF/DSQ at end of results, empty results for unstarted races, 404 for non-existent race, 404 if parent event is draft in `packages/server/src/routes/results.ts`

**Checkpoint**: Results endpoint fully functional with all modes (standard, detailed, category filter, multi-run)

---

## Phase 6: User Story 4 — View Race Startlist (Priority: P2)

**Goal**: Spectators can view who starts in a race, sorted by start order

**Independent Test**: `curl /api/v1/events/:eventId/startlist/:raceId` returns participants in start order with athleteId, no internal IDs

### Implementation

- [x] T023 [US4] Update startlist route — strip internal IDs, use athleteId from DB, format name, include catId, startTime; 404 for non-existent race or draft event in `packages/server/src/routes/startlist.ts`

**Checkpoint**: Startlist returns clean participant data in start order

---

## Phase 7: User Story 5 — View Athletes On Course (Priority: P2)

**Goal**: Spectators can see live on-course data with self-describing gate objects

**Independent Test**: `curl /api/v1/events/:eventId/oncourse` returns active athletes with self-describing gate objects (pre-transformed in OnCourseStore)

### Implementation

- [x] T024 [US5] Update oncourse route — strip participantId (C123 internal), serve pre-transformed gate data from OnCourseStore, ensure empty array when no active athletes or no XML data in `packages/server/src/routes/oncourse.ts`

**Checkpoint**: OnCourse endpoint serves self-describing gate data

---

## Phase 8: User Story 6 — View Event Categories (Priority: P2)

**Goal**: Spectators can see available age categories for filtering

**Independent Test**: `curl /api/v1/events/:eventId/categories` returns aggregated categories with classIds arrays

### Implementation

- [x] T025 [US6] Update categories route — strip internal IDs, ensure aggregated categories include classIds array, 404 for draft/non-existent event in `packages/server/src/routes/categories.ts`

**Checkpoint**: Categories endpoint returns aggregated data for frontend filter

---

## Phase 9: User Story 7 — API Documentation (Priority: P3)

**Goal**: Developers can reference complete API documentation

**Independent Test**: Documentation covers all 6 public endpoints with request/response examples

### Implementation

- [ ] T026 [US7] Write Client API documentation with all endpoints, parameters, response formats, and examples per contracts/openapi.yaml in `docs/api/client-api.md`
- [ ] T027 [P] [US7] Verify OpenAPI spec in `specs/006-client-api/contracts/openapi.yaml` matches actual implemented endpoints — update if needed

**Checkpoint**: API documentation complete and accurate

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Validation, consistency, cleanup

- [ ] T028 Verify no internal IDs leak — scan all public route responses for `id` (integer), `participant_id`, `icf_id`, `dis_id` fields that should not be exposed
- [ ] T029 [P] Verify consistent error format — ensure all 404 responses follow `{ error: "NotFound", message: "..." }` pattern across all routes
- [ ] T030 [P] Update quickstart.md with final curl examples matching actual response shapes in `specs/006-client-api/quickstart.md`
- [ ] T031 Run full validation — seed database, start server, execute all quickstart.md curl commands, verify responses match expected shapes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Data Layer)**: Depends on Phase 1 (uses raceTypes.ts, gateTransform.ts)
- **Phases 3-8 (User Stories)**: All depend on Phase 2 completion
- **Phase 9 (Documentation)**: Depends on Phases 3-8 (documents what's implemented)
- **Phase 10 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Browse Events)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (Event Details)**: Can start after Phase 2 — independent of US1
- **US3 (Race Results)**: Can start after Phase 2 — most complex story, independent
- **US4 (Startlist)**: Can start after Phase 2 — independent
- **US5 (OnCourse)**: Can start after Phase 2 — independent
- **US6 (Categories)**: Can start after Phase 2 — independent
- **US7 (Documentation)**: Depends on US1-US6 completion

### Within Each User Story

- Route handler updates are atomic per endpoint
- Each story modifies different route files (no conflicts between US1-US6)

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (Phase 1)
- T008, T009 can run in parallel (different repositories)
- US1 through US6 can run in parallel after Phase 2 (different route files)
- T028, T029, T030 can run in parallel (Phase 10)

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Data Layer Abstraction (T004-T013) — **critical path**
3. Complete Phase 3: US1 Browse Events (T014-T015)
4. Complete Phase 4: US2 Event Details (T016-T017)
5. Complete Phase 5: US3 Race Results (T018-T022)
6. **STOP and VALIDATE**: Core read API functional with clean data

### Incremental Delivery

7. Add US4 Startlist (T023)
8. Add US5 OnCourse (T024)
9. Add US6 Categories (T025)
10. Add US7 Documentation (T026-T027)
11. Polish (T028-T031)

---

## Notes

- Phase 2 is the heaviest phase — DB migration, ingest changes, seed data. This is the critical path.
- US1-US6 modify different route files — zero conflict risk in parallel execution.
- All route changes are primarily about stripping internal fields and using already-abstracted DB data.
- `dis_id` is kept in DB for internal BR1/BR2 pairing logic — only `race_type` is exposed publicly.
- `icf_id` is kept temporarily for backward compatibility — `athlete_id` is the public field.
