# Feature Specification: Live Data Pipeline

**Feature Branch**: `009-live-data-pipeline`
**Created**: 2026-02-12
**Status**: Draft
**Input**: Feature issue #9 — WebSocket server and data merge logic for live updates

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Live Updates While Watching Results (Priority: P1)

A spectator is viewing race results on their phone at the venue. As athletes finish their runs, the results update automatically without requiring a page refresh. The spectator sees new results appear, rankings adjust, and times update in real time. The experience feels "live" — changes appear within seconds of the timing system recording them.

**Why this priority**: This is the core value proposition of the entire live-mini system. Without real-time push updates, spectators must manually refresh the page, which defeats the purpose of "live" results.

**Independent Test**: Can be fully tested by connecting a client to the WebSocket, ingesting new result data via the Ingest API, and verifying the client receives the update within seconds. Delivers immediate value as spectators see live results without refreshing.

**Acceptance Scenarios**:

1. **Given** a spectator has the results page open for a running event, **When** a new result is ingested, **Then** the spectator receives the updated result data automatically within 2 seconds.
2. **Given** a spectator is connected via WebSocket, **When** an athlete's on-course status changes, **Then** the spectator receives the on-course update in real time.
3. **Given** a spectator is connected via WebSocket, **When** the event state transitions (e.g., running → finished), **Then** the spectator receives the state change notification.

---

### User Story 2 - Reconnect and Recover After Connection Loss (Priority: P1)

A spectator's phone loses network connectivity briefly (e.g., poor venue signal, switching between Wi-Fi and cellular). When the connection is restored, the application reconnects and receives the full current state so the spectator is immediately up to date without missing any data.

**Why this priority**: Network reliability at outdoor venues is poor. Without robust reconnection handling, spectators would see stale data or an error state, destroying trust in the live system.

**Independent Test**: Can be tested by connecting a client, disconnecting it, making data changes, then reconnecting and verifying the client receives complete current state. Delivers value as spectators maintain a reliable experience despite poor connectivity.

**Acceptance Scenarios**:

1. **Given** a spectator's WebSocket connection is lost, **When** the connection is re-established, **Then** the server sends a full state message so the client is immediately synchronized.
2. **Given** a spectator reconnects after several minutes offline, **When** significant data changes have occurred (new results, state changes), **Then** all changes are reflected in the full state message.
3. **Given** a spectator's connection drops and reconnects repeatedly, **When** each reconnection occurs, **Then** the server handles it gracefully without performance degradation.

---

### User Story 3 - Efficient Data Transfer for Mobile Users (Priority: P2)

Spectators at venues often have limited mobile data plans. The system minimizes data transfer by sending only changed data (diffs) for incremental updates, rather than retransmitting the entire event state for every small change.

**Why this priority**: Data efficiency directly impacts user experience on mobile networks and cost for spectators. Sending full state for every gate touch would waste bandwidth and create latency.

**Independent Test**: Can be tested by monitoring WebSocket message sizes during incremental updates and verifying that diff messages are significantly smaller than full state messages. Delivers value as spectators experience faster updates with lower data usage.

**Acceptance Scenarios**:

1. **Given** a single result is updated, **When** the server pushes the change to connected clients, **Then** only the changed data is sent as a diff message (not the entire event state).
2. **Given** a large change occurs (e.g., new XML import with many results), **When** the server determines a diff would be larger or more complex than a full state message, **Then** the server sends a full state message instead.
3. **Given** the server encounters a situation where incremental tracking is unreliable, **When** a refresh signal is needed, **Then** the server sends a refresh message that instructs the client to re-fetch data via REST API.

---

### User Story 4 - Server Merges Data from Multiple Sources (Priority: P1)

The timing system sends data through two channels: XML exports (complete event state snapshots) and TCP stream data (real-time incremental updates). The server must merge these sources intelligently so that spectators see a consistent, accurate view of the event.

**Why this priority**: Without correct merge logic, spectators could see contradictory data (e.g., stale results overwriting live ones) or missing data (e.g., on-course updates not appearing). This is essential for data integrity.

**Independent Test**: Can be tested by ingesting XML data followed by TCP updates, and verifying the merged result correctly combines both sources. Then ingesting a new XML that partially overlaps, and verifying the merge preserves real-time data where appropriate.

**Acceptance Scenarios**:

1. **Given** XML data has been ingested establishing event structure, **When** a TCP result update arrives for a known athlete/race, **Then** the result is merged into the existing structure and the update is pushed to clients.
2. **Given** TCP results have been ingested for several athletes, **When** a new XML export arrives, **Then** XML is authoritative for structure (categories, athletes, schedule) while preserving any newer TCP-sourced results that are more recent.
3. **Given** on-course data arrives from TCP, **When** the system processes it, **Then** on-course data is handled exclusively from TCP (never from XML) and pushed to clients.
4. **Given** a new XML export arrives that contains results already updated by TCP, **When** merging occurs, **Then** the configurable merge strategy determines whether XML or TCP data takes precedence for results.

---

### Edge Cases

