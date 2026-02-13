# Feature Specification: Live Results UI

**Feature Branch**: `010-live-results-ui`
**Created**: 2026-02-13
**Status**: Draft
**Input**: Feature #10 — Complete frontend for live results display with OnCourse, WebSocket updates, run detail, view modes, and category filtering.

## Clarifications

### Session 2026-02-13

- Q: Run detail interaction pattern — inline expand, bottom sheet, or separate route? → A: Inline expandable rows (tapping a result row expands it in-place).
- Q: OnCourse section placement on event page? → A: Collapsible panel above results, defaults to expanded. Users who only care about final results can collapse it.
- Q: What does detailed view (US4) show vs. simple view and run detail (US3)? → A: Detailed view toggles expanded detail for ALL athletes (penalty rows, start/finish timestamps). US3 expands a single row in simple mode. Multi-run (best-run) columns are visible in the simple view already.
- Q: OnCourse scope — selected race, selected class, or entire event? → A: All races across the entire event — shows everyone currently on the water regardless of which race/class is selected in results.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Results Updates (Priority: P1)

A spectator opens the event page on their phone and sees race results updating in real time as athletes finish their runs. When a new result arrives, the table updates without needing to refresh the page. The spectator sees the current ranking, times, and penalties as they change.

**Why this priority**: Core value proposition of the application. Without live updates, spectators must manually refresh, which defeats the purpose of a live results system.

**Independent Test**: Can be fully tested by connecting to a running event and observing that results appear automatically as they are ingested. Delivers immediate value — spectators see results the moment they happen.

**Acceptance Scenarios**:

1. **Given** a spectator has the event page open and a race is running, **When** a new result is ingested by the server, **Then** the result appears in the results table without page refresh.
2. **Given** a spectator has the event page open, **When** the WebSocket connection drops and reconnects, **Then** the full current state is restored automatically and updates resume.
3. **Given** a spectator opens an event page for the first time, **When** the page loads, **Then** the initial state is fetched via REST and a WebSocket connection is established for subsequent updates.
4. **Given** a result already displayed in the table is updated (e.g., penalty change), **When** the update arrives via WebSocket, **Then** the existing row updates in place with the new data.

---

### User Story 2 - OnCourse Display (Priority: P1)

A spectator wants to see which athletes are currently on the water. The OnCourse section shows athletes in progress with their current gate penalties, running time comparison (time-to-beat), and position on the course. This gives spectators real-time awareness of the race action.

**Why this priority**: OnCourse is the most dynamic and exciting part of live results — it shows what's happening right now. Equal priority with live results because together they form the core live experience.

**Independent Test**: Can be tested by having athletes on course and verifying the display shows their progress, gate penalties, and time-to-beat comparison. Delivers immediate value for spectators watching the race live.

**Acceptance Scenarios**:

1. **Given** athletes are on the water, **When** the spectator views the event page, **Then** a collapsible OnCourse panel above the results table is visible (expanded by default) showing all athletes currently on course across the entire event, regardless of which race/class is selected in the results below.
2. **Given** an athlete is on course, **When** they pass a gate with a penalty, **Then** the gate penalty updates in the OnCourse display.
3. **Given** an athlete finishes their run, **When** the completion is received, **Then** the athlete is removed from OnCourse and their result appears in the results table.
4. **Given** no athletes are on course, **When** the spectator views the page, **Then** the OnCourse panel is hidden (collapses entirely).
5. **Given** the OnCourse panel is expanded, **When** the spectator collapses it, **Then** it stays collapsed and only the results table is visible.

---

### User Story 3 - Run Detail View (Priority: P2)

A spectator or coach wants to see detailed information about an individual run — start time, finish time, and gate-by-gate penalties. They tap on a result row which expands inline to reveal this granular information directly below the row, keeping the user in context within the results list.

**Why this priority**: Important for coaches and insiders who need detailed analysis, but not essential for the basic live experience that most spectators need.

**Independent Test**: Can be tested by tapping a result row and verifying that detailed run information (start/finish timestamps, individual gate penalties with gate types) is displayed correctly.

**Acceptance Scenarios**:

1. **Given** a result is displayed in the results table, **When** the spectator taps/clicks on the result row, **Then** the row expands inline to show start time, finish time, and gate-by-gate penalties below.
2. **Given** the detail view is open, **When** a gate has a 2-second penalty, **Then** it is visually distinguished from a clean gate pass.
3. **Given** the detail view is open, **When** a gate has a 50-second (missed gate) penalty, **Then** it is visually distinguished as a serious penalty.
4. **Given** the detail view is open for an athlete still on course, **When** gates not yet passed are shown, **Then** they are displayed as pending/unknown.

---

### User Story 4 - Simple/Detailed View Toggle (Priority: P2)

A spectator can switch between a simple view and a detailed view. The simple view shows times, penalties, ranking, age category, and for best-run races both run columns — optimized for quick scanning on mobile. The detailed view expands all result rows to show additional information: penalty breakdown (gate-by-gate summary), start/finish timestamps. This is essentially the same detail shown by tapping a single row (US3), but applied to all athletes at once. The detailed view serves insiders and coaches who want full data at a glance.

**Why this priority**: Enhances the user experience by serving both casual spectators and knowledgeable insiders, but the simple view (already partially implemented) delivers base value.

**Independent Test**: Can be tested by toggling the view switch and verifying that all result rows expand/collapse to show or hide penalty and timestamp details.

**Acceptance Scenarios**:

