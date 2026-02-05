# API Contracts: Data Model Endpoints

**Feature**: 002-data-model | **Date**: 2026-02-04

## Overview

REST API endpoints for data model CRUD operations. All endpoints return JSON.
Authentication via `X-API-Key` header for admin/ingest endpoints.

Base URL: `/api/v1`

---

## Public Endpoints (No Auth)

### GET /events

List public events.

**Response 200:**
```json
{
  "events": [
    {
      "id": 1,
      "eventId": "CZE2.2024062500",
      "mainTitle": "Summer Youth Olympic Games 2024",
      "subTitle": "Canoe Slalom",
      "location": "Prague",
      "startDate": "2024-06-25",
      "endDate": "2024-06-27",
      "status": "running"
    }
  ]
}
```

---

### GET /events/:eventId

Get event details with races.

**Parameters:**
- `eventId` - Event ID (path)

**Response 200:**
```json
{
  "event": {
    "id": 1,
    "eventId": "CZE2.2024062500",
    "mainTitle": "Summer Youth Olympic Games 2024",
    "subTitle": "Canoe Slalom",
    "location": "Prague",
    "facility": "Whitewater Arena",
    "startDate": "2024-06-25",
    "endDate": "2024-06-27",
    "discipline": "Slalom",
    "status": "running"
  },
  "classes": [
    {
      "classId": "K1M-ZS",
      "name": "K1 Men Seniors",
      "categories": [
        { "catId": "ZS", "name": "Seniors", "firstYear": 13, "lastYear": 99 }
      ]
    }
  ],
  "races": [
    {
      "raceId": "K1M-ZS_BR1_25",
      "classId": "K1M-ZS",
      "disId": "BR1",
      "raceOrder": 10,
      "startTime": "2024-06-25T13:30:00+02:00",
      "raceStatus": 8
    }
  ]
}
```

---

### GET /events/:eventId/results/:raceId

Get results for a specific race.

**Parameters:**
- `eventId` - Event ID (path)
- `raceId` - Race ID (path)
- `catId` - Filter by category (query, optional)
- `detailed` - Include gate penalties (query, optional, default false)

**Response 200:**
```json
{
  "race": {
    "raceId": "K1M-ZS_BR1_25",
    "classId": "K1M-ZS",
    "disId": "BR1",
    "raceStatus": 10
  },
  "results": [
    {
      "rnk": 1,
      "bib": 5,
      "participantId": "60070.K1M.ZS",
      "name": "DOE John",
      "club": "Kayak Club",
      "noc": "CZE",
      "catId": "ZS",
      "catRnk": 1,
      "time": 8520,
      "pen": 200,
      "total": 8720,
      "totalBehind": null,
      "status": null,
      "gates": [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  ]
}
```

**Note:** `gates` included only when `detailed=true`.

---

### GET /events/:eventId/startlist/:raceId

Get startlist for a specific race.

**Parameters:**
- `eventId` - Event ID (path)
- `raceId` - Race ID (path)

**Response 200:**
```json
{
  "race": {
    "raceId": "K1M-ZS_BR1_25",
    "classId": "K1M-ZS",
    "startTime": "2024-06-25T13:30:00+02:00"
  },
  "startlist": [
    {
      "startOrder": 1,
      "bib": 1,
      "participantId": "60070.K1M.ZS",
      "name": "DOE John",
      "club": "Kayak Club",
      "noc": "CZE",
      "startTime": "13:30:00"
    }
  ]
}
```

---

### GET /events/:eventId/oncourse

Get competitors currently on course (real-time).

**Parameters:**
- `eventId` - Event ID (path)

**Response 200:**
```json
{
  "oncourse": [
    {
      "position": 1,
      "raceId": "K1M-ZS_BR1_25",
      "bib": 9,
      "participantId": "60090.K1M.ZS",
      "name": "SMITH Jane",
      "club": "Paddle Club",
      "gates": [0, 0, 2, 0, 0, null, null, null],
      "dtStart": "13:45:00.000",
      "dtFinish": null,
      "time": 4520,
      "pen": 200,
      "total": 4720,
      "rank": 3,
      "ttbDiff": "+1.20",
      "ttbName": "J. DOE"
    }
  ]
}
```

---

## Admin Endpoints (Requires X-API-Key)

### POST /admin/events

Create new event, returns API key.

**Request:**
```json
{
  "eventId": "CZE2.2024062500",
  "mainTitle": "Summer Youth Olympic Games 2024",
  "subTitle": "Canoe Slalom",
  "location": "Prague",
  "facility": "Whitewater Arena",
  "startDate": "2024-06-25",
  "endDate": "2024-06-27",
  "discipline": "Slalom"
}
```

**Response 201:**
```json
{
  "id": 1,
  "eventId": "CZE2.2024062500",
  "apiKey": "a1b2c3d4e5f6..."
}
```

---

### PATCH /admin/events/:eventId/status

Update event status.

**Headers:** `X-API-Key: {apiKey}`

**Request:**
```json
{
  "status": "running"
}
```

**Response 200:**
```json
{
  "eventId": "CZE2.2024062500",
  "status": "running"
}
```

---

## Ingest Endpoints (Requires X-API-Key)

### POST /ingest/xml

Ingest full XML export data.

**Headers:** `X-API-Key: {apiKey}`

**Request:**
```json
{
  "xml": "<Canoe123Data>...</Canoe123Data>"
}
```

**Response 200:**
```json
{
  "imported": {
    "participants": 45,
    "classes": 6,
    "races": 12,
    "results": 180,
    "courses": 2
  }
}
```

---

### POST /ingest/results

Ingest incremental results update (from TCP stream).

**Headers:** `X-API-Key: {apiKey}`

**Request:**
```json
{
  "raceId": "K1M-ZS_BR1_25",
  "results": [
    {
      "participantId": "60070.K1M.ZS",
      "bib": 5,
      "time": 8520,
      "pen": 200,
      "total": 8720,
      "gates": [0, 0, 2, 0, 0, 0, 0, 0],
      "rnk": 1,
      "status": null
    }
  ]
}
```

**Response 200:**
```json
{
  "updated": 1
}
```

---

### POST /ingest/oncourse

Update OnCourse data (from TCP stream).

**Headers:** `X-API-Key: {apiKey}`

**Request:**
```json
{
  "oncourse": [
    {
      "participantId": "60090.K1M.ZS",
      "raceId": "K1M-ZS_BR1_25",
      "bib": 9,
      "name": "SMITH Jane",
      "club": "Paddle Club",
      "position": 1,
      "gates": [0, 0, 2, 0, 0, null, null, null],
      "dtStart": "13:45:00.000",
      "dtFinish": null,
      "time": 4520,
      "pen": 200
    }
  ]
}
```

**Response 200:**
```json
{
  "active": 2
}
```

---

## WebSocket: /ws/events/:eventId

Real-time updates for event data.

### Server → Client Messages

**Full state (on connect, after large changes):**
```json
{
  "type": "full",
  "data": {
    "races": [...],
    "results": {...},
    "oncourse": [...]
  }
}
```

**Incremental update:**
```json
{
  "type": "diff",
  "data": {
    "results": { "K1M-ZS_BR1_25": [...] },
    "oncourse": [...]
  }
}
```

**Refresh signal (client should fetch via REST):**
```json
{
  "type": "refresh"
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid request",
  "message": "Missing required field: eventId"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**404 Not Found:**
```json
{
  "error": "Not found",
  "message": "Event not found: XYZ123"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal error",
  "message": "Database connection failed"
}
```
