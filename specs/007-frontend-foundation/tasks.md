# Tasks: Frontend Foundation

**Input**: Design documents from `/specs/007-frontend-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes.md

**Organization**: Tasks are grouped by user story. Phase 2 (Foundational) sets up routing and API types that all stories depend on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies, create shared utilities

- [ ] T001 Install wouter dependency in client package — `npm install wouter -w @c123-live-mini/client`
- [ ] T002 [P] Create time formatting utility — extract `formatTime` and `formatPenalty` from ResultList.tsx into reusable `packages/client/src/utils/formatTime.ts` per data-model.md
- [ ] T003 [P] Create race type Czech label mapping — `raceType → Czech label` per research.md R3 in `packages/client/src/utils/raceTypeLabels.ts` (include `getRaceTypeLabel()` and `isBestRunRace()` helpers)
- [ ] T004 [P] Create race grouping utility — flat race array → ClassGroup[] per research.md R2 in `packages/client/src/utils/groupRaces.ts` (group by classId, sort by raceOrder, handle single class/race edge cases)

**Checkpoint**: Shared utilities ready. `npm run build` passes.

---

## Phase 2: Foundational (API Types + Routing Shell)

**Purpose**: Update API types for Feature #6 compatibility, set up hash routing with page shells

**⚠️ CRITICAL**: All user story work depends on this phase.

- [ ] T005 Update API response types in `packages/client/src/services/api.ts` — remove `id` (integer), `participantId`, `disId` fields; add `raceType`, `athleteId`, `facility`, `catTotalBehind` per data-model.md; update EventListItem, EventDetail, RaceInfo, ResultEntry interfaces
- [ ] T006 Add startlist API function `getStartlist(eventId, raceId)` returning StartlistEntry[] in `packages/client/src/services/api.ts` per data-model.md StartlistEntry type
- [ ] T007 [P] Add categories API function `getCategories(eventId)` returning CategoryInfo[] in `packages/client/src/services/api.ts` per data-model.md CategoryInfo type
- [ ] T008 Set up wouter hash routing in `packages/client/src/App.tsx` — configure HashRouter with routes: `/#/` → EventListPage, `/#/events/:eventId` → EventDetailPage, `/#/events/:eventId/race/:raceId` → EventDetailPage; wrap in PageLayout satellite; move existing header/footer into App shell
- [ ] T009 [P] Create EventListPage shell in `packages/client/src/pages/EventListPage.tsx` — move event fetching logic from current App.tsx, render EventList component
- [ ] T010 [P] Create EventDetailPage shell in `packages/client/src/pages/EventDetailPage.tsx` — accept eventId and optional raceId from route params, placeholder for event detail rendering

**Checkpoint**: App routes between two pages. API types match Feature #6. `npm run build` passes.

---

## Phase 3: User Story 1 — Browse and Select Events (Priority: P1) 🎯 MVP

**Goal**: Spectators see event list, tap to navigate to event detail

**Independent Test**: Open app, see event list with Czech status labels and live indicator, tap event → navigates to `/#/events/:eventId`

### Implementation

- [ ] T011 [US1] Refactor EventList component — update to use new API types (no `id` field), Czech status labels ("probíhá", "dokončeno", "startovní listina"), use `eventId` as key; update Badge labels in `packages/client/src/components/EventList.tsx`
- [ ] T012 [US1] Complete EventListPage — fetch events on mount, show SkeletonCard during loading, EmptyState with Czech text ("Žádné závody nejsou k dispozici") when empty, error state with Czech message ("Chyba připojení") and retry button ("Zkusit znovu"), navigate to `/#/events/:eventId` on event click in `packages/client/src/pages/EventListPage.tsx`
- [ ] T013 [US1] Verify live indicator — ensure LiveIndicator shows on events with status "running" in EventList component in `packages/client/src/components/EventList.tsx`

**Checkpoint**: Event list page fully functional with Czech UI. Tapping event navigates to event detail URL.

---

## Phase 4: User Story 2 — View Race Results (Priority: P1)

**Goal**: Two-level race navigation (class → round), results table with Czech headers, best-run support

**Independent Test**: Navigate to event, see class tabs + round tabs, view results table with Czech headers. Switch classes/rounds. BR races show both runs.

### Implementation

