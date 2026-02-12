# Implementation Plan: Event Lifecycle

**Branch**: `008-event-lifecycle` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-event-lifecycle/spec.md`

## Summary

Implement event state management with a state machine enforcing valid transitions between five lifecycle states (draft, startlist, running, finished, official). Add an admin endpoint for state changes, state-dependent data ingestion rules on existing ingest routes, WebSocket diff notifications on state change, and a database migration for transition timestamps.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (strict mode)
**Primary Dependencies**: Fastify, Kysely, better-sqlite3
**Storage**: SQLite file-based (`packages/server/data/live-mini.db`), Repository Pattern
**Testing**: Vitest (unit + integration)
**Target Platform**: Cloud deployment (Railway), Linux server
**Project Type**: Monorepo (npm workspaces) - packages/server, packages/page, packages/shared
**Performance Goals**: State transitions <200ms, ingestion state checks add <10ms overhead
**Constraints**: Headless API (no Admin UI), no preconditions on transitions
**Scale/Scope**: Single active event per API key, ~10 concurrent requests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | Following SDD workflow: specify → clarify → plan |
| II. GitHub Issue State Sync | ✅ PASS | Issue #8 updated after each phase |
| III. Headless API Architecture | ✅ PASS | State changes via API endpoint, no Admin UI |
| IV. Design System Compliance | N/A | Backend-only feature (no frontend changes) |
| V. Repository Pattern | ✅ PASS | Status updates via EventRepository |
| VI. Minimal Viable Scope | ✅ PASS | No audit log, no preconditions, no auto-transitions |

## Project Structure

### Documentation (this feature)

```text
specs/008-event-lifecycle/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── admin-status.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/shared/
└── src/types/
    └── event.ts              # Add VALID_TRANSITIONS, ALLOWED_INGEST constants

packages/server/
├── src/
│   ├── db/
│   │   ├── schema.ts                    # Add status_changed_at to EventsTable
│   │   ├── migrations/
│   │   │   └── 010_add_status_changed_at.ts  # New migration
│   │   └── repositories/
│   │       └── EventRepository.ts       # Add updateStatusWithTimestamp()
│   ├── services/
│   │   └── EventLifecycleService.ts     # New: state machine + transition logic
│   ├── middleware/
│   │   └── apiKeyAuth.ts                # Add status to AuthenticatedRequest
│   ├── routes/
│   │   ├── admin.ts                     # Add PATCH status endpoint
│   │   └── ingest.ts                    # Add state-dependent guards
│   └── schemas/
│       └── index.ts                     # Add updateStatusSchema
└── tests/
    ├── unit/
    │   └── EventLifecycleService.test.ts  # State machine validation tests
    └── integration/
        ├── admin-status.test.ts           # Admin endpoint tests
        └── ingest-state-guards.test.ts    # Ingestion state rule tests
```

**Structure Decision**: Follows existing monorepo layout. New service file `EventLifecycleService.ts` encapsulates state machine logic, keeping route handlers thin. No new directories needed — fits within existing `services/`, `routes/`, `migrations/` structure.

## Constitution Check (Post-Design)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | All artifacts generated |
| II. GitHub Issue State Sync | ✅ PASS | Will update after plan phase |
| III. Headless API Architecture | ✅ PASS | PATCH endpoint, API key auth |
| IV. Design System Compliance | N/A | No frontend changes |
| V. Repository Pattern | ✅ PASS | `updateStatusWithTimestamp()` via EventRepository |
| VI. Minimal Viable Scope | ✅ PASS | Single service, no over-engineering |
