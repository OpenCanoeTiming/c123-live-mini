import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import {
  SkeletonCard,
  Card,
  EmptyState,
  Button,
  Tabs,
  SearchInput,
  type TabItem,
} from '@czechcanoe/rvp-design-system';
import { useLocation } from 'wouter';
import styles from './EventDetailPage.module.css';
import {
  getEventDetails,
  getEventResults,
  getCategories,
  getStartlistMaybeBr,
  ApiError,
  type EventDetail,
  type RaceInfo,
  type ResultsResponse,
  type CategoryInfo,
  type StartlistDisplayRow,
} from '../services/api';
import { groupRaces, extractDays, getDisplayRaces, type ClassGroup, type DayInfo } from '../utils/groupRaces';
import { isBestRunRace } from '../utils/raceTypeLabels';
import { EventHeader } from '../components/EventHeader';
import { ClassTabs } from '../components/ClassTabs';
import { DataViewSelector } from '../components/DataViewSelector';
import { ResultList } from '../components/ResultList';
import { StartlistTable } from '../components/StartlistTable';
import { OnCoursePanel } from '../components/OnCoursePanel';
import { ScheduleView } from '../components/ScheduleView';
import type { ViewMode } from '../components/ViewModeToggle';
import { useEventLiveState } from '../hooks/useEventLiveState';
import { useFavorites } from '../hooks/useFavorites';
import { useEventWebSocket } from '../hooks/useEventWebSocket';
import { getOnCourse } from '../services/api';
import type { WsMessage } from '@c123-live-mini/shared';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface EventDetailPageProps {
  eventId: string;
  raceId?: string;
}

