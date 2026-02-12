# Feature Specification: Frontend Foundation

**Feature Branch**: `007-frontend-foundation`
**Created**: 2026-02-12
**Status**: Draft
**Input**: Feature #7 — Basic frontend with RVP Design System integration, data display from API, responsive mobile-first layout

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse and Select Events (Priority: P1)

A spectator opens the application on their phone at a canoe slalom venue. They see a list of available events with clear visual indicators showing which events are currently live, which have finished results, and which have published startlists. They tap on an event to view its details. The selected event's races and schedule become visible.

**Why this priority**: This is the entry point to the entire application. Without event browsing, no other functionality is reachable. It must work reliably on mobile devices since most spectators use phones at the venue.

**Independent Test**: Open the application in a mobile browser, see a list of events, tap one, and view the event's race schedule. Delivers immediate value — spectators can find and select their event.

**Acceptance Scenarios**:

1. **Given** the application is opened, **When** events exist in the system, **Then** a list of non-draft events is displayed ordered by start date (most recent first)
2. **Given** the event list is displayed, **When** the spectator taps an event, **Then** the event detail view shows the event name, location, dates, discipline, and a list of races
3. **Given** the event list is loading, **When** the data has not yet arrived, **Then** skeleton placeholders are shown instead of a blank screen
4. **Given** the server is unreachable, **When** the event list fails to load, **Then** an error message with a retry action is displayed
5. **Given** an event is live (status "running"), **When** the event list is displayed, **Then** a live indicator is visible next to that event

---

### User Story 2 — View Race Results (Priority: P1)

A spectator has selected an event and wants to see race results. They see a race selector (tabs) and a results table showing ranked athletes with times, penalties, and time behind leader. They can switch between races using the tabs. Results for DNS/DNF/DSQ athletes appear at the bottom with their status clearly indicated.

**Why this priority**: Results are the primary reason spectators use the application. This is the core value proposition — seeing who is winning and by how much.

**Independent Test**: Navigate to an event with completed races, see a results table with ranking, names, times, penalties, totals, and behind. Switch between races using tabs. Delivers the core value — spectators can check results.

**Acceptance Scenarios**:

1. **Given** an event is selected with multiple races, **When** the event detail loads, **Then** race tabs are shown and the first race is auto-selected with its results displayed
2. **Given** results are displayed, **When** the spectator taps a different race tab, **Then** results for the selected race replace the previous results
3. **Given** a race has results, **When** results are displayed, **Then** each row shows rank, bib number, athlete name, club/country, run time, penalties, total time, and time behind leader
4. **Given** a race has DNS/DNF/DSQ athletes, **When** results are displayed, **Then** these athletes appear at the bottom with their status label instead of times
5. **Given** a race has no results yet, **When** results are requested, **Then** an empty state message indicates results will appear when the race starts

---

### User Story 3 — Filter Results by Category (Priority: P2)

A spectator wants to see results for a specific age category (e.g., "Ženy Seniorky" or "Muži Junioři"). They select a category filter and see only athletes from that category with category-specific rankings. They can clear the filter to return to the full results view.

**Why this priority**: Category filtering is essential for parents, coaches, and athletes who care about specific age groups. It's the most requested feature after basic results display.

**Independent Test**: View race results, select a category filter, see only matching athletes with category-specific ranking. Clear the filter and see all athletes again.

**Acceptance Scenarios**:

1. **Given** an event has multiple categories, **When** the results view loads, **Then** a category filter selector is available
2. **Given** the category filter is available, **When** the spectator selects a category, **Then** only athletes from that category are displayed with category-specific ranking (catRnk) and category-specific time behind (catTotalBehind)
3. **Given** a category filter is active, **When** the spectator clears the filter, **Then** all athletes from all categories are displayed with overall ranking
4. **Given** an event has no categories defined, **When** the results view loads, **Then** no category filter is shown

---

### User Story 4 — URL-Based Navigation (Priority: P2)

A spectator wants to share a link to specific race results with a friend. The application uses URL-based navigation so each view (event list, event detail, race results) has a unique shareable URL. When the friend opens the link, they see the same view directly.

**Why this priority**: Shareable URLs are critical for social media sharing and bookmarking. Without URL routing, spectators cannot share or bookmark specific results, which significantly reduces the application's reach and usability.

**Independent Test**: Navigate to a specific race result, copy the URL, open it in a new browser tab, and see the same race results loaded directly.

**Acceptance Scenarios**:

