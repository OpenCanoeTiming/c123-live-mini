# Quickstart: Ingest API

**Feature**: 005-ingest-api
**Date**: 2026-02-06

## Overview

This guide shows how to use the Ingest API to push timing data from c123-server to live-mini-server.

## Prerequisites

- live-mini-server running (local: `npm run dev`, or deployed)
- Event dates known (for API key validity)

## Step 1: Create Event

```bash
curl -X POST http://localhost:3000/api/v1/admin/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "CZE-2026-001",
    "mainTitle": "Czech Canoe Slalom Championships 2026",
    "location": "Prague",
    "facility": "Troja Water Sports Centre",
    "startDate": "2026-06-15",
    "endDate": "2026-06-17",
    "discipline": "CSL"
  }'
```

**Response:**
```json
{
  "id": 1,
  "eventId": "CZE-2026-001",
  "apiKey": "a1b2c3d4e5f6..."
}
```

Save the `apiKey` - you'll need it for all subsequent requests.

## Step 2: Ingest XML Data (First!)

**Important**: XML must be ingested before any OnCourse or Results data.

```bash
curl -X POST http://localhost:3000/api/v1/ingest/xml \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "xml": "<?xml version=\"1.0\"?>..."
  }'
```

**Response:**
```json
{
  "imported": {
    "participants": 150,
    "classes": 4,
    "races": 12,
    "results": 0,
    "courses": 2
  }
}
```

## Step 3: Configure Event (Optional)

Set active race and display mode:

```bash
curl -X PATCH http://localhost:3000/api/v1/admin/events/CZE-2026-001/config \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "activeRaceId": "K1M-H1",
    "displayMode": "simple",
    "showOnCourse": true
  }'
```

## Step 4: Ingest Real-time Updates

### OnCourse Data (athletes currently racing)

```bash
curl -X POST http://localhost:3000/api/v1/ingest/oncourse \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "oncourse": [
      {
        "participantId": "P001",
        "raceId": "K1M-H1",
        "bib": 42,
        "startTime": "2026-06-15T10:30:00Z",
        "status": "on_course"
      }
    ]
  }'
```

### Live Results

```bash
curl -X POST http://localhost:3000/api/v1/ingest/results \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "results": [
      {
        "raceId": "K1M-H1",
        "participantId": "P001",
        "bib": 42,
        "time": 95420,
        "pen": 2,
        "total": 97420,
        "rnk": 3,
        "gates": [
          {"gate": 1, "time": 12500},
          {"gate": 2, "time": 8300, "pen": 2}
        ]
      }
    ]
  }'
```

## API Key Validity

Your API key is valid:
- **From**: 10 days before event start date
- **Until**: 5 days after event end date

If dates are not set, the key is always valid.

## Error Handling

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Key expired on 2026-06-22T00:00:00.000Z"
}
```

**Solution**: Create a new event or extend event dates.

### 400 Bad Request

```json
{
  "error": "Invalid request",
  "message": "Invalid XML data: missing Event element"
}
```

**Solution**: Check your XML format against c123-protocol-docs.

### Data Ignored (no error, but ignored)

```json
{
  "active": 0,
  "ignored": true
}
```

**Cause**: OnCourse/Results sent before XML was ingested.
**Solution**: Send XML data first to establish event structure.

## Integration with c123-server

In c123-server, configure the live-mini connection:

```typescript
// c123-server config
const liveMiniConfig = {
  url: 'https://live-mini.example.com',
  apiKey: 'YOUR_API_KEY'
};

// After connecting to C123.exe:
// 1. Send initial XML export
await liveMini.ingestXml(c123.getFullExport());

// 2. Forward TCP stream events
c123.on('result', (result) => {
  liveMini.ingestResults([result]);
});

c123.on('oncourse', (athletes) => {
  liveMini.ingestOnCourse(athletes);
});
```

## Performance Notes

| Operation | Target | Notes |
|-----------|--------|-------|
| Event creation | <1s | Includes key generation |
| XML ingestion | <5s | Up to 5MB payload |
| OnCourse update | <200ms | In-memory store |
| Results update | <200ms | Direct DB upsert |
