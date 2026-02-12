# Frontend Route Contract

## Hash Routes

| Route | Page | Data Fetched |
|-------|------|-------------|
| `/#/` | EventListPage | `GET /api/v1/events` |
| `/#/events/:eventId` | EventDetailPage | `GET /api/v1/events/:eventId` + `GET /api/v1/events/:eventId/categories` |
| `/#/events/:eventId/race/:raceId` | EventDetailPage (deep link) | Same as above + `GET /api/v1/events/:eventId/results/:raceId` |

## API Endpoints Consumed

All endpoints from Client API (Feature #6), no authentication required.

| Endpoint | Used By | Query Params |
|----------|---------|-------------|
| `GET /api/v1/events` | EventListPage | — |
| `GET /api/v1/events/:eventId` | EventDetailPage | — |
| `GET /api/v1/events/:eventId/results/:raceId` | ResultList | `?catId=`, `?includeAllRuns=true` |
| `GET /api/v1/events/:eventId/startlist/:raceId` | StartlistTable | — |
| `GET /api/v1/events/:eventId/categories` | CategoryFilter | — |

## Component Hierarchy

```
App
├── Router (wouter HashRouter)
│   ├── /#/ → EventListPage
│   │   └── EventList (Card per event)
│   │
│   └── /#/events/:eventId[/race/:raceId] → EventDetailPage
│       ├── EventHeader (title, location, live indicator)
│       ├── ClassTabs (Level 1 navigation)
│       ├── RoundTabs (Level 2 navigation)
│       ├── CategoryFilter (FilterPills)
│       ├── ResultList (Table) OR StartlistTable (Table)
│       └── EmptyState (when no data)
│
└── PageLayout (satellite wrapper)
    ├── Header (satellite)
    └── Footer
```