- [ ] T014 [P] [US2] Create EventHeader component — display event mainTitle, subTitle, location, dates, discipline; show LiveIndicator when status is "running"; use SectionHeader from DS in `packages/client/src/components/EventHeader.tsx`
- [ ] T015 [P] [US2] Create ClassTabs component — render Tabs (variant="pills") for class-level navigation; accept classGroups and selectedClassId; hide entirely when only one class; callback onClassChange in `packages/client/src/components/ClassTabs.tsx`
- [ ] T016 [P] [US2] Create RoundTabs component — render Tabs (variant="pills", size="sm") for round-level navigation within selected class; use Czech labels from raceTypeLabels.ts; hide when only one race in class; callback onRaceChange in `packages/client/src/components/RoundTabs.tsx`
- [ ] T017 [US2] Refactor ResultList for standard results — Czech column headers (Poř., St.č., Jméno, Čas, Trest, Výsledek, Ztráta), monospace font for time values, DNS/DNF/DSQ at bottom with status in red, remove stale race info header (disId); use updated API types in `packages/client/src/components/ResultList.tsx`
- [ ] T018 [US2] Add best-run display mode to ResultList — when race is best-run type (detect via `isBestRunRace()`), show columns for 1. jízda and 2. jízda per athlete, highlight better run (bold), show Výsledek as `totalTotal`; use `prevTime`, `prevPen`, `prevTotal`, `betterRunNr` fields in `packages/client/src/components/ResultList.tsx`
- [ ] T019 [US2] Complete EventDetailPage — fetch event detail + categories on mount; derive classGroups using groupRaces utility; manage selectedClassId and selectedRaceId state; auto-select first class and first race; fetch results when race changes; for BR races automatically add `includeAllRuns=true`; render EventHeader, ClassTabs, RoundTabs, ResultList; show SkeletonCard during loading, EmptyState with Czech messages on error/empty in `packages/client/src/pages/EventDetailPage.tsx`
- [ ] T020 [US2] Handle single class/race edge case — skip ClassTabs when only one class; skip RoundTabs when only one race in class; show results directly in `packages/client/src/pages/EventDetailPage.tsx`

**Checkpoint**: Full two-level navigation works. Standard results and BR results display correctly with Czech UI.

---

## Phase 5: User Story 3 — Filter Results by Category (Priority: P2)

**Goal**: Category filter with persistence across race/round changes

**Independent Test**: View results, select category filter → see filtered results with catRnk. Switch races → filter stays. Clear filter → full results.

### Implementation

- [ ] T021 [P] [US3] Create CategoryFilter component — use FilterPills from DS; render available categories from API; show "Vše" (all) option; highlight active filter; callback onCategoryChange; hide when no categories available in `packages/client/src/components/CategoryFilter.tsx`
- [ ] T022 [US3] Integrate category filter into EventDetailPage — fetch categories via getCategories on event load; manage selectedCatId state that persists across race/round changes; pass catId to getEventResults API call; render CategoryFilter between navigation and results; show EmptyState when filtered results are empty ("V této kategorii nejsou žádní závodníci v tomto závodě") in `packages/client/src/pages/EventDetailPage.tsx`

**Checkpoint**: Category filtering works with persistence. Switching races keeps filter active.

---

## Phase 6: User Story 4 — URL-Based Navigation (Priority: P2)

**Goal**: Hash-based URLs update on navigation, deep links work, browser back/forward works

**Independent Test**: Navigate to event/race, copy URL, open in new tab → same view loads. Use browser back → returns to previous view.

### Implementation

- [ ] T023 [US4] Wire URL updates on navigation — when class/race changes in EventDetailPage, update URL hash to `/#/events/:eventId/race/:raceId` using wouter's `useLocation`; when navigating back to event list, URL returns to `/#/` in `packages/client/src/pages/EventDetailPage.tsx`
- [ ] T024 [US4] Handle deep linking — when EventDetailPage loads with raceId from URL params, find the matching class and race from the loaded data, set selectedClassId and selectedRaceId accordingly; if raceId not found in event's races, show error in `packages/client/src/pages/EventDetailPage.tsx`
- [ ] T025 [US4] Add NotFound handling — when event API returns 404, show "Závod nenalezen" message with link ("Zpět na přehled závodů") navigating to `/#/`; handle in EventDetailPage error state in `packages/client/src/pages/EventDetailPage.tsx`