export function EventDetailPage({ eventId, raceId: urlRaceId }: EventDetailPageProps) {
  const [, navigate] = useLocation();

  // Live state reducer
  const [liveState, dispatch] = useEventLiveState();

  const eventDetail = liveState.event;
  const races = liveState.races;
  const categories = liveState.categories;

  // Set browser tab title to event name
  useEffect(() => {
    if (eventDetail) {
      document.title = `${eventDetail.mainTitle} — ${import.meta.env.VITE_APP_NAME || 'ČSK Live'}`;
    }
    return () => {
      document.title = import.meta.env.VITE_APP_NAME || 'ČSK Live';
    };
  }, [eventDetail?.mainTitle]);

  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [eventState, setEventState] = useState<LoadingState>('idle');
  const [eventError, setEventError] = useState<string | null>(null);

  // Selection state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // OnCourse panel state
  const [oncoursePanelOpen, setOncoursePanelOpen] = useState(true);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailedLoading, setDetailedLoading] = useState<Set<string>>(new Set());

  // View mode state (simple/detailed)
  const [viewMode, setViewMode] = useState<ViewMode>('simple');

  // Results/startlist state
  const [startlist, setStartlist] = useState<StartlistDisplayRow[] | null>(null);
  const [resultsState, setResultsState] = useState<LoadingState>('idle');
  const [currentRaceInfo, setCurrentRaceInfo] = useState<ResultsResponse['race'] | null>(null);

  // Data view toggle
  type DataView = 'results' | 'startlist' | 'schedule';
  const [dataView, setDataView] = useState<DataView>('results');

  // Search — uncontrolled input with deferred filtering
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Favorites
  const selectedRaceResults = selectedRaceId ? (liveState.resultsByRace[selectedRaceId] ?? []) : [];
  const favorites = useFavorites(eventId, races, liveState.oncourse, selectedRaceResults);

  // Day selector state
  const [days, setDays] = useState<DayInfo[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Guard: only auto-select day on first load, not on internal navigations
  const dayAutoSelectedRef = useRef(false);

  // Get results from reducer
  const results: ResultsResponse | null = selectedRaceId && liveState.resultsByRace[selectedRaceId] && currentRaceInfo
    ? {
        race: currentRaceInfo,
        results: liveState.resultsByRace[selectedRaceId],
      }
    : null;

  // WebSocket message handler
  const handleWsMessage = useCallback((message: WsMessage) => {
    switch (message.type) {
      case 'full':
        dispatch({
          type: 'WS_FULL',
          payload: message.data,
        });
        if (selectedRaceId && eventId) {
          getEventResults(eventId, selectedRaceId, {
            catId: selectedCatId ?? undefined,
          })
            .then((resultsData) => {
              dispatch({
                type: 'SET_RESULTS',
                payload: {
                  raceId: selectedRaceId,
                  results: resultsData.results,
                },
              });
              setCurrentRaceInfo(resultsData.race);
            })
            .catch((err) => {
              console.error('[EventDetailPage] Failed to re-fetch results after WS_FULL:', err);
            });
        }
        if (eventId) {
          getOnCourse(eventId)
            .then((oncourseData) => {
              dispatch({ type: 'SET_ONCOURSE', payload: oncourseData });
            })
            .catch((err) => {
              console.error('[EventDetailPage] Failed to re-fetch oncourse after WS_FULL:', err);
            });
        }
        break;

      case 'diff':
        dispatch({
          type: 'WS_DIFF',
          payload: message.data,
        });
        break;

      case 'refresh':
        dispatch({ type: 'WS_REFRESH' });
        if (selectedRaceId && eventId) {
          getEventResults(eventId, selectedRaceId, {
            catId: selectedCatId ?? undefined,
          })
            .then((resultsData) => {
              dispatch({
                type: 'SET_RESULTS',
                payload: {
                  raceId: selectedRaceId,
                  results: resultsData.results,
                },
              });
              setCurrentRaceInfo(resultsData.race);
            })
            .catch((err) => {
              console.error('[EventDetailPage] Failed to re-fetch results:', err);
            });
        }
        if (eventId) {
          getOnCourse(eventId)
            .then((oncourseData) => {
              dispatch({
                type: 'SET_ONCOURSE',
                payload: oncourseData,
              });
            })
            .catch((err) => {
              console.error('[EventDetailPage] Failed to re-fetch oncourse:', err);
            });
        }
        break;
    }
  }, [dispatch, eventId, selectedRaceId, selectedCatId]);

  // Connect WebSocket for running/startlist events
  const shouldConnect = eventDetail && (eventDetail.status === 'running' || eventDetail.status === 'startlist');
  const { connectionState } = useEventWebSocket(
    shouldConnect ? eventId : null,
    handleWsMessage
  );

  // REST polling fallback
  const pollingIntervalRef = useRef<number | null>(null);
  const pollingParamsRef = useRef({ raceId: selectedRaceId, catId: selectedCatId });

  useEffect(() => {
    pollingParamsRef.current = { raceId: selectedRaceId, catId: selectedCatId };
  }, [selectedRaceId, selectedCatId]);

  useEffect(() => {
    if (connectionState === 'disconnected' && shouldConnect && selectedRaceId) {
      console.log('[EventDetailPage] Starting polling fallback (15s interval)');

      const poll = async () => {
        const currentRaceId = pollingParamsRef.current.raceId;
        const currentCatId = pollingParamsRef.current.catId;
        if (!currentRaceId) return;

        try {
          const resultsData = await getEventResults(eventId, currentRaceId, {
            catId: currentCatId ?? undefined,
          });
          if (pollingParamsRef.current.raceId === currentRaceId && pollingParamsRef.current.catId === currentCatId) {
            dispatch({
              type: 'SET_RESULTS',
              payload: { raceId: currentRaceId, results: resultsData.results },
            });
          }
          const oncourseData = await getOnCourse(eventId);
          dispatch({ type: 'SET_ONCOURSE', payload: oncourseData });
        } catch (err) {
          console.error('[EventDetailPage] Polling failed:', err);
        }
      };

      pollingIntervalRef.current = window.setInterval(poll, 15000);
    } else {
      if (pollingIntervalRef.current !== null) {
        console.log('[EventDetailPage] Stopping polling fallback');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [connectionState, shouldConnect, eventId, selectedRaceId, dispatch]);

  // Fetch detailed data when view mode changes to 'detailed'
  useEffect(() => {
    if (viewMode === 'detailed' && selectedRaceId && results) {
      const needsDetail = results.results.some((result) => {
        if (result.bib === null) return false;
        const key = `${selectedRaceId}-${result.bib}`;
        return !liveState.detailedCache[key];
      });

      if (needsDetail) {
        getEventResults(eventId, selectedRaceId, {
          detailed: true,
          catId: selectedCatId ?? undefined,
        })
          .then((resultsData) => {
            resultsData.results.forEach((result) => {
              if (result.bib !== null) {
                dispatch({
                  type: 'CACHE_DETAILED',
                  payload: {
                    raceId: selectedRaceId,
                    bib: result.bib,
                    detail: {
                      time: result.time ?? null,
                      pen: result.pen ?? null,
                      total: result.total ?? null,
                      gates: result.gates ?? null,
                      prevTime: result.prevTime ?? null,
                      prevPen: result.prevPen ?? null,
                      prevTotal: result.prevTotal ?? null,
                      prevGates: result.prevGates ?? null,
                    },
                  },
                });
              }
            });
          })
          .catch((err) => {
            console.error('[EventDetailPage] Failed to fetch detailed data for view mode:', err);
          });
      }
    }
  }, [viewMode, selectedRaceId, results, liveState.detailedCache, eventId, selectedCatId, dispatch]);

  // Track which eventId has been loaded to avoid full re-fetch on internal navigate
  const loadedEventIdRef = useRef<string | null>(null);

  // Load event details + categories — only when eventId changes
  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      setEventState('loading');
      setEventError(null);
      try {
        const [eventData, cats] = await Promise.all([
          getEventDetails(eventId),
          getCategories(eventId).catch(() => [] as CategoryInfo[]),
        ]);

        if (cancelled) return;

        dispatch({
          type: 'SET_INITIAL',
          payload: {
            event: eventData.event,
            classes: eventData.classes,
            races: eventData.races,
            categories: cats,
          },
        });

        const groups = groupRaces(eventData.races);
        setClassGroups(groups);

        const dayInfos = extractDays(eventData.races);
        setDays(dayInfos);

        // Auto-select active day
        if (dayInfos.length > 1 && !dayAutoSelectedRef.current) {
          dayAutoSelectedRef.current = true;
          const runningDay = dayInfos.find((d) =>
            eventData.races.some((r) => d.raceIds.has(r.raceId) && r.raceStatus != null && r.raceStatus >= 2)
          );
          setSelectedDay(runningDay ? runningDay.date : dayInfos[0].date);
        }

        // Handle deep link with raceId from URL
        if (urlRaceId) {
          const targetRace = eventData.races.find((r) => r.raceId === urlRaceId);
          if (targetRace) {
            const targetClassId = targetRace.classId ?? groups[0]?.classId ?? null;
            setSelectedClassId(targetClassId);
            setSelectedRaceId(urlRaceId);
            // Set day to match deep-linked race
            if (dayInfos.length > 1) {
              const raceDay = dayInfos.find((d) => d.raceIds.has(urlRaceId));
              if (raceDay) setSelectedDay(raceDay.date);
            }
          } else {
            setEventState('error');
            setEventError('Závod nenalezen');
            return;
          }
        } else if (groups.length > 0) {
          setSelectedClassId(groups[0].classId);
          setSelectedRaceId(groups[0].displayRaces[0].raceId);
        }

        setEventState('success');
        loadedEventIdRef.current = eventId;

        if (eventData.event.status === 'running') {
          getOnCourse(eventId)
            .then((oncourseData) => {
              if (cancelled) return;
              dispatch({ type: 'SET_ONCOURSE', payload: oncourseData });
            })
            .catch((err) => {
              console.error('[EventDetailPage] Failed to load oncourse:', err);
            });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setEventError('Závod nenalezen');
        } else {
          setEventError(
            err instanceof ApiError
              ? `Chyba serveru (${err.status})`
              : 'Nepodařilo se načíst závod'
          );
        }
        setEventState('error');
      }
    }

    loadEvent();
    return () => { cancelled = true; };
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps -- urlRaceId handled below

  // Sync selection from URL changes (browser back/forward, deep link after initial load)
  // Skips internal navigates (where state is already set by handleClassChange/handleDayChange)
  useEffect(() => {
    // Skip during initial load (loadEvent handles it) or same event not loaded yet
    if (loadedEventIdRef.current !== eventId) return;
    if (!urlRaceId) return;

    // Only sync if URL race differs from current selection (browser back/forward)
    if (urlRaceId === selectedRaceId) return;

    const targetRace = races.find((r) => r.raceId === urlRaceId);
    if (!targetRace) return;

    const classId = targetRace.classId ?? selectedClassId;
    if (classId) setSelectedClassId(classId);
    setSelectedRaceId(urlRaceId);

    // Sync day
    if (days.length > 0) {
      const raceDay = days.find((d) => d.raceIds.has(urlRaceId));
      if (raceDay && raceDay.date !== selectedDay) setSelectedDay(raceDay.date);
    }
  }, [urlRaceId, eventId, races, days, selectedRaceId, selectedClassId, selectedDay]);

  // Load results/startlist when race changes
  useEffect(() => {
    if (!selectedRaceId || eventState !== 'success') return;

    const raceId = selectedRaceId;
    let cancelled = false;

    async function loadResults() {
      setResultsState('loading');
      setCurrentRaceInfo(null);
      setStartlist(null);

      try {
        const [resultsData, startlistData] = await Promise.all([
          getEventResults(eventId, raceId, {
            catId: selectedCatId ?? undefined,
          }),
          getStartlistMaybeBr(eventId, raceId).catch(() => [] as StartlistDisplayRow[]),
        ]);

        if (cancelled) return;

        dispatch({
          type: 'SET_RESULTS',
          payload: { raceId, results: resultsData.results },
        });
        setCurrentRaceInfo(resultsData.race);
        setStartlist(startlistData.length > 0 ? startlistData : null);

        if (resultsData.results.length > 0 && eventDetail?.status !== 'startlist') {
          setDataView('results');
        } else if (startlistData.length > 0) {
          setDataView('startlist');
        }

        setResultsState('success');
      } catch {
        if (cancelled) return;
        try {
          const startlistData = await getStartlistMaybeBr(eventId, raceId);
          if (cancelled) return;
          setStartlist(startlistData);
          setDataView('startlist');
          setResultsState('success');
        } catch {
          if (cancelled) return;
          setResultsState('error');
        }
      }
    }

    loadResults();
    return () => { cancelled = true; };
  }, [eventId, selectedRaceId, selectedCatId, eventState]);

  // Pick the best display race for a given class on a given day.
  // Applies getDisplayRaces on day-filtered races so BR1 is hidden when BR2 exists.
  const pickDayRaceId = useCallback(
    (group: ClassGroup, dayInfo: DayInfo): string | null => {
      const dayRaces = group.races.filter((r) => dayInfo.raceIds.has(r.raceId));
      const display = getDisplayRaces(dayRaces);
      return display[0]?.raceId ?? dayRaces[0]?.raceId ?? null;
    },
    []
  );

  // Handle class change
  const handleClassChange = useCallback(
    (classId: string) => {
      setSelectedClassId(classId);
      setExpandedRows(new Set());
      const group = classGroups.find((g) => g.classId === classId);
      if (!group) return;

      let newRaceId: string | null = null;
      if (selectedDay) {
        const dayInfo = days.find((d) => d.date === selectedDay);
        if (dayInfo) newRaceId = pickDayRaceId(group, dayInfo);
      }
      if (!newRaceId && group.displayRaces.length > 0) {
        newRaceId = group.displayRaces[0].raceId;
      }
      if (newRaceId) {
        setSelectedRaceId(newRaceId);
        navigate(`/events/${eventId}/race/${newRaceId}`);
      }
    },
    [classGroups, selectedDay, days, eventId, navigate, pickDayRaceId]
  );

  // Handle day change — keep same class, switch to that class's race on the new day
  const handleDayChange = useCallback(
    (dayDate: string) => {
      setSelectedDay(dayDate);
      const dayInfo = days.find((d) => d.date === dayDate);
      if (!dayInfo || !selectedClassId) return;
      const group = classGroups.find((g) => g.classId === selectedClassId);
      if (!group) return;
      const newRaceId = pickDayRaceId(group, dayInfo);
      if (newRaceId) {
        setSelectedRaceId(newRaceId);
        navigate(`/events/${eventId}/race/${newRaceId}`);
      }
    },
    [days, selectedClassId, classGroups, eventId, navigate, pickDayRaceId]
  );

  // Handle race/round change
  const handleRaceChange = useCallback(
    (raceId: string) => {
      setSelectedRaceId(raceId);
      setExpandedRows(new Set());
      navigate(`/events/${eventId}/race/${raceId}`);
    },
    [eventId, navigate]
  );

  // Handle category change
  const handleCategoryChange = useCallback((catId: string | null) => {
    setSelectedCatId(catId);
    setExpandedRows(new Set());
  }, []);

  // Handle row expand/collapse
  const handleToggleExpand = useCallback(
    async (key: string) => {
      const newExpanded = new Set(expandedRows);

      if (newExpanded.has(key)) {
        newExpanded.delete(key);
        setExpandedRows(newExpanded);
      } else {
        newExpanded.add(key);
        setExpandedRows(newExpanded);

        if (!liveState.detailedCache[key] && selectedRaceId) {
          setDetailedLoading(prev => new Set([...prev, key]));

          try {
            const resultsData = await getEventResults(eventId, selectedRaceId, {
              detailed: true,
              catId: selectedCatId ?? undefined,
            });

            resultsData.results.forEach((result) => {
              if (result.bib !== null) {
                dispatch({
                  type: 'CACHE_DETAILED',
                  payload: {
                    raceId: selectedRaceId,
                    bib: result.bib,
                    detail: {
                      time: result.time ?? null,
                      pen: result.pen ?? null,
                      total: result.total ?? null,
                      gates: result.gates ?? null,
                      prevTime: result.prevTime ?? null,
                      prevPen: result.prevPen ?? null,
                      prevTotal: result.prevTotal ?? null,
                      prevGates: result.prevGates ?? null,
                    },
                  },
                });
              }
            });
          } catch (err) {
            console.error('[EventDetailPage] Failed to fetch detailed results:', err);
          } finally {
            setDetailedLoading(prev => {
              const newLoading = new Set(prev);
              newLoading.delete(key);
              return newLoading;
            });
          }
        }
      }
    },
    [expandedRows, liveState.detailedCache, selectedRaceId, eventId, selectedCatId, detailedLoading, dispatch]
  );

  // Build class name map
  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cls of liveState.classes) {
      map[cls.classId] = cls.name;
    }
    return map;
  }, [liveState.classes]);

  // Search filter (uses deferred query for responsiveness)
  const filteredResults: ResultsResponse | null = useMemo(() => {
    if (!results) return null;
    let filtered = results.results;
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        (r.club && r.club.toLowerCase().includes(q)) ||
        (r.bib != null && String(r.bib).includes(q))
      );
    }
    if (favorites.showOnlyFavorites && selectedRaceId) {
      filtered = filtered.filter((r) =>
        r.bib != null && favorites.isMatchingFavorite(r.bib, selectedRaceId)
      );
    }
    return { ...results, results: filtered };
  }, [results, deferredSearchQuery, favorites.showOnlyFavorites, favorites.isMatchingFavorite, selectedRaceId]);

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

  // Filter categories to only those present in this race — use startlist (always unfiltered)
  // so the dropdown stays stable even when a category filter is active.
  const availableCategories = useMemo(() => {
    const source = startlist ?? results?.results ?? [];
    if (source.length === 0) return categories;
    const present = new Set(source.map((e) => e.catId).filter(Boolean));
    return categories.filter((c) => present.has(c.catId));
  }, [categories, startlist, results]);

  // Data view tabs
  const hasResults = results && results.results.length > 0;
  const hasStartlist = startlist && startlist.length > 0;
  const dataViewTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = [];
    if (hasResults && eventDetail?.status !== 'startlist') tabs.push({ id: 'results', label: 'Výsledky', content: null });
    if (hasStartlist) tabs.push({ id: 'startlist', label: 'Startovka', content: null });
    tabs.push({ id: 'schedule', label: 'Program', content: null });
    return tabs;
  }, [hasResults, hasStartlist, eventDetail?.status]);

  // Search results count for startlist search input
  const searchResultsCount = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    if (dataView === 'startlist') return filteredStartlist?.length;
    return undefined;
  }, [searchQuery, dataView, filteredStartlist]);

  // Filter classGroups by selected day
  const filteredClassGroups = useMemo(() => {
    if (!selectedDay) return classGroups;
    const dayInfo = days.find((d) => d.date === selectedDay);
    if (!dayInfo) return classGroups;
    return classGroups.filter((g) =>
      g.races.some((r) => dayInfo.raceIds.has(r.raceId))
    );
  }, [classGroups, selectedDay, days]);

  // Safety net: when filteredClassGroups changes (day switch), ensure selected class/race
  // is valid. handleDayChange covers the common case but doesn't handle the edge case
  // where the selected class doesn't exist on the new day.
  useEffect(() => {
    if (filteredClassGroups.length === 0) return;

    const dayInfo = selectedDay ? days.find((d) => d.date === selectedDay) : null;
    const currentVisible = filteredClassGroups.some((g) => g.classId === selectedClassId);

    if (!currentVisible) {
      // Class not on this day — select first class on this day
      const firstGroup = filteredClassGroups[0];
      setSelectedClassId(firstGroup.classId);
      const newRaceId = dayInfo
        ? pickDayRaceId(firstGroup, dayInfo)
        : firstGroup.displayRaces[0]?.raceId ?? null;
      setSelectedRaceId(newRaceId);
    } else if (dayInfo && selectedRaceId && !dayInfo.raceIds.has(selectedRaceId)) {
      // Class is visible but selected race is from another day — find race for this day
      const group = filteredClassGroups.find((g) => g.classId === selectedClassId);
      if (group) {
        const newRaceId = pickDayRaceId(group, dayInfo);
        if (newRaceId) setSelectedRaceId(newRaceId);
      }
    }
  }, [filteredClassGroups, selectedDay, selectedClassId, selectedRaceId, days, pickDayRaceId]);

  // Day selector tabs (no "Vše")
  const dayTabs: TabItem[] = useMemo(() => {
    return days.map((d) => ({ id: d.date, label: d.label, content: null }));
  }, [days]);

  // Clear search when switching data view
  const handleDataViewChange = useCallback((id: string) => {
    setDataView(id as DataView);
    setSearchQuery('');
  }, []);

  // 404 / error
  if (eventState === 'error') {
    return (
      <section>
        <Card>
          <EmptyState
            title={eventError ?? 'Chyba'}
            description={
              eventError === 'Závod nenalezen'
                ? 'Požadovaný závod nebyl nalezen.'
                : (eventError ?? 'Neznámá chyba')
            }
            action={
              <Button onClick={() => navigate('/')}>
                Zpět na přehled závodů
              </Button>
            }
          />
        </Card>
      </section>
    );
  }

  if (eventState === 'loading' || eventState === 'idle') {
    return (
      <section>
        <SkeletonCard />
      </section>
    );
  }

  // Find races for selected class
  const selectedGroup = filteredClassGroups.find((g) => g.classId === selectedClassId);
  const selectedRace = races.find((r) => r.raceId === selectedRaceId);
  const selectedRaceClassId = selectedRace?.classId ?? null;
  const showClassTabs = filteredClassGroups.length > 1;
  const classTabsStandalone = filteredClassGroups.reduce(
    (sum, g) => sum + (classNameMap[g.classId] ?? g.classId).length,
    0
  ) > 21;
  const displayRaces = selectedGroup?.displayRaces ?? [];
  const showRoundTabs = displayRaces.length > 1;
  const hasMergedBR = selectedGroup
    ? selectedGroup.races.length !== selectedGroup.displayRaces.length
    : false;
  const isBR = selectedRace ? isBestRunRace(selectedRace.raceType) : false;

  return (
    <section className={styles.pageWrapper}>
      {eventDetail && (
        <EventHeader event={eventDetail} connectionState={shouldConnect ? connectionState : undefined} />
      )}

      <OnCoursePanel
        oncourse={liveState.oncourse}
        isOpen={oncoursePanelOpen}
        onToggle={() => setOncoursePanelOpen(!oncoursePanelOpen)}
      />

      {/* NAV ROW: Days (left) + ClassTabs (center, desktop only inline) + Data View (right) */}
      <div className={styles.navigationRow}>
        {days.length > 1 && (
          <div className={styles.dayTabs}>
            <Tabs
              tabs={dayTabs}
              activeTab={selectedDay ?? dayTabs[0]?.id}
              onChange={handleDayChange}
              variant="pills"
              size="sm"
              energyAccent
            />
          </div>
        )}
        {dataView !== 'schedule' && showClassTabs && (
          <div className={`${styles.classTabs} ${classTabsStandalone ? styles.classTabsStandalone : ''}`}>
            <ClassTabs
              classGroups={filteredClassGroups}
              selectedClassId={selectedClassId}
              onClassChange={handleClassChange}
              classNameMap={classNameMap}
            />
          </div>
        )}
        {resultsState === 'success' && (
          <DataViewSelector
            tabs={dataViewTabs}
            activeTab={dataView}
            onChange={handleDataViewChange}
          />
        )}
      </div>

      {resultsState === 'loading' && <SkeletonCard />}

      {resultsState === 'error' && (
        <Card>
          <EmptyState
            title="Chyba načítání"
            description="Nepodařilo se načíst výsledky ani startovní listinu."
          />
        </Card>
      )}

      {resultsState === 'success' && dataView === 'results' && filteredResults && filteredResults.results.length === 0 && selectedCatId && (
        <Card>
          <EmptyState
            title="V této kategorii nejsou žádní závodníci v tomto závodě"
            description="Zkuste vybrat jinou kategorii nebo zrušte filtr."
          />
        </Card>
      )}

      {resultsState === 'success' && dataView === 'results' && filteredResults && (filteredResults.results.length > 0 || !selectedCatId) && (
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
          showOnlyFavorites={favorites.showOnlyFavorites}
          onToggleShowFavorites={() => favorites.setShowOnlyFavorites(!favorites.showOnlyFavorites)}
          favoritesCount={favorites.favoritesCount}
        />
      )}

      {resultsState === 'success' && dataView === 'startlist' && (
        <div className={styles.startlistSearch}>
          <SearchInput
            size="sm"
            placeholder="Hledat závodníka..."
            onChange={setSearchQuery}
            debounceMs={200}
            resultsCount={searchResultsCount}
          />
        </div>
      )}

      {resultsState === 'success' && dataView === 'startlist' && filteredStartlist && filteredStartlist.length > 0 && (
        <StartlistTable
          entries={filteredStartlist}
          isFavorite={favorites.isFavorite}
          onToggleFavorite={favorites.toggleFavorite}
          raceClassId={selectedRaceClassId}
        />
      )}

      {resultsState === 'success' && dataView === 'startlist' && (!filteredStartlist || filteredStartlist.length === 0) && (
        <Card>
          <EmptyState
            title="Startovní listina není k dispozici"
            description="Startovní listina pro tento závod zatím nebyla zveřejněna."
          />
        </Card>
      )}

      {resultsState === 'success' && dataView === 'schedule' && (
        <ScheduleView
          races={races}
          classNameMap={classNameMap}
          currentRaceId={selectedRaceId}
          onRaceClick={(raceId) => {
            const race = races.find((r) => r.raceId === raceId);
            if (race) {
              const classId = race.classId || selectedClassId;
              if (classId && classId !== selectedClassId) {
                setSelectedClassId(classId);
              }
              setSelectedRaceId(raceId);
              setDataView('results');
              navigate(`/events/${eventId}/race/${raceId}`);
            }
          }}
        />
      )}

      {resultsState === 'success' && dataView === 'results' && !results && (!startlist || startlist.length === 0) && (
        <Card>
          <EmptyState
            title="Zatím nejsou k dispozici žádná data"
            description="Výsledky se zobrazí po zahájení závodu."
          />
        </Card>
      )}

      {races.length === 0 && resultsState !== 'loading' && (
        <Card>
          <EmptyState
            title="Žádné závody"
            description="Pro tuto akci nebyly naplánovány žádné závody."
          />
        </Card>
      )}
    </section>
  );
}
