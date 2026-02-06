# Data Model: Client API

**Feature**: 006-client-api | **Date**: 2026-02-06

This document defines **DB schema changes** and **public API data shapes**. Abstraction happens at ingest time — the database stores technology-agnostic data.

## DB Schema Changes (Migration 007)

### races table — add `race_type` column

```sql
ALTER TABLE races ADD COLUMN race_type TEXT;
-- Backfill from dis_id using R1 mapping
UPDATE races SET race_type = CASE dis_id
  WHEN 'BR1' THEN 'best-run-1'
  WHEN 'BR2' THEN 'best-run-2'
  WHEN 'TSR' THEN 'training'
  WHEN 'SR'  THEN 'seeding'
  WHEN 'QUA' THEN 'qualification'
  WHEN 'SEM' THEN 'semifinal'
  WHEN 'FIN' THEN 'final'
  WHEN 'XT'  THEN 'cross-trial'
  WHEN 'X4'  THEN 'cross-heat'
  WHEN 'XS'  THEN 'cross-semifinal'
  WHEN 'XF'  THEN 'cross-final'
  WHEN 'XER' THEN 'cross-extra'
  ELSE 'unknown'
END;
```

**Note**: `dis_id` is kept — it's used internally for BR1↔BR2 pairing logic in `findPairedBrRace()`.

### participants table — add `athlete_id` column

```sql
ALTER TABLE participants ADD COLUMN athlete_id TEXT;
-- Backfill from icf_id
UPDATE participants SET athlete_id = icf_id;
```

**Note**: `icf_id` is kept temporarily for backward compatibility. New ingest writes to `athlete_id`.

### results.gates — format change (data migration)

The `gates` column changes from positional integer array to self-describing object array:

**Before**: `"[0, 2, 50, 0]"` (positional, requires course config to interpret)
**After**: `"[{\"number\":1,\"type\":\"normal\",\"penalty\":0},{\"number\":2,\"type\":\"normal\",\"penalty\":2},{\"number\":3,\"type\":\"reverse\",\"penalty\":50}]"`

Backfill script:
1. For each result with gates data
2. Look up race → course_nr → course.gate_config
3. Zip gate values with gate_config characters
4. Write transformed JSON back

### Ingest Changes

| Service | Change |
|---------|--------|
| `IngestService.ts` (XML) | Map `dis_id` → `race_type` when inserting/upserting races |
| `IngestService.ts` (XML) | Write `athlete_id` instead of `icf_id` for participants |
| `IngestService.ts` (XML) | Transform gates + gate_config → self-describing format before storing results |
| `ResultIngestService.ts` (TCP) | Transform incoming gate data to self-describing format using stored course config |
| `OnCourseStore.ts` | Transform incoming gate data to self-describing format on store |

## Public API Types

### PublicEvent (list item)

Used in `GET /api/v1/events` response.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| eventId | string | events.event_id | Timekeeper-assigned identifier |
| mainTitle | string | events.main_title | Event name |
| subTitle | string \| null | events.sub_title | Subtitle |
| location | string \| null | events.location | Venue location |
| startDate | string \| null | events.start_date | ISO 8601 date |
| endDate | string \| null | events.end_date | ISO 8601 date |
| discipline | string \| null | events.discipline | Slalom/Sprint/WildWater |
| status | EventStatus | events.status | draft/startlist/running/finished/official |

**Excluded**: `id` (internal), `api_key`, `config`, `has_xml_data`, `created_at`, `facility`

### PublicEventDetail

Used in `GET /api/v1/events/:eventId` response. Same as PublicEvent plus:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| facility | string \| null | events.facility | Venue name |
| classes | PublicClass[] | ClassRepository | Boat classes with categories |
| races | PublicRace[] | RaceRepository | Race schedule |

### PublicClass

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| classId | string | classes.class_id | Class identifier (e.g., K1M-ZS) |
| name | string | classes.name | Short name (e.g., K1M) |
| longTitle | string \| null | classes.long_title | Full name |
| categories | PublicCategory[] | CategoriesTable | Age categories in this class |

**Excluded**: `id` (internal), `event_id` (implicit from URL)

### PublicCategory

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| catId | string | categories.cat_id | Category code (e.g., ZS, ZM) |
| name | string | categories.name | Display name (e.g., Senior) |
| firstYear | number \| null | categories.first_year | Youngest birth year |
| lastYear | number \| null | categories.last_year | Oldest birth year |

**Excluded**: `id` (internal), `class_id` (implicit from parent)

### PublicAggregatedCategory

Used in `GET /api/v1/events/:eventId/categories` response.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| catId | string | categories.cat_id | Category code |
| name | string | categories.name | Display name |
| firstYear | number \| null | categories.first_year | Youngest birth year |
| lastYear | number \| null | categories.last_year | Oldest birth year |
| classIds | string[] | aggregated | List of class IDs containing this category |

### PublicRace

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| raceId | string | races.race_id | Race identifier |
| classId | string | resolved from classes.class_id | Parent class |
| raceType | string | races.race_type | Human-readable (stored in DB, see research.md R1) |
| raceOrder | number \| null | races.race_order | Schedule position |
| startTime | string \| null | races.start_time | Scheduled start (ISO 8601) |
| raceStatus | number | races.race_status | Status code (1-12) |

