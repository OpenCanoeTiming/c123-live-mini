# Implementation Plan: Live Results UI

**Branch**: `010-live-results-ui` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-live-results-ui/spec.md`

## Summary

Complete the frontend live results experience by integrating WebSocket real-time updates, adding an OnCourse athletes panel, inline expandable run details, simple/detailed view toggle, and enhancing category filtering for live data. This is a frontend-only feature — all server endpoints and WebSocket protocol already exist from features #6, #7, and #9.

## Technical Context

**Language/Version**: TypeScript 5.x strict mode, React 18, Node.js 20 LTS
**Primary Dependencies**: React 18.3.1, wouter, @czechcanoe/rvp-design-system 1.0.3, Vite
**Storage**: N/A (frontend-only, all data from server API and WebSocket)
**Testing**: Vitest + React Testing Library (jsdom)
**Target Platform**: Mobile browsers (Chrome, Safari, Firefox) — mobile-first SPA
**Project Type**: Web application (frontend package in monorepo)
**Performance Goals**: Live updates <2s latency, view toggle instant, reconnect <10s
**Constraints**: rvp-design-system only (no inline styles), mobile-first, session-scoped state
**Scale/Scope**: ~200 concurrent spectators per event, 7 new components, 3 modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. SDD Workflow | PASS | Following full specify → clarify → plan → tasks workflow |
| II. GitHub Issue Sync | PASS | Issue #10 updated after each phase |
| III. Headless API | PASS | No server changes — frontend consumes existing API |
| IV. Design System Compliance | PASS | All components use rvp-design-system. Satellite mode already configured. |
| V. Repository Pattern | N/A | No database changes |
| VI. Minimal Viable Scope | PASS | Only implementing specified features. No bonus features (scoring, favorites). |

**Post-Phase 1 Re-check**: PASS — No new violations introduced. All UI built from design system components. No new dependencies added.

## Project Structure

### Documentation (this feature)

```text
specs/010-live-results-ui/
├── plan.md              # This file
├── research.md          # Phase 0: Technical decisions
├── data-model.md        # Phase 1: Client-side state model
├── quickstart.md        # Phase 1: Dev setup guide
├── contracts/           # Phase 1: API usage contracts
│   └── client-api-usage.md
└── tasks.md             # Phase 2: Task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/client/src/
├── hooks/                    # NEW: Custom hooks
│   ├── useEventWebSocket.ts  # WebSocket connection + reconnection
│   └── useEventLiveState.ts  # Live state reducer (full/diff/refresh)
├── components/               # EXISTING + NEW
│   ├── OnCoursePanel.tsx     # NEW: Collapsible on-course athletes panel
│   ├── RunDetailExpand.tsx   # NEW: Inline expanded row (gates, timestamps)
│   ├── GatePenalties.tsx     # NEW: Gate-by-gate penalty visualization
│   ├── ConnectionStatus.tsx  # NEW: Live/polling/disconnected indicator
│   ├── ViewModeToggle.tsx    # NEW: Simple/detailed view switch
│   ├── ResultList.tsx        # MODIFIED: Expandable rows, view modes
│   ├── EventHeader.tsx       # EXISTING (unchanged)
│   ├── ClassTabs.tsx         # EXISTING (unchanged)
│   ├── RoundTabs.tsx         # EXISTING (unchanged)
│   ├── CategoryFilter.tsx    # EXISTING (unchanged)
│   ├── EventList.tsx         # EXISTING (unchanged)
│   └── StartlistTable.tsx    # EXISTING (unchanged)
├── pages/
│   ├── EventDetailPage.tsx   # MODIFIED: Integrate WS, OnCourse, view mode
│   └── EventListPage.tsx     # EXISTING (unchanged)
├── services/
│   └── api.ts                # MODIFIED: Add getOnCourse()
└── utils/
    ├── formatTime.ts         # EXISTING (unchanged)
    ├── groupRaces.ts         # EXISTING (unchanged)
    └── raceTypeLabels.ts     # EXISTING (unchanged)
```

**Structure Decision**: Frontend-only changes within the existing `packages/client` structure. New hooks directory for WebSocket and state management. New components follow existing patterns. No new packages or major structural changes.

## Complexity Tracking

> No constitution violations. No complexity justifications needed.

*Table intentionally left empty — all design choices align with constitution principles.*
