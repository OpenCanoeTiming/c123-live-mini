# Feature Specification: Client API

**Feature Branch**: `006-client-api`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Public API endpoints for reading event data - list of public events, event data (startlist, results, schedule), API documentation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Public Events (Priority: P1)

A spectator opens the live results page and sees a list of currently active events. They can identify which event they want to follow based on the event name, location, date, and current status (e.g., "running", "finished").

**Why this priority**: Without the ability to discover events, no other client functionality is possible. This is the entry point for all users.

**Independent Test**: Can be fully tested by requesting the events list endpoint and verifying it returns only non-draft events with correct metadata. Delivers value as users can see what events are available.

**Acceptance Scenarios**:

1. **Given** multiple events exist with various statuses, **When** a spectator requests the public events list, **Then** only events with status other than "draft" are returned, ordered by start date (most recent first)
2. **Given** no public events exist, **When** a spectator requests the events list, **Then** an empty list is returned with a successful response
3. **Given** an event transitions from "draft" to "startlist", **When** a spectator requests the events list, **Then** the newly published event appears in the list

---

### User Story 2 - View Event Details and Race Schedule (Priority: P1)

A spectator selects an event and sees its full details: event metadata (name, location, dates, discipline), list of boat classes with age categories, and the race schedule with race statuses. This gives them a complete overview of the event structure.

**Why this priority**: Understanding the event structure (what classes race when, which races are complete vs. in progress) is essential before viewing any results. Tied with P1 as it completes the navigation flow.

**Independent Test**: Can be tested by requesting event detail and verifying all structural data (classes, categories, races) is returned. Delivers value as users can see the complete event program.

**Acceptance Scenarios**:

1. **Given** an event with classes, categories, and races, **When** a spectator requests event details, **Then** event metadata, all classes with their categories, and all races with their statuses are returned
2. **Given** an event ID that does not exist, **When** a spectator requests event details, **Then** a 404 response is returned
3. **Given** a draft event, **When** a spectator requests its details by internal ID, **Then** a 404 response is returned (draft events are not publicly accessible)

---

### User Story 3 - View Race Results (Priority: P1)

A spectator wants to see results for a completed or in-progress race. They see athletes ranked by total time (time + penalties), with the option to filter by age category and to view detailed gate penalties.

**Why this priority**: Results are the core purpose of the entire system - this is what spectators come for.

**Independent Test**: Can be tested by requesting results for a race and verifying correct ranking, times, penalties, and filtering. Delivers value as the primary use case of the application.

**Acceptance Scenarios**:

1. **Given** a race with completed results, **When** a spectator requests results, **Then** athletes are returned ranked by total time with time, penalties, total, and gap to leader
2. **Given** a race with results, **When** a spectator requests results filtered by age category, **Then** only athletes in that category are returned with category-specific rankings
3. **Given** a best-of-two-runs race (BR1/BR2), **When** a spectator requests results with all runs included, **Then** both run details are returned along with the best run indicator
4. **Given** a race with athletes having special statuses (DNS, DNF, DSQ), **When** a spectator requests results, **Then** those athletes appear at the end with their status clearly indicated
5. **Given** a spectator wants detailed gate penalties, **When** they request results in detailed mode, **Then** gate-by-gate penalty data is included in the response

---

### User Story 4 - View Race Startlist (Priority: P2)

A spectator wants to see who is starting in a specific race. They view the startlist which shows athletes in start order with their bib number, name, club, and country.

**Why this priority**: Startlists are essential for spectators at the venue to know who is coming next, but they are secondary to event discovery and results.

**Independent Test**: Can be tested by requesting a startlist for a specific race and verifying athletes are returned in start order with correct attributes. Delivers value as spectators can follow the starting order.

**Acceptance Scenarios**:

1. **Given** a race with participants assigned start orders, **When** a spectator requests the startlist, **Then** participants are returned sorted by start order with bib, name, club, and country
2. **Given** a race with no participants yet, **When** a spectator requests the startlist, **Then** an empty startlist is returned with race metadata
3. **Given** an invalid race ID, **When** a spectator requests the startlist, **Then** a 404 response is returned

---

### User Story 5 - View Athletes On Course (Priority: P2)

A spectator wants to see which athletes are currently on the water. They see live position data, intermediate gate times, and time-to-beat comparison.

**Why this priority**: On-course data is valuable during live racing but is secondary to results and startlists which work for all event states.

**Independent Test**: Can be tested by requesting on-course data when athletes are active. Delivers value as spectators can follow live racing action.

**Acceptance Scenarios**:

1. **Given** athletes are currently on course, **When** a spectator requests on-course data, **Then** active athletes are returned with their current gate progress, intermediate times, and time-to-beat comparison
2. **Given** no athletes are on course, **When** a spectator requests on-course data, **Then** an empty list is returned
3. **Given** on-course data has not been ingested yet (no XML data), **When** a spectator requests on-course data, **Then** an empty list is returned

---

### User Story 6 - View Event Categories (Priority: P2)

A spectator wants to filter results by age category. They first need to see which categories are available for the event so the frontend can offer a category filter.

**Why this priority**: Category filtering is important for the Czech canoe community where age categories (Senior, U23, Junior, etc.) are a primary way spectators follow results. But it enhances rather than enables the core experience.

