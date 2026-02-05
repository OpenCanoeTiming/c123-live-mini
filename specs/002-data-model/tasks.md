# Tasks: Protocol Analysis & Data Model

**Input**: Design documents from `/specs/002-data-model/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Not explicitly requested in spec - tests omitted per template guidelines.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story mapping (US1, US2, US3, US4)
- Paths based on monorepo structure: `packages/server/`, `packages/shared/`, `packages/client/`

---

## Phase 1: Setup

**Purpose**: Database infrastructure and shared types foundation

- [x] T001 Install Kysely and better-sqlite3 dependencies in packages/server/package.json
- [x] T002 Create database connection module in packages/server/src/db/database.ts
- [x] T003 [P] Create Kysely Database type interface in packages/server/src/db/schema.ts
- [x] T004 [P] Setup migrations directory structure in packages/server/src/db/migrations/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema and shared types that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Migrations

- [x] T005 Create migration 001_create_events.ts in packages/server/src/db/migrations/
- [x] T006 Create migration 002_create_classes.ts (classes + categories tables) in packages/server/src/db/migrations/
- [x] T007 Create migration 003_create_participants.ts in packages/server/src/db/migrations/
- [x] T008 Create migration 004_create_races.ts in packages/server/src/db/migrations/
- [x] T009 Create migration 005_create_results.ts in packages/server/src/db/migrations/
- [x] T010 Create migration 006_create_courses.ts in packages/server/src/db/migrations/
- [x] T011 Create migration 007_create_indexes.ts in packages/server/src/db/migrations/

### Shared Types

- [x] T012 [P] Create Event type in packages/shared/src/types/event.ts
- [x] T013 [P] Create Class and Category types in packages/shared/src/types/class.ts
- [x] T014 [P] Create Participant type in packages/shared/src/types/participant.ts
- [x] T015 [P] Create Race type in packages/shared/src/types/race.ts
- [x] T016 [P] Create Result type in packages/shared/src/types/result.ts
- [x] T017 [P] Create Course type in packages/shared/src/types/course.ts
- [x] T018 Export all types from packages/shared/src/types/index.ts

### Base Repositories

- [x] T019 Create BaseRepository abstract class in packages/server/src/db/repositories/BaseRepository.ts
- [x] T020 [P] Create EventRepository in packages/server/src/db/repositories/EventRepository.ts
- [x] T021 [P] Create ClassRepository in packages/server/src/db/repositories/ClassRepository.ts
- [x] T022 [P] Create ParticipantRepository in packages/server/src/db/repositories/ParticipantRepository.ts

### Migration Runner

- [x] T023 Create migration runner script in packages/server/src/db/migrate.ts
- [x] T024 Add "migrate" script to packages/server/package.json
- [x] T025 Run migrations and verify schema with sample query

**Checkpoint**: Foundation ready - database schema complete, base types and repositories available

---

## Phase 3: User Story 1 - Live Results Page Data Display (Priority: P1) 🎯 MVP

**Goal**: Spectators can view current standings, competitor info, and race details from ingested XML data

**Independent Test**: Load sample XML file (captures/2024-LODM-fin.xml), query results via API, verify all fields present

### Repositories for US1

- [x] T026 [P] [US1] Create RaceRepository in packages/server/src/db/repositories/RaceRepository.ts
- [x] T027 [P] [US1] Create ResultRepository in packages/server/src/db/repositories/ResultRepository.ts
- [x] T028 [P] [US1] Create CourseRepository in packages/server/src/db/repositories/CourseRepository.ts

### XML Parser

- [x] T029 [US1] Create XML parser types in packages/server/src/services/xml/types.ts
- [x] T030 [US1] Implement XML parser for Events section in packages/server/src/services/xml/parseEvents.ts
- [x] T031 [P] [US1] Implement XML parser for Classes section in packages/server/src/services/xml/parseClasses.ts
- [x] T032 [P] [US1] Implement XML parser for Participants section in packages/server/src/services/xml/parseParticipants.ts
- [x] T033 [P] [US1] Implement XML parser for Schedule section in packages/server/src/services/xml/parseSchedule.ts
- [x] T034 [P] [US1] Implement XML parser for Results section in packages/server/src/services/xml/parseResults.ts
- [x] T035 [P] [US1] Implement XML parser for CourseData section in packages/server/src/services/xml/parseCourseData.ts
- [x] T036 [US1] Create main XML parser orchestrator in packages/server/src/services/xml/index.ts

### Ingest Service

- [x] T037 [US1] Create IngestService for XML import in packages/server/src/services/IngestService.ts
- [x] T038 [US1] Implement upsert logic for all entities in IngestService

### API Routes for US1

- [x] T039 [US1] Create GET /api/v1/events route in packages/server/src/routes/events.ts
- [x] T040 [US1] Create GET /api/v1/events/:eventId route in packages/server/src/routes/events.ts
- [x] T041 [US1] Create GET /api/v1/events/:eventId/results/:raceId route in packages/server/src/routes/results.ts
- [x] T042 [US1] Create GET /api/v1/events/:eventId/startlist/:raceId route in packages/server/src/routes/startlist.ts
- [x] T043 [US1] Create POST /api/v1/ingest/xml route in packages/server/src/routes/ingest.ts

### Admin API for US1

- [x] T044 [US1] Create POST /api/v1/admin/events route (create event with API key) in packages/server/src/routes/admin.ts
- [x] T045 [US1] Create API key generation utility in packages/server/src/utils/apiKey.ts
- [x] T046 [US1] Create API key auth middleware in packages/server/src/middleware/apiKeyAuth.ts

### Integration

- [x] T047 [US1] Register all routes in Fastify app in packages/server/src/app.ts
- [x] T048 [US1] Verify end-to-end: load sample XML, query results via REST API

**Checkpoint**: US1 complete - full results display from XML data working

---

## Phase 4: User Story 2 - OnCourse Real-time Tracking (Priority: P2)

**Goal**: Spectators see competitors currently on water with live gate progress

**Independent Test**: POST OnCourse data via ingest endpoint, GET /oncourse returns current competitors

### OnCourse Types

- [x] T049 [P] [US2] Create OnCourseEntry interface in packages/shared/src/types/oncourse.ts
- [x] T050 [US2] Export OnCourseEntry from packages/shared/src/types/index.ts

### OnCourse Service (In-Memory)

- [x] T051 [US2] Create OnCourseStore (Map-based) in packages/server/src/services/OnCourseStore.ts
- [x] T052 [US2] Implement add/update/remove/getAll methods in OnCourseStore
- [x] T053 [US2] Implement auto-cleanup for finished competitors (based on dtFinish)

### API Routes for US2

- [x] T054 [US2] Create GET /api/v1/events/:eventId/oncourse route in packages/server/src/routes/oncourse.ts
- [x] T055 [US2] Create POST /api/v1/ingest/oncourse route in packages/server/src/routes/ingest.ts
- [x] T056 [US2] Register oncourse routes in app.ts

### Integration

- [x] T057 [US2] Verify end-to-end: POST oncourse data, GET returns active competitors

**Checkpoint**: US2 complete - real-time OnCourse tracking working

---

## Phase 5: User Story 3 - Multi-Run Race Support (Priority: P2)

**Goal**: BR1/BR2 races display both runs with better run indicated

**Independent Test**: Load BR1 and BR2 results for same competitor, verify TotalTotal and BetterRunNr correctly computed

### Multi-Run Query Methods

- [x] T058 [US3] Add getResultsWithBestRun method to ResultRepository in packages/server/src/db/repositories/ResultRepository.ts
- [x] T059 [US3] Add getBothRunsForParticipant method to ResultRepository
- [x] T060 [US3] Implement BR1/BR2 linking logic by ClassId pattern

### API Enhancement for US3

- [x] T061 [US3] Add includeAllRuns query param to GET /results/:raceId in packages/server/src/routes/results.ts
- [x] T062 [US3] Return betterRunNr and totalTotal in results response

### Integration

- [x] T063 [US3] Verify with sample data: BR1 85.50s, BR2 82.30s returns betterRunNr=2

**Checkpoint**: US3 complete - multi-run results with best run identification working

---

## Phase 6: User Story 4 - Age Category Filtering (Priority: P3)

**Goal**: Users filter results by age category and see category-specific rankings

**Independent Test**: Query results with catId filter, verify only matching competitors returned with CatRnk

### Category Query Methods

- [x] T064 [US4] Add getCategoriesForEvent method to ClassRepository in packages/server/src/db/repositories/ClassRepository.ts
- [x] T065 [US4] Add filterByCatId method to ResultRepository in packages/server/src/db/repositories/ResultRepository.ts
- [x] T066 [US4] Ensure CatRnk is properly returned when filtering

### API Enhancement for US4

- [x] T067 [US4] Add catId query param handling to GET /results/:raceId in packages/server/src/routes/results.ts
- [x] T068 [US4] Add GET /api/v1/events/:eventId/categories endpoint in packages/server/src/routes/categories.ts
- [x] T069 [US4] Register categories route in app.ts

### Integration

- [x] T070 [US4] Verify filtering: request catId=ZS returns only seniors with correct CatRnk

**Checkpoint**: US4 complete - age category filtering working

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, error handling improvements

- [x] T071 [P] Add request validation schemas using Fastify JSON Schema in packages/server/src/schemas/
- [x] T072 [P] Add comprehensive error responses per contracts/api.md error format
- [x] T073 [P] Add logging for all repository operations
- [x] T074 Update packages/server/README.md with API documentation
- [x] T075 Verify all endpoints match contracts/api.md specification
- [x] T076 Run quickstart.md validation steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational, can run parallel to US1
- **US3 (Phase 5)**: Depends on US1 (needs ResultRepository)
- **US4 (Phase 6)**: Depends on US1 (needs ResultRepository, ClassRepository)
- **Polish (Phase 7)**: Depends on all desired user stories

### User Story Dependencies

```
Foundational ──┬──► US1 (P1) ──┬──► US3 (P2) ──┐
               │               │               │
               │               └──► US4 (P3) ──┼──► Polish
               │                               │
               └──► US2 (P2) ──────────────────┘
