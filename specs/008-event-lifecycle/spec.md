# Feature Specification: Event Lifecycle

**Feature Branch**: `008-event-lifecycle`
**Created**: 2026-02-12
**Status**: Draft
**Input**: Feature issue #8 — Implement event state management and transitions

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Advance Event Through Lifecycle (Priority: P1)

A timekeeper manages a canoe slalom event from creation to official results. After creating the event (draft), they publish the startlist so spectators can see who is competing. When the race begins, they mark the event as running, which enables live timing features. After the last competitor finishes, they mark the event as finished (unofficial results). Once results are verified, they confirm them as official (final, non-live).

**Why this priority**: This is the core feature — without state transitions, events remain permanently in draft and the entire live results workflow is broken. Every other feature depends on events progressing through their lifecycle.

**Independent Test**: Can be fully tested by creating an event and transitioning it through all five states (draft → startlist → running → finished → official), verifying the state changes are persisted and reflected correctly.

**Acceptance Scenarios**:

1. **Given** an event in "draft" state, **When** the timekeeper advances it to "startlist", **Then** the event state changes to "startlist" and the event becomes visible to the public.
2. **Given** an event in "startlist" state, **When** the timekeeper advances it to "running", **Then** the event state changes to "running" and live timing data can flow to spectators.
3. **Given** an event in "running" state, **When** the timekeeper advances it to "finished", **Then** the event state changes to "finished" and results are shown as unofficial.
4. **Given** an event in "finished" state, **When** the timekeeper advances it to "official", **Then** the event state changes to "official" and results are marked as final.

---

### User Story 2 - Enforce Valid State Transitions (Priority: P1)

The system prevents invalid state transitions to protect data integrity. For example, a timekeeper cannot jump from "draft" directly to "running" (skipping the startlist phase), and cannot revert an "official" event back to "running". Only the defined forward transitions are permitted.

**Why this priority**: Without transition validation, accidental or incorrect state changes could corrupt the event workflow, hide published data, or create inconsistent states for spectators.

**Independent Test**: Can be tested by attempting every possible state combination (25 total: 5 states x 5 states) and verifying that only the valid forward transitions succeed while all others are rejected with a clear error.

**Acceptance Scenarios**:

1. **Given** an event in "draft" state, **When** the timekeeper attempts to change it to "running", **Then** the system rejects the request with a clear error explaining the valid next state.
2. **Given** an event in "official" state, **When** the timekeeper attempts to change it to any other state, **Then** the system rejects the request because "official" is a terminal state.
3. **Given** an event in "running" state, **When** the timekeeper attempts to change it to "startlist" (backward), **Then** the system rejects the request because backward transitions are not allowed.

---

### User Story 3 - Public Visibility Based on State (Priority: P2)

Spectators see events only when they have reached at least the "startlist" state. Events in "draft" are invisible to the public. The current state is communicated to spectators so they understand whether they are viewing a startlist, live results, unofficial results, or official results.

**Why this priority**: Spectators need to understand what they are looking at. Showing a draft event with incomplete data would be confusing, and not distinguishing between unofficial and official results could mislead users.

**Independent Test**: Can be tested by creating events in each state and verifying that the public listing excludes draft events, and each visible event displays its current state label.

**Acceptance Scenarios**:

1. **Given** an event in "draft" state, **When** a spectator requests the list of events, **Then** the draft event does not appear in the list.
2. **Given** an event in "startlist" state, **When** a spectator views the event, **Then** the event is visible and its state is indicated as "startlist".
3. **Given** an event in "running" state, **When** a spectator views the event, **Then** the event is visible and its state is indicated as live/running.
4. **Given** an event in "official" state, **When** a spectator views the event, **Then** the results are presented as final and official.

---

### User Story 4 - State-Dependent Behavior of Data Ingestion (Priority: P2)

The system's behavior for incoming data depends on the event's current state. Data ingestion (startlists, results, on-course updates) is only accepted when the event is in an appropriate state. For example, live timing results should only be ingested when the event is "running".

**Why this priority**: Prevents data corruption from out-of-sequence updates. Without state-aware ingestion, results could be pushed to a "draft" event before it is properly configured, or to an "official" event whose results should be frozen.

**Independent Test**: Can be tested by attempting data ingestion at each event state and verifying that only appropriate combinations are accepted.

**Acceptance Scenarios**:

1. **Given** an event in "draft" state, **When** XML structure data is ingested, **Then** the system accepts it (draft events can receive initial configuration data).
2. **Given** an event in "official" state, **When** any data ingestion is attempted, **Then** the system rejects it because official results are frozen.
3. **Given** an event in "running" state, **When** live timing data is ingested, **Then** the system accepts and processes it normally.