1. **Given** the results table is displayed, **When** the page loads, **Then** the simple view is shown by default.
2. **Given** the simple view is active, **When** the spectator toggles to detailed view, **Then** all result rows expand to show penalty breakdown and start/finish timestamps.
3. **Given** the detailed view is active, **When** the spectator toggles back to simple view, **Then** the expanded detail rows collapse back to compact rows.
4. **Given** the spectator switches view mode, **When** they navigate to another race, **Then** the chosen view mode persists.
5. **Given** a best-run race is displayed in simple view, **When** the spectator views results, **Then** both run columns and the better-run indicator are visible without needing the detailed toggle.

---

### User Story 5 - Age Category Filtering with Category Ranking (Priority: P3)

A spectator wants to filter results by age category (e.g., Junior, U23) and see ranking within that category. When a category filter is active, the table shows the category-specific rank and gap to category leader alongside (or instead of) the overall rank.

**Why this priority**: Valuable for parents and coaches tracking specific age groups, but the overall results view already provides the core information.

**Independent Test**: Can be tested by selecting a category filter and verifying that the results table shows category-specific ranking, gap, and filtered athletes.

**Acceptance Scenarios**:

1. **Given** an event has multiple age categories, **When** the spectator selects a specific category, **Then** only athletes in that category are shown.
2. **Given** a category filter is active, **When** results are displayed, **Then** category rank and category gap are shown.
3. **Given** a category filter is active, **When** a live update arrives for an athlete outside the selected category, **Then** the update does not appear in the filtered view.
4. **Given** the "All" filter is selected, **When** results are displayed, **Then** overall ranking is shown for all athletes.

---

### Edge Cases

- What happens when the WebSocket connection cannot be established (e.g., corporate firewall)? System falls back to REST polling at a reasonable interval.
- What happens when an event transitions from "running" to "finished"? The live indicator disappears, OnCourse section is removed, and final results are displayed.
- What happens when the server sends a "refresh" message? The client discards cached data and re-fetches the full state via REST.
- What happens when the device goes to sleep and wakes up? The WebSocket reconnects and receives a full state update.
- What happens when results arrive for a race the user is not currently viewing? The data is cached locally so it's available when the user navigates to that race.
- What happens on a very slow mobile connection? Loading states are shown, and updates are applied as they arrive without blocking the UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST establish a WebSocket connection to the server when the spectator views a running event, and receive real-time updates.
- **FR-002**: System MUST apply incoming WebSocket diff messages to update the displayed results, OnCourse entries, and event status without full page reload.
- **FR-003**: System MUST handle WebSocket full-state messages by replacing the current cached state entirely.
- **FR-004**: System MUST handle WebSocket refresh messages by discarding local cache and re-fetching via REST API.
- **FR-005**: System MUST automatically reconnect the WebSocket when the connection drops, with exponential backoff.
- **FR-006**: System MUST display an OnCourse section as a collapsible panel above the results table (expanded by default) showing all athletes currently on the water across the entire event (not filtered by selected race/class), including their gate progress, accumulated penalties, and time-to-beat comparison. The panel hides entirely when no athletes are on course.
- **FR-007**: System MUST provide a run detail view as an inline expandable row showing start time, finish time, course gate count, and gate-by-gate penalties with gate type (normal/reverse) distinction.
- **FR-008**: System MUST provide a toggle between simple view (rank, name, time, penalty, total, gap; plus both run columns for best-run races) and detailed view (all rows expanded with penalty breakdown and start/finish timestamps).
- **FR-009**: System MUST default to simple view on page load. In simple view, individual rows can still be expanded via tap (US3).
- **FR-010**: System MUST support filtering results by age category with category-specific ranking and gap display.
- **FR-011**: System MUST gracefully handle connection failures by falling back to periodic REST polling.
- **FR-012**: System MUST visually indicate when the connection is live (receiving real-time updates) versus when using fallback polling.
- **FR-013**: System MUST update OnCourse display in real time as athletes progress through gates.
- **FR-014**: System MUST remove athletes from OnCourse when they complete their run and ensure their result appears in the results table.
- **FR-015**: System MUST persist the selected view mode (simple/detailed) across race navigation within the same session.

### Key Entities

- **OnCourse Entry**: An athlete currently on the water — identified by bib and race, with gate progress, running time, penalties, provisional rank, and time-to-beat comparison.
- **Run Detail**: Detailed breakdown of a single run — start/finish timestamps, gate-by-gate penalties with gate types, total time and penalty.
- **View Mode**: User preference for result display density — simple (minimal columns) or detailed (full gate/timing data).
- **Live Connection State**: The current state of the WebSocket connection — connected, reconnecting, disconnected (polling fallback).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Live result updates appear on the spectator's screen within 2 seconds of the data arriving at the server.
- **SC-002**: After a connection drop, the system reconnects and restores full state within 10 seconds under normal network conditions.
- **SC-003**: The OnCourse display accurately reflects athletes on the water — athletes appear within 2 seconds of starting and disappear within 2 seconds of finishing.
- **SC-004**: Run detail view loads within 1 second of user interaction (tap/click on result row).
- **SC-005**: View mode toggle takes effect immediately with no visible loading delay.
- **SC-006**: Category filtering updates the displayed results within 1 second of selection.
- **SC-007**: The application remains responsive and usable on mobile devices with standard 4G connectivity during live race conditions.
- **SC-008**: All live features work correctly on the latest versions of Chrome, Safari, and Firefox mobile browsers.
