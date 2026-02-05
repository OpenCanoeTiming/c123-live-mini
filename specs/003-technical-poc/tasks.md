# Tasks: Technical PoC

**Input**: Design documents from `/specs/003-technical-poc/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested for PoC - validation via manual curl/browser testing.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Paths: `packages/server/` and `packages/page/`

---

## Phase 1: Setup (Monorepo Infrastructure)

**Purpose**: Initialize npm workspaces monorepo structure

**Note**: All completed in 002-data-model feature, using `packages/client` instead of `packages/page`.

- [X] T001 Create root package.json with npm workspaces configuration
- [X] T002 Create tsconfig.base.json with shared TypeScript settings
- [X] T003 [P] Create packages/server/package.json with Fastify dependencies
- [X] T004 [P] Create packages/client/package.json with React/Vite dependencies
- [X] T005 [P] Create packages/server/tsconfig.json extending base config
- [X] T006 [P] Create packages/client/tsconfig.json extending base config
- [X] T007 Create .gitignore with node_modules, dist, data/ patterns
- [X] T008 Run npm install to verify workspace setup

**Checkpoint**: `npm install` succeeds, all packages recognized ✓

---

## Phase 2: Foundational (Database & App Skeleton)

**Purpose**: Core infrastructure required before any user story

**Note**: Completed in 002-data-model with enhanced schema (events, classes, participants, races, results, courses).

- [X] T009 Create packages/server/src/db/schema.ts with Database interface and table types
- [X] T010 Create packages/server/src/db/database.ts with Kysely client initialization (SQLite)
- [X] T011 Create packages/server/src/db/migrations/ with initial schema migrations
- [X] T012 Create packages/server/src/db/migrate.ts with migration runner
- [X] T013 Create packages/server/src/app.ts with Fastify app setup
- [X] T014 Create packages/server/src/index.ts entry point (runs migrations, starts server)
- [X] T015 [P] Create packages/client/index.html with React mount point
- [X] T016 [P] Create packages/client/vite.config.ts with React plugin and API proxy
- [X] T017 [P] Create packages/client/src/main.tsx React entry point
- [X] T018 Add dev scripts to root package.json for running both packages

**Checkpoint**: `npm run dev` starts server (port 3000) and frontend (port 5173) ✓

---

## Phase 3: User Story 1 - Verify Server Health (Priority: P1) 🎯 MVP

**Goal**: Health endpoint confirms server is running

**Note**: Health endpoint exists at `/health` (not `/api/v1/health`). Implemented inline in app.ts.

**Independent Test**: `curl http://localhost:3000/health` returns `{"status":"ok"}`

### Implementation for User Story 1

- [X] T019 [US1] Health endpoint implemented inline in packages/server/src/app.ts
- [X] T020 [US1] Health routes registered in packages/server/src/app.ts
- [X] T021 [US1] Health endpoint returns status

**Checkpoint**: Health endpoint responds correctly - US1 complete ✓

---

## Phase 4: User Story 2 - Verify Data Persistence (Priority: P1)

**Goal**: Events and results can be stored and retrieved via API

**Note**: Completed in 002-data-model with full repository pattern and enhanced API.

**Independent Test**: GET /api/v1/events returns events list

### Implementation for User Story 2

- [X] T022 [P] [US2] Create packages/server/src/db/repositories/EventRepository.ts with CRUD operations
- [X] T023 [P] [US2] Create packages/server/src/db/repositories/ResultRepository.ts with CRUD operations
- [X] T024 [US2] Create packages/server/src/routes/events.ts with GET /api/v1/events endpoints
- [X] T025 [US2] Add GET /api/v1/events/:eventId endpoint to events.ts
- [X] T026 [US2] Create packages/server/src/routes/results.ts for result operations
- [X] T027 [US2] Register event and result routes in packages/server/src/app.ts
- [X] T028 [US2] Add request validation via Fastify schemas
- [X] T029 [US2] Add error responses (400, 404) via global error handler

**Checkpoint**: Full event/result CRUD works via API - US2 complete ✓

---

