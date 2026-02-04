# Feature Specification: Protocol Analysis & Data Model

**Feature Branch**: `002-data-model`
**Created**: 2026-02-04
**Status**: Draft
**Input**: User description: "Analyze C123 protocol and design SQLite data model for live results display"

## Clarifications

### Session 2026-02-04

- Q: OnCourse data storage strategy? → A: In-memory only (loss on restart acceptable, TCP stream restores within seconds)
- Q: Event data retention policy? → A: Complete retention (max ~10 events/season, single-digit MB each; migrate to PostgreSQL if needed)
- Q: Expected concurrent users? → A: 100-300 (SQLite sufficient, no caching layer needed)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Results Page Data Display (Priority: P1)

A spectator visits the live results page during a canoe slalom race and sees current standings, competitor information, and race details. The data model must support all information needed for a complete live results experience.

**Why this priority**: This is the core functionality - without proper data storage, no live results can be displayed to spectators.

**Independent Test**: Can be fully tested by loading sample XML data into the database and verifying all required fields for the LivePage Prototype are queryable and correctly structured.

**Acceptance Scenarios**:

1. **Given** XML export data is ingested, **When** the client requests results for a race, **Then** the system returns competitor names, times, penalties, rankings, and category information.
2. **Given** multiple races exist in the system, **When** a user browses events, **Then** they can see race schedule with statuses and filter by category.
3. **Given** a competitor has completed their run, **When** viewing results, **Then** the display shows time, total penalties, gate-by-gate penalties, and ranking within category.

---

### User Story 2 - OnCourse Real-time Tracking (Priority: P2)

During a live race, spectators see which competitors are currently on the water, their current progress, and live penalty accumulation as they pass gates.

**Why this priority**: Real-time tracking is the differentiating feature of live results - without it, users could just wait for static results.

**Independent Test**: Can be tested by simulating OnCourse TCP messages and verifying the data model captures current competitors, their gate progress, and running times.

**Acceptance Scenarios**:

1. **Given** competitors are on course, **When** viewing the live page, **Then** users see active competitors with their current gate progress and running time.
2. **Given** a competitor receives a penalty on gate 5, **When** the OnCourse data updates, **Then** the penalty is immediately visible in the data.
3. **Given** a competitor finishes, **When** dtFinish timestamp appears, **Then** their final time is available and they transition from "on course" to "finished".

---

### User Story 3 - Multi-Run Race Support (Priority: P2)

For Best Run format races (BR1/BR2), the system correctly tracks and displays both runs, showing the better result while preserving individual run data.

**Why this priority**: Most Czech races use Best Run format - without this, the system cannot properly display domestic competition results.

**Independent Test**: Can be tested by loading BR1 and BR2 results for the same competitor and verifying the system correctly identifies and displays the better run while maintaining access to both.

**Acceptance Scenarios**:

1. **Given** a competitor completed BR1 with time 85.50s, **When** they complete BR2 with 82.30s, **Then** the system shows 82.30s as the result with indication that run 2 was better.
2. **Given** viewing detailed results, **When** expanding a competitor's entry, **Then** both BR1 and BR2 times are visible with their respective penalties.
3. **Given** BR2 data arrives, **When** it's the better run, **Then** both the current run and previous run data are preserved (BR1 from TotalTotal fallback or cached BR1 Results).

---

### User Story 4 - Age Category Filtering (Priority: P3)

Users can filter results by age category (e.g., U14, U16, Junior, Senior) and see rankings within their selected category.

**Why this priority**: Category filtering is essential for parents/coaches tracking specific age groups, but core results work without it.

**Independent Test**: Can be tested by querying results with category filters and verifying correct subset and re-ranked results.

**Acceptance Scenarios**:

1. **Given** results contain competitors from multiple age categories, **When** filtering by "U14", **Then** only U14 competitors are shown with category-specific rankings.
2. **Given** categories are defined in XML Classes data, **When** the system ingests data, **Then** it dynamically creates category options from the data (not hardcoded).

---

### Edge Cases

