# Research: Live Results UI

## R1: WebSocket Client Strategy

**Decision**: Custom lightweight hook (`useEventWebSocket`) wrapping browser-native `WebSocket` API.

**Rationale**: The server protocol is simple (unidirectional, 3 message types). No need for a library like socket.io — the native WebSocket API plus a custom reconnection hook is sufficient and avoids adding dependencies. The server already handles heartbeat via ping/pong frames which the browser handles natively.

**Alternatives considered**:
- `socket.io-client`: Overkill — server uses raw WebSocket via `@fastify/websocket`, not socket.io. Would add protocol mismatch.
- `reconnecting-websocket` npm package: Small utility, but implementing reconnection with exponential backoff is straightforward (~30 lines) and avoids dependency.

## R2: Client-Side State Management for Live Data

**Decision**: React state (useState/useReducer) in EventDetailPage with a dedicated reducer for applying WebSocket messages (full/diff/refresh).

**Rationale**: The existing EventDetailPage already manages event data, races, results, and categories via useState. Adding a reducer for WebSocket message handling fits naturally. No global state library needed — the live data scope is limited to a single event page.

**Alternatives considered**:
- Zustand / Redux: Unnecessary complexity for a single-page data scope. The app has no cross-page state sharing needs.
- React Context: Would work but adds indirection without benefit since all consumers are children of EventDetailPage.

## R3: Diff Application Strategy

**Decision**: Upsert by composite key `bib + raceId` for results, replace array for oncourse entries.

**Rationale**: Matches server's broadcast pattern — diff messages contain full result objects for changed athletes. OnCourse diffs contain the complete current on-course list (small, typically 1-3 athletes). The server sends `oncourse` as a complete snapshot per diff, not individual entry changes.

**Alternatives considered**:
- Granular field-level patching: Server doesn't send field-level diffs, so this would require server changes.
- Full re-fetch on every diff: Wasteful; defeats the purpose of WebSocket.

## R4: REST Polling Fallback

**Decision**: Poll every 15 seconds when WebSocket is unavailable. Poll the same REST endpoints already used for initial load.

**Rationale**: 15 seconds balances freshness with server load for the "few hundred users" scale. Uses existing `api.ts` functions so no new endpoints needed. Polling activates only when WebSocket fails (not as a parallel mechanism).

**Alternatives considered**:
- 5-second polling: Too aggressive for a fallback mechanism on a small server.
- 30-second polling: Too stale for live results during an active race.
- Server-Sent Events (SSE) as fallback: Would require server changes; not worth the complexity for a fallback.

## R5: Inline Expandable Row Pattern

**Decision**: Conditionally render a detail panel `<tr>` below the result row using the existing `Table` component's row structure. Detail fetched via `getEventResults(eventId, raceId, { detailed: true })` on first expand.

**Rationale**: The server already supports `?detailed=true` which returns `dtStart`, `dtFinish`, `courseGateCount`, and `gates[]`. Fetching on demand avoids loading gate data for all athletes upfront. Once fetched, cache the detailed data in component state.

**Alternatives considered**:
- Preload all detailed data: Wasteful — most users won't expand every row.
- Custom overlay/modal: Rejected in clarification phase — inline expand chosen.

## R6: OnCourse Data Source

**Decision**: OnCourse data arrives via WebSocket diff messages (`oncourse` field) and is initialized via REST `GET /api/v1/events/:eventId/oncourse` on page load.

**Rationale**: The WebSocket already broadcasts oncourse updates in diff messages. The REST endpoint provides the initial state. OnCourse entries are event-scoped (not race-filtered), matching the clarified requirement.

**Alternatives considered**:
- WebSocket-only (skip REST init): The initial `full` message doesn't include oncourse data — it only has event structure. REST is needed for the initial oncourse state.

## R7: rvp-design-system Component Mapping

**Decision**: Use existing design system components for all UI elements:

| Feature | Component(s) |
|---------|-------------|
| OnCourse panel | `Card` (collapsible), `SectionHeader` with collapse action |
| Gate penalties | `Badge` for penalty indicators |
| View toggle | `Tabs` (pills variant) or `Button` toggle |
| Connection status | `LiveIndicator` + `Badge` |
| Loading states | `SkeletonCard`, `SkeletonTable` |
| Empty states | `EmptyState` |
| Result table | `Table` with `ColumnDef` |

**Rationale**: All required UI patterns map to existing design system components. No missing components identified that would require unstyled fallbacks.

## R8: View Mode Persistence

**Decision**: Store view mode in React state (session-scoped). Reset on page reload.

**Rationale**: Spec requires persistence "within the same session" but not across sessions. React state naturally provides this — survives race/class navigation but resets on full page reload. No need for localStorage or URL params.

**Alternatives considered**:
- localStorage: Persists across sessions, which exceeds spec requirements.
- URL query parameter: Would clutter URLs shared between users (a spectator sharing a link shouldn't force their view preference on the recipient).
