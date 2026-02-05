# Implementation Plan: Technical PoC

**Branch**: `003-technical-poc` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-technical-poc/spec.md`

## Summary

Proof of concept to validate the end-to-end technical stack: Fastify server with SQLite/Kysely persistence, React frontend with rvp-design-system, connected via REST API. Validates that all components work together before building real features.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Fastify (server), Kysely + better-sqlite3 (database), React + Vite (frontend), rvp-design-system (UI)
**Storage**: SQLite (file-based, auto-created on startup)
**Testing**: Vitest (unit/integration), Playwright (E2E - optional for PoC)
**Target Platform**: Node.js server + Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (monorepo with npm workspaces)
**Performance Goals**: Health endpoint <100ms, page load <3s (PoC baseline)
**Constraints**: No external database server, no authentication, REST only (no WebSocket)
**Scale/Scope**: Single developer testing, minimal data volume

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution not yet configured for this project. Proceeding with standard best practices:

- [x] Monorepo structure justified (server + frontend separation)
- [x] Dependencies are minimal and well-established
- [x] No unnecessary complexity for PoC scope
- [x] Testing approach proportional to PoC goals

## Project Structure

### Documentation (this feature)

```text
specs/003-technical-poc/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI)
│   └── openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── server/
│   ├── src/
│   │   ├── app.ts           # Fastify app setup
│   │   ├── server.ts        # Entry point
│   │   ├── db/
│   │   │   ├── client.ts    # Kysely client
│   │   │   └── migrations/  # Database migrations
│   │   ├── routes/
│   │   │   ├── health.ts    # Health endpoint
│   │   │   └── events.ts    # Event CRUD endpoints
│   │   └── repositories/
│   │       └── event.ts     # Event repository
│   ├── tests/
│   │   └── routes/
│   ├── package.json
│   └── tsconfig.json
│
└── page/
    ├── src/
    │   ├── main.tsx         # React entry point
    │   ├── App.tsx          # Root component
    │   ├── components/
    │   │   └── EventList.tsx
    │   └── services/
    │       └── api.ts       # API client
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts

package.json                  # Root workspace config
tsconfig.base.json           # Shared TS config
```

**Structure Decision**: Monorepo with npm workspaces. `packages/server` for Fastify backend, `packages/page` for React frontend. Shared TypeScript configuration at root.
