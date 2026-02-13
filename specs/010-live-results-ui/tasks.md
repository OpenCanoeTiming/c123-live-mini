# Tasks: Live Results UI

**Input**: Design documents from `/specs/010-live-results-ui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec. Tests omitted from task list.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `packages/client/src/`
- Shared types: `packages/shared/src/types/`
- All paths relative to repository root `/workspace/timing/c123-live-mini/`

---

## Phase 1: Setup

**Purpose**: API service additions and directory structure for new hooks

- [X] T001 Add `getOnCourse(eventId)` function to `packages/client/src/services/api.ts` — fetches `GET /api/v1/events/:eventId/oncourse` and returns `PublicOnCourseEntry[]`. Follow existing function patterns (ApiError handling, base URL).
- [X] T002 [P] Create `packages/client/src/hooks/` directory. This is a new directory for custom React hooks (useEventWebSocket, useEventLiveState).

---

## Phase 2: Foundational (WebSocket + Live State Infrastructure)

**Purpose**: Core infrastructure that ALL user stories depend on — WebSocket connection management and client-side live state reducer.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create `useEventWebSocket` hook in `packages/client/src/hooks/useEventWebSocket.ts`. Implements: connect to `ws://{host}/api/v1/events/:eventId/ws`, parse JSON messages as `WsMessage` (discriminated union from `packages/shared/src/types/websocket.ts`), automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, 15s cap), connection state tracking (`connecting | connected | reconnecting | disconnected`), cleanup on unmount. Import `WsMessage` type from shared package. Hook signature: `useEventWebSocket(eventId: string | null, onMessage: (msg: WsMessage) => void)` returns `{ connectionState: ConnectionState }`. Only connect when eventId is non-null and event status is 'running' or 'startlist'.
- [X] T004 Create `useEventLiveState` reducer hook in `packages/client/src/hooks/useEventLiveState.ts`. Implements: `EventLiveState` type (per data-model.md: event, classes, races, categories, resultsByRace as `Record<string, PublicResult[]>`, oncourse as `PublicOnCourseEntry[]`, detailedCache as `Record<string, RunDetailData>`). Reducer actions: `SET_INITIAL` (from REST load), `WS_FULL` (replace event/classes/races/categories, clear resultsByRace), `WS_DIFF` (upsert results by bib into resultsByRace[raceId], replace oncourse array, update event status), `WS_REFRESH` (clear all cached state, set flag for re-fetch), `SET_RESULTS` (from REST fetch for specific race), `SET_ONCOURSE` (from REST fetch), `CACHE_DETAILED` (store RunDetailData by `${raceId}-${bib}` key). Import types from shared package.
- [X] T005 [P] Create `ConnectionStatus` component in `packages/client/src/components/ConnectionStatus.tsx`. Displays WebSocket connection state using rvp-design-system `LiveIndicator` and `Badge`. Shows: green `LiveIndicator` when connected, yellow `Badge` "Reconnecting..." when reconnecting, gray `Badge` "Offline — polling" when disconnected (polling fallback). Props: `connectionState: ConnectionState`. Compact mobile-friendly layout.

**Checkpoint**: WebSocket infrastructure ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Live Results Updates (Priority: P1) MVP

**Goal**: Results table updates in real time via WebSocket without page refresh. Reconnects automatically on connection drop. Falls back to REST polling if WebSocket unavailable.

**Independent Test**: Open event page for a running event, ingest a new result on the server, verify it appears in the table without refresh. Kill the WebSocket server, verify polling fallback activates. Restart server, verify reconnection.

### Implementation for User Story 1

