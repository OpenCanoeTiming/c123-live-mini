# Quickstart: Live Results UI

## Prerequisites

- Node.js 20 LTS
- npm 10+
- Server running locally (`packages/server` on port 3000)

## Setup

```bash
cd /workspace/timing/c123-live-mini
npm install
```

## Development

```bash
# Terminal 1: Start server (provides API + WebSocket)
npm run dev -w packages/server

# Terminal 2: Start frontend dev server
npm run dev -w packages/client
```

Frontend runs on `http://localhost:5173` with Vite proxy forwarding `/api` to `http://localhost:3000`.

## Testing

```bash
# Run frontend tests
npm test -w packages/client

# Run with watch mode
npm run test:watch -w packages/client

# Type checking
npm run typecheck -w packages/client
```

## Key Files to Modify

### New Files

| File | Purpose |
|------|---------|
| `packages/client/src/hooks/useEventWebSocket.ts` | WebSocket connection management hook |
| `packages/client/src/hooks/useEventLiveState.ts` | Live state reducer (full/diff/refresh handling) |
| `packages/client/src/components/OnCoursePanel.tsx` | Collapsible on-course athletes panel |
| `packages/client/src/components/RunDetailExpand.tsx` | Inline expanded row with gate details |
| `packages/client/src/components/ConnectionStatus.tsx` | Live/polling/disconnected indicator |
| `packages/client/src/components/ViewModeToggle.tsx` | Simple/detailed view switch |
| `packages/client/src/components/GatePenalties.tsx` | Gate-by-gate penalty visualization |

### Modified Files

| File | Changes |
|------|---------|
| `packages/client/src/pages/EventDetailPage.tsx` | Integrate WebSocket, OnCourse panel, view mode, connection status |
| `packages/client/src/components/ResultList.tsx` | Add expandable rows, detailed view mode, live update support |
| `packages/client/src/services/api.ts` | Add `getOnCourse()` function |

## Verify WebSocket Locally

To test WebSocket connection manually:

```bash
# With server running, use wscat or browser DevTools
# Connect to: ws://localhost:3000/api/v1/events/{eventId}/ws
# Should receive initial "full" message with event state
```

## Architecture Notes

- WebSocket is unidirectional (server → client only)
- OnCourse data is event-scoped (shows all races)
- Detailed data (`?detailed=true`) fetched on demand per row
- View mode persists in React state (session-scoped)
- Polling fallback activates only when WebSocket fails
