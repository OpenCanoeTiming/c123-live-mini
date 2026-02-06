# Data Model: Client API

**Feature**: 006-client-api | **Date**: 2026-02-06

This document defines the **public API data shapes** — what consumers receive. These are transformations of internal DB types, not new database tables.

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
| raceType | string | **mapped from** races.dis_id | Human-readable (see research.md R1) |
| raceOrder | number \| null | races.race_order | Schedule position |
| startTime | string \| null | races.start_time | Scheduled start (ISO 8601) |
| raceStatus | number | races.race_status | Status code (1-12) |

**Excluded**: `id` (internal), `event_id` (implicit), `dis_id` (replaced by raceType), `start_interval`, `course_nr` (internal detail)

### PublicParticipant

Used in startlist and result responses (embedded).

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| bib | number \| null | participants.event_bib | Bib number |
| athleteId | string \| null | **renamed from** participants.icf_id | Registration ID |
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
| athleteId | string \| null | participants.icf_id | Registration ID |
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
| gates | PublicGate[] \| null | **transformed** | Self-describing gate penalties |
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
| gates | PublicGate[] | **transformed** | Self-describing gate progress |
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

| Internal → Public | Transformation |
|-------------------|----------------|
| `events.id` | Omitted |
| `events.event_id` | → `eventId` |
| `participants.icf_id` | → `athleteId` |
| `participants.participant_id` | Omitted (C123 internal) |
| `races.dis_id` | → `raceType` (mapped label) |
| `results.gates` (JSON int[]) | → `gates` (PublicGate[]) with course context |
| `courses.gate_config` | Merged into PublicGate objects |
| `*_name` (family+given) | → `name` (formatted string) |
| All `.id` fields | Omitted from public responses |
