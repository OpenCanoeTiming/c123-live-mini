# Data Model: Frontend Foundation

This feature is frontend-only — no database changes. This document defines the client-side data structures and their relationships to the Client API (Feature #6).

## API Response Types (Updated for Feature #6)

These types must match the actual API responses after Feature #6 data abstraction. The existing `services/api.ts` has stale types that need updating.

### EventListItem

```
eventId: string          // e.g., "CZE2.2024062500"
mainTitle: string        // e.g., "LODM 2024"
subTitle: string | null  // e.g., "Litoměřice"
location: string | null
startDate: string | null // ISO date
endDate: string | null
discipline: string | null
status: string           // "draft" | "startlist" | "running" | "finished" | "official"
```

Note: No `id` field — Feature #6 removed internal integer IDs from public responses.

### EventDetail

```
eventId: string
mainTitle: string
subTitle: string | null
location: string | null
facility: string | null
startDate: string | null
endDate: string | null
discipline: string | null
status: string
```

### RaceInfo

```
raceId: string           // e.g., "Q-C1M"
classId: string | null   // e.g., "C1M"
raceType: string         // e.g., "qualification", "final", "best-run-1"
raceOrder: number | null
startTime: string | null
raceStatus: number       // 1=scheduled, 4=running, 8=completed, etc.
```

Note: `disId` removed in Feature #6, replaced by `raceType`.

### ResultEntry (Standard)

```
rnk: number | null
bib: number | null
athleteId: string | null  // replaces participantId
name: string
club: string | null
noc: string | null
catId: string | null
catRnk: number | null
catTotalBehind: string | null
time: number | null       // hundredths of a second
pen: number | null        // hundredths
total: number | null      // hundredths
totalBehind: string | null
status: string | null     // "DNS" | "DNF" | "DSQ" | null
```

### ResultEntry (Best-Run with includeAllRuns)

Extends standard result with:

```
betterRunNr: number | null   // 1 or 2 — which run was better
totalTotal: number | null    // best result of both runs (hundredths)
prevTime: number | null      // other run's time
prevPen: number | null       // other run's penalty
prevTotal: number | null     // other run's total
prevRnk: number | null       // other run's rank
```

### StartlistEntry

```
bib: number | null
athleteId: string | null
name: string
club: string | null
noc: string | null
catId: string | null
startNr: number | null    // start order
startTime: string | null  // scheduled start time
```

### CategoryInfo (from /categories endpoint)

```
catId: string             // e.g., "ZS", "MJ"
name: string              // e.g., "Ženy Seniorky"
classIds: string[]        // classes this category appears in
```

## Client-Side Derived Structures

### ClassGroup (two-level navigation)

Derived from flat race list by grouping on `classId`:

```
classId: string           // e.g., "C1M"
races: RaceInfo[]         // races within this class, sorted by raceOrder
```

Derived via: `races.reduce((groups, race) => group by race.classId)`

### RaceTypeLabel (Czech label mapping)

Static mapping from API `raceType` to Czech display label:

```
"qualification" → "Kvalifikace"
"semifinal"     → "Semifinále"
"final"         → "Finále"
"best-run-1"    → "1. jízda"
"best-run-2"    → "2. jízda"
"training"      → "Trénink"
"unknown"       → "Neznámý typ"
```

## Data Flow

```
API /events          → EventListItem[]  → EventList page
API /events/:id      → {event, classes, races} → EventDetail page
  races              → ClassGroup[]     → Two-level navigation (class → round)
API /events/:id/results/:raceId → ResultEntry[] → ResultList component
  ?catId=X           → filtered results with catRnk
  ?includeAllRuns    → BR paired results with prevTime, betterRunNr
API /events/:id/startlist/:raceId → StartlistEntry[] → StartlistTable component
API /events/:id/categories → CategoryInfo[] → FilterPills component
```

## State Management

No external state library. React component state with these key pieces:

```
Route state (from URL hash):
  - currentView: "home" | "event" | "race"
  - eventId: string | null
  - raceId: string | null

Application state:
  - events: EventListItem[]
  - eventDetail: EventDetail | null
  - races: RaceInfo[]  (flat from API)
  - classGroups: ClassGroup[]  (derived)
  - categories: CategoryInfo[]
  - selectedClassId: string | null
  - selectedCatId: string | null  (persists across race changes)
  - results: ResultEntry[] | null
  - startlist: StartlistEntry[] | null

Loading/error per section:
  - eventsState: "idle" | "loading" | "success" | "error"
  - eventState: "idle" | "loading" | "success" | "error"
  - resultsState: "idle" | "loading" | "success" | "error"
```
