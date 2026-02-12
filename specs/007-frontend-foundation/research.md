# Research: Frontend Foundation

## R1: Hash-Based Routing Library

**Decision**: Use `wouter` for hash-based routing

**Rationale**: Application has only 3-4 routes. wouter adds ~2.2 KB gzipped vs react-router's ~15 KB. Zero dependencies, simple API, TypeScript support. Aligns with YAGNI principle — no unused features.

**Alternatives considered**:
- react-router v7 with HashRouter — 15 KB, overkill for 3-4 routes, 85% larger
- Custom hash router (hashchange + useState) — ~0.5 KB but maintenance burden, no community support, reinventing the wheel
- @tanstack/router — powerful but heavy, designed for complex apps

**Route structure**:
```
/#/                                    → Event list (home)
/#/events/:eventId                     → Event detail with class/race navigation
/#/events/:eventId/race/:raceId        → Race results (deep link to specific race)
```

---

## R2: Two-Level Race Navigation

**Decision**: Group flat race list by `classId`, then sort races within each class by `raceOrder`

**Rationale**: Spectators think in terms of classes ("I want to see C1 men") then rounds ("qualification or final"). This matches the sport's natural hierarchy. The API returns races with `classId` and `raceType` already abstracted.

**Data transformation**:
```
Input:  flat array of races [{raceId, classId, raceType, raceOrder}, ...]
Step 1: Group by classId → Map<classId, Race[]>
Step 2: Sort classes by first race's raceOrder (preserves schedule order)
Step 3: Sort races within class by raceOrder
Output: ordered array of {classId, races: Race[]}
```

**Navigation behavior**:
- Auto-select first class and first race on event load
- When switching class, auto-select first race in new class
- When switching race, keep class selected
- Single class with single race → skip both nav levels

**Edge cases**:
- Single class → hide class selector, show only round tabs
- Single class + single race → hide all navigation, show results directly

---

## R3: Race Type Czech Labels

**Decision**: Use standard Czech canoe terminology

| raceType (API) | Czech Label |
|----------------|-------------|
| qualification | Kvalifikace |
| semifinal | Semifinále |
| final | Finále |
| best-run-1 | 1. jízda |
| best-run-2 | 2. jízda |
| training | Trénink |
| seeding | Seeding |
| cross-heat | Kříž - Jízda |
| cross-semifinal | Kříž - Semifinále |
| cross-final | Kříž - Finále |
| unknown | Neznámý typ |

**Rationale**: "Jízda" (ride/run) is the standard Czech term for individual attempts in best-run format. "Pokus" (attempt) is also used but "jízda" is more common in official results.

---

## R4: Best-Run Display Strategy

**Decision**: Always use `?includeAllRuns=true` for best-run races by default

**Rationale**: When spectators view best-run results, they always want to see both runs. The API's multi-run mode returns both BR1 and BR2 paired per athlete with `betterRunNr` indicating the better run. Showing only one run is confusing in best-run context.

**Display columns for BR results**:
- Rank, Bib, Name, Club
- 1. jízda (time + pen = total)
- 2. jízda (time + pen = total)
- Výsledek (better of the two totals)
- Ztráta (behind leader)
- Better run visually highlighted (bold or checkmark)

**API fields used**:
- `time`, `pen`, `total` — current run
- `prevTime`, `prevPen`, `prevTotal` — other run
- `betterRunNr` — which run is better (1 or 2)
- `totalTotal` — best result of both runs

---

## R5: Existing Code Assessment

**Decision**: Refactor existing client package rather than rewrite

**Current state** (packages/client/):
- App.tsx — monolithic component with all state, no routing
- EventList.tsx — functional, uses DS components
- ResultList.tsx — functional but needs BR support and Czech labels
- services/api.ts — needs update (stale types from pre-Feature #6 era: still has `id`, `participantId`, `disId`)

**What needs to change**:
- Add routing (wouter) — split App.tsx into page components
- Update api.ts types to match Feature #6 API responses (remove internal IDs, add raceType, athleteId)
- Add race grouping utility for two-level navigation
- Add Czech label mapping utility
- Add category filter UI + persistence logic
- Add startlist API call + component
- Replace inline styles with DS components where possible
- Add BR results display mode

**What stays**:
- EventList.tsx — mostly intact, minor cleanup
- services/api.ts fetch wrapper — base pattern is good
- Vite config — works as-is (proxy, test setup)
- Design system integration — already configured

---

## R6: Design System Component Mapping

**Decision**: Map spec requirements to available rvp-design-system components

| UI Element | DS Component | Notes |
|------------|-------------|-------|
| Page wrapper | `PageLayout variant="satellite"` | Already in use |
| Header | `Header variant="satellite"` | Already in use |
| Event cards | `Card clickable` | Already in use |
| Status badges | `Badge` | Already in use |
| Race results table | `Table` or `ResultsTable` | ResultsTable available for sport-specific layout |
| Loading states | `SkeletonCard`, `SkeletonTable` | Already in use |
| Empty states | `EmptyState` | Already in use |
| Error states | `EmptyState + Button` | Already in use |
| Live indicator | `LiveIndicator` | Already in use |
| Class tabs (L1) | `Tabs variant="pills"` | Already in use for flat races |
| Round tabs (L2) | `Tabs variant="pills" size="sm"` | Smaller, nested within class |
| Category filter | `FilterPills` | Available in DS — pill-based filter with clear |
| Section headers | `SectionHeader` | Already in use |
| Startlist | `Table` | Simple data table |
| Footer | Custom div | Keep minimal, DS has no Footer component |
