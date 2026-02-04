# Tasks: Monorepo Setup

**Input**: Design documents from `/specs/001-monorepo-setup/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No tests requested for this infrastructure feature. Validation via manual verification of npm scripts.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/server/`, `packages/client/`, `packages/shared/`
- Root level configuration files at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize monorepo structure and root-level configuration

- [x] T001 Create root package.json with workspaces config at /package.json
- [x] T002 [P] Create .nvmrc with Node.js version at /.nvmrc
- [x] T003 [P] Create tsconfig.base.json with shared TypeScript config at /tsconfig.base.json
- [x] T004 [P] Update .gitignore for monorepo (node_modules, dist) at /.gitignore
- [x] T005 Create packages/ directory structure (server, client, shared)

---

## Phase 2: Foundational (Shared Package)

**Purpose**: Create shared package that MUST exist before server and client

**⚠️ CRITICAL**: Server and client packages depend on shared package being functional

- [x] T006 Create shared package.json at /packages/shared/package.json
- [x] T007 [P] Create shared tsconfig.json extending base at /packages/shared/tsconfig.json
- [x] T008 Create shared/src/index.ts with sample type export at /packages/shared/src/index.ts

**Checkpoint**: Shared package ready - server and client can now depend on it

---

## Phase 3: User Story 1 - Developer Sets Up Local Environment (Priority: P1) 🎯 MVP

**Goal**: Developer can clone repo, run `npm install`, and start dev servers

**Independent Test**:
1. `npm install` completes without errors
2. `npm run dev` starts both server and client
3. Shared types are importable from both packages

### Implementation for User Story 1

#### Server Package
- [ ] T009 [P] [US1] Create server package.json with dependencies at /packages/server/package.json
- [ ] T010 [P] [US1] Create server tsconfig.json extending base at /packages/server/tsconfig.json
- [ ] T011 [US1] Create server entry point with Fastify placeholder at /packages/server/src/index.ts
- [ ] T012 [US1] Add shared package dependency and verify import at /packages/server/src/index.ts

#### Client Package
- [ ] T013 [P] [US1] Create client package.json with Vite/React deps at /packages/client/package.json
- [ ] T014 [P] [US1] Create client tsconfig.json extending base at /packages/client/tsconfig.json
- [ ] T015 [P] [US1] Create vite.config.ts at /packages/client/vite.config.ts
- [ ] T016 [P] [US1] Create index.html at /packages/client/index.html
- [ ] T017 [US1] Create client entry point (main.tsx) at /packages/client/src/main.tsx
- [ ] T018 [US1] Add shared package dependency and verify import at /packages/client/src/main.tsx

#### Root Dev Script
- [ ] T019 [US1] Install concurrently and add dev script to root package.json
- [ ] T020 [US1] Verify `npm run dev` starts both server and client concurrently

**Checkpoint**: User Story 1 complete - developer can install deps and run dev servers

---

## Phase 4: User Story 2 - Developer Builds for Production (Priority: P2)

**Goal**: `npm run build` creates production builds for both server and client

**Independent Test**:
1. `npm run build` completes without errors
2. `/packages/server/dist/` contains compiled JS
3. `/packages/client/dist/` contains bundled assets

### Implementation for User Story 2

- [ ] T021 [P] [US2] Add build script to server package.json
- [ ] T022 [P] [US2] Add build script to client package.json (Vite build)
- [ ] T023 [P] [US2] Add build script to shared package.json
- [ ] T024 [US2] Add root build script that builds all packages in order at /package.json
- [ ] T025 [US2] Verify build output artifacts exist

**Checkpoint**: User Story 2 complete - production builds working

---

## Phase 5: User Story 3 - Developer Runs Tests (Priority: P3)

**Goal**: `npm test` runs Vitest across all packages

**Independent Test**:
1. `npm test` executes Vitest
2. Sample test in each package runs
3. Failed test exits with non-zero code

### Implementation for User Story 3

- [ ] T026 [US3] Add vitest as root devDependency at /package.json
- [ ] T027 [P] [US3] Create vitest.workspace.ts at /vitest.workspace.ts
- [ ] T028 [P] [US3] Add sample test to shared package at /packages/shared/src/index.test.ts
- [ ] T029 [P] [US3] Add sample test to server package at /packages/server/src/index.test.ts
- [ ] T030 [P] [US3] Add sample test to client package at /packages/client/src/App.test.tsx
- [ ] T031 [US3] Add test scripts to each package.json
- [ ] T032 [US3] Add root test script and verify all tests run at /package.json

**Checkpoint**: User Story 3 complete - test infrastructure working

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [ ] T033 [P] Verify quickstart.md instructions work (fresh clone test)
- [ ] T034 [P] Verify all npm scripts work from root (dev, build, test)
- [ ] T035 Update README.md with final project structure at /README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS server and client packages
- **User Story 1 (Phase 3)**: Depends on Foundational (shared package)
- **User Story 2 (Phase 4)**: Depends on User Story 1 (packages must exist)
- **User Story 3 (Phase 5)**: Depends on User Story 1 (packages must exist)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - creates the packages
- **User Story 2 (P2)**: Can start after US1 - adds build to existing packages
- **User Story 3 (P3)**: Can start after US1 - adds tests to existing packages

Note: US2 and US3 could run in parallel after US1, as they modify different files (build scripts vs test scripts).

### Within Each User Story

- Package configuration before source files
- Dependencies resolved before importing

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T002, T003, T004 can run in parallel
```

**Phase 3 (US1) - after T005**:
```
Server: T009, T010 in parallel
Client: T013, T014, T015, T016 in parallel
(Server and Client can proceed in parallel)
```

**Phase 5 (US3) - after T026**:
```
T027, T028, T029, T030 can all run in parallel
```

---

## Parallel Example: User Story 1

```bash
# After foundational phase, launch server and client config in parallel:
Task: "Create server package.json at /packages/server/package.json"
Task: "Create server tsconfig.json at /packages/server/tsconfig.json"
Task: "Create client package.json at /packages/client/package.json"
Task: "Create client tsconfig.json at /packages/client/tsconfig.json"
Task: "Create vite.config.ts at /packages/client/vite.config.ts"
Task: "Create index.html at /packages/client/index.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (shared package)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run `npm install` and `npm run dev`
5. Monorepo is functional for development

### Incremental Delivery

1. Complete Setup + Foundational → Shared package ready
2. Add User Story 1 → Dev workflow working (MVP!)
3. Add User Story 2 → Build workflow working
4. Add User Story 3 → Test workflow working
5. Each story adds capability without breaking previous

---

## Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| 1 - Setup | T001-T005 (5) | Root configuration |
| 2 - Foundational | T006-T008 (3) | Shared package |
| 3 - US1 (P1) | T009-T020 (12) | Dev environment |
| 4 - US2 (P2) | T021-T025 (5) | Production builds |
| 5 - US3 (P3) | T026-T032 (7) | Test infrastructure |
| 6 - Polish | T033-T035 (3) | Validation |

**Total Tasks**: 35
**MVP Tasks** (through US1): 20

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
