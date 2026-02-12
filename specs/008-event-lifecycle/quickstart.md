# Quickstart: Event Lifecycle

**Feature**: 008-event-lifecycle

## Prerequisites

- Node.js 20 LTS
- npm workspaces setup (`npm install` at repo root)
- Existing database with events table (from Feature #4)

## Key Files to Modify

| File | Change |
|------|--------|
| `packages/shared/src/types/event.ts` | Add `VALID_TRANSITIONS`, `ALLOWED_INGEST` constants |
| `packages/server/src/db/schema.ts` | Add `status_changed_at` to EventsTable |
| `packages/server/src/db/migrations/010_add_status_changed_at.ts` | New migration |
| `packages/server/src/db/repositories/EventRepository.ts` | Add `updateStatusWithTimestamp()` method |
| `packages/server/src/services/EventLifecycleService.ts` | New: state machine validation + transition logic |
| `packages/server/src/routes/admin.ts` | Add `PATCH /admin/events/:eventId/status` |
| `packages/server/src/middleware/apiKeyAuth.ts` | Add `status` to `AuthenticatedRequest.event` |
| `packages/server/src/routes/ingest.ts` | Add state-dependent ingestion guards |

## Development Flow

```bash
# 1. Run server in dev mode
cd packages/server && npm run dev

# 2. Create an event (existing endpoint)
curl -X POST http://localhost:3000/api/v1/admin/events \
  -H 'Content-Type: application/json' \
  -d '{"eventId": "TEST.001", "mainTitle": "Test Event"}'
# Returns: { "apiKey": "..." }

# 3. Transition to startlist (new endpoint)
curl -X PATCH http://localhost:3000/api/v1/admin/events/TEST.001/status \
  -H 'X-API-Key: <apiKey>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "startlist"}'
# Returns: { "previousStatus": "draft", "status": "startlist", "statusChangedAt": "..." }

# 4. Attempt invalid transition (should fail)
curl -X PATCH http://localhost:3000/api/v1/admin/events/TEST.001/status \
  -H 'X-API-Key: <apiKey>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "finished"}'
# Returns 400: { "error": "InvalidTransition", "validTransitions": ["running", "draft"] }

# 5. Verify public visibility
curl http://localhost:3000/api/v1/events
# Event appears in list (not draft)
```

## Testing Strategy

- **Unit tests**: State machine validation (all 25 state combinations)
- **Integration tests**: Admin status endpoint, ingest state guards
- **No E2E needed**: Feature is backend-only with well-defined API contract