**Excluded**: `id` (internal), `event_id` (implicit), `dis_id` (replaced by raceType), `start_interval`, `course_nr` (internal detail)

### PublicParticipant

Used in startlist and result responses (embedded).

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| bib | number \| null | participants.event_bib | Bib number |
| athleteId | string \| null | participants.athlete_id | Registration ID (stored in DB) |
| name | string | **formatted** familyName + givenName | Full name |
| club | string \| null | participants.club | Club name |
| noc | string \| null | participants.noc | Country code |
| catId | string \| null | participants.cat_id | Age category |
| isTeam | boolean | participants.is_team | Team entry flag |

**Excluded**: `id` (internal), `participant_id` (C123 composite ID), `class_id` (implicit), `event_id` (implicit), `familyName`/`givenName` (merged into `name`), `member1-3` (internal)

### PublicResult (standard mode)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| rnk | number \| null | results.rnk | Overall rank |
| bib | number \| null | results.bib | Bib number |
| athleteId | string \| null | participants.athlete_id | Registration ID (stored in DB) |
| name | string | formatted | Full name |
| club | string \| null | participants.club | Club |
| noc | string \| null | participants.noc | Country |
| catId | string \| null | participants.cat_id | Category |
| catRnk | number \| null | results.cat_rnk | Category rank |
| time | number \| null | results.time | Run time (hundredths) |
| pen | number \| null | results.pen | Total penalty (hundredths) |
| total | number \| null | results.total | Time + penalty |
| totalBehind | string \| null | results.total_behind | Gap to leader |
| catTotalBehind | string \| null | results.cat_total_behind | Gap to category leader |
| status | string \| null | results.status | DNS/DNF/DSQ/CAP or null |

### PublicResult (detailed mode — additional fields)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| dtStart | string \| null | results.dt_start | Actual start timestamp |
| dtFinish | string \| null | results.dt_finish | Actual finish timestamp |
| gates | PublicGate[] \| null | results.gates (pre-transformed in DB) | Self-describing gate penalties |
| courseGateCount | number \| null | courses.nr_gates | Total gates on course |

### PublicResult (multi-run — additional fields for BR races)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| betterRunNr | number \| null | results.better_run_nr | Which run was better |
| totalTotal | number \| null | results.total_total | Best time of both runs |
| prevTime | number \| null | results.prev_time | Other run time |
| prevPen | number \| null | results.prev_pen | Other run penalty |
| prevTotal | number \| null | results.prev_total | Other run total |
| prevRnk | number \| null | results.prev_rnk | Other run rank |

### PublicGate

Self-describing gate penalty object.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| number | number | array index + 1 | Gate number (1-based) |
| type | string | courses.gate_config char | "normal" / "reverse" / "unknown" |
| penalty | number \| null | results.gates[i] | 0 = clean, 2 = touch, 50 = miss |

### PublicOnCourseEntry

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| raceId | string | OnCourseEntry.raceId | Race identifier |
| bib | number | OnCourseEntry.bib | Bib number |
| name | string | OnCourseEntry.name | Full name |
| club | string | OnCourseEntry.club | Club |
| position | number | OnCourseEntry.position | Position on course |
| gates | PublicGate[] | OnCourseStore (pre-transformed) | Self-describing gate progress |
| completed | boolean | OnCourseEntry.completed | Finished flag |
| dtStart | string \| null | OnCourseEntry.dtStart | Start timestamp |
| dtFinish | string \| null | OnCourseEntry.dtFinish | Finish timestamp |
| time | number \| null | OnCourseEntry.time | Current time (hundredths) |
| pen | number | OnCourseEntry.pen | Current penalty |
| total | number \| null | OnCourseEntry.total | Current total |
| rank | number \| null | OnCourseEntry.rank | Live rank |
| ttbDiff | string \| null | OnCourseEntry.ttbDiff | Time-to-beat difference |
| ttbName | string \| null | OnCourseEntry.ttbName | TTB reference name |

**Excluded**: `participantId` (C123 composite ID — internal)

## Transformation Summary

### At Ingest Time (DB stores abstracted data)

| C123 Input | DB Column | Transformation |
|------------|-----------|----------------|
| `dis_id` (BR1, QUA) | `races.race_type` | Mapped to human-readable label |
| `ICFId` | `participants.athlete_id` | Renamed (value preserved) |
| gates positional array + gate_config | `results.gates` | Merged into self-describing objects |
| OnCourse gates | OnCourseStore | Transformed on store with course config |

### At Read Time (Client API — minimal)

| DB Field | API Response | Transformation |
|----------|-------------|----------------|
| `events.id`, `*.id` | Omitted | Strip internal IDs |
| `events.event_id` | `eventId` | camelCase rename |
| `participants.participant_id` | Omitted | C123 internal, not exposed |
| `races.dis_id` | Omitted | Internal, `raceType` used instead |
| `participants.icf_id` | Omitted | Legacy, `athleteId` used instead |
| `family_name` + `given_name` | `name` | Formatted string |
| `courses.gate_config` | Omitted | Already merged into gate objects |