## Phase 5: User Story 3 - Verify Frontend Connectivity (Priority: P1)

**Goal**: React app renders with rvp-design-system styling

**Independent Test**: Open http://localhost:5173, see styled page

### Implementation for User Story 3

- [X] T030 [US3] Create packages/client/src/App.tsx with basic layout using rvp-design-system patterns
- [X] T031 [US3] Import styles.css (rvp-design-system patterns) in main.tsx
- [X] T032 [US3] Add responsive container and heading components
- [X] T033 [US3] Verify mobile-responsive layout

**Note**: rvp-design-system is not published to npm, so styles.css was created following the design system patterns.

**Checkpoint**: Frontend shows styled page - US3 complete

---

## Phase 6: User Story 4 - Verify End-to-End Flow (Priority: P2)

**Goal**: Data flows from API through database to frontend display

**Independent Test**: Create event via API, see it in browser

### Implementation for User Story 4

- [ ] T034 [US4] Create packages/page/src/services/api.ts with fetch wrapper for /api/v1
- [ ] T035 [US4] Add getEvents() and getEventResults() functions to api.ts
- [ ] T036 [US4] Create packages/page/src/components/EventList.tsx to display events
- [ ] T037 [US4] Create packages/page/src/components/ResultList.tsx to display results
- [ ] T038 [US4] Integrate EventList and ResultList in App.tsx
- [ ] T039 [US4] Add loading state while fetching data
- [ ] T040 [US4] Add error state when API unavailable

**Checkpoint**: End-to-end flow works - US4 complete

---

## Phase 7: Polish & Validation

**Purpose**: Final cleanup and verification

- [X] T041 [P] README.md exists with setup instructions
- [X] T042 [P] .nvmrc exists with Node 20 version
- [ ] T043 Verify all success criteria from spec.md (SC-001 through SC-005)
- [ ] T044 Test database auto-creation on fresh start
- [ ] T045 Run full E2E validation per quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational (can parallel with US1)
- **US3 (Phase 5)**: Depends on Foundational (can parallel with US1, US2)
- **US4 (Phase 6)**: Depends on US2 (API) and US3 (Frontend)
- **Polish (Phase 7)**: Depends on US4

### User Story Dependencies

```
Foundational
    ├── US1 (Health) ─────────────────────┐
    ├── US2 (Data Persistence) ───────────┼── US4 (E2E)
    └── US3 (Frontend) ───────────────────┘
```

- **US1, US2, US3**: Can run in parallel after Foundational
- **US4**: Requires US2 + US3 complete

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T003 + T004 (package.json files)
T005 + T006 (tsconfig files)
```

**Phase 2 (Foundational)**:
```
T015 + T016 + T017 (frontend setup, parallel with server)
```

**Phase 4 (US2)**:
```
T022 + T023 (repositories)
```

**Phase 7 (Polish)**:
```
T041 + T042 (docs)
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Health)
4. **VALIDATE**: `curl /api/v1/health` works
5. Complete Phase 4: US2 (Data Persistence)
6. **VALIDATE**: Event CRUD works
7. Complete Phase 5: US3 (Frontend)
8. **VALIDATE**: Styled page loads
9. Complete Phase 6: US4 (E2E)
10. **VALIDATE**: Full flow works
11. Complete Phase 7: Polish

### Quick Parallel Approach

After Foundational, work on US1 + US2 + US3 simultaneously, then US4.

---

## Summary

| Phase | Tasks | Parallel |
|-------|-------|----------|
| Setup | T001-T008 | 4 |
| Foundational | T009-T018 | 3 |
| US1 (Health) | T019-T021 | 0 |
| US2 (Persistence) | T022-T029 | 2 |
| US3 (Frontend) | T030-T033 | 0 |
| US4 (E2E) | T034-T040 | 0 |
| Polish | T041-T045 | 2 |
| **Total** | **45** | **11** |

---

## Notes

- No tests requested - validation via curl/browser
- rvp-design-system must be the only styling source
- SQLite database auto-creates in packages/server/data/
- API prefix: /api/v1
- Commit after each checkpoint