- [X] T006 [US1] Refactor `EventDetailPage` in `packages/client/src/pages/EventDetailPage.tsx` to use `useEventLiveState` reducer instead of individual useState calls for event/classes/races/categories/results. Keep existing REST fetch logic for initial load but dispatch results into reducer via `SET_INITIAL` and `SET_RESULTS` actions. Preserve all existing functionality (class tabs, round tabs, race selection, URL deep linking).
- [X] T007 [US1] Integrate `useEventWebSocket` hook into `EventDetailPage`. Connect when event is loaded and status is 'running' or 'startlist'. Pass a `handleWsMessage` callback that dispatches `WS_FULL`, `WS_DIFF`, or `WS_REFRESH` actions to the reducer. On `WS_REFRESH`, trigger REST re-fetch of current race results and oncourse data. Add `ConnectionStatus` component to the page header area (below EventHeader).
- [X] T008 [US1] Implement REST polling fallback in `EventDetailPage`. When `connectionState.status === 'disconnected'`, start a 15-second interval that calls `getEventResults(eventId, selectedRaceId)` and `getOnCourse(eventId)`, dispatching results to reducer. Stop polling when WebSocket reconnects. Use `useRef` for interval ID, clean up on unmount.
- [X] T009 [US1] Handle diff result upserts in ResultList. When results state changes (from WebSocket diff), the existing `ResultList` component in `packages/client/src/components/ResultList.tsx` should re-render with updated data. Verify that the component correctly re-sorts results by rank when a new result arrives or an existing result changes rank. No structural changes needed to ResultList for this task — the reducer handles state updates and React re-renders automatically.

**Checkpoint**: Live results updates working end-to-end. Results appear in real time, reconnection works, polling fallback activates.

---

## Phase 4: User Story 2 — OnCourse Display (Priority: P1)

**Goal**: Collapsible panel above results showing all athletes currently on the water across the entire event, with gate progress, penalties, and time-to-beat comparison.

**Independent Test**: With athletes on course, verify the OnCourse panel appears above results, shows gate progress and TTB. Collapse the panel, verify it stays collapsed. When no athletes are on course, verify the panel hides entirely.

### Implementation for User Story 2

- [X] T010 [P] [US2] Create `GatePenalties` component in `packages/client/src/components/GatePenalties.tsx`. Displays a compact visual of gate-by-gate penalties from `PublicGate[]`. Each gate shown as a small indicator: green (0 = clean), yellow (2 = touch), red (50 = missed), gray (null = not yet passed). Use rvp-design-system `Badge` for each gate. Show gate number and type (normal/reverse indicated by label or icon). Compact horizontal layout suitable for mobile. Props: `gates: PublicGate[]`.
- [X] T011 [US2] Create `OnCoursePanel` component in `packages/client/src/components/OnCoursePanel.tsx`. Collapsible panel using rvp-design-system `Card` and `SectionHeader` (with collapse/expand action). Shows each `PublicOnCourseEntry` as a card/row with: athlete name, bib, club, race class, gate progress (via `GatePenalties` component), accumulated time and penalty, provisional rank, time-to-beat comparison (ttbDiff and ttbName). Sorted by position (1 = closest to finish). Props: `oncourse: PublicOnCourseEntry[]`, `isOpen: boolean`, `onToggle: () => void`. When `oncourse` is empty, render nothing (return null).
- [X] T012 [US2] Integrate `OnCoursePanel` into `EventDetailPage`. Add oncourse state from reducer. Fetch initial oncourse data via `getOnCourse(eventId)` on mount for running events, dispatch to reducer via `SET_ONCOURSE`. Render `OnCoursePanel` above the class tabs / results section. Manage `oncoursePanelOpen` state (default: true). WebSocket diffs with `oncourse` field already handled by reducer from US1 integration (T007).
- [X] T013 [US2] Handle event status transitions for OnCourse. When event status changes to 'finished' (via WS diff), clear oncourse entries in reducer and hide the OnCourse panel. When status is 'startlist' (no live data yet), don't show OnCourse panel.

**Checkpoint**: OnCourse panel working with live updates. Shows athletes on water, collapses/expands, hides when empty.

---

## Phase 5: User Story 3 — Run Detail View (Priority: P2)

**Goal**: Tapping a result row expands it inline to show start/finish timestamps and gate-by-gate penalties. Detail data fetched on demand and cached.

**Independent Test**: Tap a result row, verify it expands showing start time, finish time, and gate penalties. Verify penalty colors: green for clean, yellow for 2s touch, red for 50s miss. Collapse the row, verify it collapses. Expand same row again, verify cached data loads instantly.

### Implementation for User Story 3

