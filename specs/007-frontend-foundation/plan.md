# Implementation Plan: Frontend Foundation

**Branch**: `007-frontend-foundation` | **Date**: 2026-02-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-frontend-foundation/spec.md`

## Summary

Refactor the existing client SPA to support hash-based routing, two-level race navigation (class → round), category filtering with persistence, best-run results display, startlists, and Czech UI. Uses `wouter` for lightweight routing (~2.2 KB) and existing `rvp-design-system` components. No backend changes — purely frontend.

## Technical Context

**Language/Version**: TypeScript 5.x strict mode, React 18, Node.js 20 LTS
**Primary Dependencies**: wouter (new), react 18, @czechcanoe/rvp-design-system 1.0.2
**Storage**: N/A (frontend-only, all data from Client API)
**Testing**: Vitest + @testing-library/react + jsdom
**Target Platform**: Mobile-first web SPA (320px+), modern browsers
**Project Type**: Web application (monorepo: packages/client)
**Performance Goals**: Initial load <2s on 3G, no horizontal scroll on 320px+
**Constraints**: rvp-design-system only (no custom CSS), Czech UI text, hash-based URLs
**Scale/Scope**: 3 routes, ~8 components, 1 utility module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. SDD Workflow | PASS | Following full SDD: specify → clarify → plan → tasks |
| II. Issue Sync | PASS | Issue #7 updated after each phase |
| III. Headless API | PASS | Frontend consumes headless API, no admin UI |
| IV. DS Compliance | PASS | All UI from rvp-design-system, satellite mode, mobile-first |
| V. Repository Pattern | N/A | No database access in this feature |
| VI. Minimal Scope | PASS | Only specified features, wouter over react-router (YAGNI) |

No violations. No Complexity Tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-frontend-foundation/
├── plan.md              # This file
├── research.md          # Routing, navigation, labels research
├── data-model.md        # Client-side types and data flow
├── quickstart.md        # Manual test scenarios
├── contracts/
│   └── routes.md        # Route contract and component hierarchy
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
packages/client/
├── src/
│   ├── main.tsx                    # Entry point (add Router wrapper)
│   ├── App.tsx                     # Router setup, layout wrapper
│   ├── pages/
│   │   ├── EventListPage.tsx       # NEW — /#/ route
│   │   └── EventDetailPage.tsx     # NEW — /#/events/:eventId[/race/:raceId]
│   ├── components/
│   │   ├── EventList.tsx           # REFACTOR — update types, Czech labels
│   │   ├── ResultList.tsx          # REFACTOR — add BR support, Czech headers
│   │   ├── StartlistTable.tsx      # NEW — startlist display
│   │   ├── ClassTabs.tsx           # NEW — Level 1 navigation (class selector)
│   │   ├── RoundTabs.tsx           # NEW — Level 2 navigation (round selector)
│   │   ├── CategoryFilter.tsx      # NEW — FilterPills for category filtering
│   │   └── EventHeader.tsx         # NEW — event title, location, live indicator
│   ├── services/
│   │   └── api.ts                  # REFACTOR — update types, add startlist/categories
│   └── utils/
│       ├── raceTypeLabels.ts       # NEW — Czech label mapping
│       ├── groupRaces.ts           # NEW — flat races → ClassGroup[]
│       └── formatTime.ts           # NEW — extract from ResultList (reusable)
└── src/
    └── App.test.tsx                # UPDATE — test routing
```

**Structure Decision**: Existing `packages/client/` structure extended with `pages/` for route components and `utils/` for shared utilities. No new packages. Components stay flat (no deep nesting) per YAGNI.
