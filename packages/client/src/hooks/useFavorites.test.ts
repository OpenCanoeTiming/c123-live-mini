/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from './useFavorites';
import type { PublicRace, PublicOnCourseEntry } from '@c123-live-mini/shared';

let notifSpy: ReturnType<typeof vi.fn>;

// Mock Notification API
beforeEach(() => {
  notifSpy = vi.fn();
  vi.stubGlobal('Notification', class MockNotification {
    static permission = 'granted';
    static requestPermission = vi.fn().mockResolvedValue('granted');
    constructor(title: string, options?: NotificationOptions) {
      notifSpy(title, options);
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    expect(result.current.isMatchingFavorite(5, 'K1M-ZS_BR1_26')).toBe(true);
    expect(result.current.isMatchingFavorite(5, 'K1M-ZS_BR2_26')).toBe(true);
    expect(result.current.isMatchingFavorite(5, 'K1W-ZS_BR1_26')).toBe(false);
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

// Helper to create oncourse entries
function makeOncourse(overrides: Partial<PublicOnCourseEntry> = {}): PublicOnCourseEntry {
  return {
    raceId: 'K1M-ZS_BR1_26',
    bib: 5,
    name: 'Jan Novak',
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
    ...overrides,
  };
}

// Pre-load favorites + notifications enabled into localStorage
function setupFavorites(bibs: Array<{ bib: number; classId: string }>) {
  localStorage.setItem('favorites-event-1', JSON.stringify({
    favorites: bibs,
    showOnlyFavorites: false,
  }));
}

describe('useFavorites — oncourse notifications', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends start notification when favorite appears on course', () => {
    setupFavorites([{ bib: 5, classId: 'K1M-ZS' }]);
    const oncourse: PublicOnCourseEntry[] = [];

    const { rerender } = renderHook(
      ({ oc }) => useFavorites('event-1', races, oc, []),
      { initialProps: { oc: oncourse } }
    );

    // Athlete appears on course
    rerender({ oc: [makeOncourse({ bib: 5, completed: false })] });

    expect(notifSpy).toHaveBeenCalledTimes(1);
    expect(notifSpy.mock.calls[0][0]).toContain('Jan Novak');
    expect(notifSpy.mock.calls[0][1].tag).toContain('start');
  });

  it('sends finish notification when completed changes to true', () => {
    setupFavorites([{ bib: 5, classId: 'K1M-ZS' }]);

    const { rerender } = renderHook(
      ({ oc }) => useFavorites('event-1', races, oc, []),
      { initialProps: { oc: [makeOncourse({ bib: 5, completed: false })] } }
    );

    // Clear initial start notification
    notifSpy.mockClear();

    // Athlete finishes
    rerender({ oc: [makeOncourse({ bib: 5, completed: true, time: 9523 })] });

    expect(notifSpy).toHaveBeenCalledTimes(1);
    expect(notifSpy.mock.calls[0][1].tag).toContain('finish');
  });

  it('sends finish notification when athlete disappears from oncourse', () => {
    setupFavorites([{ bib: 5, classId: 'K1M-ZS' }]);

    const { rerender } = renderHook(
      ({ oc }) => useFavorites('event-1', races, oc, []),
      { initialProps: { oc: [makeOncourse({ bib: 5, completed: false })] } }
    );

    // Clear initial start notification
    notifSpy.mockClear();

    // Athlete disappears
    rerender({ oc: [] });

    expect(notifSpy).toHaveBeenCalledTimes(1);
    expect(notifSpy.mock.calls[0][1].tag).toContain('finish');
  });

  it('does not send notifications when browser permission is denied', () => {
    setupFavorites([{ bib: 5, classId: 'K1M-ZS' }]);

    // Override permission to denied
    vi.stubGlobal('Notification', class MockNotification {
      static permission = 'denied';
      static requestPermission = vi.fn().mockResolvedValue('denied');
      constructor(title: string, options?: NotificationOptions) {
        notifSpy(title, options);
      }
    });

    const { rerender } = renderHook(
      ({ oc }) => useFavorites('event-1', races, oc, []),
      { initialProps: { oc: [] as PublicOnCourseEntry[] } }
    );

    rerender({ oc: [makeOncourse({ bib: 5, completed: false })] });

    expect(notifSpy).not.toHaveBeenCalled();
  });

  it('deduplicates notifications within cooldown period', () => {
    setupFavorites([{ bib: 5, classId: 'K1M-ZS' }]);

    const { rerender } = renderHook(
      ({ oc }) => useFavorites('event-1', races, oc, []),
      { initialProps: { oc: [] as PublicOnCourseEntry[] } }
    );

    // First appearance
    rerender({ oc: [makeOncourse({ bib: 5, completed: false })] });
    expect(notifSpy).toHaveBeenCalledTimes(1);

    // Remove and re-add quickly (same tag within cooldown)
    rerender({ oc: [] as PublicOnCourseEntry[] });
    notifSpy.mockClear();
    rerender({ oc: [makeOncourse({ bib: 5, completed: false })] });

    // The start notification should be deduplicated (finish may fire for removal)
    const startCalls = notifSpy.mock.calls.filter(
      (call: [string, NotificationOptions | undefined]) => call[1]?.tag?.includes('start')
    );
    expect(startCalls.length).toBe(0);
  });
});

describe('useFavorites — race status notifications', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends notification when race status changes to official', () => {
    setupFavorites([{ bib: 5, classId: 'K1M-ZS' }]);
    const runningRaces: PublicRace[] = [
      { raceId: 'K1M-ZS_BR1_26', classId: 'K1M-ZS', raceType: 'best-run-1', raceOrder: 1, startTime: null, raceStatus: 7 },
    ];
    const officialRaces: PublicRace[] = [
      { raceId: 'K1M-ZS_BR1_26', classId: 'K1M-ZS', raceType: 'best-run-1', raceOrder: 1, startTime: null, raceStatus: 11 },
    ];

    const { rerender } = renderHook(
      ({ r }) => useFavorites('event-1', r, emptyOncourse, []),
      { initialProps: { r: runningRaces } }
    );

    notifSpy.mockClear();

    rerender({ r: officialRaces });

    expect(notifSpy).toHaveBeenCalledTimes(1);
    expect(notifSpy.mock.calls[0][1].body).toContain('oficiální');
  });

  it('sends notification when race status changes to unofficial', () => {
    setupFavorites([{ bib: 5, classId: 'K1M-ZS' }]);
    const runningRaces: PublicRace[] = [
      { raceId: 'K1M-ZS_BR1_26', classId: 'K1M-ZS', raceType: 'best-run-1', raceOrder: 1, startTime: null, raceStatus: 7 },
    ];
    const unofficialRaces: PublicRace[] = [
      { raceId: 'K1M-ZS_BR1_26', classId: 'K1M-ZS', raceType: 'best-run-1', raceOrder: 1, startTime: null, raceStatus: 10 },
    ];

    const { rerender } = renderHook(
      ({ r }) => useFavorites('event-1', r, emptyOncourse, []),
      { initialProps: { r: runningRaces } }
    );

    notifSpy.mockClear();

    rerender({ r: unofficialRaces });

    expect(notifSpy).toHaveBeenCalledTimes(1);
    expect(notifSpy.mock.calls[0][1].body).toContain('neoficiální');
  });
});