**Checkpoint**: URLs are shareable. Deep links load correct view. Back button works. 404 shows Czech message.

---

## Phase 7: User Story 5 — View Startlist (Priority: P3)

**Goal**: Display startlist when race has no results but has published start data

**Independent Test**: Navigate to race with startlist but no results → see startlist table with Czech headers.

### Implementation

- [ ] T026 [P] [US5] Create StartlistTable component — Czech column headers (St.č., Jméno, Klub, Kategorie); use Table from DS; show athletes in start order (by startNr); display bib, name, club, catId; EmptyState when empty in `packages/client/src/components/StartlistTable.tsx`
- [ ] T027 [US5] Integrate startlist into EventDetailPage — when results are empty for selected race, fetch startlist via getStartlist; show StartlistTable instead of ResultList; if both startlist and results exist, show results (results take priority); show empty state when neither exists ("Zatím nejsou k dispozici žádná data") in `packages/client/src/pages/EventDetailPage.tsx`

**Checkpoint**: Startlists display for races without results. Results take priority when both exist.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: DS compliance, inline style cleanup, test updates, validation

- [ ] T028 Remove inline styles — scan all components for inline `style={}` attributes; replace with DS component props or DS CSS variables where possible; document any remaining inline styles that have no DS equivalent in `packages/client/src/components/*.tsx` and `packages/client/src/pages/*.tsx`
- [ ] T029 [P] Update existing tests — update App.test.tsx for new routing structure; ensure tests pass with wouter HashRouter wrapping; update mocks for new API types in `packages/client/src/App.test.tsx`
- [ ] T030 [P] Verify responsive behavior — test all pages at 320px viewport width; ensure no horizontal scroll; verify tap targets are at least 44px; test on mobile device emulation
- [ ] T031 Run full quickstart.md validation — seed database, start dev server, execute all 10 quickstart scenarios manually; verify all Czech labels, loading states, error states, and navigation flows work as specified in `specs/007-frontend-foundation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (uses utilities + wouter)
- **Phases 3-7 (User Stories)**: All depend on Phase 2 completion
- **Phase 8 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Browse Events)**: Can start after Phase 2 — independent, EventListPage only
- **US2 (View Results)**: Can start after Phase 2 — independent, EventDetailPage; most complex story
- **US3 (Category Filter)**: Depends on US2 completion (adds filter to EventDetailPage)
- **US4 (URL Navigation)**: Depends on US2 completion (adds URL sync to EventDetailPage)
- **US5 (Startlist)**: Depends on US2 completion (adds fallback view to EventDetailPage)

### Within Each User Story

- Components marked [P] can be created in parallel (different files)
- Page integration tasks depend on component tasks completing
- EventDetailPage tasks within US2 are sequential (state management builds up)

### Parallel Opportunities

- T002, T003, T004 can all run in parallel (Phase 1 — different utility files)
- T006, T007 can run in parallel (different API functions)
- T009, T010 can run in parallel (different page shells)
- T014, T015, T016 can run in parallel (different components, US2)
- T021 can run in parallel with US2 work (different component file)
- T026 can run in parallel with US3/US4 work (different component file)
- T028, T029, T030 can run in parallel (Phase 8 — different concerns)

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010) — **critical path**
3. Complete Phase 3: US1 Browse Events (T011-T013)
4. Complete Phase 4: US2 View Results (T014-T020)
5. **STOP and VALIDATE**: Event list + two-level navigation + results table functional with Czech UI

### Incremental Delivery

6. Add US3 Category Filter (T021-T022)
7. Add US4 URL Navigation (T023-T025)
8. Add US5 Startlist (T026-T027)
9. Polish (T028-T031)

---

## Notes

- This feature is frontend-only — no backend/database changes.
- US1 and US2 are both P1 but US1 can be completed independently. US2 is the largest story.
- US3, US4, US5 all extend EventDetailPage from US2, so they depend on US2 completing first.
- All Czech labels are defined in research.md R3. Error/empty state texts are in task descriptions.
- BR best-run detection uses `isBestRunRace()` from raceTypeLabels.ts utility.
- Category filter persistence is managed via React state in EventDetailPage — selectedCatId does NOT reset on race change.
