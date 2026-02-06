# Feature Specification: Ingest API

**Feature Branch**: `005-ingest-api`
**Created**: 2026-02-06
**Status**: Draft
**Input**: Feature #5 - Admin and data ingestion API endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Event and Obtain API Key (Priority: P1)

A timekeeper needs to create a new event in the live-mini system before they can start sending timing data. They initiate event creation from c123-server Admin UI, which calls the live-mini API to create the event and receives an API key for subsequent data ingestion.

**Why this priority**: This is the foundation for all other functionality. Without an event and API key, no data can be ingested. This enables the entire live results workflow.

**Independent Test**: Can be fully tested by calling the event creation endpoint with valid event data and verifying that an API key is returned. The key can then be used to authenticate subsequent requests.

**Acceptance Scenarios**:

1. **Given** c123-server is connected to live-mini-server, **When** timekeeper creates a new event with name and configuration, **Then** system returns a unique API key valid for several days
2. **Given** an event is being created, **When** required event data is missing, **Then** system returns a validation error with specific field requirements
3. **Given** an event already exists with the same identifier, **When** timekeeper attempts to create a duplicate, **Then** system returns an error indicating the event already exists

---

### User Story 2 - Ingest XML Data (Priority: P1)

The timekeeper's c123-server sends XML exports containing full state data (startlist, results, schedule, classes) to live-mini-server. This data is the authoritative source for event structure and is sent frequently during the event.

**Why this priority**: XML ingestion is critical for populating event data. Without it, there is nothing to display to spectators. This is a core data pipeline requirement.

**Independent Test**: Can be tested by sending a valid XML payload with API key authentication. Verify data is stored and can be retrieved via public API.

**Acceptance Scenarios**:

1. **Given** a valid API key, **When** XML export data is sent to the ingest endpoint, **Then** system parses and stores the data, returning success confirmation
2. **Given** a valid API key, **When** malformed XML is sent, **Then** system returns a parsing error with details about the issue
3. **Given** an invalid or expired API key, **When** data ingestion is attempted, **Then** system returns 401 Unauthorized
4. **Given** valid XML data, **When** data is ingested, **Then** categories, athletes, schedule, and results are updated according to merge strategy (XML is authoritative for structure)

---

### User Story 3 - Ingest Real-time TCP Stream Data (Priority: P1)

The c123-server forwards real-time data from TCP stream (OnCourse athletes, live results) as JSON to live-mini-server. This provides incremental updates that supplement the XML data.

**Why this priority**: Real-time updates are essential for live results experience. OnCourse data and immediate result updates come exclusively from this stream.

**Independent Test**: Can be tested by sending JSON payloads representing OnCourse and result updates. Verify data merges correctly with existing XML-sourced data.

**Acceptance Scenarios**:

1. **Given** a valid API key and existing event data, **When** OnCourse data is sent, **Then** system updates athlete on-course status
2. **Given** a valid API key, **When** live result data is sent, **Then** system incrementally updates results while preserving XML-sourced structure
3. **Given** conflicting data between TCP and XML sources, **When** merge occurs, **Then** TCP updates results while XML remains authoritative for structure

---

### User Story 4 - Configure Event Settings (Priority: P2)

The timekeeper needs to configure event-specific settings such as active race selection, display preferences, and other operational parameters after the event is created.

**Why this priority**: Configuration enables customization of the live display. Important but secondary to the core data flow.

**Independent Test**: Can be tested by updating event configuration via API and verifying changes are reflected in event state.

**Acceptance Scenarios**:

1. **Given** a valid API key for an existing event, **When** race selection is updated, **Then** system updates the active race configuration
2. **Given** a valid API key, **When** invalid configuration values are submitted, **Then** system returns validation error with specific issues
3. **Given** event configuration changes, **When** changes are saved, **Then** public API reflects the updated configuration

---

### Edge Cases

- What happens when API key expires during an active event?
- How does system handle very large XML exports (e.g., multi-day events with thousands of athletes)?
- What happens when TCP data arrives before any XML has been ingested?
- How does system handle concurrent ingestion requests from the same event?
- What happens when c123-server connection is interrupted and data arrives out of order?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an endpoint to create new events and return a unique API key
- **FR-002**: System MUST validate API key on every ingest request and return 401 for invalid/expired keys
- **FR-003**: System MUST accept XML export data and parse it into structured event data (categories, athletes, schedule, results)
- **FR-004**: System MUST accept JSON data representing TCP stream updates (OnCourse, live results)
- **FR-005**: System MUST implement merge strategy: XML authoritative for structure, TCP updates for real-time data
- **FR-006**: System MUST provide an endpoint to update event configuration (race selection, settings)
- **FR-007**: API keys MUST have configurable validity period (default: several days, matching event duration)
- **FR-008**: System MUST support only one active event per API key (prevents cross-event data leaks)
- **FR-009**: System MUST return appropriate error responses with details for validation failures
- **FR-010**: System MUST handle OnCourse data exclusively from TCP stream (never from XML)
- **FR-011**: System MUST log all API requests for debugging and audit purposes

### Key Entities

- **Event**: Represents a timing event with name, dates, configuration, and lifecycle state (draft → startlist → running → finished → official)
- **API Key**: Unique authentication token tied to exactly one event, with creation timestamp and expiry
- **Ingest Record**: Log of each data ingestion with timestamp, source type (XML/JSON), status, and any errors

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Event creation and API key generation completes in under 1 second
- **SC-002**: XML ingestion (up to 5MB payload) processes successfully in under 5 seconds
- **SC-003**: JSON/TCP stream updates process in under 200ms per request
- **SC-004**: System correctly rejects 100% of requests with invalid API keys
- **SC-005**: Data ingested via API is available to public endpoints within 2 seconds
- **SC-006**: System handles at least 10 concurrent ingest requests without data corruption

## Assumptions

- c123-server handles the TCP connection to Canoe123.exe and forwards data as HTTP requests
- XML format follows c123-protocol-docs specification
- API keys are generated using cryptographically secure random generation
- Database layer from Feature #4 is available and provides repository pattern access
- Event lifecycle state transitions are managed by the ingest logic based on data received
