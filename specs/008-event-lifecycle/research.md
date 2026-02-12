# Research: Event Lifecycle

**Feature**: 008-event-lifecycle | **Date**: 2026-02-12

## R1: State Machine Pattern for Event Lifecycle

**Decision**: Explicit transition map (adjacency list) with a pure validation function.

**Rationale**: The event lifecycle has exactly 5 states and 6 valid transitions (4 forward + 2 backward corrections). This is small enough that a simple map of `currentState → Set<validNextState>` is the clearest and most testable approach. No state machine library needed.

**Alternatives considered**:
- **State machine library (xstate)**: Overkill for 5 states, adds dependency, harder to debug for this scale.
- **Database-level constraints**: SQLite CHECK constraints can validate state values but cannot enforce transition rules between old and new values.
- **Event sourcing**: Would provide full audit trail but adds significant complexity beyond spec requirements (only current state + last transition time needed).

## R2: State-Dependent Ingestion Enforcement

**Decision**: Add state check to the existing `apiKeyAuth` middleware, extending the `AuthenticatedRequest` with the event's current status. Each ingest route validates allowed states for its data type.

**Rationale**: The middleware already resolves the event from API key and attaches event info to the request. Adding `status` to this resolved data is minimal change. Each ingest route can then check `event.status` against its allowed states before processing.

**Alternatives considered**:
- **Separate middleware per route**: More granular but duplicates event resolution logic.
- **Decorator/guard pattern**: Over-engineered for 3 ingest endpoints with simple state checks.

## R3: WebSocket Diff Notification on State Change

**Decision**: After a successful state transition, emit a `diff` message to all connected clients for that event containing the new status.

**Rationale**: Aligns with existing WebSocket architecture (diff/full/refresh message types). State change is a small payload — just the new status value — making `diff` the natural choice. The `full` message type is reserved for large data changes.

**Alternatives considered**:
- **Full state push**: Unnecessary overhead for a single field change.
- **Refresh signal**: Would force clients to re-fetch via REST, adding latency.

## R4: Admin Endpoint Design

**Decision**: `PATCH /api/v1/admin/events/:eventId/status` with body `{ status: "newState" }`. Authenticated via the same API key mechanism as ingest routes.

**Rationale**: PATCH is semantically correct (partial update of a resource). Separating status change from general event updates makes the state machine validation clear and focused. Using the existing API key auth avoids adding a new auth mechanism.

**Alternatives considered**:
- **PUT /admin/events/:eventId** with full event body: Mixes state transitions with general updates, harder to enforce transition rules.
- **POST /admin/events/:eventId/transitions**: More RESTful for state machines but adds complexity with transition resources that don't need persistence.

## R5: Database Schema Changes

**Decision**: Add `status_changed_at` column to the events table via new migration. No separate transition history table.

**Rationale**: Spec requires recording a timestamp for each state transition (FR-006) but explicitly scopes out full audit log. A single `status_changed_at` timestamp on the events table satisfies the requirement with minimal schema change.

**Alternatives considered**:
- **Separate transitions table**: Full audit trail but explicitly out of scope per assumptions.
- **JSON history column**: Append-only log in a JSON field — clever but harder to query and not needed.
