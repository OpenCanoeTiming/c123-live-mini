# Implementation Plan: Client API

**Branch**: `006-client-api` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-client-api/spec.md`

## Summary

Refactor existing client-facing routes to implement a technology-transparent public API. The routes already exist (`events`, `results`, `startlist`, `oncourse`, `categories`) but currently expose raw C123 internal data formats (positional gate arrays, raw dis_id codes, internal DB IDs, C123 participant IDs). This feature introduces a **response transformation layer** that maps internal DB representations to self-describing, technology-agnostic JSON responses, plus adds API documentation.

**Key insight**: This is primarily a **response transformation** task, not a new route creation task. The existing routes and repository methods already cover most functional requirements. The main work is:
1. Building mappers that transform DB/internal types → public API types
2. Enriching responses with self-describing data (gate objects, race type labels, etc.)
3. Extending the detailed mode with timestamps and course context
4. Adding API documentation

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (strict mode)
**Primary Dependencies**: Fastify, Kysely, better-sqlite3
**Storage**: SQLite file-based (`packages/server/data/live-mini.db`), Repository Pattern
**Testing**: Vitest (existing test infrastructure)
**Target Platform**: Linux server (Railway deployment)
**Project Type**: Monorepo (npm workspaces) — `packages/server`, `packages/page`, `packages/shared`
**Performance Goals**: <1s response for 200 participants, <1s event list for 50 events
**Constraints**: SQLite serialized writes, in-memory OnCourse store, low hundreds of concurrent users
**Scale/Scope**: ~50 events, ~200 participants per race, ~24 gates per course

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. SDD Workflow | PASS | Following specify → clarify → plan → tasks flow |
| II. GitHub Issue Sync | PASS | Issue #6 updated after each phase |
| III. Headless API | PASS | All endpoints are JSON API, no UI |
| IV. Design System | N/A | No frontend changes in this feature |
| V. Repository Pattern | PASS | Using existing repositories, no direct DB access |
| VI. Minimal Viable Scope | PASS | Only specified endpoints, no extras |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-client-api/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and rationale
├── data-model.md        # Phase 1: public API data shapes
├── quickstart.md        # Phase 1: testing guide
├── contracts/           # Phase 1: OpenAPI spec
│   └── openapi.yaml
└── tasks.md             # Phase 2: task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/server/src/
├── routes/              # MODIFY existing route handlers
│   ├── events.ts        # Update response mapping
│   ├── results.ts       # Add transformation layer, extend detailed mode
│   ├── startlist.ts     # Update response mapping
│   ├── oncourse.ts      # Update response mapping with self-describing gates
│   └── categories.ts    # Update response mapping
├── mappers/             # NEW: response transformation layer
│   ├── index.ts         # Re-exports
│   ├── eventMapper.ts   # DB Event → Public Event
│   ├── raceMapper.ts    # DB Race → Public Race (dis_id → race type label)
│   ├── participantMapper.ts  # DB Participant → Public Participant (icf_id → athlete_id)
│   ├── resultMapper.ts  # DB Result → Public Result (gates array → gate objects)
│   └── oncourseMapper.ts    # OnCourseEntry → Public OnCourse (self-describing gates)
├── schemas/             # MODIFY: add response schemas for validation
│   └── clientApi.ts     # NEW: Fastify JSON schemas for client endpoints
└── utils/
    └── raceTypes.ts     # NEW: dis_id → human-readable race type mapping

packages/shared/src/types/
└── publicApi.ts         # NEW: public API response type definitions

packages/server/tests/
├── routes/              # MODIFY: update existing route tests
│   ├── events.test.ts
│   ├── results.test.ts
│   ├── startlist.test.ts
│   ├── oncourse.test.ts
│   └── categories.test.ts
└── mappers/             # NEW: unit tests for mappers
    ├── eventMapper.test.ts
    ├── raceMapper.test.ts
    ├── resultMapper.test.ts
    └── oncourseMapper.test.ts

docs/
└── api/
    └── client-api.md    # API documentation (Markdown)
```

**Structure Decision**: Extends existing monorepo structure. New `mappers/` directory in server package provides clean separation between DB data shapes and public API shapes. Shared types in `packages/shared` ensure frontend can import the same type definitions.
