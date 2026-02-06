# Tasks: Ingest API

**Input**: Design documents from `/specs/005-ingest-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/server/src/`, `packages/page/src/`
- Tests: `packages/server/tests/`

---

## Phase 1: Setup (Schema & Infrastructure)

**Purpose**: Database migrations and shared infrastructure for all user stories

- [x] T001 Create migration 008_add_event_config.ts in `packages/server/src/db/migrations/008_add_event_config.ts`
- [x] T002 Create migration 009_create_ingest_records.ts in `packages/server/src/db/migrations/009_create_ingest_records.ts`
- [x] T003 Update Database interface in `packages/server/src/db/schema.ts` with IngestRecordsTable and EventsTable extensions
- [x] T004 Run migrations and verify schema changes with `npm run migrate`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user story implementation

**⚠️ CRITICAL**: User story phases depend on these tasks

- [x] T005 Create IngestRecordRepository in `packages/server/src/db/repositories/IngestRecordRepository.ts`
- [x] T006 Add isApiKeyValid() function to `packages/server/src/utils/apiKey.ts`
- [x] T007 Update apiKeyAuth middleware to check validity window in `packages/server/src/middleware/apiKeyAuth.ts`
- [x] T008 [P] Create EventConfig type and validation schema in `packages/server/src/schemas/eventConfig.ts`
- [x] T009 [P] Create LiveResultInput type in `packages/server/src/types/ingest.ts`
- [x] T010 Add config and has_xml_data methods to EventRepository in `packages/server/src/db/repositories/EventRepository.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create Event and Obtain API Key (Priority: P1) 🎯 MVP

**Goal**: Timekeeper can create an event and receive an API key with proper validity window

**Independent Test**: POST /admin/events with event dates returns API key; subsequent requests within validity window succeed, outside fail with 401

### Implementation for User Story 1

- [ ] T011 [US1] Update admin routes to return validity info in response in `packages/server/src/routes/admin.ts`
- [ ] T012 [US1] Add ingest record logging for event creation in `packages/server/src/routes/admin.ts`
- [ ] T013 [US1] Verify API key rejection with clear expiration message (401 with reason)

**Checkpoint**: Event creation with API key validity is functional

---

## Phase 4: User Story 2 - Ingest XML Data (Priority: P1)

**Goal**: c123-server can send XML exports and system stores structured data

**Independent Test**: POST /ingest/xml with valid XML returns import counts; subsequent JSON/TCP ingestion is enabled (has_xml_data = 1)

### Implementation for User Story 2

- [ ] T014 [US2] Update IngestService to set has_xml_data flag after successful XML ingestion in `packages/server/src/services/IngestService.ts`
- [ ] T015 [US2] Add ingest record logging to XML endpoint in `packages/server/src/routes/ingest.ts`
- [ ] T016 [US2] Log payload size and items processed for XML ingestion

**Checkpoint**: XML ingestion sets has_xml_data flag and logs to ingest_records

---

## Phase 5: User Story 3 - Ingest Real-time TCP Stream Data (Priority: P1)

**Goal**: c123-server can send OnCourse and live results as JSON; data merges with XML-sourced structure

**Independent Test**: POST /ingest/oncourse and POST /ingest/results with valid JSON returns success (or ignored if no XML)

### Implementation for User Story 3

- [ ] T017 [P] [US3] Create ResultIngestService in `packages/server/src/services/ResultIngestService.ts`
- [ ] T018 [US3] Add POST /ingest/results endpoint in `packages/server/src/routes/ingest.ts`
- [ ] T019 [US3] Add has_xml_data check to OnCourse endpoint - return { ignored: true } if no XML in `packages/server/src/routes/ingest.ts`
- [ ] T020 [US3] Add has_xml_data check to Results endpoint - return { ignored: true } if no XML
- [ ] T021 [US3] Add ingest record logging to OnCourse and Results endpoints
- [ ] T022 [US3] Add request validation schema for /ingest/results in `packages/server/src/schemas/index.ts`

**Checkpoint**: Real-time data ingestion works with XML-first requirement enforced

---

## Phase 6: User Story 4 - Configure Event Settings (Priority: P2)

**Goal**: Timekeeper can update event configuration (active race, display mode, etc.)

**Independent Test**: PATCH /admin/events/:eventId/config updates settings; GET returns current config

### Implementation for User Story 4

- [ ] T023 [P] [US4] Create config routes file in `packages/server/src/routes/config.ts`
- [ ] T024 [US4] Implement GET /admin/events/:eventId/config endpoint
- [ ] T025 [US4] Implement PATCH /admin/events/:eventId/config endpoint
- [ ] T026 [US4] Register config routes in app.ts in `packages/server/src/app.ts`
- [ ] T027 [US4] Add ingest record logging for config updates

**Checkpoint**: Event configuration is fully functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T028 [P] Update OpenAPI documentation if needed in `specs/005-ingest-api/contracts/openapi.yaml`
- [ ] T029 Validate all endpoints per quickstart.md scenarios
- [ ] T030 Run full test suite and verify no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Phase 2 completion
  - US1, US2, US3 are P1 priority - implement in order
  - US4 is P2 priority - can be done after P1 stories
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 - Independent of US1
- **User Story 3 (P1)**: Depends on US2 (has_xml_data flag must exist)
- **User Story 4 (P2)**: Can start after Phase 2 - Independent of US1-3

### Within Each User Story

- Service before routes
- Core implementation before logging
- Validation before error handling

### Parallel Opportunities

- T008, T009 can run in parallel (different files)
- T017 can run in parallel with T018-T022 setup
- T023 can run in parallel with its setup
- T028 can run in parallel with T029, T030

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Sequential (dependencies):
T005 → T006 → T007

# Parallel (different files):
T008 (schemas/eventConfig.ts) || T009 (types/ingest.ts) || T010 (EventRepository)
```

---

## Implementation Strategy

### MVP First (User Stories 1-2)

1. Complete Phase 1: Setup (migrations)
2. Complete Phase 2: Foundational (repositories, auth, types)
3. Complete Phase 3: User Story 1 (event creation with validity)
4. Complete Phase 4: User Story 2 (XML ingestion with has_xml_data)
5. **STOP and VALIDATE**: Test event creation + XML ingestion flow

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test event creation → Checkpoint
3. Add US2 → Test XML ingestion → Checkpoint
4. Add US3 → Test real-time data → Checkpoint
5. Add US4 → Test configuration → Complete

### Single Developer Strategy

Since this is backend-only with dependencies:

1. Complete phases 1-4 (Setup + Foundational + US1 + US2)
2. Then complete phase 5 (US3 depends on US2's has_xml_data)
3. Then complete phase 6 (US4 is independent but lower priority)
4. Finish with phase 7 (Polish)

---

## Notes

- Existing infrastructure from Feature #4 already provides: event creation, XML ingestion, OnCourse ingestion, all repositories
- This feature EXTENDS existing code rather than creating new from scratch
- Focus on: validity window, configuration endpoint, results ingestion, logging, XML-first check
- All changes are additive - no breaking changes to existing API
- Commit after each task or logical group
