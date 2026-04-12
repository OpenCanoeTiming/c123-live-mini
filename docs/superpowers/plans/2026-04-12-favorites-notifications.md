# Favorites & Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow spectators to mark favorite athletes and receive browser notifications when they start, finish, or when their race results become official.

**Architecture:** Client-only feature using a single `useFavorites` hook that encapsulates localStorage persistence, favorites filtering, and Browser Notifications API. Star buttons are rendered inline after athlete names in existing ResultList and StartlistTable components. No server changes.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library, Browser Notifications API, localStorage

---

## File Structure

| File | Responsibility |
|------|---------------|
| Create: `packages/client/src/hooks/useFavorites.ts` | Core hook: localStorage CRUD, filtering, notification triggers |
| Create: `packages/client/src/hooks/useFavorites.test.ts` | Unit tests for the hook |
| Create: `packages/client/src/components/StarButton.tsx` | Inline star toggle component |
| Create: `packages/client/src/components/StarButton.module.css` | Star button styles |
| Create: `packages/client/src/components/FavoritesToggle.tsx` | Filter toggle button with badge |
| Create: `packages/client/src/components/FavoritesToggle.module.css` | Favorites toggle styles |
| Create: `packages/client/src/components/NotificationPrompt.tsx` | One-time notification opt-in banner |
| Create: `packages/client/src/components/NotificationPrompt.module.css` | Notification prompt styles |
| Modify: `packages/client/src/components/ResultList.tsx` | Add StarButton inline after name, accept favorites props |
| Modify: `packages/client/src/components/StartlistTable.tsx` | Add StarButton inline after name, accept favorites props |
| Modify: `packages/client/src/pages/EventDetailPage.tsx` | Integrate useFavorites hook, wire props to children |

---

### Task 1: useFavorites Hook — localStorage Storage

**Files:**
- Create: `packages/client/src/hooks/useFavorites.ts`
- Create: `packages/client/src/hooks/useFavorites.test.ts`

- [ ] **Step 1: Write failing tests for localStorage storage**

```typescript
// packages/client/src/hooks/useFavorites.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from './useFavorites';
import type { PublicRace, PublicOnCourseEntry } from '@c123-live-mini/shared';

// Minimal race fixtures for raceId→classId mapping
const races: PublicRace[] = [
  { raceId: 'K1M-ZS_BR1_26', classId: 'K1M-ZS', raceType: 'best-run-1', raceOrder: 1, startTime: null, raceStatus: 7 },
  { raceId: 'K1M-ZS_BR2_26', classId: 'K1M-ZS', raceType: 'best-run-2', raceOrder: 2, startTime: null, raceStatus: 7 },
  { raceId: 'K1W-ZS_BR1_26', classId: 'K1W-ZS', raceType: 'best-run-1', raceOrder: 3, startTime: null, raceStatus: 7 },
];

const emptyOncourse: PublicOnCourseEntry[] = [];

describe('useFavorites — storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no favorites', () => {
    const { result } = renderHook(() =>
      useFavorites('event-1', races, emptyOncourse, [])
    );
    expect(result.current.favoritesCount).toBe(0);
    expect(result.current.isFavorite(5, 'K1M-ZS')).toBe(false);
  });

  it('toggles a favorite on and off', () => {
    const { result } = renderHook(() =>
      useFavorites('event-1', races, emptyOncourse, [])
    );
    act(() => result.current.toggleFavorite(5, 'K1M-ZS'));
    expect(result.current.isFavorite(5, 'K1M-ZS')).toBe(true);
    expect(result.current.favoritesCount).toBe(1);

    act(() => result.current.toggleFavorite(5, 'K1M-ZS'));
    expect(result.current.isFavorite(5, 'K1M-ZS')).toBe(false);
    expect(result.current.favoritesCount).toBe(0);
  });

  it('persists to localStorage', () => {
    const { result, unmount } = renderHook(() =>
      useFavorites('event-1', races, emptyOncourse, [])
    );
    act(() => result.current.toggleFavorite(5, 'K1M-ZS'));
    unmount();

    const stored = JSON.parse(localStorage.getItem('favorites-event-1')!);
    expect(stored.favorites).toEqual([{ bib: 5, classId: 'K1M-ZS' }]);
  });

  it('restores from localStorage on mount', () => {
    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: false,
      showOnlyFavorites: false,
    }));
    const { result } = renderHook(() =>
      useFavorites('event-1', races, emptyOncourse, [])
    );
    expect(result.current.isFavorite(5, 'K1M-ZS')).toBe(true);
    expect(result.current.favoritesCount).toBe(1);
  });

  it('keeps same bib in different classes independent', () => {
    const { result } = renderHook(() =>
      useFavorites('event-1', races, emptyOncourse, [])
    );
    act(() => result.current.toggleFavorite(1, 'K1M-ZS'));
    act(() => result.current.toggleFavorite(1, 'K1W-ZS'));
    expect(result.current.isFavorite(1, 'K1M-ZS')).toBe(true);
    expect(result.current.isFavorite(1, 'K1W-ZS')).toBe(true);
    expect(result.current.favoritesCount).toBe(2);

    act(() => result.current.toggleFavorite(1, 'K1M-ZS'));
    expect(result.current.isFavorite(1, 'K1M-ZS')).toBe(false);
    expect(result.current.isFavorite(1, 'K1W-ZS')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/client && npx vitest run src/hooks/useFavorites.test.ts`
