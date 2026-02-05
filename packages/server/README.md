# @c123-live-mini/server

Backend API server for c123-live-mini timing system.

## Quick Start

```bash
# Install dependencies (from monorepo root)
npm install

# Run migrations
npm run migrate --workspace=@c123-live-mini/server

# Start development server
npm run dev --workspace=@c123-live-mini/server

# Run type checking
npm run typecheck --workspace=@c123-live-mini/server

# Run tests
npm run test --workspace=@c123-live-mini/server
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_PATH` | SQLite database file path | `./data/live-mini.db` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `LOG_LEVEL` | Log level (`debug` / `info` / `warn` / `error`) | `info` |

## API Endpoints

Base URL: `/api/v1`

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | List all public events |
| GET | `/events/:eventId` | Get event details with classes and races |
| GET | `/events/:eventId/results/:raceId` | Get results for a specific race |
| GET | `/events/:eventId/startlist/:raceId` | Get startlist for a specific race |
| GET | `/events/:eventId/oncourse` | Get competitors currently on course |
| GET | `/events/:eventId/categories` | Get available categories for an event |

### Admin Endpoints (Requires X-API-Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/events` | Create a new event, returns API key |

### Ingest Endpoints (Requires X-API-Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ingest/xml` | Ingest full XML export data |
| POST | `/ingest/oncourse` | Update OnCourse data (real-time) |

### Query Parameters

#### Results Endpoint (`/events/:eventId/results/:raceId`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `catId` | string | Filter by category ID |
| `detailed` | boolean | Include gate penalties (`true` / `1`) |
| `includeAllRuns` | boolean | Include all runs for BR1/BR2 races |

## Authentication

Protected endpoints require the `X-API-Key` header with a valid API key.

```bash
curl -H "X-API-Key: your-api-key" https://api.example.com/api/v1/ingest/xml
```

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Invalid request | Request validation failed |
| 401 | Unauthorized | Invalid or missing API key |
| 404 | Not found | Resource not found |
| 409 | Conflict | Resource already exists |
| 500 | Internal error | Server error |

## Project Structure

```
src/
├── app.ts                 # Fastify app configuration
├── index.ts               # Server entry point
├── db/
│   ├── database.ts        # Kysely database connection
│   ├── schema.ts          # Database type definitions
│   ├── migrate.ts         # Migration runner
│   ├── migrations/        # SQL migrations
│   └── repositories/      # Data access layer
├── routes/                # API route handlers
├── services/              # Business logic
├── middleware/            # Fastify middleware
├── schemas/               # JSON Schema validation
└── utils/                 # Utility functions
```

## Database

SQLite database with Kysely query builder. Migrations are managed in `src/db/migrations/`.

### Run Migrations

```bash
npm run migrate --workspace=@c123-live-mini/server
```

### Database Tables

- `events` - Race events
- `classes` - Competition classes
- `categories` - Age categories
- `participants` - Competitors
- `races` - Individual races within events
- `results` - Race results
- `courses` - Course definitions with gate counts

## Development

### Adding New Endpoints

1. Define JSON Schema in `src/schemas/index.ts`
2. Create route handler in `src/routes/`
3. Register route in `src/app.ts`

### Adding Repository Methods

1. Extend repository class in `src/db/repositories/`
2. Use `this.logOperation()` for debug logging
3. Use `this.log.info()` for important operations

## Related Documentation

- [API Contracts](../../specs/002-data-model/contracts/api.md) - Full API specification
- [Data Model](../../specs/002-data-model/data-model.md) - Database schema design
- [Quickstart](../../specs/002-data-model/quickstart.md) - Setup guide