- What happens when WebSocket connections exceed server capacity? The server enforces a maximum connection limit and gracefully rejects new connections with an informative message.
- What happens when a client connects to an event with no data yet? The server sends a full state message with empty data structures (empty arrays for results, startlist, etc.).
- What happens when TCP data arrives for an athlete not in the XML structure? The system ignores the data (XML defines structure, per ARCHITECTURE.md).
- What happens when the server restarts while clients are connected? Clients detect the disconnection and reconnect. The server sends a full state message upon reconnection.
- What happens when multiple XML imports arrive in quick succession? Each import is processed sequentially. Clients receive updates only after processing is complete, avoiding intermediate states.
- What happens when no clients are connected? The server still processes ingest data and updates the database, but skips WebSocket broadcasting.
- What happens when an event transitions to "official"? The server sends the state transition diff to all connected clients, then closes all WebSocket connections for that event after a short grace period. No further connections are accepted for official events.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a WebSocket endpoint that clients can connect to for receiving live updates for a specific event.
- **FR-002**: System MUST support three message types sent from server to client: `diff` (incremental changes), `full` (complete state), and `refresh` (signal to re-fetch via REST).
- **FR-003**: System MUST send a `full` state message to each client immediately upon WebSocket connection.
- **FR-004**: System MUST send `diff` messages to all connected clients when incremental data changes occur (single result update, on-course status change, event state transition).
- **FR-005**: System MUST send `full` state messages when large changes occur (new XML import, server restart) instead of attempting complex diffs.
- **FR-006**: System MUST send `refresh` messages when the server cannot reliably determine what has changed and the client should discard its cache and re-fetch via REST.
- **FR-007**: System MUST merge XML and TCP data sources according to the configured merge strategy: XML is authoritative for structure (categories, athletes, schedule), TCP updates results incrementally.
- **FR-008**: System MUST handle on-course data exclusively from TCP stream, never from XML.
- **FR-009**: System MUST support a configurable merge strategy that determines how conflicts between XML and TCP result data are resolved.
- **FR-010**: System MUST trigger WebSocket broadcasts when data is ingested through the Ingest API (both XML and TCP/JSON endpoints).
- **FR-011**: System MUST handle client disconnection and reconnection gracefully, sending full state on each new connection.
- **FR-012**: System MUST enforce a maximum number of concurrent WebSocket connections per event to protect server resources.
- **FR-013**: System MUST send WebSocket messages only to clients subscribed to the affected event.
- **FR-014**: System MUST NOT require authentication for WebSocket connections (public spectator access, consistent with REST Client API).
- **FR-015**: System MUST continue processing ingest data even when no WebSocket clients are connected.
- **FR-016**: System MUST broadcast event state transitions (from Feature #8 lifecycle) as diff messages to connected clients.
- **FR-017**: System MUST implement WebSocket ping/pong heartbeat to detect stale connections. Clients that do not respond to ping within a timeout period MUST be disconnected to free capacity.
- **FR-018**: System MUST close WebSocket connections after an event transitions to "official" state: send the state transition diff, then close all connections for that event after a short grace period.

### Key Entities

- **WebSocket Connection**: A persistent connection between a spectator's browser and the server, scoped to a specific event. Tracks connection state and the event being observed.
- **Message**: A server-to-client WebSocket payload with a type (`diff`, `full`, `refresh`) and optional data content. The message format is consistent across all types.
- **Merge Strategy**: A configurable set of rules determining how data from XML and TCP sources is combined. Defines precedence for structural data (XML wins) and result data (configurable).
- **Data Change Event**: An internal notification triggered when ingest processing modifies data in the database, used to determine what WebSocket messages to broadcast.

## Assumptions

- WebSocket communication is unidirectional (server → client). Clients do not send data to the server through WebSocket — they use REST API for any requests.
- The Ingest API (Feature #5) and Client API (Feature #6) are fully implemented and provide the data ingestion and reading infrastructure.
- Event Lifecycle (Feature #8) state machine is implemented and provides state transition events.
- Diff messages contain only the changed entities (e.g., a single updated result object, changed event state), using the same data structure as the Client API. The frontend applies diffs by upserting entities by their ID — no JSON Patch or positional operations.
- SQLite's serialized writes ensure data consistency during concurrent ingest operations. The merge logic executes within database transactions.
- The server runs as a single instance (no horizontal scaling or distributed WebSocket concerns at this stage).
- The configurable merge strategy defaults to "XML authoritative for structure, TCP authoritative for results" which covers the standard use case. Alternative strategies are for future optimization.

## Clarifications

### Session 2026-02-12

- Q: Should the server implement WebSocket ping/pong heartbeat to detect stale connections? → A: Yes, server sends periodic ping frames; clients that don't respond are disconnected after timeout.
- Q: What should a diff message contain? → A: Changed entities only (e.g., a single updated result object). Frontend upserts by entity ID.
- Q: Should the server close WebSocket connections after event becomes official? → A: Yes, send final state transition diff, then close connections after a short grace period.

## Dependencies

- **Feature #5 (Ingest API)**: Provides data ingestion endpoints that trigger merge logic and WebSocket broadcasts.
- **Feature #6 (Client API)**: Defines the data structures and response formats that WebSocket messages follow.
- **Feature #8 (Event Lifecycle)**: Provides state transition events that are broadcast to WebSocket clients.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Spectators see data updates within 2 seconds of the timing system recording a change — the live experience feels real-time.
- **SC-002**: After connection loss and reconnection, spectators see accurate, complete data within 3 seconds — no stale or missing information.
- **SC-003**: Incremental diff messages are at least 80% smaller than full state messages for single-result updates — mobile data usage is minimized.
- **SC-004**: System supports at least 200 concurrent WebSocket connections per event without degradation in update delivery time.
- **SC-005**: Data from XML and TCP sources is merged correctly in 100% of standard scenarios — no contradictory or missing data visible to spectators.
- **SC-006**: The live data pipeline operates reliably throughout a full event day (8+ hours) without memory leaks or connection degradation.