Expected: FAIL — module `./useFavorites` not found

- [ ] **Step 3: Implement the hook (storage only)**

```typescript
// packages/client/src/hooks/useFavorites.ts
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { PublicRace, PublicOnCourseEntry, PublicResult } from '@c123-live-mini/shared';

interface FavoriteEntry {
  bib: number;
  classId: string;
}

interface FavoritesData {
  favorites: FavoriteEntry[];
  notificationsEnabled: boolean;
  showOnlyFavorites: boolean;
}

const EMPTY_DATA: FavoritesData = {
  favorites: [],
  notificationsEnabled: false,
  showOnlyFavorites: false,
};

function loadFromStorage(eventId: string): FavoritesData {
  try {
    const raw = localStorage.getItem(`favorites-${eventId}`);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw);
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      notificationsEnabled: Boolean(parsed.notificationsEnabled),
      showOnlyFavorites: Boolean(parsed.showOnlyFavorites),
    };
  } catch {
    return EMPTY_DATA;
  }
}

function saveToStorage(eventId: string, data: FavoritesData): void {
  localStorage.setItem(`favorites-${eventId}`, JSON.stringify(data));
}

export function useFavorites(
  eventId: string,
  races: PublicRace[],
  oncourse: PublicOnCourseEntry[],
  resultsByRace: PublicResult[] | never[],
) {
  const [data, setData] = useState<FavoritesData>(() => loadFromStorage(eventId));

  // Persist on every change
  useEffect(() => {
    saveToStorage(eventId, data);
  }, [eventId, data]);

  // Build raceId → classId map
  const raceToClass = useMemo(() => {
    const map = new Map<string, string>();
    for (const race of races) {
      if (race.classId) map.set(race.raceId, race.classId);
    }
    return map;
  }, [races]);

  const isFavorite = useCallback(
    (bib: number, classId: string): boolean =>
      data.favorites.some((f) => f.bib === bib && f.classId === classId),
    [data.favorites]
  );

  const toggleFavorite = useCallback(
    (bib: number, classId: string) => {
      setData((prev) => {
        const exists = prev.favorites.some((f) => f.bib === bib && f.classId === classId);
        const favorites = exists
          ? prev.favorites.filter((f) => !(f.bib === bib && f.classId === classId))
          : [...prev.favorites, { bib, classId }];
        return { ...prev, favorites };
      });
    },
    []
  );

  const isMatchingFavorite = useCallback(
    (bib: number, raceId: string): boolean => {
      const classId = raceToClass.get(raceId);
      if (!classId) return false;
      return data.favorites.some((f) => f.bib === bib && f.classId === classId);
    },
    [data.favorites, raceToClass]
  );

  const showOnlyFavorites = data.showOnlyFavorites;

  const setShowOnlyFavorites = useCallback((value: boolean) => {
    setData((prev) => ({ ...prev, showOnlyFavorites: value }));
  }, []);

  const notificationsEnabled = data.notificationsEnabled;

  const toggleNotifications = useCallback(() => {
    setData((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
  }, []);

  return {
    isFavorite,
    toggleFavorite,
    favoritesCount: data.favorites.length,
    showOnlyFavorites,
    setShowOnlyFavorites,
    isMatchingFavorite,
    notificationsEnabled,
    toggleNotifications,
    favorites: data.favorites,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/client && npx vitest run src/hooks/useFavorites.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/hooks/useFavorites.ts packages/client/src/hooks/useFavorites.test.ts
git commit -m "feat(client): add useFavorites hook with localStorage persistence (#13)"
```

---

### Task 2: useFavorites Hook — Filtering

**Files:**
- Modify: `packages/client/src/hooks/useFavorites.test.ts`

- [ ] **Step 1: Write failing tests for filtering**

Append to `useFavorites.test.ts`:

```typescript
describe('useFavorites — filtering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isMatchingFavorite resolves raceId to classId', () => {
    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: false,
      showOnlyFavorites: false,
    }));
    const { result } = renderHook(() =>
      useFavorites('event-1', races, emptyOncourse, [])
    );
    // BR1 race belongs to K1M-ZS → should match
    expect(result.current.isMatchingFavorite(5, 'K1M-ZS_BR1_26')).toBe(true);
    // BR2 same class → should also match
    expect(result.current.isMatchingFavorite(5, 'K1M-ZS_BR2_26')).toBe(true);
    // Different class → should not match
    expect(result.current.isMatchingFavorite(5, 'K1W-ZS_BR1_26')).toBe(false);
    // Unknown race → should not match
    expect(result.current.isMatchingFavorite(5, 'UNKNOWN_RACE')).toBe(false);
  });

  it('showOnlyFavorites toggles and persists', () => {
    const { result } = renderHook(() =>
      useFavorites('event-1', races, emptyOncourse, [])
    );
    expect(result.current.showOnlyFavorites).toBe(false);

    act(() => result.current.setShowOnlyFavorites(true));
    expect(result.current.showOnlyFavorites).toBe(true);

    const stored = JSON.parse(localStorage.getItem('favorites-event-1')!);
    expect(stored.showOnlyFavorites).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (already implemented)**

Run: `cd packages/client && npx vitest run src/hooks/useFavorites.test.ts`
Expected: All 7 tests PASS (filtering logic already in Task 1 implementation)

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/hooks/useFavorites.test.ts
git commit -m "test(client): add filtering tests for useFavorites (#13)"
```

