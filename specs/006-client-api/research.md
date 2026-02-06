# Research: Client API

**Feature**: 006-client-api | **Date**: 2026-02-06

## R1: Race Type Mapping (dis_id → human-readable)

**Decision**: Map C123 `dis_id` codes to human-readable English race type strings.

**Mapping**:

| dis_id | Race Type Label | Description |
|--------|----------------|-------------|
| BR1 | `best-run-1` | First run in best-of-two format |
| BR2 | `best-run-2` | Second run in best-of-two format |
| TSR | `training` | Training/seeding run |
| SR | `seeding` | Seeding run |
| QUA | `qualification` | Qualification round |
| SEM | `semifinal` | Semifinal round |
| FIN | `final` | Final round |
| XT | `cross-trial` | Cross discipline trial |
| X4 | `cross-heat` | Cross discipline heat (4 boats) |
| XS | `cross-semifinal` | Cross discipline semifinal |
| XF | `cross-final` | Cross discipline final |
| XER | `cross-extra` | Cross discipline extra round |

**Rationale**: Labels are lowercase-hyphenated, self-describing, and don't require knowledge of C123 conventions. Frontend can display them directly or map to localized labels.

**Alternatives considered**:
- Numeric enum: Less readable, still requires lookup table
- Full sentences: Too verbose for API field values
- C123 raw codes: Violates technology-transparent principle

## R2: Gate Penalty Self-Describing Format

**Decision**: Transform positional gate arrays (`[0, 2, 50, 0, ...]`) into array of objects with gate metadata.

**Format**:
```json
{
  "gates": [
    { "number": 1, "type": "normal", "penalty": 0 },
    { "number": 2, "type": "normal", "penalty": 2 },
    { "number": 3, "type": "reverse", "penalty": 50 },
    { "number": 4, "type": "normal", "penalty": 0 }
  ]
}
```

**Source data**:
- Gate penalties: `results.gates` (JSON array of integers: 0, 2, 50, null)
- Gate types: `courses.gate_config` (string like `"NNRNNNRNNNN"`, N=normal, R=reverse)
- Gate count: `courses.nr_gates`

**Transformation logic**:
1. Parse `gates` JSON array from result
2. Load course for the race's `course_nr`
3. Zip gate penalties with gate_config characters
4. Map: index → `number` (1-based), config char → `type`, value → `penalty`
5. If course data unavailable, fall back to `type: "unknown"`

**Rationale**: Frontend never needs to separately fetch course configuration. Each gate object is self-contained.

**Alternatives considered**:
- Keep positional array + separate course endpoint: Requires two API calls, error-prone client-side join
- Embed full course config in every result: Redundant, bloats response

## R3: Public Identifier Strategy

**Decision**: Use `event_id` (timekeeper-assigned) for event identification in URLs. For races and participants, use existing string IDs but document them as opaque identifiers.

**URL patterns**:
- `/api/v1/events` — list events
- `/api/v1/events/:eventId` — event detail (eventId = event_id string)
- `/api/v1/events/:eventId/results/:raceId` — race results
- `/api/v1/events/:eventId/startlist/:raceId` — race startlist
- `/api/v1/events/:eventId/oncourse` — on-course athletes
- `/api/v1/events/:eventId/categories` — event categories

**Field mapping in responses**:
- `event.id` → omit (internal DB id)
- `event.eventId` → `event.eventId` (keep, it's timekeeper-assigned)
- `participant.icfId` → `participant.athleteId`
- `participant.id` → omit (internal DB id)
- `result.id` → omit (internal DB id)
- `race.id` → omit (internal DB id)

**Rationale**: event_id is already used in URL params by existing routes. The change is about response bodies — stripping internal IDs and renaming icfId.

## R4: Detailed Mode Enrichment

**Decision**: Extend `?detailed=true` query parameter on results endpoint to include:
- Start/finish timestamps (`dtStart`, `dtFinish`)
- Self-describing gate objects (from R2)
- Course metadata (gate count)

**Standard mode** returns: rank, bib, name, club, noc, category, athleteId, time, pen, total, totalBehind, status, raceType, catRnk, catTotalBehind

**Detailed mode** additionally returns: dtStart, dtFinish, gates (as objects), courseGateCount

**Rationale**: Standard mode is lightweight for result lists. Detailed mode provides full run analysis data. Single endpoint with query parameter avoids endpoint proliferation.

## R5: API Documentation Format

**Decision**: Markdown documentation in `docs/api/client-api.md` with complete endpoint reference.

**Rationale**: Markdown is version-controlled, readable in GitHub, and doesn't require additional tooling. OpenAPI YAML in `contracts/` serves as machine-readable complement.

**Alternatives considered**:
- Swagger UI: Requires hosting, adds runtime dependency
- Only OpenAPI: Less readable for quick reference
- Only Markdown: No machine-readable schema for tooling

## R6: Response Consistency Pattern

**Decision**: All responses follow consistent envelope patterns:

**List responses**:
```json
{ "<pluralEntity>": [...] }
```

**Detail responses**:
```json
{ "event": {...}, "classes": [...], "races": [...] }
```

**Error responses** (already implemented):
```json
{ "error": "NotFound", "message": "Event not found" }
```

**Rationale**: Consistent patterns simplify frontend parsing. No wrapping in `{ data: ... }` — keeps responses flat and predictable.