**Independent Test**: Can be tested by requesting categories for an event and verifying unique categories are aggregated across all classes. Delivers value as spectators can find their category quickly.

**Acceptance Scenarios**:

1. **Given** an event with multiple classes sharing categories, **When** a spectator requests event categories, **Then** unique categories are returned aggregated across all classes, with the list of class IDs each category appears in
2. **Given** an event with no classes or categories, **When** a spectator requests categories, **Then** an empty list is returned

---

### User Story 7 - API Documentation (Priority: P3)

A developer (including the c123-live-mini-page frontend team) needs to understand the available endpoints, request/response formats, and query parameters. They access API documentation that is accurate and up-to-date.

**Why this priority**: Documentation is essential for frontend integration and future third-party consumers, but the API itself must exist first.

**Independent Test**: Can be tested by accessing the documentation endpoint/file and verifying all public endpoints are documented with request/response schemas. Delivers value as developers can integrate without reading source code.

**Acceptance Scenarios**:

1. **Given** the API is deployed, **When** a developer accesses the documentation, **Then** all public endpoints are listed with their paths, methods, parameters, and response formats
2. **Given** a new endpoint is added, **When** the documentation is regenerated, **Then** the new endpoint appears in the documentation

---

### Edge Cases

- What happens when an event has no races or participants yet? The API returns the event shell with empty arrays for classes, races, etc.
- What happens when results are requested for a race that hasn't started? An empty results array is returned with the race metadata showing its current status.
- How does the system handle concurrent requests during heavy live updates? Read endpoints serve the current database state; consistency is guaranteed by SQLite's serialized writes.
- What happens when filtering by a category that doesn't exist in the event? An empty results array is returned (not an error).
- How are times formatted? Times are returned as integers in hundredths of seconds. Formatting is the frontend's responsibility.
- What about gate penalties format? Gates are returned as a JSON array of integers (0 = clean, 2 = touch, 50 = miss) matching the gate order on the course.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an endpoint to list all publicly visible events (non-draft status) with basic metadata (title, location, dates, discipline, status)
- **FR-002**: System MUST provide an endpoint to retrieve full event details including classes, categories, and race schedule for a specific event
- **FR-003**: System MUST provide an endpoint to retrieve the startlist for a specific race, returning participants in start order
- **FR-004**: System MUST provide an endpoint to retrieve results for a specific race, ranked by total time
- **FR-005**: System MUST support filtering results by age category, returning category-specific rankings
- **FR-006**: System MUST support a detailed mode for results that includes gate-by-gate penalty data
- **FR-007**: System MUST support returning both runs for best-of-two-runs races (BR1/BR2) when requested
- **FR-008**: System MUST provide an endpoint to retrieve athletes currently on course with intermediate timing data
- **FR-009**: System MUST return 404 for non-existent or draft events/races when accessed via public endpoints
- **FR-010**: System MUST provide API documentation covering all public endpoints with request/response schemas
- **FR-011**: System MUST return consistent JSON response structures across all endpoints (unified error format, consistent naming conventions)
- **FR-012**: System MUST use a versioned API path prefix (e.g., `/api/v1/`) for all client endpoints
- **FR-013**: System MUST provide an endpoint to retrieve aggregated age categories for an event (for category filter)
- **FR-014**: System MUST NOT expose any data from draft events through public endpoints
- **FR-015**: System MUST include course information (gate count, gate types) when detailed results are requested, so the frontend can correctly interpret gate penalty arrays

### Key Entities

- **Event**: A competition identified by event_id, containing classes, races, and participants. Has a lifecycle status (draft → startlist → running → finished → official). Only non-draft events are publicly visible.
- **Class**: A boat class (e.g., K1M, C1W) within an event, containing categories and linked to races and participants.
- **Category**: An age category (e.g., Senior, U23, Junior) within a class, defined by birth year range. Used for filtering results.
- **Race**: A single run (e.g., BR1, BR2, Final) within a class, with a schedule and status. Contains results for participants.
- **Participant**: An athlete or team registered in the event, linked to a class and category.
- **Result**: A timing record for a participant in a specific race, including time, penalties, ranking, and optional gate details.
- **OnCourse**: Ephemeral real-time data about athletes currently racing, including intermediate gate times and time-to-beat comparison. Not persisted in database.
- **Course**: Physical course configuration (gate count, gate types) used for interpreting gate penalty arrays.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All public event data is accessible without authentication - spectators can browse events and view results immediately upon opening the page
- **SC-002**: Event list loads within 1 second for up to 50 events under normal conditions
- **SC-003**: Race results for up to 200 participants load within 1 second including category filtering
- **SC-004**: All public endpoints return valid, consistently structured JSON responses that the frontend can reliably parse
- **SC-005**: Draft events are never exposed through any public endpoint - verified by attempting to access draft events through all public routes
- **SC-006**: API documentation covers 100% of public endpoints with accurate request/response examples
- **SC-007**: Category filtering correctly calculates category-specific rankings (not just filtering overall rankings)
- **SC-008**: Best-of-two-runs data correctly pairs BR1 and BR2 results for the same participant