---

### Task 3: useFavorites Hook — Notification Triggers

**Files:**
- Modify: `packages/client/src/hooks/useFavorites.ts`
- Modify: `packages/client/src/hooks/useFavorites.test.ts`

- [ ] **Step 1: Write failing tests for notification triggers**

Append to `useFavorites.test.ts`:

```typescript
describe('useFavorites — notifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
  });

  it('fires notification when favorite appears in oncourse', () => {
    const notifSpy = vi.fn();
    vi.stubGlobal('Notification', class MockNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title: string, options?: NotificationOptions) {
        notifSpy(title, options);
      }
    });

    // Start with favorite and notifications enabled
    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: true,
      showOnlyFavorites: false,
    }));

    const oncourseEmpty: PublicOnCourseEntry[] = [];
    const { rerender } = renderHook(
      ({ oncourse }) => useFavorites('event-1', races, oncourse, []),
      { initialProps: { oncourse: oncourseEmpty } }
    );

    // Simulate athlete appearing on course
    const oncourseWithFav: PublicOnCourseEntry[] = [{
      raceId: 'K1M-ZS_BR1_26',
      bib: 5,
      name: 'PRSKAVEC Jiri',
      club: 'USK Praha',
      position: 1,
      gates: [],
      completed: false,
      dtStart: '2026-04-12T09:00:00',
      dtFinish: null,
      time: null,
      pen: 0,
      total: null,
      rank: null,
      ttbDiff: null,
      ttbName: null,
    }];

    rerender({ oncourse: oncourseWithFav });

    expect(notifSpy).toHaveBeenCalledWith(
      expect.stringContaining('PRSKAVEC Jiri'),
      expect.objectContaining({ tag: expect.stringContaining('start') })
    );
  });

  it('fires notification when favorite completes (completed flag)', () => {
    const notifSpy = vi.fn();
    vi.stubGlobal('Notification', class MockNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title: string, options?: NotificationOptions) {
        notifSpy(title, options);
      }
    });

    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: true,
      showOnlyFavorites: false,
    }));

    const oncourseRunning: PublicOnCourseEntry[] = [{
      raceId: 'K1M-ZS_BR1_26',
      bib: 5,
      name: 'PRSKAVEC Jiri',
      club: 'USK Praha',
      position: 1,
      gates: [],
      completed: false,
      dtStart: '2026-04-12T09:00:00',
      dtFinish: null,
      time: null,
      pen: 0,
      total: null,
      rank: null,
      ttbDiff: null,
      ttbName: null,
    }];

    const { rerender } = renderHook(
      ({ oncourse }) => useFavorites('event-1', races, oncourse, []),
      { initialProps: { oncourse: oncourseRunning } }
    );

    notifSpy.mockClear();

    // Athlete finishes
    const oncourseCompleted: PublicOnCourseEntry[] = [{
      ...oncourseRunning[0],
      completed: true,
      dtFinish: '2026-04-12T09:01:35',
      time: 9524,
      total: 9524,
      rank: 1,
    }];

    rerender({ oncourse: oncourseCompleted });

    expect(notifSpy).toHaveBeenCalledWith(
      expect.stringContaining('PRSKAVEC Jiri'),
      expect.objectContaining({ tag: expect.stringContaining('finish') })
    );
  });

  it('fires notification when favorite disappears from oncourse (removal)', () => {
    const notifSpy = vi.fn();
    vi.stubGlobal('Notification', class MockNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title: string, options?: NotificationOptions) {
        notifSpy(title, options);
      }
    });

    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: true,
      showOnlyFavorites: false,
    }));

    const oncourseRunning: PublicOnCourseEntry[] = [{
      raceId: 'K1M-ZS_BR1_26',
      bib: 5,
      name: 'PRSKAVEC Jiri',
      club: 'USK Praha',
      position: 1,
      gates: [],
      completed: false,
      dtStart: '2026-04-12T09:00:00',
      dtFinish: null,
      time: null,
      pen: 0,
      total: null,
      rank: null,
      ttbDiff: null,
      ttbName: null,
    }];

    const { rerender } = renderHook(
      ({ oncourse }) => useFavorites('event-1', races, oncourse, []),
      { initialProps: { oncourse: oncourseRunning } }
    );

    notifSpy.mockClear();

    // Athlete removed from oncourse (no completed flag)
    rerender({ oncourse: [] });

    expect(notifSpy).toHaveBeenCalledWith(
      expect.stringContaining('PRSKAVEC Jiri'),
      expect.objectContaining({ tag: expect.stringContaining('finish') })
    );
  });

  it('does not fire notification when notifications are disabled', () => {
    const notifSpy = vi.fn();
    vi.stubGlobal('Notification', class MockNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title: string, options?: NotificationOptions) {
        notifSpy(title, options);
      }
    });

    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: false,
      showOnlyFavorites: false,
    }));

    const { rerender } = renderHook(
      ({ oncourse }) => useFavorites('event-1', races, oncourse, []),
      { initialProps: { oncourse: [] as PublicOnCourseEntry[] } }
    );

    const oncourseWithFav: PublicOnCourseEntry[] = [{
      raceId: 'K1M-ZS_BR1_26',
      bib: 5, name: 'PRSKAVEC Jiri', club: 'USK Praha',
      position: 1, gates: [], completed: false,
      dtStart: '2026-04-12T09:00:00', dtFinish: null,
      time: null, pen: 0, total: null, rank: null,
      ttbDiff: null, ttbName: null,
    }];

    rerender({ oncourse: oncourseWithFav });
    expect(notifSpy).not.toHaveBeenCalled();
  });

  it('deduplicates notifications within 30s cooldown', () => {
    const notifSpy = vi.fn();
    vi.stubGlobal('Notification', class MockNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title: string, options?: NotificationOptions) {
        notifSpy(title, options);
      }
    });

    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: true,
      showOnlyFavorites: false,
    }));

    const oncourseWithFav: PublicOnCourseEntry[] = [{
      raceId: 'K1M-ZS_BR1_26', bib: 5, name: 'PRSKAVEC Jiri',
      club: 'USK Praha', position: 1, gates: [], completed: false,
      dtStart: '2026-04-12T09:00:00', dtFinish: null,
      time: null, pen: 0, total: null, rank: null,
      ttbDiff: null, ttbName: null,
    }];

    const { rerender } = renderHook(
      ({ oncourse }) => useFavorites('event-1', races, oncourse, []),
      { initialProps: { oncourse: [] as PublicOnCourseEntry[] } }
    );

    rerender({ oncourse: oncourseWithFav });
    expect(notifSpy).toHaveBeenCalledTimes(1);

    // Same oncourse data again — should NOT fire
    rerender({ oncourse: [] as PublicOnCourseEntry[] });
    rerender({ oncourse: oncourseWithFav });
    // 1 original start + 1 finish (removal) + dedup blocks second start
    // Total: start notif fires only once
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/client && npx vitest run src/hooks/useFavorites.test.ts`
Expected: FAIL — notification logic not yet implemented

