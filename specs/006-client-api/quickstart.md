# Quickstart: Client API Testing

**Feature**: 006-client-api | **Date**: 2026-02-06

## Prerequisites

```bash
cd /workspace/timing/c123-live-mini
npm install
npm run -w packages/server build
```

## Seed Test Data

```bash
npm run -w packages/server seed
```

This creates a test database with:
- 1 event (LODM 2024, eventId: `CZE2.2024062500`)
- 2 classes (K1M-ZS, K1W-ZS) with age categories
- 2 races (BR1 for each class)
- 20 participants (10 per class)
- 20 results (includes DNS, DNF, DSQ examples)
- 1 course (24 gates with gate config)

## Start Dev Server

```bash
npm run -w packages/server dev
```

Server runs at `http://localhost:3000`.

## Test Endpoints

### List Events
```bash
curl http://localhost:3000/api/v1/events | jq
```

Expected: Array of public events (no draft events), no internal IDs.

### Event Detail
```bash
curl http://localhost:3000/api/v1/events/CZE2.2024062500 | jq
```

Expected: Event metadata + classes with categories + races with `raceType` labels (not raw dis_id).

### Event Categories
```bash
curl http://localhost:3000/api/v1/events/CZE2.2024062500/categories | jq
```

Expected: Aggregated categories with `classIds` arrays.

### Race Results (standard)
```bash
curl http://localhost:3000/api/v1/events/CZE2.2024062500/results/K1M-ZS_BR1_25 | jq
```

Expected: Results with `athleteId` (not `icfId`), no internal IDs, `raceType` on race.

### Race Results (detailed)
```bash
curl "http://localhost:3000/api/v1/events/CZE2.2024062500/results/K1M-ZS_BR1_25?detailed=true" | jq
```

Expected: Additionally includes `gates` as array of objects `{number, type, penalty}`, `dtStart`, `dtFinish`, `courseGateCount`.

### Race Results (category filter)
```bash
curl "http://localhost:3000/api/v1/events/CZE2.2024062500/results/K1M-ZS_BR1_25?catId=ZS" | jq
```

Expected: Only athletes in ZS category, with `catRnk` rankings.

### Startlist
```bash
curl http://localhost:3000/api/v1/events/CZE2.2024062500/startlist/K1M-ZS_BR1_25 | jq
```

Expected: Participants sorted by start order, `athleteId` field present.

### OnCourse
```bash
curl http://localhost:3000/api/v1/events/CZE2.2024062500/oncourse | jq
```

Expected: Empty array (no live data seeded). Gates would be self-describing objects when populated.

### Error Cases

```bash
# Non-existent event
curl http://localhost:3000/api/v1/events/NONEXISTENT | jq
# Expected: 404 { "error": "NotFound", "message": "Event not found" }

# Draft event (if one exists)
# Expected: 404 (treated as non-existent)
```

## Run Tests

```bash
npm run -w packages/server test
```

## Key Validation Points

1. **No internal IDs**: No `id` fields (integer) in any response
2. **No C123 codes**: `raceType` shows human-readable labels, not BR1/QUA/FIN
3. **Self-describing gates**: Gate objects with `{number, type, penalty}`, not positional arrays
4. **athleteId**: Renamed from `icfId`
5. **Draft filtering**: Draft events never appear in any public response
6. **Consistent structure**: All responses follow same JSON conventions
