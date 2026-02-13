# Client API Usage Contracts: Live Results UI

This feature consumes existing server endpoints. No new server endpoints are needed. This document specifies how the frontend uses each endpoint.

## REST Endpoints (Existing)

### Initial Page Load

| Endpoint | When Called | Response Used For |
|----------|-----------|-------------------|
| `GET /api/v1/events/:eventId` | On mount | Event details, classes, races structure |
| `GET /api/v1/events/:eventId/categories` | On mount | Category filter pills |
| `GET /api/v1/events/:eventId/results/:raceId` | On race selection | Results table data |
| `GET /api/v1/events/:eventId/startlist/:raceId` | Fallback when no results | Startlist table |
| `GET /api/v1/events/:eventId/oncourse` | On mount (running events) | Initial OnCourse panel data |

### On-Demand Requests

| Endpoint | When Called | Response Used For |
|----------|-----------|-------------------|
| `GET /api/v1/events/:eventId/results/:raceId?detailed=true` | Row expand (US3) | Gate-by-gate data, timestamps |
| `GET /api/v1/events/:eventId/results/:raceId?catId=X` | Category filter change | Filtered results with category ranking |
| `GET /api/v1/events/:eventId/results/:raceId?includeAllRuns=true` | Best-run race view | Multi-run result data |

### Polling Fallback

When WebSocket is unavailable, poll these endpoints every 15 seconds:

| Endpoint | Equivalent WS Data |
|----------|-------------------|
| `GET /api/v1/events/:eventId/results/:raceId` | `diff.results` |
| `GET /api/v1/events/:eventId/oncourse` | `diff.oncourse` |
| `GET /api/v1/events/:eventId` | `diff.status` (event status) |

## WebSocket Protocol (Existing)

### Connection

```
URL: ws://{host}/api/v1/events/:eventId/ws
Direction: Server → Client (unidirectional)
Heartbeat: Server ping every 30s, browser auto-pong
```

### Message Handling

```typescript
// Message discrimination
switch (message.type) {
  case 'full':
    // Replace entire event state
    // message.data: { event, classes, races, categories }
    break;

  case 'diff':
    // Incremental update (all fields optional)
    // message.data.results?: PublicResult[] — upsert by bib into resultsByRace[raceId]
    // message.data.raceId?: string — target race for results
    // message.data.oncourse?: PublicOnCourseEntry[] — replace oncourse array
    // message.data.status?: PublicEventStatus — update event status
    break;

  case 'refresh':
    // Discard all cached state
    // Re-fetch via REST: event details + current race results + oncourse
    break;
}
```

## New API Service Functions

Add to existing `packages/client/src/services/api.ts`:

```typescript
// Fetch on-course entries for an event
export async function getOnCourse(eventId: string): Promise<PublicOnCourseEntry[]>

// Fetch detailed result for a specific athlete (for inline expand)
// Uses existing getEventResults with detailed=true option
// No new function needed — already supported via options parameter
```
