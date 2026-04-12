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
  _resultsByRace: PublicResult[] | never[],
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
