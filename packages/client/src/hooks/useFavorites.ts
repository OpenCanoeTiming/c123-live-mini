import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { PublicRace, PublicOnCourseEntry, PublicResult } from '@c123-live-mini/shared';

const COOLDOWN_MS = 30_000;

/** Format time in hundredths to MM:SS.hh or SS.hh */
function formatTime(hundredths: number): string {
  const totalSeconds = Math.floor(hundredths / 100);
  const hh = hundredths % 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hhStr = hh.toString().padStart(2, '0');
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${hhStr}`;
  }
  return `${seconds}.${hhStr}`;
}

interface FavoriteEntry {
  bib: number;
  classId: string;
}

interface FavoritesData {
  favorites: FavoriteEntry[];
  showOnlyFavorites: boolean;
}

const EMPTY_DATA: FavoritesData = {
  favorites: [],
  showOnlyFavorites: false,
};

function loadFromStorage(eventId: string): FavoritesData {
  try {
    const raw = localStorage.getItem(`favorites-${eventId}`);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw);
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      showOnlyFavorites: Boolean(parsed.showOnlyFavorites),
    };
  } catch {
    return EMPTY_DATA;
  }
}

function saveToStorage(eventId: string, data: FavoritesData): void {
  try {
    localStorage.setItem(`favorites-${eventId}`, JSON.stringify(data));
  } catch {
    // localStorage full or disabled (e.g., private browsing)
  }
}

export function useFavorites(
  eventId: string,
  races: PublicRace[],
  oncourse: PublicOnCourseEntry[],
  _resultsByRace: PublicResult[] | never[],
) {
  const [data, setData] = useState<FavoritesData>(() => loadFromStorage(eventId));

  // Re-sync state when eventId changes (SPA navigation without remount)
  const prevEventIdRef = useRef(eventId);
  useEffect(() => {
    if (prevEventIdRef.current !== eventId) {
      prevEventIdRef.current = eventId;
      setData(loadFromStorage(eventId));
    }
  }, [eventId]);

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

        // Request notification permission on first favorite add (must be in user gesture)
        if (!exists && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
        }

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

  // Notifications are always enabled — browser permission dialog is the gate
  const notificationsEnabled = true;

  // --- Notification logic ---

  const lastNotified = useRef<Map<string, number>>(new Map());

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const now = Date.now();
    const lastTime = lastNotified.current.get(tag) ?? 0;
    if (now - lastTime < COOLDOWN_MS) return;
    lastNotified.current.set(tag, now);
    new Notification(title, { body, tag });
  }, []);

  // Track previous oncourse state
  const prevOncourseRef = useRef<Map<string, PublicOnCourseEntry>>(new Map());
  const isInitialOncourseRef = useRef(true);

  useEffect(() => {
    // Skip first render to avoid notification spam for athletes already on course
    if (isInitialOncourseRef.current) {
      isInitialOncourseRef.current = false;
      const initMap = new Map<string, PublicOnCourseEntry>();
      for (const entry of oncourse) {
        const classId = raceToClass.get(entry.raceId);
        if (classId) initMap.set(`${entry.bib}-${classId}`, entry);
      }
      prevOncourseRef.current = initMap;
      return;
    }

    if (!notificationsEnabled) {
      // Still update the ref so we don't fire stale notifications when re-enabled
      const newMap = new Map<string, PublicOnCourseEntry>();
      for (const entry of oncourse) {
        const classId = raceToClass.get(entry.raceId);
        if (classId) {
          newMap.set(`${entry.bib}-${classId}`, entry);
        }
      }
      prevOncourseRef.current = newMap;
      return;
    }

    const prevMap = prevOncourseRef.current;
    const newMap = new Map<string, PublicOnCourseEntry>();

    for (const entry of oncourse) {
      const classId = raceToClass.get(entry.raceId);
      if (!classId) continue;
      const key = `${entry.bib}-${classId}`;
      newMap.set(key, entry);

      const isFav = data.favorites.some((f) => f.bib === entry.bib && f.classId === classId);
      if (!isFav) continue;

      const prev = prevMap.get(key);

      if (!prev && !entry.completed && entry.dtStart) {
        // Start trigger: favorite appeared on course with a start time
        sendNotification(
          `${entry.name} startuje`,
          `${entry.club}`,
          `start-${key}`,
        );
      } else if (prev && !prev.completed && entry.completed) {
        // Finish trigger (completed): completed changed from false to true
        const timeStr = entry.time != null ? formatTime(entry.time) : '';
        sendNotification(
          `${entry.name} v cíli`,
          timeStr ? `${timeStr}` : '',
          `finish-${key}`,
        );
      }
    }

    // Check for removals (favorite disappeared without completed=true)
    for (const [key, prev] of prevMap) {
      if (newMap.has(key)) continue;
      const isFav = data.favorites.some((f) => {
        const classId = key.split('-').slice(1).join('-');
        return f.bib === prev.bib && f.classId === classId;
      });
      if (!isFav) continue;
      if (!prev.completed) {
        sendNotification(
          `${prev.name} dokončil jízdu`,
          '',
          `finish-${key}`,
        );
      }
    }

    prevOncourseRef.current = newMap;
  }, [oncourse, notificationsEnabled, data.favorites, raceToClass, sendNotification]);

  // Track previous race statuses for race status notifications
  const prevRaceStatusRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!notificationsEnabled) {
      const newMap = new Map<string, number>();
      for (const race of races) {
        newMap.set(race.raceId, race.raceStatus);
      }
      prevRaceStatusRef.current = newMap;
      return;
    }

    const prevMap = prevRaceStatusRef.current;
    const newMap = new Map<string, number>();

    for (const race of races) {
      newMap.set(race.raceId, race.raceStatus);
      const prevStatus = prevMap.get(race.raceId);
      if (prevStatus === undefined) continue;

      // Only trigger when status CHANGES to 10 or 11
      if (prevStatus === race.raceStatus) continue;
      if (race.raceStatus !== 10 && race.raceStatus !== 11) continue;

      // Check if any favorite has this classId
      const classId = race.classId;
      if (!classId) continue;
      const hasFav = data.favorites.some((f) => f.classId === classId);
      if (!hasFav) continue;

      const statusText = race.raceStatus === 11 ? 'oficiální' : 'neoficiální';
      sendNotification(
        `Výsledky ${classId}`,
        `Výsledky jsou ${statusText}`,
        `race-status-${race.raceId}-${race.raceStatus}`,
      );
    }

    prevRaceStatusRef.current = newMap;
  }, [races, notificationsEnabled, data.favorites, sendNotification]);

  return {
    isFavorite,
    toggleFavorite,
    favoritesCount: data.favorites.length,
    showOnlyFavorites,
    setShowOnlyFavorites,
    isMatchingFavorite,
    favorites: data.favorites,
  };
}
