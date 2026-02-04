# Data Model: Protocol Analysis & Data Model

**Feature**: 002-data-model | **Date**: 2026-02-04

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     Event       │       │     Course      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ eventId         │◄──────│ eventId (FK)    │
│ mainTitle       │       │ courseNr        │
│ subTitle        │       │ nrGates         │
│ location        │       │ gateConfig      │
│ facility        │       └─────────────────┘
│ startDate       │
│ endDate         │       ┌─────────────────┐
│ discipline      │       │     Class       │
│ status          │       ├─────────────────┤
│ apiKey          │◄──────│ eventId (FK)    │
│ createdAt       │       │ classId (PK)    │
└─────────────────┘       │ name            │
        │                 │ longTitle       │
        │                 └────────┬────────┘
        │                          │
        │                 ┌────────▼────────┐
        │                 │    Category     │
        │                 ├─────────────────┤
        │                 │ id (PK)         │
        │                 │ classId (FK)    │
        │                 │ catId           │
        │                 │ name            │
        │                 │ firstYear       │
        │                 │ lastYear        │
        │                 └─────────────────┘
        │
        ▼
┌─────────────────┐       ┌─────────────────┐
│   Participant   │       │      Race       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ eventId (FK)    │       │ eventId (FK)    │
│ participantId   │       │ raceId          │
│ classId (FK)    │       │ classId (FK)    │
│ eventBib        │       │ disId           │
│ icfId           │       │ raceOrder       │
│ familyName      │       │ startTime       │
│ givenName       │       │ courseNr        │
│ noc             │       │ raceStatus      │
│ club            │       └────────┬────────┘
│ catId           │                │
│ isTeam          │                │
│ member1-3       │                │
└────────┬────────┘                │
         │                         │
         │    ┌────────────────────┘
         │    │
         ▼    ▼
