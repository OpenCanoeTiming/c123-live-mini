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
- **Server**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Start individually

```bash
# Server only
npm run dev -w packages/server

# Frontend only
npm run dev -w packages/page
```

## Verify Installation

### 1. Health Check

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

### 2. Create Test Event

```bash
curl -X POST http://localhost:3001/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Event"}'
```

### 3. Add Test Result

```bash
curl -X POST http://localhost:3001/api/v1/events/1/results \
  -H "Content-Type: application/json" \
  -d '{"athleteName": "Test Athlete", "timeMs": 95420, "penaltySeconds": 2}'
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
│   └── page/            # React frontend
│       ├── src/
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

SQLite database is auto-created at `packages/server/data/poc.db` on first run.

To reset database, delete the file and restart the server.

## Troubleshooting

### Port already in use

```bash
# Find process on port 3001
lsof -i :3001
# Kill it
kill -9 <PID>
```

### Database locked

Ensure only one server instance is running.

### CORS errors

Frontend must run on http://localhost:5173 (default Vite port) for CORS to work.