- What happens when XML contains categories not previously seen? → Dynamic category creation from Classes data.
- How does system handle DNS/DNF/DSQ/CAP statuses? → Stored in dedicated status field, excluded from time-based rankings.
- What happens when competitor data is updated mid-race? → Upsert logic preserves existing data while updating changed fields.
- How does system handle team races (TSR)? → Team participants have IsTeam=true with Member1-3 references.
- What happens with Cross discipline (XT, X4, XS, XF)? → Different time semantics (finish order vs actual time) handled by DisId-aware logic.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store event metadata (EventId, title, location, dates, discipline type).
- **FR-002**: System MUST store participant data including name, club, nationality, bib number, and age category.
- **FR-003**: System MUST store race schedule with ClassId, DisId (run type), start times, and race status.
- **FR-004**: System MUST store results including time (hundredths), penalties, gate-by-gate breakdown, ranking, and status codes.
- **FR-005**: System MUST support multiple runs per competitor (BR1/BR2) with ability to identify better run.
- **FR-006**: System MUST store OnCourse data for real-time display (current gate progress, running time, checkpoint timestamps).
- **FR-007**: System MUST support team participants with references to individual members.
- **FR-008**: System MUST derive age categories dynamically from Classes/Categories data in XML.
- **FR-009**: System MUST maintain category-specific rankings (CatRnk) separate from overall rankings (Rnk).
- **FR-010**: System MUST handle all result status codes: empty (OK), DNS, DNF, DSQ, CAP.
- **FR-011**: System MUST store gate configuration (number of gates, gate types N/R) per course.
- **FR-012**: System MUST support Cross discipline formats with heat numbers, round numbers, and qualification status.

### Key Entities

- **Event**: Competition metadata - EventId, titles, location, dates, discipline (Slalom/Cross), configuration flags.
- **Participant**: Competitor or team - internal Id, names, club, nationality, bib, age category (CatId), team membership.
- **Class**: Race category definition - ClassId (e.g., K1M-ZS), display names, associated age categories with year ranges.
- **Race**: Scheduled race - RaceId, ClassId, DisId (BR1/BR2/TSR/XT/etc.), start time, status, course number.
- **Result**: Competition result - links to Race and Participant, times, penalties, rankings, status, gate penalties array.
- **OnCourse**: Transient real-time data - competitor currently on water, gate progress, checkpoint timestamps, running calculations.
- **Course**: Gate configuration - CourseNr, number of gates, gate type sequence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Data model supports all fields required by LivePage Prototype from rvp-design-system (verified by mapping document).
- **SC-002**: Sample XML file (captures/2024-LODM-fin.xml) can be fully ingested without data loss for display-relevant fields.
- **SC-003**: Query for race results returns all data needed for both "simple" view (time, penalty, rank) and "detailed" view (gate times, split times).
- **SC-004**: Age category filtering returns correctly re-ranked results within 1 second for typical race size (100 competitors).
- **SC-005**: OnCourse data structure supports real-time updates without full result recalculation.
- **SC-006**: Data model documentation is complete with entity relationships, field descriptions, and XML-to-model mapping.
- **SC-007**: System supports 100-300 concurrent users viewing live results without degradation.

## Assumptions

- Time values are stored in hundredths of seconds as integers (matching XML format).
- Gate penalties are stored as an array/JSON field matching the 25-position format from XML.
- OnCourse is transient in-memory data only; loss on server restart is acceptable as TCP stream restores state within seconds.
- Cross discipline support is secondary to Slalom - basic structure included but detailed X4/XS/XF heat progression may be simplified.
- Complete event data retention; expected ~10 events/season at single-digit MB each; SQLite sufficient, PostgreSQL migration path if growth exceeds expectations.

## Out of Scope

- Scoring/points calculation (Phase 4 bonus feature).
- User favorites/notifications (Phase 4 bonus feature).
- Full audit trail of data changes.
- International QUA/SEM/FIN format (no sample data available).
- GateTimes detailed passage timestamps (optional field, not critical for MVP).
- CompOfficials/judges data (not displayed on live page).