┌─────────────────────────────────────────┐
│                 Result                   │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ eventId (FK)                            │
│ raceId (FK) ────────────────────────────│
│ participantId (FK) ─────────────────────│
│ startOrder, bib, startTime              │
│ status (DNS/DNF/DSQ/CAP/null)           │
│ dtStart, dtFinish                       │
│ time, pen, total (hundredths)           │
│ gates (JSON array)                      │
│ rnk, rnkOrder, catRnk, catRnkOrder      │
│ totalBehind, catTotalBehind             │
│ prevTime, prevPen, prevTotal, prevRnk   │  ← BR2 carries BR1 data
│ totalTotal, betterRunNr                 │  ← Best of both runs
│ heatNr, roundNr, qualified              │  ← Cross discipline
└─────────────────────────────────────────┘
```

---

## Table Definitions

### events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| event_id | TEXT | NOT NULL UNIQUE | C123 EventId (e.g., CZE2.2024062500) |
| main_title | TEXT | NOT NULL | Event main title |
| sub_title | TEXT | | Event subtitle |
| location | TEXT | | Venue location |
| facility | TEXT | | Venue name |
| start_date | TEXT | | ISO 8601 date |
| end_date | TEXT | | ISO 8601 date |
| discipline | TEXT | | Slalom/Sprint/WildWater |
| status | TEXT | DEFAULT 'draft' | draft/startlist/running/finished/official |
| api_key | TEXT | UNIQUE | API key for this event |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

### classes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| event_id | INTEGER | FK events(id) | |
| class_id | TEXT | NOT NULL | C123 ClassId (e.g., K1M-ZS) |
| name | TEXT | NOT NULL | Short name |
| long_title | TEXT | | Full name |
| UNIQUE(event_id, class_id) | | | |

### categories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| class_id | INTEGER | FK classes(id) | |
| cat_id | TEXT | NOT NULL | Age category code (e.g., ZS, ZM) |
| name | TEXT | NOT NULL | Display name |
| first_year | INTEGER | | Youngest birth year |
| last_year | INTEGER | | Oldest birth year |

### participants

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| event_id | INTEGER | FK events(id) | |
| participant_id | TEXT | NOT NULL | C123 Id (e.g., 60070.C1M.ZS) |
| class_id | INTEGER | FK classes(id) | |
| event_bib | INTEGER | | Bib number |
| icf_id | TEXT | | Registration number |
| family_name | TEXT | NOT NULL | Last name |
| given_name | TEXT | | First name |
| noc | TEXT | | Country code |
| club | TEXT | | Club name |
| cat_id | TEXT | | Age category |
| is_team | INTEGER | DEFAULT 0 | Boolean |
| member1 | TEXT | | Team member 1 participant_id |
| member2 | TEXT | | Team member 2 participant_id |
| member3 | TEXT | | Team member 3 participant_id |
| UNIQUE(event_id, participant_id) | | | |

### races

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| event_id | INTEGER | FK events(id) | |
| race_id | TEXT | NOT NULL | C123 RaceId (e.g., K1M-ZS_BR1_25) |
| class_id | INTEGER | FK classes(id) | |
| dis_id | TEXT | NOT NULL | Run type: BR1/BR2/TSR/XT/X4/XS/XF/XER |
| race_order | INTEGER | | Schedule order |
| start_time | TEXT | | Scheduled start (ISO 8601) |
| start_interval | TEXT | | Interval between starts |
| course_nr | INTEGER | | Course number (1-4) |
| race_status | INTEGER | DEFAULT 1 | 1-12 enum |
| UNIQUE(event_id, race_id) | | | |

### results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| event_id | INTEGER | FK events(id) | |
| race_id | INTEGER | FK races(id) | |
| participant_id | INTEGER | FK participants(id) | |
| start_order | INTEGER | | Starting position |
| bib | INTEGER | | Bib number |
| start_time | TEXT | | Scheduled start time |
| status | TEXT | | DNS/DNF/DSQ/CAP or NULL for OK |
| dt_start | TEXT | | Actual start timestamp |
| dt_finish | TEXT | | Actual finish timestamp |
| time | INTEGER | | Run time in hundredths |
| gates | TEXT | | JSON array of gate penalties |
| pen | INTEGER | | Total penalty (hundredths) |
| total | INTEGER | | time + pen |
| rnk | INTEGER | | Overall rank |
| rnk_order | INTEGER | | Rank order for ties |
| cat_rnk | INTEGER | | Category rank |
| cat_rnk_order | INTEGER | | Category rank order |
| total_behind | TEXT | | Gap to leader |
| cat_total_behind | TEXT | | Gap to category leader |
| prev_time | INTEGER | | Previous run time (BR2) |
| prev_pen | INTEGER | | Previous run penalty (BR2) |
| prev_total | INTEGER | | Previous run total (BR2) |
| prev_rnk | INTEGER | | Previous run rank (BR2) |
| total_total | INTEGER | | Best time of both runs |
| better_run_nr | INTEGER | | Which run was better (1 or 2) |
| heat_nr | INTEGER | | Heat number (Cross) |
| round_nr | INTEGER | | Round number (Cross) |
| qualified | TEXT | | Q for qualified (Cross) |
| UNIQUE(race_id, participant_id) | | | |

### courses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| event_id | INTEGER | FK events(id) | |
| course_nr | INTEGER | NOT NULL | Course number (1-4) |
| nr_gates | INTEGER | | Number of gates |
| gate_config | TEXT | | Gate types: N=normal, R=reverse |
| UNIQUE(event_id, course_nr) | | | |

---

## Indexes

```sql
-- Query optimization for common access patterns
CREATE INDEX idx_results_race ON results(race_id);
CREATE INDEX idx_results_participant ON results(participant_id);
CREATE INDEX idx_results_event_race ON results(event_id, race_id);
CREATE INDEX idx_participants_event ON participants(event_id);
CREATE INDEX idx_participants_class ON participants(class_id);
CREATE INDEX idx_races_event ON races(event_id);
CREATE INDEX idx_races_class ON races(class_id);
CREATE INDEX idx_classes_event ON classes(event_id);
```

---

## OnCourse (In-Memory Structure)

Not persisted to database. TypeScript interface:

```typescript
interface OnCourseEntry {
  participantId: string;
  raceId: string;
  bib: number;
  name: string;
  club: string;
  position: number;        // 1 = closest to finish
  gates: number[];         // Current penalty state
  completed: boolean;
  dtStart: string | null;
  dtFinish: string | null;
  time: number | null;     // Running time in hundredths
  pen: number;             // Accumulated penalty
  total: number | null;
  rank: number | null;
  ttbDiff: string | null;  // Time to beat difference
  ttbName: string | null;  // Leader name
}

// Server maintains: Map<string, OnCourseEntry> keyed by `${raceId}-${bib}`
```

---

## Validation Rules

### Event
- `event_id` must match pattern: `XXX#.YYYYMMDD##`
- `status` must be one of: draft, startlist, running, finished, official
- `api_key` generated on creation, 32 hex characters

### Participant
- `participant_id` must contain ICF ID and class reference
- `is_team=1` requires at least `member1` to be set
- Team members must exist as participants in same event

### Race
- `race_id` must match pattern: `{ClassId}_{DisId}_{Day}`
- `dis_id` must be valid: BR1, BR2, TSR, SR, QUA, SEM, FIN, XT, X4, XS, XF, XER
- `race_status` must be 1-12

### Result
- `time`, `pen`, `total` in hundredths (divide by 100 for seconds)
- `gates` is JSON array with values: 0 (clean), 2 (touch), 50 (missed)
- `status` NULL means OK, otherwise DNS/DNF/DSQ/CAP
- Results with non-null status excluded from time-based rankings

---

## State Transitions

### Event Lifecycle
```
draft → startlist → running → finished → official
                      ↑
                      └── (can return from finished if corrections needed)
```

### RaceStatus Values Used
```
1 (Scheduled) → 3 (StartListOK) → 8 (InProgress) → 10 (Completed) → 11 (Final)
```

---

## Migration Strategy

Migrations stored in `packages/server/src/db/migrations/` using Kysely migrator:

1. `001_create_events.ts` - events table
2. `002_create_classes.ts` - classes + categories tables
3. `003_create_participants.ts` - participants table
4. `004_create_races.ts` - races table
5. `005_create_results.ts` - results table
6. `006_create_courses.ts` - courses table
7. `007_create_indexes.ts` - all indexes
