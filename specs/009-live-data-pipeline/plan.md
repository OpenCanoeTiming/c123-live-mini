# Implementation Plan: Live Data Pipeline

**Branch**: `009-live-data-pipeline` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-live-data-pipeline/spec.md`

## Summary

Implement WebSocket server for real-time event updates using `@fastify/websocket`. Add a `WebSocketManager` service for per-event connection tracking, room-based broadcasting, and ping/pong heartbeat. Integrate broadcast triggers into existing ingest routes (XML, results, oncourse) and admin status transitions. Define shared WebSocket message types (full/diff/refresh) reusing Client API data structures.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (strict mode)
**Primary Dependencies**: Fastify, Kysely, better-sqlite3, `@fastify/websocket` (new)
**Storage**: SQLite file-based (`packages/server/data/live-mini.db`), Repository Pattern — no schema changes
**Testing**: Vitest (unit + integration)
**Target Platform**: Cloud deployment (Railway), Linux server
**Project Type**: Monorepo (npm workspaces) - packages/server, packages/page, packages/shared
**Performance Goals**: Updates delivered within 2s of ingestion (SC-001), 200 concurrent connections per event (SC-004)
**Constraints**: Unidirectional WebSocket (server → client), no auth on WS, single instance
**Scale/Scope**: 200 concurrent connections per event, 8+ hours continuous operation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | Following SDD workflow: specify → clarify → plan |
| II. GitHub Issue State Sync | ✅ PASS | Issue #9 updated after each phase |
| III. Headless API Architecture | ✅ PASS | WebSocket is server-to-client push, no Admin UI added |
| IV. Design System Compliance | N/A | Backend-only feature (frontend WebSocket client is future work) |
| V. Repository Pattern | ✅ PASS | Full state payload composed via existing repositories |
| VI. Minimal Viable Scope | ✅ PASS | No pub/sub middleware, no event sourcing, no distributed WS |

## Project Structure

### Documentation (this feature)

```text
specs/009-live-data-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── websocket.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/shared/
└── src/types/
    ├── websocket.ts             # NEW: WsMessage, WsFullPayload, WsDiffPayload types
    └── index.ts                 # MODIFY: export WebSocket types

packages/server/
├── src/
│   ├── app.ts                   # MODIFY: register @fastify/websocket, create WebSocketManager
│   ├── services/
│   │   └── WebSocketManager.ts  # NEW: connection tracking, rooms, broadcast, heartbeat
│   └── routes/
│       ├── websocket.ts         # NEW: GET /api/v1/events/:eventId/ws handler
│       ├── ingest.ts            # MODIFY: add broadcast triggers after ingestion
│       └── admin.ts             # MODIFY: add broadcast trigger after state transition
└── tests/
    ├── unit/
    │   └── WebSocketManager.test.ts  # NEW: room management, broadcast, heartbeat tests
    └── integration/
        └── websocket.test.ts         # NEW: endpoint tests (connect, full state, diffs)
```

**Structure Decision**: Follows existing monorepo layout. Single new service `WebSocketManager.ts` encapsulates all WebSocket state management. Single new route file `websocket.ts` handles the endpoint. Modifications to existing ingest and admin routes are minimal (adding broadcast calls). No new directories needed.

## Constitution Check (Post-Design)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ PASS | All artifacts generated |
| II. GitHub Issue State Sync | ✅ PASS | Will update after plan phase |
| III. Headless API Architecture | ✅ PASS | WebSocket is read-only push channel, no admin UI |
| IV. Design System Compliance | N/A | No frontend changes in this feature |
| V. Repository Pattern | ✅ PASS | Full state composed via existing repositories, no direct DB access in WebSocket code |
| VI. Minimal Viable Scope | ✅ PASS | Direct broadcast calls, no event bus abstraction, no distributed concerns |
