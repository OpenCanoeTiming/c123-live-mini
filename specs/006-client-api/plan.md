# Implementation Plan: Client API

**Branch**: `006-client-api` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-client-api/spec.md`

## Summary

Implement a technology-transparent public API for reading event data. The client-facing routes already exist (`events`, `results`, `startlist`, `oncourse`, `categories`) but currently expose raw C123 internal data formats. This feature has two parts:

1. **Data layer abstraction** (extends #005): DB schema migration + ingest transformation updates so the database stores already-abstracted, technology-agnostic data
2. **Client API refinement**: Update route handlers to serve clean public responses, add API documentation

**Key architectural decision**: Abstraction happens at **ingest time**, not at read time. The database becomes vendor-neutral. Client API is a thin read layer with minimal transformation (only filtering internal IDs and formatting).

### What changes from #005

| Data Item | Current (raw C123) | Target (abstracted) | Where |
|-----------|-------------------|---------------------|-------|
| `races.dis_id` (BR1, QUA) | Raw C123 code | + new `race_type` column (human-readable) | DB migration + ingest |
| `participants.icf_id` | C123-specific name | Rename to `athlete_id` | DB migration + ingest |
| `results.gates` ([0,2,50]) | Positional array | Self-describing objects [{number, type, penalty}] | Ingest transformation |
| `courses.gate_config` (NNRN...) | Kept for internal use | Merged into gate objects at ingest | Ingest transformation |
| OnCourse gates | Positional array | Self-describing objects | OnCourse store transformation |

### What stays in #006 only

- Draft event filtering on all public endpoints
- Stripping internal DB `id` fields from responses
- Response envelope patterns and error format consistency
- Query params: `catId`, `detailed`, `includeAllRuns`
- API documentation (Markdown + OpenAPI)

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
| V. Repository Pattern | PASS | Using existing repositories, schema migration via Kysely |
| VI. Minimal Viable Scope | PASS | DB changes are prerequisite for client API, not scope creep |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-client-api/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and rationale
├── data-model.md        # Phase 1: DB schema changes + public API data shapes
├── quickstart.md        # Phase 1: testing guide
├── contracts/           # Phase 1: OpenAPI spec
│   └── openapi.yaml
└── tasks.md             # Phase 2: task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/server/src/
├── db/
│   └── migrations/
│       └── 007-*.ts         # NEW: schema migration (race_type, athlete_id, gates format)
├── services/
│   ├── IngestService.ts     # MODIFY: add race_type mapping, gates transformation
│   ├── ResultIngestService.ts  # MODIFY: gates → self-describing objects
│   └── OnCourseStore.ts     # MODIFY: transform gates on store
├── routes/                  # MODIFY: existing route handlers
│   ├── events.ts            # Strip internal IDs, ensure draft filtering
│   ├── results.ts           # Serve pre-transformed data, extend detailed mode
│   ├── startlist.ts         # Strip internal IDs, add athleteId
│   ├── oncourse.ts          # Serve pre-transformed gate data
│   └── categories.ts        # Minor: strip internal IDs
├── utils/
│   └── raceTypes.ts         # NEW: dis_id → race_type mapping (used by ingest)
└── schemas/
    └── clientApi.ts         # NEW: Fastify JSON schemas for response validation

packages/shared/src/types/
├── race.ts                  # MODIFY: add raceType field
├── participant.ts           # MODIFY: icfId → athleteId
├── result.ts                # MODIFY: gates type change
└── publicApi.ts             # NEW: public API response type definitions

packages/server/src/db/
├── schema.ts                # MODIFY: add race_type, rename icf_id
├── repositories/
│   ├── RaceRepository.ts    # MODIFY: include race_type in queries
│   └── ParticipantRepository.ts  # MODIFY: athlete_id field
└── seed-data.ts             # MODIFY: use new field names and formats

packages/server/tests/
├── services/
│   ├── ingest.test.ts       # MODIFY: verify transformations
│   └── raceTypes.test.ts    # NEW: race type mapping tests
├── routes/
│   ├── events.test.ts       # MODIFY: verify clean responses
│   ├── results.test.ts      # MODIFY: verify self-describing gates
│   └── ...
└── migrations/
    └── 007.test.ts          # NEW: migration test

docs/
└── api/
    └── client-api.md        # API documentation (Markdown)
```

**Structure Decision**: No new `mappers/` directory needed. Transformation logic lives in ingest services (where data enters the system). Route handlers become simpler — they read already-clean data from DB and only strip internal IDs.
