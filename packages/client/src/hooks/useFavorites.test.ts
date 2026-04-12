import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from './useFavorites';
import type { PublicRace, PublicOnCourseEntry } from '@c123-live-mini/shared';

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