---

### Edge Cases

- What happens when a state transition is requested for a non-existent event? The system returns a "not found" error.
- What happens when the same state transition is requested twice (e.g., "running" → "running")? The system rejects it as a no-op with an appropriate message.
- What happens if there is a network interruption during a state transition request? The state change is atomic — it either completes fully or not at all.
- What happens when data ingestion is in progress and a state transition to "official" is requested? The state transition should complete, and any subsequent ingestion attempts are rejected.
- What happens if the timekeeper needs to correct a mistake (e.g., prematurely marked as "finished")? Only specific backward transitions are allowed as correction mechanisms: finished → running and startlist → draft.
- What happens when a published startlist needs to be retracted? The timekeeper transitions the event back to "draft" (startlist → draft), making it invisible to spectators again. Any spectators who already viewed the startlist will see the event disappear from the public listing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support exactly five event states: draft, startlist, running, finished, official.
- **FR-002**: System MUST enforce the following valid state transitions:
  - draft → startlist
  - startlist → running
  - running → finished
  - finished → official
  - finished → running (correction only)
  - startlist → draft (unpublish startlist)
- **FR-003**: System MUST reject any state transition not listed in FR-002 with a descriptive error message that includes the current state, requested state, and list of valid transitions.
- **FR-004**: System MUST provide an administrative operation for changing an event's state, authenticated with the event's API key.
- **FR-005**: System MUST persist state changes immediately and atomically.
- **FR-006**: System MUST record a timestamp for each state transition.
- **FR-007**: System MUST exclude events in "draft" state from all public-facing listings and data responses.
- **FR-008**: System MUST include the current event state in all public event data responses.
- **FR-009**: System MUST enforce state-dependent data ingestion rules:
  - "draft": Accept XML structure data and configuration only
  - "startlist": Accept XML data (structure updates)
  - "running": Accept all data types (XML, results, on-course)
  - "finished": Accept XML data and results corrections only
  - "official": Reject all data ingestion
- **FR-010**: System MUST treat "official" as a terminal state — no transitions out of it are permitted.
- **FR-011**: System MUST reject same-state transitions (e.g., "running" → "running") with an informative message.
- **FR-012**: System MUST notify connected spectators of state changes by sending the new state as a diff message through the existing real-time channel.

### Key Entities

- **Event State**: One of five discrete values representing the event's position in its lifecycle. Each state determines what operations are permitted on the event.
- **State Transition**: A change from one event state to another. Has a source state, target state, timestamp, and initiator (identified by API key). Only predefined transitions are valid.
- **Ingestion Rule**: A mapping between event states and permitted data types, defining what kind of incoming data is accepted at each lifecycle stage.

## Assumptions

- State transitions are always initiated explicitly by the timekeeper (via c123-server). There are no automatic state transitions based on time or data conditions.
- State transitions have no preconditions — the system does not validate data completeness (e.g., presence of XML data or categories) before allowing a transition. The timekeeper is trusted to manage the event workflow.
- The existing API key authentication mechanism (from Feature #5) is used for state transition requests — no additional authentication is needed.
- Two backward transitions are permitted as correction mechanisms: finished → running (premature finish marking) and startlist → draft (retract published startlist for further edits). Other backward transitions are not needed.
- State transition history (audit log) is tracked via timestamps but a full audit log of all transitions is not in scope — only the current state and last transition time are persisted.

## Clarifications

### Session 2026-02-12

- Q: Should backward transition startlist → draft be allowed (unpublish startlist)? → A: Yes, allow startlist → draft as a correction mechanism because startlists can change after initial publication.
- Q: Should state transitions require preconditions (e.g., XML data before publishing)? → A: No preconditions — timekeeper has full control over transitions regardless of data state.
- Q: Should connected spectators be notified via WebSocket when event state changes? → A: Yes, state change is sent as a `diff` message to connected clients.

## Dependencies

- **Feature #5 (Ingest API)**: State-dependent ingestion rules build on the existing ingest endpoints and API key authentication.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Timekeepers can advance an event through all five lifecycle states within 30 seconds total (excluding time spent on actual race operations).
- **SC-002**: 100% of invalid state transitions are rejected with a clear, actionable error message — no invalid state can ever be persisted.
- **SC-003**: Spectators see accurate state information for every event — draft events are never visible, and the displayed state always matches the actual state within 2 seconds of a transition.
- **SC-004**: Data ingestion respects state rules with zero exceptions — no data is accepted into an event in an inappropriate state.
- **SC-005**: The finished → running correction transition works reliably, enabling timekeepers to recover from premature finish marking without data loss.
