# Quickstart: Live Data Pipeline

**Feature**: 009-live-data-pipeline

## Prerequisites

- Node.js 20 LTS
- npm workspaces setup (`npm install` at repo root)
- Feature #5 (Ingest API), #6 (Client API), #8 (Event Lifecycle) implemented
- New dependency: `@fastify/websocket` in packages/server

## Key Files to Create

| File | Purpose |
|------|---------|
| `packages/shared/src/types/websocket.ts` | WebSocket message type definitions |
| `packages/server/src/services/WebSocketManager.ts` | Connection tracking, room management, broadcast, heartbeat |
| `packages/server/src/routes/websocket.ts` | WebSocket endpoint route handler |

## Key Files to Modify

| File | Change |
|------|--------|
| `packages/shared/src/types/index.ts` | Export WebSocket types |
| `packages/server/src/app.ts` | Register `@fastify/websocket` plugin, pass WebSocketManager to routes |
| `packages/server/src/routes/ingest.ts` | Add broadcast calls after XML/results/oncourse ingestion |
| `packages/server/src/routes/admin.ts` | Add broadcast call after state transition, handle official state closure |
| `packages/server/package.json` | Add `@fastify/websocket` dependency |

## Development Flow

```bash
# 1. Install new dependency
cd packages/server && npm install @fastify/websocket

# 2. Run server in dev mode
npm run dev

# 3. Create event and ingest XML (existing flow)
curl -X POST http://localhost:3000/api/v1/admin/events \
  -H 'Content-Type: application/json' \
  -d '{"eventId": "TEST.WS", "mainTitle": "WebSocket Test"}'
# Returns: { "apiKey": "..." }

# Transition to running
curl -X PATCH http://localhost:3000/api/v1/admin/events/TEST.WS/status \
  -H 'X-API-Key: <apiKey>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "startlist"}'

curl -X PATCH http://localhost:3000/api/v1/admin/events/TEST.WS/status \
  -H 'X-API-Key: <apiKey>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "running"}'

# 4. Connect WebSocket client (using wscat or browser)
npx wscat -c ws://localhost:3000/api/v1/events/TEST.WS/ws
# Should receive: { "type": "full", "data": { "event": {...}, ... } }

# 5. In another terminal, ingest a result
curl -X POST http://localhost:3000/api/v1/ingest/results \
  -H 'X-API-Key: <apiKey>' \
  -H 'Content-Type: application/json' \
  -d '{"results": [{"raceId": "K1M-BR1", "bib": 42, "time": 9523, "pen": 200}]}'
# WebSocket client should receive: { "type": "diff", "data": { "results": [...], "raceId": "K1M-BR1" } }

# 6. Test connection limit rejection
# Connect 200+ clients and verify 201st is rejected with 503

# 7. Test official state closure
curl -X PATCH http://localhost:3000/api/v1/admin/events/TEST.WS/status \
  -H 'X-API-Key: <apiKey>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "finished"}'
# WebSocket receives: { "type": "diff", "data": { "status": "finished" } }

curl -X PATCH http://localhost:3000/api/v1/admin/events/TEST.WS/status \
  -H 'X-API-Key: <apiKey>' \
  -H 'Content-Type: application/json' \
  -d '{"status": "official"}'
# WebSocket receives: { "type": "diff", "data": { "status": "official" } }
# Then connection closes after 5 seconds with code 1000
```

## Testing Strategy

- **Unit tests**: WebSocketManager (room management, broadcast, heartbeat, connection limits)
- **Integration tests**: WebSocket endpoint (connect, receive full state, receive diffs, rejection cases)
- **Manual E2E**: Connect browser client, ingest data via curl, verify real-time updates