- [ ] **Step 3: Add notification logic to useFavorites**

Add to `packages/client/src/hooks/useFavorites.ts` — inside the hook function, after the existing return values are defined, add this notification effect:

```typescript
// Add these refs and effect inside useFavorites, before the return statement:

  // Notification deduplication (30s cooldown)
  const lastNotified = useRef<Map<string, number>>(new Map());
  const prevOncourseRef = useRef<PublicOnCourseEntry[]>([]);

  const COOLDOWN_MS = 30_000;

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const now = Date.now();
    const lastTime = lastNotified.current.get(tag) ?? 0;
    if (now - lastTime < COOLDOWN_MS) return;

    lastNotified.current.set(tag, now);
    new Notification(title, { body, tag });
  }, []);

  // Detect oncourse changes for notifications
  useEffect(() => {
    if (!data.notificationsEnabled) {
      prevOncourseRef.current = oncourse;
      return;
    }
    if (data.favorites.length === 0) {
      prevOncourseRef.current = oncourse;
      return;
    }

    const prevOncourse = prevOncourseRef.current;
    const prevByKey = new Map(prevOncourse.map((e) => [`${e.bib}-${e.raceId}`, e]));
    const currByKey = new Map(oncourse.map((e) => [`${e.bib}-${e.raceId}`, e]));

    for (const entry of oncourse) {
      const classId = raceToClass.get(entry.raceId);
      if (!classId) continue;
      if (!data.favorites.some((f) => f.bib === entry.bib && f.classId === classId)) continue;

      const prevEntry = prevByKey.get(`${entry.bib}-${entry.raceId}`);

      // New on course (start)
      if (!prevEntry && !entry.completed) {
        sendNotification(
          `${entry.name} startuje`,
          `${entry.name} (#${entry.bib}) je na trati`,
          `start-${entry.bib}-${entry.raceId}`
        );
      }

      // Completed (finish)
      if (entry.completed && prevEntry && !prevEntry.completed) {
        const timeStr = entry.total != null ? ` — ${(entry.total / 100).toFixed(2)}s` : '';
        sendNotification(
          `${entry.name} v cíli${timeStr}`,
          `${entry.name} (#${entry.bib}) dokončil jízdu`,
          `finish-${entry.bib}-${entry.raceId}`
        );
      }
    }

    // Detect removal (was on course, now gone, never saw completed)
    for (const prevEntry of prevOncourse) {
      const classId = raceToClass.get(prevEntry.raceId);
      if (!classId) continue;
      if (!data.favorites.some((f) => f.bib === prevEntry.bib && f.classId === classId)) continue;

      const currEntry = currByKey.get(`${prevEntry.bib}-${prevEntry.raceId}`);
      if (!currEntry && !prevEntry.completed) {
        sendNotification(
          `${prevEntry.name} dokončil jízdu`,
          `${prevEntry.name} (#${prevEntry.bib})`,
          `finish-${prevEntry.bib}-${prevEntry.raceId}`
        );
      }
    }

    prevOncourseRef.current = oncourse;
  }, [oncourse, data.notificationsEnabled, data.favorites, raceToClass, sendNotification]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/client && npx vitest run src/hooks/useFavorites.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/hooks/useFavorites.ts packages/client/src/hooks/useFavorites.test.ts