1. **Given** the spectator navigates to an event, **When** the event detail loads, **Then** the browser URL reflects the selected event
2. **Given** the spectator is viewing race results, **When** they copy the URL and open it in a new tab, **Then** the same event and race results are displayed
3. **Given** the spectator uses the browser back button, **When** they were on event detail, **Then** they return to the event list
4. **Given** a spectator opens a URL for a non-existent event, **When** the page loads, **Then** a "not found" message is shown with a link back to the event list

---

### User Story 5 — View Startlist (Priority: P3)

A spectator wants to see who is starting in an upcoming race and their start order. They navigate to a race that hasn't started yet and see the startlist with athlete names, bib numbers, clubs, and categories.

**Why this priority**: Startlists are useful before races begin but secondary to results. Spectators typically check startlists once and then wait for results.

**Independent Test**: Navigate to a race with a published startlist, see athletes listed in start order with bib, name, club, and category.

**Acceptance Scenarios**:

1. **Given** a race has a published startlist, **When** the spectator views the race, **Then** a startlist is displayed with athletes in start order
2. **Given** a race has both startlist and results, **When** the spectator views the race, **Then** results are shown by default (results take priority over startlist)
3. **Given** a race has no startlist and no results, **When** the spectator views the race, **Then** an empty state indicates the race schedule but no data is available yet

---

### Edge Cases

- What happens when the server returns an error mid-navigation (e.g., event loads but results call fails)? — Show the event detail with an error message in the results section; do not lose the already-loaded event data
- What happens when an event has only one race? — Skip the race tab selector entirely and show results directly
- What happens on extremely slow connections? — Skeleton loaders are shown for each section independently; partially loaded data is displayed as it arrives
- What happens when the spectator navigates to a draft event URL? — The API returns 404; the application shows a "not found" message
- What happens when the event list is empty (no public events)? — An empty state message informs the spectator that no events are currently available

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST display a list of public events fetched from the Client API, excluding draft events
- **FR-002**: The application MUST allow spectators to select an event and view its detail (name, location, dates, discipline, race schedule)
- **FR-003**: The application MUST display race results in a table with rank, bib, name, club/country, time, penalties, total, and time behind
- **FR-004**: The application MUST allow switching between races using a tab-style selector
- **FR-005**: The application MUST support filtering results by age category, showing category-specific rankings
- **FR-006**: The application MUST use URL-based navigation so that event and race views have unique shareable URLs
- **FR-007**: The application MUST show appropriate loading states (skeletons) while data is being fetched
- **FR-008**: The application MUST show error states with retry options when API calls fail
- **FR-009**: The application MUST indicate live events with a visual live indicator
- **FR-010**: The application MUST display DNS/DNF/DSQ statuses clearly in the results table
- **FR-011**: The application MUST display startlists for races that have published start data
- **FR-012**: The application MUST use only the project's designated design system for all visual components — no custom CSS or inline styles for standard UI patterns
- **FR-013**: The application MUST be responsive and optimized for mobile viewports (320px and up) as the primary display target
- **FR-014**: The application MUST use monospaced font for all time values to ensure visual alignment

### Key Entities

- **Event**: A competition with a name, location, dates, discipline, status, and a set of races. Spectators browse and select events.
- **Race**: A single competition run within an event, identified by class and race type (e.g., qualification, semifinal, best-run). Spectators switch between races.
- **Result**: An athlete's performance in a race, with ranking, time, penalties, and status. The primary data spectators consume.
- **Category**: An age/gender group used for filtering results (e.g., "Muži Senioři", "Ženy Juniorky"). Derived from event configuration.
- **Startlist Entry**: An athlete's registration for a race with start order, bib number, and category.

## Assumptions

- The Client API (Feature #6) is fully implemented and stable
- The design system provides all necessary UI components (layout, tables, cards, tabs, badges, skeleton loaders, empty states)
- The application is a single-page application served as static files
- No authentication is required — all data is public
- The application does not need to handle WebSocket/live updates in this feature (that is Feature #9 — Live Data Pipeline)
- Time values from the API are in hundredths of seconds and must be formatted for display (e.g., 8520 → "85.20")
- The application will be deployed behind a proxy that handles serving and caching

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A spectator can navigate from the event list to viewing race results in under 3 taps/clicks
- **SC-002**: The initial event list loads and displays within 2 seconds on a 3G mobile connection
- **SC-003**: All views are usable without horizontal scrolling on screens 320px wide and larger
- **SC-004**: Shared URLs load the correct view directly without requiring additional navigation
- **SC-005**: 100% of UI components come from the designated design system — no custom CSS for standard patterns
- **SC-006**: Category filter correctly shows category-specific rankings that match the API response
- **SC-007**: All error states provide clear messaging and a path to recovery (retry or navigate back)
