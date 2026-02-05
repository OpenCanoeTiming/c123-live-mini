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

- [ ] T001 Create root package.json with npm workspaces configuration
- [ ] T002 Create tsconfig.base.json with shared TypeScript settings
- [ ] T003 [P] Create packages/server/package.json with Fastify dependencies
- [ ] T004 [P] Create packages/page/package.json with React/Vite dependencies
- [ ] T005 [P] Create packages/server/tsconfig.json extending base config
- [ ] T006 [P] Create packages/page/tsconfig.json extending base config
- [ ] T007 Create .gitignore with node_modules, dist, data/ patterns
- [ ] T008 Run npm install to verify workspace setup

**Checkpoint**: `npm install` succeeds, both packages recognized

---

## Phase 2: Foundational (Database & App Skeleton)

**Purpose**: Core infrastructure required before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create packages/server/src/db/types.ts with Database interface and table types from data-model.md
- [ ] T010 Create packages/server/src/db/client.ts with Kysely client initialization (SQLite)
- [ ] T011 Create packages/server/src/db/migrations/001_initial_schema.ts with events and mock_results tables
- [ ] T012 Create packages/server/src/db/migrate.ts with migration runner
- [ ] T013 Create packages/server/src/app.ts with Fastify app setup and CORS
- [ ] T014 Create packages/server/src/server.ts entry point (runs migrations, starts server)
- [ ] T015 [P] Create packages/page/index.html with React mount point
- [ ] T016 [P] Create packages/page/vite.config.ts with React plugin and API proxy
- [ ] T017 [P] Create packages/page/src/main.tsx React entry point
- [ ] T018 Add dev scripts to root package.json for running both packages

**Checkpoint**: `npm run dev` starts server (port 3001) and frontend (port 5173)

---

## Phase 3: User Story 1 - Verify Server Health (Priority: P1) 🎯 MVP

**Goal**: Health endpoint confirms server is running

**Independent Test**: `curl http://localhost:3001/api/v1/health` returns `{"status":"ok",...}`

### Implementation for User Story 1

- [ ] T019 [US1] Create packages/server/src/routes/health.ts with GET /api/v1/health endpoint
- [ ] T020 [US1] Register health routes in packages/server/src/app.ts
- [ ] T021 [US1] Verify health endpoint returns status, timestamp per OpenAPI spec

**Checkpoint**: Health endpoint responds correctly - US1 complete

---

## Phase 4: User Story 2 - Verify Data Persistence (Priority: P1)

**Goal**: Events and results can be stored and retrieved via API

**Independent Test**: POST event → GET event returns same data

### Implementation for User Story 2

- [ ] T022 [P] [US2] Create packages/server/src/repositories/event.ts with CRUD operations
- [ ] T023 [P] [US2] Create packages/server/src/repositories/result.ts with CRUD operations
- [ ] T024 [US2] Create packages/server/src/routes/events.ts with GET/POST /api/v1/events endpoints
- [ ] T025 [US2] Add GET /api/v1/events/:eventId endpoint to events.ts
- [ ] T026 [US2] Create packages/server/src/routes/results.ts with GET/POST /api/v1/events/:eventId/results
- [ ] T027 [US2] Register event and result routes in packages/server/src/app.ts
- [ ] T028 [US2] Add request validation per OpenAPI schemas
- [ ] T029 [US2] Add error responses (400, 404) per OpenAPI spec

**Checkpoint**: Full event/result CRUD works via curl - US2 complete

---

## Phase 5: User Story 3 - Verify Frontend Connectivity (Priority: P1)

**Goal**: React app renders with rvp-design-system styling

**Independent Test**: Open http://localhost:5173, see styled page

### Implementation for User Story 3

- [ ] T030 [US3] Create packages/page/src/App.tsx with basic layout using rvp-design-system
- [ ] T031 [US3] Import rvp-design-system CSS/styles in main.tsx
- [ ] T032 [US3] Add responsive container and heading components
- [ ] T033 [US3] Verify mobile-responsive layout

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

- [ ] T041 [P] Add README.md with setup instructions (copy from quickstart.md)
- [ ] T042 [P] Add .nvmrc with Node 20 version
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