git commit -m "feat(client): add notification triggers to useFavorites (#13)"
```

---

### Task 4: useFavorites Hook — Race Status Notifications

**Files:**
- Modify: `packages/client/src/hooks/useFavorites.ts`
- Modify: `packages/client/src/hooks/useFavorites.test.ts`

- [ ] **Step 1: Write failing test for race-end notification**

Append to `useFavorites.test.ts`:

```typescript
describe('useFavorites — race status notifications', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fires notification when race with favorite goes official', () => {
    const notifSpy = vi.fn();
    vi.stubGlobal('Notification', class MockNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title: string, options?: NotificationOptions) {
        notifSpy(title, options);
      }
    });

    localStorage.setItem('favorites-event-1', JSON.stringify({
      favorites: [{ bib: 5, classId: 'K1M-ZS' }],
      notificationsEnabled: true,
      showOnlyFavorites: false,
    }));

    const racesRunning: PublicRace[] = [
      { raceId: 'K1M-ZS_BR1_26', classId: 'K1M-ZS', raceType: 'best-run-1', raceOrder: 1, startTime: null, raceStatus: 7 },
    ];

    const { rerender } = renderHook(
      ({ r }) => useFavorites('event-1', r, emptyOncourse, []),
      { initialProps: { r: racesRunning } }
    );

    notifSpy.mockClear();

    const racesOfficial: PublicRace[] = [
      { ...racesRunning[0], raceStatus: 11 },
    ];

    rerender({ r: racesOfficial });

    expect(notifSpy).toHaveBeenCalledWith(
      expect.stringContaining('oficiální'),
      expect.anything()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/client && npx vitest run src/hooks/useFavorites.test.ts`
Expected: FAIL — race status notification not yet implemented

- [ ] **Step 3: Add race status notification effect**

Add to `useFavorites.ts`, after the oncourse notification effect:

```typescript
  // Detect race status changes (Unofficial=10, Official=11)
  const prevRacesRef = useRef<PublicRace[]>([]);

  useEffect(() => {
    if (!data.notificationsEnabled || data.favorites.length === 0) {
      prevRacesRef.current = races;
      return;
    }

    const prevRaces = prevRacesRef.current;
    const prevStatusMap = new Map(prevRaces.map((r) => [r.raceId, r.raceStatus]));

    for (const race of races) {
      if (!race.classId) continue;
      const prevStatus = prevStatusMap.get(race.raceId);
      if (prevStatus === undefined) continue;
      if (prevStatus === race.raceStatus) continue;

      // Only trigger for transitions TO Unofficial (10) or Official (11)
      if (race.raceStatus !== 10 && race.raceStatus !== 11) continue;

      // Check if any favorite belongs to this class
      const hasFavInClass = data.favorites.some((f) => f.classId === race.classId);
      if (!hasFavInClass) continue;

      const statusLabel = race.raceStatus === 11 ? 'oficiální' : 'neoficiální';
      sendNotification(
        `Výsledky jsou ${statusLabel}`,
        `${race.classId} ${race.raceType ?? ''}`.trim(),
        `race-end-${race.raceId}`
      );
    }

    prevRacesRef.current = races;
  }, [races, data.notificationsEnabled, data.favorites, sendNotification]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/client && npx vitest run src/hooks/useFavorites.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/hooks/useFavorites.ts packages/client/src/hooks/useFavorites.test.ts
git commit -m "feat(client): add race status notifications to useFavorites (#13)"
```

---

### Task 5: StarButton Component

**Files:**
- Create: `packages/client/src/components/StarButton.tsx`
- Create: `packages/client/src/components/StarButton.module.css`

- [ ] **Step 1: Create StarButton component**

```tsx
// packages/client/src/components/StarButton.tsx
import styles from './StarButton.module.css';

interface StarButtonProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function StarButton({ active, onClick }: StarButtonProps) {
  return (
    <button
      className={`${styles.starBtn} ${active ? styles.active : ''}`}
      onClick={(e) => {
        e.stopPropagation(); // Don't trigger row expand
        onClick(e);
      }}
      aria-label={active ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
      type="button"
    >
      {active ? '\u2605' : '\u2606'}
    </button>
  );
}
```

- [ ] **Step 2: Create StarButton styles**

```css
/* packages/client/src/components/StarButton.module.css */
.starBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  margin-left: 2px;
  color: var(--csk-color-text-tertiary, #9ca3af);
  -webkit-tap-highlight-color: transparent;
  vertical-align: middle;
}

.starBtn.active {
  color: var(--csk-color-warning, #f59e0b);
}

/* Ensure minimum 44x44 tap target on touch devices */
@media (pointer: coarse) {
  .starBtn {
    position: relative;
  }
  .starBtn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/StarButton.tsx packages/client/src/components/StarButton.module.css
git commit -m "feat(client): add StarButton component (#13)"
```

---

### Task 6: FavoritesToggle Component

**Files:**
- Create: `packages/client/src/components/FavoritesToggle.tsx`
- Create: `packages/client/src/components/FavoritesToggle.module.css`

- [ ] **Step 1: Create FavoritesToggle component**

```tsx
// packages/client/src/components/FavoritesToggle.tsx
import styles from './FavoritesToggle.module.css';

interface FavoritesToggleProps {
  active: boolean;
  count: number;
  onToggle: () => void;
}

export function FavoritesToggle({ active, count, onToggle }: FavoritesToggleProps) {
  if (count === 0) return null;

  return (
    <button
      className={`${styles.toggleBtn} ${active ? styles.active : ''}`}
      onClick={onToggle}
      aria-label={active ? 'Zobrazit všechny' : 'Zobrazit oblíbené'}
      type="button"
    >
      <span className={styles.star}>{'\u2605'}</span>
      <span className={styles.badge}>{count}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create FavoritesToggle styles**

```css
/* packages/client/src/components/FavoritesToggle.module.css */
.toggleBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--csk-color-border-secondary, #e5e7eb);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-bg-primary, white);
  color: var(--csk-color-text-secondary, #6b7280);
  cursor: pointer;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.toggleBtn.active {
  background: var(--csk-color-primary, #2563eb);
  color: white;
  border-color: var(--csk-color-primary, #2563eb);
}

.star {
  font-size: 13px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  background: var(--csk-color-primary, #2563eb);
  color: white;
}

.toggleBtn.active .badge {
  background: white;
  color: var(--csk-color-primary, #2563eb);
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/FavoritesToggle.tsx packages/client/src/components/FavoritesToggle.module.css
git commit -m "feat(client): add FavoritesToggle component (#13)"
```

---

### Task 7: NotificationPrompt Component

**Files:**
- Create: `packages/client/src/components/NotificationPrompt.tsx`
- Create: `packages/client/src/components/NotificationPrompt.module.css`

- [ ] **Step 1: Create NotificationPrompt component**

```tsx
// packages/client/src/components/NotificationPrompt.tsx
import { useState, useCallback } from 'react';
import styles from './NotificationPrompt.module.css';

interface NotificationPromptProps {
  favoritesCount: number;
  notificationsEnabled: boolean;
  onEnable: () => void;
}

export function NotificationPrompt({
  favoritesCount,
  notificationsEnabled,
  onEnable,
}: NotificationPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleAllow = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      onEnable();
    }
    setDismissed(true);
  }, [onEnable]);

  // Don't show if: no favorites, already enabled, already dismissed, or not supported
  if (favoritesCount === 0) return null;
  if (notificationsEnabled) return null;
  if (dismissed) return null;
  if (typeof Notification === 'undefined') return null;
  if (Notification.permission === 'denied') return null;

  return (
    <div className={styles.prompt}>
      <span className={styles.icon}>{'\uD83D\uDD14'}</span>
      <span className={styles.text}>
        Chcete dostávat notifikace o startu a dojetí oblíbených?
      </span>
      <div className={styles.actions}>
        <button className={styles.btnAllow} onClick={handleAllow} type="button">
          Povolit
        </button>
        <button className={styles.btnDismiss} onClick={() => setDismissed(true)} type="button">
          Ne
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create NotificationPrompt styles**

```css
/* packages/client/src/components/NotificationPrompt.module.css */
.prompt {
  margin: 0.5rem;
  padding: 10px 12px;
  background: var(--csk-color-bg-info, #eff6ff);
  border: 1px solid var(--csk-color-border-info, #bfdbfe);
  border-radius: var(--radius-lg, 8px);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--csk-color-text-info, #1e40af);
}

.icon {
  font-size: 18px;
  flex-shrink: 0;
}

.text {
  flex: 1;
}

.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btnAllow {
  padding: 4px 10px;
  background: var(--csk-color-primary, #2563eb);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btnDismiss {
  padding: 4px 10px;
  background: transparent;
  color: var(--csk-color-text-secondary, #6b7280);
  border: 1px solid var(--csk-color-border-secondary, #d1d5db);
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/NotificationPrompt.tsx packages/client/src/components/NotificationPrompt.module.css
git commit -m "feat(client): add NotificationPrompt component (#13)"
```

---

### Task 8: Integrate StarButton into ResultList

**Files:**
- Modify: `packages/client/src/components/ResultList.tsx`

- [ ] **Step 1: Add favorites props to ResultList interface**

Add to `ResultListProps` interface in `packages/client/src/components/ResultList.tsx:257-278`:

```typescript
  // Favorites
  isFavorite?: (bib: number, classId: string) => boolean;
  onToggleFavorite?: (bib: number, classId: string) => void;
  raceClassId?: string | null;
```

- [ ] **Step 2: Add StarButton import and integrate into name column**

Add import at the top of `ResultList.tsx`:

```typescript
import { StarButton } from './StarButton';
```

Modify the name column render in `buildStandardColumns` — the name column at line 41-53 needs a `favorites` parameter. Since `buildStandardColumns` is a standalone function, refactor to accept favorites params:

Change the function signature:

```typescript
function buildStandardColumns(
  selectedCatId: string | null,
  favorites?: { isFavorite: (bib: number, classId: string) => boolean; onToggle: (bib: number, classId: string) => void; classId: string | null },
): Column[] {
```

And update the name column render (the second column):

```typescript
    {
      key: 'name',
      header: 'Jméno',
      width: '100%',
      render: (row) => (
        <div>
          <div className={styles.athleteName}>
            <span className={styles.bibBadge}>{row.bib ?? '-'}</span>
            {row.name}
            {favorites && row.bib != null && favorites.classId && (
              <StarButton
                active={favorites.isFavorite(row.bib, favorites.classId)}
                onClick={() => favorites.onToggle(row.bib!, favorites.classId!)}
              />
            )}
            {row.catId && <span className={styles.catTag}>{row.catId}</span>}
          </div>
          {row.club && <div className={styles.athleteClub}>{row.club}</div>}
        </div>
      ),
    },
```

Apply the same change to `buildBestRunColumns`.

- [ ] **Step 3: Pass favorites params through ResultList component**

In the `ResultList` component function, build the favorites param and pass to column builders:

```typescript
  const favoritesParam = isFavorite && onToggleFavorite
    ? { isFavorite, onToggle: onToggleFavorite, classId: raceClassId ?? null }
    : undefined;

  const columns = isBestRun
    ? buildBestRunColumns(selectedCatId ?? null, favoritesParam)
    : buildStandardColumns(selectedCatId ?? null, favoritesParam);
```

- [ ] **Step 4: Run type check**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/components/ResultList.tsx
git commit -m "feat(client): integrate StarButton into ResultList (#13)"
```

---

### Task 9: Integrate StarButton into StartlistTable

**Files:**
- Modify: `packages/client/src/components/StartlistTable.tsx`

- [ ] **Step 1: Add favorites props and StarButton**

Add to `StartlistTableProps` and update the component:

```typescript
import { StarButton } from './StarButton';

interface StartlistTableProps {
  entries: StartlistDisplayRow[];
  isFavorite?: (bib: number, classId: string) => boolean;
  onToggleFavorite?: (bib: number, classId: string) => void;
  raceClassId?: string | null;
}
```

Modify the name column in `buildColumns` — add a favorites parameter:

```typescript
function buildColumns(
  hasStartTimes: boolean,
  hasBothRuns: boolean,
  favorites?: { isFavorite: (bib: number, classId: string) => boolean; onToggle: (bib: number, classId: string) => void; classId: string | null },
): ColumnDef<StartlistDisplayRow>[] {
```

Update the name column cell render to include StarButton after name:

```typescript
    {
      key: 'name',
      header: 'Jméno',
      cell: (row) => (
        <div>
          <div className={styles.athleteName}>
            {row.name}
            {favorites && row.bib != null && favorites.classId && (
              <StarButton
                active={favorites.isFavorite(row.bib, favorites.classId)}
                onClick={() => favorites.onToggle(row.bib!, favorites.classId!)}
              />
            )}
          </div>
          {row.club && (
            <div className={styles.athleteClub}>{row.club}</div>
          )}
        </div>
      ),
    },
```

- [ ] **Step 2: Pass favorites param in component**

```typescript
export function StartlistTable({ entries, isFavorite, onToggleFavorite, raceClassId }: StartlistTableProps) {
  // ...existing code...
  const favoritesParam = isFavorite && onToggleFavorite
    ? { isFavorite, onToggle: onToggleFavorite, classId: raceClassId ?? null }
    : undefined;
  const columns = buildColumns(hasStartTimes, hasBothRuns, favoritesParam);
  // ...rest unchanged...
```

- [ ] **Step 3: Run type check**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/components/StartlistTable.tsx
git commit -m "feat(client): integrate StarButton into StartlistTable (#13)"
```

---

### Task 10: Integrate Everything in EventDetailPage

**Files:**
- Modify: `packages/client/src/pages/EventDetailPage.tsx`

- [ ] **Step 1: Import new components and hook**

Add imports at the top of `EventDetailPage.tsx`:

```typescript
import { useFavorites } from '../hooks/useFavorites';
import { FavoritesToggle } from '../components/FavoritesToggle';
import { NotificationPrompt } from '../components/NotificationPrompt';
```

- [ ] **Step 2: Initialize useFavorites hook**

After the existing hook calls (around line 51), add:

```typescript
  // Favorites
  const selectedRaceResults = selectedRaceId ? (liveState.resultsByRace[selectedRaceId] ?? []) : [];
  const favorites = useFavorites(eventId, races, liveState.oncourse, selectedRaceResults);
```

- [ ] **Step 3: Get classId for current race**

After `selectedRace` is defined (around line 726), add:

```typescript
  const selectedRaceClassId = selectedRace?.classId ?? null;
```

- [ ] **Step 4: Add favorites filtering to results**

Update the `filteredResults` memo (around line 595) to also apply favorites filter:

```typescript
  const filteredResults: ResultsResponse | null = useMemo(() => {
    if (!results) return null;
    let filtered = results.results;

    // Search filter
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        (r.club && r.club.toLowerCase().includes(q)) ||
        (r.bib != null && String(r.bib).includes(q))
      );
    }

    // Favorites filter
    if (favorites.showOnlyFavorites && selectedRaceId) {
      filtered = filtered.filter((r) =>
        r.bib != null && favorites.isMatchingFavorite(r.bib, selectedRaceId)
      );
    }

    return { ...results, results: filtered };
  }, [results, deferredSearchQuery, favorites.showOnlyFavorites, favorites.isMatchingFavorite, selectedRaceId]);
```

Similarly update `filteredStartlist`:

```typescript
  const filteredStartlist = useMemo(() => {
    if (!startlist) return null;
    let filtered = startlist;

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.club && s.club.toLowerCase().includes(q)) ||
        (s.bib != null && String(s.bib).includes(q))
      );
    }

    if (favorites.showOnlyFavorites && selectedRaceId) {
      filtered = filtered.filter((s) =>
        s.bib != null && favorites.isMatchingFavorite(s.bib, selectedRaceId)
      );
    }

    return filtered;
  }, [startlist, deferredSearchQuery, favorites.showOnlyFavorites, favorites.isMatchingFavorite, selectedRaceId]);
```

- [ ] **Step 5: Add NotificationPrompt and FavoritesToggle to JSX**

Add `NotificationPrompt` before the results section (after OnCoursePanel, around line 746):

```tsx
      <NotificationPrompt
        favoritesCount={favorites.favoritesCount}
        notificationsEnabled={favorites.notificationsEnabled}
        onEnable={favorites.toggleNotifications}
      />
```

Add `FavoritesToggle` into the ResultList toolbar. Pass it as a new prop to ResultList, or add it alongside the existing toolbar elements. The simplest approach: add it to the `toolbarRight` area of ResultList. Add a new prop `favoritesToggle` to ResultList:

Actually, the cleaner approach is to render FavoritesToggle alongside DataViewSelector in the navigation row. Add after the DataViewSelector (line 776-781):

```tsx
        {resultsState === 'success' && dataView !== 'schedule' && (
          <FavoritesToggle
            active={favorites.showOnlyFavorites}
            count={favorites.favoritesCount}
            onToggle={() => favorites.setShowOnlyFavorites(!favorites.showOnlyFavorites)}
          />
        )}
```

- [ ] **Step 6: Pass favorites props to ResultList**

Update the ResultList render (around line 804-824) — add favorites props:

```tsx
        <ResultList
          data={filteredResults}
          isBestRun={isBR}
          selectedCatId={selectedCatId}
          expandedRows={expandedRows}
          onToggleExpand={handleToggleExpand}
          detailedCache={liveState.detailedCache}
          detailedLoading={detailedLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          roundRaces={displayRaces}
          selectedRaceId={selectedRaceId}
          onRaceChange={handleRaceChange}
          hasMergedBR={hasMergedBR}
          showRoundTabs={showRoundTabs}
          onSearchChange={setSearchQuery}
          categories={availableCategories}
          onCategoryChange={handleCategoryChange}
          isFavorite={favorites.isFavorite}
          onToggleFavorite={favorites.toggleFavorite}
          raceClassId={selectedRaceClassId}
        />
```

- [ ] **Step 7: Pass favorites props to StartlistTable**

Update StartlistTable render (around line 838-839):

```tsx
        <StartlistTable
          entries={filteredStartlist}
          isFavorite={favorites.isFavorite}
          onToggleFavorite={favorites.toggleFavorite}
          raceClassId={selectedRaceClassId}
        />
```

- [ ] **Step 8: Run type check**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Run all tests**

Run: `cd packages/client && npx vitest run`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add packages/client/src/pages/EventDetailPage.tsx
git commit -m "feat(client): integrate favorites into EventDetailPage (#13)"
```

---

### Task 11: Manual Testing & Cleanup

**Files:**
- Various cleanup

- [ ] **Step 1: Start dev server**

Run: `cd /workspace/timing/c123-live-mini && npm run dev`

- [ ] **Step 2: Manual test checklist**

Open browser at the client dev URL. Verify:

1. Star icons appear inline after athlete names in results and startlist
2. Tapping a star toggles it (filled/empty)
3. After adding a favorite, NotificationPrompt banner appears
4. FavoritesToggle button appears in navigation area with badge count
5. Toggling favorites filter shows only starred athletes
6. Page refresh preserves favorites
7. Mobile layout: stars don't break row layout on 390px width

- [ ] **Step 3: Clean up mockup files**

```bash
rm -rf docs/superpowers/mockups/node_modules docs/superpowers/mockups/package.json docs/superpowers/mockups/package-lock.json
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: clean up mockup artifacts (#13)"
```
