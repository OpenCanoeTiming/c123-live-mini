# Quickstart: Data Model Implementation

**Feature**: 002-data-model | **Date**: 2026-02-04

## Prerequisites

- Node.js 20 LTS
- npm 10+
- Repository cloned with monorepo setup complete (Feature #001)

## Setup Steps

### 1. Install Dependencies

```bash
cd /workspace/timing/c123-live-mini
npm install
```

Required packages (add to `packages/server/package.json`):
```json
{
  "dependencies": {
    "kysely": "^0.27.0",
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

### 2. Create Database Configuration

Create `packages/server/src/db/database.ts`:

```typescript
import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { Database } from './schema';

const dialect = new SqliteDialect({
  database: new SQLite(process.env.DATABASE_PATH || './data/live-mini.db'),
});

export const db = new Kysely<Database>({ dialect });
```

### 3. Run Migrations

```bash
npm run migrate --workspace=@c123-live-mini/server
```

Or programmatically:
```typescript
import { Migrator, FileMigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import path from 'path';

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, 'migrations'),
  }),
});

await migrator.migrateToLatest();
```

### 4. Verify Schema

```bash
sqlite3 data/live-mini.db ".schema"
```

Expected tables: events, classes, categories, participants, races, results, courses

## Quick Verification

### Insert Test Event

```typescript
import { db } from './db/database';

const event = await db.insertInto('events')
  .values({
    event_id: 'TEST.20260204',
    main_title: 'Test Event',
    status: 'draft',
    api_key: 'test-key-123',
  })
  .returningAll()
  .executeTakeFirst();

console.log('Created event:', event);
```

### Query Results

```typescript
const results = await db
  .selectFrom('results')
  .innerJoin('participants', 'participants.id', 'results.participant_id')
  .innerJoin('races', 'races.id', 'results.race_id')
  .select([
    'results.rnk',
    'results.bib',
    'participants.family_name',
    'participants.given_name',
    'results.time',
    'results.pen',
    'results.total',
  ])
  .where('races.race_id', '=', 'K1M-ZS_BR1_25')
  .orderBy('results.rnk')
  .execute();
```

## File Structure After Setup

```
packages/server/
├── src/
│   ├── db/
│   │   ├── database.ts      # Kysely instance
│   │   ├── schema.ts        # Type definitions
│   │   ├── migrations/
│   │   │   ├── 001_create_events.ts
│   │   │   ├── 002_create_classes.ts
│   │   │   ├── 003_create_participants.ts
│   │   │   ├── 004_create_races.ts
│   │   │   ├── 005_create_results.ts
│   │   │   ├── 006_create_courses.ts
│   │   │   └── 007_create_indexes.ts
│   │   └── repositories/
│   │       ├── EventRepository.ts
│   │       ├── ParticipantRepository.ts
│   │       ├── RaceRepository.ts
│   │       └── ResultRepository.ts
│   └── ...
└── data/
    └── live-mini.db         # SQLite database file
```

## Common Tasks

### Load Sample XML

```typescript
import { parseXml } from './services/xml-parser';
import { EventRepository } from './db/repositories/EventRepository';

const xml = fs.readFileSync('../c123-protocol-docs/captures/2024-LODM-fin.xml', 'utf8');
const data = parseXml(xml);

const eventRepo = new EventRepository(db);
await eventRepo.importFromXml(data);
```

### Query with Category Filter

```typescript
const results = await db
  .selectFrom('results')
  .innerJoin('participants', 'participants.id', 'results.participant_id')
  .select(['results.*', 'participants.cat_id'])
  .where('participants.cat_id', '=', 'ZS')
  .orderBy('results.cat_rnk')
  .execute();
```

## Next Steps

1. Implement repository classes for each entity
2. Create XML parser service
3. Add API routes using contracts from `contracts/api.md`
4. Test with sample data from `c123-protocol-docs/captures/`