- [X] T014 [P] [US3] Create `RunDetailExpand` component in `packages/client/src/components/RunDetailExpand.tsx`. Displays inline detail for a single run below the result row. Shows: start timestamp (formatted), finish timestamp (formatted), course gate count, gate-by-gate penalties (reuses `GatePenalties` component from T010). Loading state while fetching (rvp-design-system `SkeletonCard`). Props: `detail: RunDetailData | null`, `isLoading: boolean`. Mobile-friendly layout — timestamps on one line, gates as a scrollable horizontal row or wrap.
- [X] T015 [US3] Add inline expandable row support to `ResultList` in `packages/client/src/components/ResultList.tsx`. Add `expandedRows: Set<string>` and `onToggleExpand: (key: string) => void` props. For each result row, add click handler that calls `onToggleExpand('${raceId}-${bib}')`. When a row's key is in `expandedRows`, render `RunDetailExpand` below it. Add visual indicator (chevron icon or similar from design system) on each row to show it's expandable.
- [X] T016 [US3] Implement detail data fetching and caching in `EventDetailPage`. When a row is expanded: check `detailedCache` in reducer state for `${raceId}-${bib}` key. If cached, use immediately. If not, call `getEventResults(eventId, raceId, { detailed: true })` to get all detailed results for that race, then dispatch `CACHE_DETAILED` for each result. Pass `detailedCache`, `expandedRows` state, and toggle handler to `ResultList`.

**Checkpoint**: Inline run detail expansion working. Gate penalties visualized with color coding. Detail data cached per race.

---

## Phase 6: User Story 4 — Simple/Detailed View Toggle (Priority: P2)

**Goal**: Toggle between simple view (compact rows) and detailed view (all rows expanded with penalty breakdown and timestamps). View mode persists across race navigation within session.

**Independent Test**: Default view is simple. Toggle to detailed — all rows expand to show gate penalties and timestamps. Toggle back — all rows collapse. Navigate to a different race — view mode persists (still detailed).

### Implementation for User Story 4

- [X] T017 [P] [US4] Create `ViewModeToggle` component in `packages/client/src/components/ViewModeToggle.tsx`. Simple toggle using rvp-design-system `Tabs` (pills variant) with two options: "Simple" and "Detailed" (Czech labels: "Základní" / "Detailní"). Props: `viewMode: 'simple' | 'detailed'`, `onViewModeChange: (mode: 'simple' | 'detailed') => void`. Compact inline layout suitable for placement near the results table header.
- [X] T018 [US4] Integrate view mode into `EventDetailPage`. Add `viewMode` state (default: 'simple'), persisted in component state (survives race/class navigation, resets on page reload per R8 research decision). Render `ViewModeToggle` between the category filter and results table. Pass `viewMode` to `ResultList`.
- [X] T019 [US4] Update `ResultList` in `packages/client/src/components/ResultList.tsx` to support `viewMode` prop. When `viewMode === 'detailed'`: fetch detailed data for all results in current race (call `getEventResults` with `detailed: true` once per race, cache in reducer), expand all rows to show `RunDetailExpand` component (reusing US3 infrastructure). When `viewMode === 'simple'`: show compact rows with individual expand capability (US3). Ensure best-run race columns (run 1, run 2, better-run indicator) are visible in both modes.

**Checkpoint**: View toggle working. Simple/detailed modes switch correctly. Mode persists across race navigation.

---

## Phase 7: User Story 5 — Category Filtering with Live Updates (Priority: P3)

**Goal**: Category filtering works correctly with live WebSocket data. When a category filter is active, live updates only show for athletes in the selected category. Category rank and gap displayed.

**Independent Test**: Select a category filter. Verify only athletes in that category are shown with category rank and gap. Ingest a result for an athlete outside the category — verify it doesn't appear. Switch back to "All" — verify all results shown with overall ranking.

### Implementation for User Story 5

- [X] T020 [US5] Ensure category filtering works with live data in `EventDetailPage`. The existing `CategoryFilter` component and `?catId=` API parameter already work for REST fetches. For live WebSocket diffs: when a category filter is active and a diff arrives with results, apply client-side filtering — only update the displayed results for athletes matching the selected category. Store the unfiltered results in reducer (resultsByRace) and apply category filter at render time. When category changes, if cached results exist for the race, filter client-side first, then fetch fresh `?catId=X` results from API for authoritative category rankings.
- [X] T021 [US5] Verify category rank display in `ResultList`. When a category is selected: show `catRnk` column instead of `rnk`, show `catTotalBehind` instead of `totalBehind`. This already works in the existing `ResultList` implementation (conditional column rendering based on `selectedCatId` prop). Verify it continues to work correctly when results are updated via WebSocket diffs.

