# Favorites & Notifications — Design Spec

> **GitHub Issue:** #13
> **Status:** Approved design, pending implementation
> **Scope:** Client-only personalization for spectators

## Goal

Allow spectators to mark favorite athletes and receive browser notifications when they start, finish, or when their race results become official.

## Constraints

- **Client-only** — no server changes, no new API endpoints
- **Per-event** — favorites stored in localStorage scoped to eventId
- **Mobile-first** — all UI must work on narrow screens without breaking existing layout
- **Design system** — use @czechcanoe/rvp-design-system components, no inline styles

## Data Model

### Identification

Athletes are identified by `bib + classId` within an event. The same bib number can exist in different classes (e.g., bib 1 in K1M and bib 1 in K1W are different athletes).

In BR (best-run) races, one class has multiple races (BR1, BR2) sharing the same bib numbers. Favorites apply to the class — all races within that class are tracked.

### localStorage Schema

Key: `favorites-${eventId}`

```typescript
interface FavoritesData {
  favorites: FavoriteEntry[];
  notificationsEnabled: boolean;
  showOnlyFavorites: boolean;
}

interface FavoriteEntry {
  bib: number;
  classId: string;  // e.g., "K1M-ZS"
}
```

## Architecture

### Single Hook: `useFavorites`

```typescript
useFavorites(eventId: string, races: PublicRace[], liveState: EventLiveState)
```

Returns:

```typescript
{
  // Storage
  isFavorite: (bib: number, classId: string) => boolean;
  toggleFavorite: (bib: number, classId: string) => void;
  favoritesCount: number;

  // Filter
  showOnlyFavorites: boolean;
  setShowOnlyFavorites: (value: boolean) => void;
  isMatchingFavorite: (bib: number, raceId: string) => boolean;

  // Notifications
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
}
```

The hook maps `raceId → classId` via the races array to match favorites across BR races.

### Notification Triggers

| Trigger | Detection | Message Example |
|---------|-----------|-----------------|
| Start | New bib appears in oncourse diff with `completed: false` | "Jan Novak (K1M #5) starts — BR1" |
| Finish | Oncourse entry `completed` changes to `true` OR bib removed from oncourse | "Jan Novak (K1M #5) finished — 95.37s" |
| Race end | `raceStatus` changes to 10 (Unofficial) or 11 (Official) for a race containing a favorite | "K1M BR1 — results are official" |

### Deduplication

The hook maintains `lastNotified: Map<string, number>` (key: `${bib}-${classId}-${trigger}`, value: timestamp). 30-second cooldown per trigger to prevent duplicate notifications from rapid WS updates.

### Finish Detection Detail

Two complementary signals for detecting a finish:

1. **`completed: true`** — oncourse entry gets `completed` flag set (ideal case, athlete crossed finish gate)
2. **Removed from oncourse** — bib disappears from oncourse list without `completed` being observed (DNF, DSQ, or timing software cleanup)

If `completed: true` is observed, use oncourse data for time. If only removed, check results diff for time data. If neither has time, notification says "finished" without time.

## UI Components

### StarButton (new)

- Small star icon inline after athlete name (before category tag)
- No extra column — rendered inside the existing name cell
- Tap area: min 44x44px for touch, visually compact
- States: empty star (not favorite) / filled star (favorite)
- Uses design system icon if available, minimal SVG otherwise

### FavoritesToggle (new)

- Toggle button in the toolbar area alongside existing filters (CategoryFilter, ViewModeToggle)
- Shows badge with favorites count
- Disabled state when `favoritesCount === 0`
- When active, ResultList and StartlistTable filter to show only favorites

### NotificationPrompt (new)

- Compact banner above results, shown after first favorite is added
- Text: "Receive notifications when favorites start or finish? [Allow] [No]"
- On "Allow": calls `Notification.requestPermission()`
- On "No" or browser denial: stores decision, never shows again
- If browser permission revoked later: silently deactivates notifications

### No New Routes

Everything lives within EventDetailPage — stars on rows, filter toggle in toolbar, notifications in background.

### Existing Component Changes

| Component | Change |
|-----------|--------|
| ResultList | Add StarButton inline after name, apply `isMatchingFavorite` filter |
| StartlistTable | Add StarButton inline after name, apply same filter |
| EventDetailPage | Integrate `useFavorites` hook, pass props to children |
| Toolbar area | Add FavoritesToggle alongside existing filters |

## BR Race Handling

A favorite for bib 5 in class K1M-ZS tracks across all races in that class (BR1, BR2). The hook resolves this via the `races` array where each `PublicRace` has a `classId`. Notification messages include the race type (BR1/BR2) for clarity.

## Edge Cases

- **Same bib, different class:** bib 1 in K1M and bib 1 in K1W are independent favorites
- **Tab in background:** Notifications API works in background tabs — primary use case
- **Offline/disconnected:** No notifications when WebSocket is down; ConnectionStatus already handles this
- **Permission revoked:** Check `Notification.permission === 'denied'` and silently deactivate
- **Page refresh:** Favorites persist via localStorage; notification state (enabled/disabled) persists; active oncourse tracking resets (acceptable — hook rebuilds from next WS full payload)

## Testing Strategy

### Unit Tests (Vitest)

- `useFavorites` hook: toggle, persistence, filtering, deduplication
- Mocked `localStorage` and `Notification` API
- BR scenario: bib 5 in K1M has BR1 and BR2, favorites match both races
- Edge: same bib in different classes (bib 1 K1M vs bib 1 K1W)
- Finish detection: completed flag, removal from oncourse, both signals

### Manual Tests

- Mobile layout: inline star doesn't break result row layout
- Background notifications: switch tab, wait for start/finish events
- Persistence: page refresh, favorites remain
- BR race: favorite athlete, receive notifications from both runs
- Notification prompt: appears once, respects user choice
