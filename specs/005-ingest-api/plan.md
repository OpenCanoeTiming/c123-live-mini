# Implementation Plan: Ingest API

**Branch**: `005-ingest-api` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-ingest-api/spec.md`

## Summary

Complete the Ingest API by adding missing functionality: API key validity window based on event dates, event configuration endpoint, live results ingestion via JSON, ingest record logging, and XML-first data requirement. The existing infrastructure from Feature #4 (Database Layer) provides the foundation.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (strict mode)
**Primary Dependencies**: Fastify, Kysely, better-sqlite3
**Storage**: SQLite file-based (`packages/server/data/live-mini.db`), Repository Pattern
**Testing**: Vitest (unit + integration)
**Target Platform**: Cloud deployment (Railway), Linux server
**Project Type**: Monorepo (npm workspaces) - packages/server, packages/page
**Performance Goals**: Event creation <1s, XML ingestion <5s (5MB), JSON updates <200ms
**Constraints**: Headless API (no Admin UI), mobile-first frontend
**Scale/Scope**: Single active event per API key, ~10 concurrent ingest requests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | Following SDD workflow with spec.md completed |
| II. GitHub Issue State Sync | ✅ PASS | Issue #5 updated after each phase |
| III. Headless API Architecture | ✅ PASS | No Admin UI, all endpoints for remote management |
| IV. Design System Compliance | N/A | This feature is backend-only |
| V. Repository Pattern | ✅ PASS | All DB access via repositories |
| VI. Minimal Viable Scope | ✅ PASS | Only implementing specified features |

## Project Structure

### Documentation (this feature)

```text
specs/005-ingest-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output - OpenAPI specs
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/server/
├── src/
│   ├── routes/
│   │   ├── admin.ts           # POST /admin/events (exists, needs validity window)
│   │   ├── ingest.ts          # POST /ingest/xml, /ingest/oncourse (exists)
│   │   └── [new: config.ts]   # Event configuration endpoint
│   ├── middleware/
│   │   └── apiKeyAuth.ts      # API key validation (needs expiry check)
│   ├── services/
│   │   ├── IngestService.ts   # XML ingestion (exists)
│   │   ├── OnCourseStore.ts   # OnCourse store (exists)
│   │   └── [new: ResultIngestService.ts] # Live results via JSON
│   ├── db/
│   │   ├── schema.ts          # Database schema (needs ingest_records)
│   │   ├── migrations/        # Migrations
│   │   └── repositories/      # Repository classes
│   └── utils/
│       ├── apiKey.ts          # Key generation (needs validity calc)
│       └── logger.ts          # Logging (exists)
└── tests/
    ├── integration/           # API endpoint tests
    └── unit/                  # Service tests
```

**Structure Decision**: Extending existing monorepo structure in `packages/server`. New files for configuration routes and result ingestion service. Schema extension for ingest_records logging.

## Complexity Tracking

> No constitution violations. All implementations follow established patterns.

| Item | Justification |
|------|---------------|
| IngestRecord table | Required by FR-011 for audit logging |
| Separate ResultIngestService | Separation from OnCourseStore - different merge semantics |

## Existing Infrastructure (from Feature #4)

The following is already implemented and working:

| Component | Status | Location |
|-----------|--------|----------|
| Event creation endpoint | ✅ Exists | `routes/admin.ts` |
| API key generation | ✅ Exists | `utils/apiKey.ts` |
| API key auth middleware | ✅ Exists | `middleware/apiKeyAuth.ts` |
| XML ingest endpoint | ✅ Exists | `routes/ingest.ts` |
| OnCourse ingest endpoint | ✅ Exists | `routes/ingest.ts` |
| IngestService | ✅ Exists | `services/IngestService.ts` |
| All repositories | ✅ Exist | `db/repositories/*.ts` |

## Gap Analysis

What needs to be implemented for Feature #5:

| Requirement | Current State | Action Needed |
|-------------|---------------|---------------|
| FR-007: API key validity window | No expiry check | Add validity calculation and check |
| FR-006: Event configuration endpoint | Missing | Create new endpoint |
| FR-004: Live results via JSON | Only OnCourse exists | Add results ingest endpoint |
| FR-011: Ingest record logging | No logging | Add ingest_records table + logging |
| FR-012: Ignore TCP without XML | No check | Add hasXmlData flag to event |
