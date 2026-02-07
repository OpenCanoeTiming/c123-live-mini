# Client API Documentation

Public read-only API for accessing live canoe slalom event data.

## Overview

All endpoints are prefixed with `/api/v1`. Responses are JSON with consistent envelope patterns.

### Authentication

The Client API is public and requires no authentication. Draft events are excluded from all responses.

### Error Responses

All errors follow this format:

```json
{
  "error": "NotFound",
  "message": "Event not found"
}
```

## Endpoints

### List Events

```
GET /api/v1/events
```

Returns all public events (excludes draft events), ordered by start date (most recent first).

**Response:**

```json
{
  "events": [
    {
      "eventId": "CZE2.2024062500",
      "mainTitle": "LODM 2024",
      "subTitle": "Litoměřice",
      "location": "Litoměřice",
      "startDate": "2024-06-25",
      "endDate": "2024-06-26",
      "discipline": "Slalom",
      "status": "running"
    }
  ]
}
```

**Status values:** `startlist`, `running`, `finished`, `official`

---

### Get Event Details

```
GET /api/v1/events/:eventId
```

Returns full event details including classes, categories, and race schedule.

**Response:**

```json
{
  "event": {
    "eventId": "CZE2.2024062500",
    "mainTitle": "LODM 2024",
    "subTitle": "Litoměřice",
    "location": "Litoměřice",
    "facility": "WWC Litoměřice",
    "startDate": "2024-06-25",
    "endDate": "2024-06-26",
    "discipline": "Slalom",
    "status": "running"
  },
  "classes": [
    {
      "classId": "K1M-ZS",
      "name": "K1M",
      "longTitle": "Kayak Single Men - Senior",
      "categories": [
        {
          "catId": "ZS",
          "name": "Senior",
          "firstYear": 1990,
          "lastYear": 2005
        }
      ]
    }
  ],
  "races": [
    {
      "raceId": "K1M-ZS_BR1_25",
      "classId": "K1M-ZS",
      "raceType": "best-run-1",
      "raceOrder": 1,
      "startTime": "2024-06-25T09:00:00Z",
      "raceStatus": 8
    }
  ]
}
```

**Race types:** `best-run-1`, `best-run-2`, `training`, `seeding`, `qualification`, `semifinal`, `final`, `cross-trial`, `cross-heat`, `cross-semifinal`, `cross-final`, `cross-extra`

**Race status codes:**
- 1 = Scheduled
- 3 = StartListOK
- 8 = InProgress
- 10 = Completed
- 11 = Final

---

### Get Race Results

```
GET /api/v1/events/:eventId/results/:raceId
```

Returns results for a race ranked by total time.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `catId` | string | Filter by age category code (e.g., `ZS`) |
| `detailed` | boolean | Include gate penalties, timestamps, course context |
| `includeAllRuns` | boolean | For BR races: include both run details |

**Standard Response:**

```json
{
  "race": {
    "raceId": "K1M-ZS_BR1_25",
    "classId": "K1M-ZS",
    "raceType": "best-run-1",
    "raceStatus": 8
  },
  "results": [
    {
      "rnk": 1,
      "bib": 23,
      "athleteId": "60070",
      "name": "NOVÁK Jan",
      "club": "TJ Slavia Praha",
      "noc": "CZE",
      "catId": "ZS",
      "catRnk": 1,
      "time": 9234,
      "pen": 200,
      "total": 9434,
      "totalBehind": "+0.00",
      "catTotalBehind": "+0.00",
      "status": null
    }
  ]
}
```

**Detailed Mode (`?detailed=true`):**

Additional fields per result:

```json
{
  "dtStart": "2024-06-25T09:01:30.000Z",
  "dtFinish": "2024-06-25T09:03:04.340Z",
  "gates": [
    { "number": 1, "type": "normal", "penalty": 0 },
    { "number": 2, "type": "normal", "penalty": 2 },
    { "number": 3, "type": "reverse", "penalty": 0 }
  ],
  "courseGateCount": 24
}
```

**Gate types:** `normal`, `reverse`, `unknown`
**Gate penalties:** `0` = clean, `2` = touch (2s), `50` = miss (50s)

**Multi-Run Mode (`?includeAllRuns=true`):**

For best-run races (BR1/BR2), additional fields:

```json
{
  "betterRunNr": 1,
  "totalTotal": 9434,
  "prevTime": 9500,
  "prevPen": 400,
  "prevTotal": 9900,
  "prevRnk": 2
}
```

**Status values:** `DNS` (Did Not Start), `DNF` (Did Not Finish), `DSQ` (Disqualified), `CAP` (Capped), `null` (normal)

---

### Get Race Startlist

```
GET /api/v1/events/:eventId/startlist/:raceId
```

Returns participants for a race sorted by start order.

**Response:**

```json
{
  "race": {
    "raceId": "K1M-ZS_BR1_25",
    "classId": "K1M-ZS",
    "startTime": "2024-06-25T09:00:00Z"
  },
  "startlist": [
    {
      "startOrder": 1,
      "bib": 23,
      "athleteId": "60070",
      "name": "NOVÁK Jan",
      "club": "TJ Slavia Praha",
      "noc": "CZE",
      "catId": "ZS",
      "startTime": "2024-06-25T09:00:00Z"
    }
  ]
}
```

---

### Get Athletes On Course

```
GET /api/v1/events/:eventId/oncourse
```

Returns athletes currently on the water with live intermediate timing data.

**Response:**

```json
{
  "oncourse": [
    {
      "raceId": "K1M-ZS_BR1_25",
      "bib": 23,
      "name": "NOVÁK Jan",
      "club": "TJ Slavia Praha",
      "position": 1,
      "gates": [
        { "number": 1, "type": "normal", "penalty": 0 },
        { "number": 2, "type": "normal", "penalty": 2 }
      ],
      "completed": false,
      "dtStart": "2024-06-25T09:01:30.000Z",
      "dtFinish": null,
      "time": 4520,
      "pen": 200,
      "total": 4720,
      "rank": 1,
      "ttbDiff": "-1.20",
      "ttbName": "Leader"
    }
  ]
}
```

**Notes:**
- Returns empty array when no athletes are on course
- Data is transient (not persisted to database)
- `position` indicates order on course (1 = closest to finish)

---

### Get Event Categories

```
GET /api/v1/events/:eventId/categories
```

Returns unique age categories aggregated across all classes for the event.

**Response:**

```json
{
  "categories": [
    {
      "catId": "ZS",
      "name": "Senior",
      "firstYear": 1990,
      "lastYear": 2005,
      "classIds": ["K1M-ZS", "C1M-ZS", "K1W-ZS"]
    }
  ]
}
```

---

## Time Values

All time values are in **hundredths of a second** (centiseconds):
- `9234` = 92.34 seconds (1:32.34)
- `200` = 2.00 seconds penalty

## OpenAPI Specification

Full OpenAPI 3.1 spec available at: `specs/006-client-api/contracts/openapi.yaml`