```

- **US1**: Independent after Foundational
- **US2**: Independent after Foundational (parallel with US1)
- **US3**: Depends on US1 (extends ResultRepository)
- **US4**: Depends on US1 (extends ResultRepository, uses ClassRepository)

### Parallel Opportunities

**Within Phase 2 (Foundational):**
```
T012, T013, T014, T015, T016, T017 (all shared types)
T020, T021, T022 (base repositories)
```

**Within US1:**
```
T026, T027, T028 (repositories)
T031, T032, T033, T034, T035 (XML parsers)
```

**Across User Stories (after Foundational):**
```
US1 and US2 can proceed in parallel
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T025)
3. Complete Phase 3: US1 (T026-T048)
4. **STOP**: Test with sample XML, verify results display
5. Deploy basic results viewing capability

### Incremental Delivery

1. Setup + Foundational → Database ready
2. US1 → Results display from XML (MVP!)
3. US2 → Add real-time OnCourse tracking
4. US3 → Add multi-run support
5. US4 → Add category filtering
6. Polish → Production-ready

### Parallel Team Strategy

With 2 developers after Foundational:
- Developer A: US1 → US3 → US4
- Developer B: US2 → Polish tasks

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Setup | T001-T004 | Database infrastructure |
| Foundational | T005-T025 | Schema, types, base repos |
| US1 (P1) | T026-T048 | Results display - MVP |
| US2 (P2) | T049-T057 | OnCourse tracking |
| US3 (P2) | T058-T063 | Multi-run support |
| US4 (P3) | T064-T070 | Category filtering |
| Polish | T071-T076 | Docs, validation, cleanup |

**Total Tasks**: 76
**MVP Scope**: T001-T048 (48 tasks)
**Parallel Opportunities**: 25 tasks marked [P]
