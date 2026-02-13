# Data Model: Live Results UI

This feature is frontend-only. No database schema changes are needed. All data comes from the existing server API (REST + WebSocket). This document describes the **client-side data structures** used to manage live state.

## Client State Entities

### EventLiveState

Top-level state container for a single event's live data, managed by a reducer in EventDetailPage.

| Field | Type | Description |
|-------|------|-------------|
| event | PublicEventDetail | Event metadata (title, status, dates) |
| classes | PublicClass[] | Boat class definitions with categories |
| races | PublicRace[] | All races with types and statuses |
| categories | PublicAggregatedCategory[] | Aggregated age categories for filtering |
| resultsByRace | Map<raceId, PublicResult[]> | Cached results keyed by race ID |
| oncourse | PublicOnCourseEntry[] | Athletes currently on water (event-wide) |
| detailedCache | Map<`${raceId}-${bib}`, RunDetailData> | Cached detailed results for expanded rows |

### RunDetailData

Cached data for an inline-expanded result row, fetched on demand via `?detailed=true`.

| Field | Type | Description |
|-------|------|-------------|
| dtStart | string \| null | Start timestamp (ISO 8601) |
| dtFinish | string \| null | Finish timestamp (ISO 8601) |
| courseGateCount | number | Total gates on course |
| gates | PublicGate[] | Gate-by-gate penalties |

### ConnectionState

WebSocket connection lifecycle state.

| Field | Type | Description |
|-------|------|-------------|
| status | 'connecting' \| 'connected' \| 'reconnecting' \| 'disconnected' | Current connection state |
| retryCount | number | Consecutive reconnection attempts |
| lastMessageAt | number \| null | Timestamp of last received message (for staleness detection) |

### ViewPreferences

User's display preferences for the current session.

| Field | Type | Description |
|-------|------|-------------|
| viewMode | 'simple' \| 'detailed' | Current view mode (default: simple) |
| oncoursePanelOpen | boolean | OnCourse panel expanded/collapsed (default: true) |
| expandedRows | Set<`${raceId}-${bib}`> | Individually expanded rows in simple mode |

## State Transitions

### WebSocket Message → State Update

| Message Type | State Change |
|---|---|
| `full` | Replace event, classes, races, categories. Clear resultsByRace cache. |
| `diff` with `results` | Upsert into `resultsByRace[raceId]` by bib. Re-sort by rank. |
| `diff` with `oncourse` | Replace entire `oncourse` array. |
| `diff` with `status` | Update `event.status`. If changed to 'finished', clear oncourse. |
| `refresh` | Clear all cached state. Trigger full REST re-fetch. |

### Connection State Transitions

```
[initial] → connecting → connected
connected → reconnecting (on close/error)
reconnecting → connecting (retry attempt)
reconnecting → disconnected (max retries exceeded → fallback to polling)
disconnected → connecting (manual retry or polling detects server available)
```

### Reconnection Backoff

| Retry # | Delay |
|---------|-------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5+ | 15s (cap) |

After 5 failed attempts, switch to REST polling fallback (15s interval).

## Existing Server Types (No Changes)

All types below are already defined in `packages/shared/src/types/`:

- `PublicResult`, `PublicResultDetailed`, `PublicResultMultiRun` — from `publicApi.ts`
- `PublicOnCourseEntry`, `PublicGate` — from `publicApi.ts`
- `PublicEventDetail`, `PublicClass`, `PublicRace` — from `publicApi.ts`
- `WsMessage`, `WsMessageFull`, `WsMessageDiff`, `WsMessageRefresh` — from `websocket.ts`
- `WsFullPayload`, `WsDiffPayload` — from `websocket.ts`

No new shared types needed. All client-side types are local to the frontend package.
