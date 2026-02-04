# Implementation Plan: Protocol Analysis & Data Model

**Branch**: `002-data-model` | **Date**: 2026-02-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-data-model/spec.md`

## Summary

Design SQLite data model for c123-live-mini based on C123 protocol XML format analysis. The model must support live results display, OnCourse real-time tracking, multi-run races (BR1/BR2), and age category filtering. Data is ingested from c123-server via JSON API, stored in SQLite using Kysely, and served to React frontend via REST/WebSocket.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Fastify, Kysely, better-sqlite3
**Storage**: SQLite (file-based, Repository Pattern)
**Testing**: Vitest
**Target Platform**: Linux server (Railway), Browser (React SPA)
**Project Type**: Web application (monorepo: server + client + shared)
**Performance Goals**: 100-300 concurrent users, <1s query response
**Constraints**: Complete data retention (~10 events/season), OnCourse in-memory only
**Scale/Scope**: ~10 events/season, single-digit MB per event

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No project constitution defined (template only). Proceeding without gates.

**Implicit principles from PROJECT.md:**
- ✅ Repository Pattern for DB access
- ✅ Headless API (no admin UI in this service)
- ✅ Type-safe SQL via Kysely
- ✅ Shared types between server/client

## Project Structure

### Documentation (this feature)

```text
specs/002-data-model/
├── plan.md              # This file
├── research.md          # Phase 0 output - XML format analysis
├── data-model.md        # Phase 1 output - SQLite schema design
├── quickstart.md        # Phase 1 output - setup guide
├── contracts/           # Phase 1 output - API contracts
│   └── api.md           # REST API endpoints for data model
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── server/
│   └── src/
│       ├── db/
│       │   ├── schema.ts        # Kysely table definitions
│       │   ├── migrations/      # SQL migrations
│       │   └── repositories/    # Repository classes
│       ├── models/              # TypeScript interfaces
│       └── services/            # Business logic
├── client/
│   └── src/
│       ├── types/               # Shared type imports
│       └── services/            # API client
└── shared/
    └── src/
        └── types/               # Shared domain types
            ├── event.ts
            ├── participant.ts
            ├── race.ts
            ├── result.ts
            └── index.ts
```

**Structure Decision**: Existing monorepo with npm workspaces. Data model types go in `packages/shared/src/types/`, DB schema in `packages/server/src/db/`.

## Complexity Tracking

> No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
