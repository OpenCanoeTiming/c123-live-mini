# Tasks: Database Layer

**Input**: Design documents from `/specs/004-database-layer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not requested in specification - tests omitted.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story mapping (US1, US2, US3)
- Paths based on monorepo structure: `packages/server/`

---

## Phase 1: Setup

**Purpose**: Prepare seed script infrastructure

- [x] T001 Verify existing database infrastructure in packages/server/src/db/

**Note**: Database schema, migrations, and repositories already exist from Features #2 and #3. No setup tasks required.

---

## Phase 2: Foundational

**Purpose**: No foundational tasks needed - infrastructure complete

**⚠️ CRITICAL**: All database infrastructure (schema, migrations, repositories) already exists.

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Developer Quick Start with Demo Data (Priority: P1) 🎯 MVP

**Goal**: Developer can run `npm run seed` and immediately have working demo data

**Independent Test**: Run `npm run seed` on fresh database, verify API returns demo event with 20 participants, 2 races, and results

### Implementation for User Story 1

- [x] T002 [P] [US1] Extract event metadata from 2024-LODM-fin.xml and create seed data constant in packages/server/src/db/seed-data.ts
- [x] T003 [P] [US1] Extract K1M-ZS class definition (10 participants) from XML and add to packages/server/src/db/seed-data.ts
- [x] T004 [P] [US1] Extract K1W-ZS class definition (10 participants) from XML and add to packages/server/src/db/seed-data.ts
- [x] T005 [P] [US1] Extract race schedule for K1M-ZS_BR1 from XML and add to packages/server/src/db/seed-data.ts
- [x] T006 [P] [US1] Extract race schedule for K1W-ZS_BR1 from XML and add to packages/server/src/db/seed-data.ts
- [x] T007 [P] [US1] Extract results for K1M-ZS (including DNS/DNF examples) and add to packages/server/src/db/seed-data.ts
- [x] T008 [P] [US1] Extract results for K1W-ZS (including DNS/DNF examples) and add to packages/server/src/db/seed-data.ts
- [x] T009 [P] [US1] Extract course configuration and add to packages/server/src/db/seed-data.ts
- [x] T010 [US1] Create seed script entry point in packages/server/src/db/seed.ts with clear, insert, verify logic
- [x] T011 [US1] Add "seed" script to packages/server/package.json pointing to seed.ts
- [x] T012 [US1] Verify idempotency: run seed twice, confirm no errors and data is replaced

**Checkpoint**: `npm run seed` works, API returns demo event with all data

---

## Phase 4: User Story 2 - Automated Testing with Predictable Data (Priority: P2)

**Goal**: Test suite can rely on known seed data values for assertions

**Independent Test**: Verify seed data has deterministic values that tests can assert against

### Implementation for User Story 2

- [x] T013 [US2] Document known test values (eventId, participant count, specific times) in packages/server/src/db/seed-data.ts as exported constants
- [x] T014 [US2] Add TypeScript types for seed data structures in packages/server/src/db/seed-data.ts
- [x] T015 [US2] Verify seed data includes at least one result of each status type (OK, DNS, DNF)

**Checkpoint**: Seed data has documented, predictable values for test assertions

---

## Phase 5: User Story 3 - Data Model Documentation (Priority: P3)

**Goal**: New contributors understand database structure without reading code

**Independent Test**: Review documentation accuracy against actual schema.ts

### Implementation for User Story 3

- [x] T016 [P] [US3] Copy data-model.md from specs/004-database-layer/ to docs/data-model.md
- [x] T017 [US3] Verify ERD diagram in docs/data-model.md matches packages/server/src/db/schema.ts
- [x] T018 [US3] Verify XML mapping tables are accurate by comparing with packages/server/src/services/xml/ parsers
- [x] T019 [US3] Add link to docs/data-model.md from main README.md or docs index

**Checkpoint**: Documentation accurately describes all 7 tables and XML mappings

---

## Phase 6: Polish & Validation

**Purpose**: Final verification and cleanup

- [x] T020 Run quickstart.md validation steps from specs/004-database-layer/quickstart.md
- [x] T021 Verify frontend displays seeded data correctly (manual check)
- [x] T022 Update CLAUDE.md if any new patterns or conventions were established

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No work needed - infrastructure exists
- **Foundational (Phase 2)**: No work needed - infrastructure exists
- **US1 (Phase 3)**: Can start immediately
- **US2 (Phase 4)**: Depends on US1 (needs seed data to document)
- **US3 (Phase 5)**: Can run parallel to US1/US2 (documentation only)
- **Polish (Phase 6)**: Depends on US1, US2, US3

### User Story Dependencies

```
Setup ──► US1 (P1) ──► US2 (P2) ──► Polish
              │                        ▲
              └──► US3 (P3) ───────────┘
```

- **US1**: Can start immediately (MVP)
- **US2**: Depends on US1 (documents seed data)
- **US3**: Independent (documentation, can run parallel)

### Parallel Opportunities

**Within US1 (Phase 3)**:
```
T002, T003, T004, T005, T006, T007, T008, T009 (all seed data extraction - parallel)
```

**Across Stories**:
```
US1 and US3 can proceed in parallel (different deliverables)
```

---

## Parallel Example: User Story 1

```bash
# Extract all seed data in parallel:
Task: "Extract event metadata" (T002)
Task: "Extract K1M-ZS class" (T003)
Task: "Extract K1W-ZS class" (T004)
Task: "Extract K1M-ZS race" (T005)
Task: "Extract K1W-ZS race" (T006)
Task: "Extract K1M-ZS results" (T007)
Task: "Extract K1W-ZS results" (T008)
Task: "Extract course config" (T009)

# Then sequentially:
Task: "Create seed.ts" (T010) - depends on all data
Task: "Add npm script" (T011)
Task: "Verify idempotency" (T012)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 3: User Story 1 (T002-T012)
2. **STOP and VALIDATE**: Run `npm run seed`, verify API returns demo data
3. Feature is usable for development

### Incremental Delivery

1. US1 → Seed script works (MVP!)
2. US2 → Test-friendly constants documented
3. US3 → Documentation in docs/
4. Polish → Final validation

### Solo Developer Path

Work sequentially: US1 → US2 → US3 → Polish

Total: 22 tasks (T001-T022)

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Setup | T001 | Verify infrastructure (trivial) |
| US1 (P1) | T002-T012 | Seed script - **MVP** |
| US2 (P2) | T013-T015 | Test constants |
| US3 (P3) | T016-T019 | Documentation |
| Polish | T020-T022 | Validation |

**Total Tasks**: 22
**MVP Scope**: T001-T012 (12 tasks)
**Parallel Opportunities**: 8 tasks in US1 (T002-T009)