**Checkpoint**: Category filtering working with live data. Category-specific ranking displayed. Live updates respect active filter.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, robustness, and final integration

- [X] T022 Handle event lifecycle transitions in `EventDetailPage`. When event status changes from 'running' to 'finished': hide `ConnectionStatus` live indicator, remove OnCourse panel, show final results with "Official" or "Finished" badge. When status is 'startlist': show startlist, no OnCourse, but connect WebSocket for incoming live data when race starts.
- [X] T023 Handle device sleep/wake reconnection. In `useEventWebSocket`, detect when the page becomes visible again (via `document.addEventListener('visibilitychange')`) and trigger immediate reconnect if connection was lost during sleep. This ensures spectators who lock their phone and come back get fresh data quickly.
- [X] T024 Handle results caching across race navigation. When user navigates to a different race (class tab or round tab change), check if `resultsByRace[newRaceId]` has cached data from a WebSocket diff. If yes, display cached data immediately while optionally fetching fresh data in background. This prevents unnecessary loading states when switching between races that have received live updates.
- [X] T025 Verify type safety across all new files. Run `npm run typecheck -w packages/client` and fix any TypeScript errors. Ensure all imports from `@c123-live-mini/shared` types are correct. Verify no `any` types introduced.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (getOnCourse in api.ts) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (WebSocket hook + reducer)
- **US2 (Phase 4)**: Depends on Phase 2 + T006 from US1 (reducer integrated into EventDetailPage)
- **US3 (Phase 5)**: Depends on Phase 2 + T006 from US1 (reducer in EventDetailPage)
- **US4 (Phase 6)**: Depends on US3 (reuses RunDetailExpand component and expandable row infrastructure)
- **US5 (Phase 7)**: Depends on US1 (live data flowing through reducer)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — no dependency on other stories
- **US2 (P1)**: Depends on US1 T006 (reducer in EventDetailPage) — but can largely be built in parallel (OnCoursePanel is an independent component)
- **US3 (P2)**: Foundation + T006 — independent component development, integrate after US1
- **US4 (P2)**: Depends on US3 (reuses RunDetailExpand and expandable row support)
- **US5 (P3)**: Depends on US1 (needs live data flow working)

### Within Each User Story

- Components before integration
- Integration into EventDetailPage after components ready
- State management changes before UI consumption

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel
- T003 and T005 (Foundational: WS hook and ConnectionStatus) can run in parallel
- T010 and T014 (GatePenalties and RunDetailExpand components) can run in parallel — independent components
- T017 (ViewModeToggle) can be built in parallel with US3 tasks

---

## Parallel Example: Phase 2 (Foundational)

```bash
# These can run in parallel (different files, no dependencies):
Task T003: "Create useEventWebSocket hook in packages/client/src/hooks/useEventWebSocket.ts"
Task T005: "Create ConnectionStatus component in packages/client/src/components/ConnectionStatus.tsx"

# T004 depends on shared types understanding but not on T003/T005:
Task T004: "Create useEventLiveState reducer in packages/client/src/hooks/useEventLiveState.ts"
```

## Parallel Example: US2 + US3 Components

```bash
# These components are independent and can be built in parallel:
Task T010: "Create GatePenalties component in packages/client/src/components/GatePenalties.tsx"
Task T014: "Create RunDetailExpand component in packages/client/src/components/RunDetailExpand.tsx"
Task T017: "Create ViewModeToggle component in packages/client/src/components/ViewModeToggle.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: US1 — Live Results Updates (T006-T009)
4. **STOP and VALIDATE**: Open event page, ingest data, verify real-time updates
5. Deploy/demo if ready — spectators already get live results

### Incremental Delivery

1. Setup + Foundational → WebSocket infrastructure ready
2. US1 → Live results updating in real time → **Deploy (MVP!)**
3. US2 → OnCourse panel shows athletes on water → Deploy
4. US3 → Tap to expand run detail → Deploy
5. US4 → Simple/Detailed toggle → Deploy
6. US5 → Category filtering with live data → Deploy
7. Polish → Edge cases, robustness → Final Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All components must use rvp-design-system exclusively (no inline styles)
- All types imported from `@c123-live-mini/shared` package
- No server changes needed — all endpoints exist from features #6, #7, #9
