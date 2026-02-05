# Quickstart: Technical PoC

## Prerequisites

- Node.js 20 LTS
- npm 10+

## Setup

```bash
# Clone and install
git clone <repository-url>
cd c123-live-mini
npm install
```

## Development

### Start both server and frontend

```bash
npm run dev
```

This starts:
- **Server**: http://localhost:3000
- **Frontend**: http://localhost:5173

### Start individually

```bash
# Server only
npm run dev -w packages/server

# Frontend only
npm run dev -w packages/client
```

## Verify Installation

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

### 2. Create Test Event

```bash
curl -X POST http://localhost:3000/api/v1/admin/events \
  -H "Content-Type: application/json" \
  -d '{"eventId": "test-event", "mainTitle": "Test Event"}'
```

Expected response:
```json
{"id":1,"eventId":"test-event","apiKey":"<generated-api-key>"}
```

### 3. Verify Event Created

```bash
curl http://localhost:3000/api/v1/events/test-event
```

### 4. View in Browser

Open http://localhost:5173 to see the frontend displaying the test data.

## Project Structure

```
c123-live-mini/
├── packages/
│   ├── server/          # Fastify backend
│   │   ├── src/
│   │   └── package.json
│   ├── client/          # React frontend
│   │   ├── src/
│   │   └── package.json
│   └── shared/          # Shared types
│       └── package.json
├── package.json         # Workspace root
└── tsconfig.base.json   # Shared TS config
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start development servers |
| `npm run build` | Build all packages |
| `npm test` | Run all tests |
| `npm run typecheck` | Check TypeScript |

## Database

SQLite database is auto-created at `packages/server/data/live-mini.db` on first run.
Migrations are automatically applied when the server starts.

To reset database, delete the file and restart the server.

## Troubleshooting

### Port already in use

```bash
# Find process on port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Database locked

Ensure only one server instance is running.

### CORS errors

Frontend must run on http://localhost:5173 (default Vite port) for CORS to work.
