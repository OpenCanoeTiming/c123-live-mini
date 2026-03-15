import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react';
import {
  SkeletonCard,
  Card,
  EmptyState,
  Button,
  Tabs,
  SearchInput,
  Breadcrumbs,
  type TabItem,
  type BreadcrumbItem,
} from '@czechcanoe/rvp-design-system';
import { useLocation, Link } from 'wouter';
import styles from './EventDetailPage.module.css';
import {
  getEventDetails,
  getEventResults,
  getCategories,
  getStartlist,
  ApiError,
  type EventDetail,
  type RaceInfo,
  type ResultsResponse,
  type CategoryInfo,
  type StartlistEntry,
} from '../services/api';
import { groupRaces, extractDays, type ClassGroup, type DayInfo } from '../utils/groupRaces';
import { isBestRunRace } from '../utils/raceTypeLabels';
import { EventHeader } from '../components/EventHeader';
import { ClassTabs } from '../components/ClassTabs';
import { RoundTabs } from '../components/RoundTabs';
import { CategoryFilter } from '../components/CategoryFilter';
import { ResultList } from '../components/ResultList';
import { StartlistTable } from '../components/StartlistTable';
import { OnCoursePanel } from '../components/OnCoursePanel';
import { ScheduleView } from '../components/ScheduleView';
import { ViewModeToggle, type ViewMode } from '../components/ViewModeToggle';
import { useEventLiveState } from '../hooks/useEventLiveState';
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

  // Live state reducer (replaces individual useState for event/classes/races/categories/results)
  const [liveState, dispatch] = useEventLiveState();

  // Derived state from reducer
  const eventDetail = liveState.event;
  const races = liveState.races;
  const categories = liveState.categories;

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
  const [startlist, setStartlist] = useState<StartlistEntry[] | null>(null);
  const [resultsState, setResultsState] = useState<LoadingState>('idle');
  const [currentRaceInfo, setCurrentRaceInfo] = useState<ResultsResponse['race'] | null>(null);

  // Data view toggle: results vs startlist vs schedule
  type DataView = 'results' | 'startlist' | 'schedule';
  const [dataView, setDataView] = useState<DataView>('results');

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => setSearchQuery(value));
  }, []);

  // Day selector state
  const [days, setDays] = useState<DayInfo[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Updated bibs tracking for animation (Phase 9)
  const [updatedBibs, setUpdatedBibs] = useState<Set<number>>(new Set());
  const updatedBibsTimerRef = useRef<number | null>(null);

  // Get results from reducer for selected race and construct ResultsResponse
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
        // Re-fetch results for the currently selected race after full state replacement
        // (WS_FULL clears resultsByRace, so we need to reload to keep the UI populated)
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
        // Track updated bibs for animation highlight
        if (message.data.results) {
          const bibs = new Set(message.data.results.filter(r => r.bib != null).map(r => r.bib!));
          if (bibs.size > 0) {
            setUpdatedBibs(bibs);
            if (updatedBibsTimerRef.current) clearTimeout(updatedBibsTimerRef.current);
            updatedBibsTimerRef.current = window.setTimeout(() => {
              setUpdatedBibs(new Set());
              updatedBibsTimerRef.current = null;
            }, 2500);
          }
        }
        break;

      case 'refresh':
        dispatch({ type: 'WS_REFRESH' });
        // Trigger REST re-fetch of current race and oncourse
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

  // REST polling fallback when WebSocket is disconnected
  const pollingIntervalRef = useRef<number | null>(null);
  const pollingParamsRef = useRef({ raceId: selectedRaceId, catId: selectedCatId });

  // Track current polling parameters
  useEffect(() => {
    pollingParamsRef.current = { raceId: selectedRaceId, catId: selectedCatId };
  }, [selectedRaceId, selectedCatId]);

  useEffect(() => {
    // Start polling when disconnected and should be connected
    if (connectionState === 'disconnected' && shouldConnect && selectedRaceId) {
      console.log('[EventDetailPage] Starting polling fallback (15s interval)');

      const poll = async () => {
        // Capture current params at poll time
        const currentRaceId = pollingParamsRef.current.raceId;
        const currentCatId = pollingParamsRef.current.catId;

        if (!currentRaceId) return;

        try {
          // Fetch current race results
          const resultsData = await getEventResults(eventId, currentRaceId, {
            catId: currentCatId ?? undefined,
          });

          // Only dispatch if params haven't changed during the request
          if (pollingParamsRef.current.raceId === currentRaceId && pollingParamsRef.current.catId === currentCatId) {
            dispatch({
              type: 'SET_RESULTS',
              payload: {
                raceId: currentRaceId,
                results: resultsData.results,
              },
            });
          }

          // Fetch oncourse data
          const oncourseData = await getOnCourse(eventId);

          // Oncourse data is event-wide, so always dispatch
          dispatch({
            type: 'SET_ONCOURSE',
            payload: oncourseData,
          });
        } catch (err) {
          console.error('[EventDetailPage] Polling failed:', err);
        }
      };

      // Start interval
      pollingIntervalRef.current = window.setInterval(poll, 15000);
    } else {
      // Stop polling when WebSocket reconnects or no longer needed
      if (pollingIntervalRef.current !== null) {
        console.log('[EventDetailPage] Stopping polling fallback');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
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
      // Check if we need to fetch detailed data
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
            // Cache detailed data for all results
            resultsData.results.forEach((result) => {
              if (result.bib !== null) {
                dispatch({
                  type: 'CACHE_DETAILED',
                  payload: {
                    raceId: selectedRaceId,
                    bib: result.bib,
                    detail: {
                      dtStart: result.dtStart ?? null,
                      dtFinish: result.dtFinish ?? null,
                      courseGateCount: result.courseGateCount ?? null,
                      gates: result.gates ?? null,
                      prevDtStart: result.prevDtStart ?? null,
                      prevDtFinish: result.prevDtFinish ?? null,
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

  // Load event details + categories
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

        // Dispatch to reducer (API types are now Public types from shared package)
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

        // Handle deep link with raceId from URL
        if (urlRaceId) {
          const targetRace = eventData.races.find((r) => r.raceId === urlRaceId);
          if (targetRace) {
            const targetClassId = targetRace.classId ?? groups[0]?.classId ?? null;
            setSelectedClassId(targetClassId);
            setSelectedRaceId(urlRaceId);
          } else {
            // raceId not found — show error
            setEventState('error');
            setEventError('Závod nenalezen');
            return;
          }
        } else if (groups.length > 0) {
          // Auto-select first class and first display race (BR1 filtered out)
          setSelectedClassId(groups[0].classId);
          setSelectedRaceId(groups[0].displayRaces[0].raceId);
        }

        setEventState('success');

        // Fetch initial oncourse data for running events
        if (eventData.event.status === 'running') {
          getOnCourse(eventId)
            .then((oncourseData) => {
              if (cancelled) return;
              dispatch({
                type: 'SET_ONCOURSE',
                payload: oncourseData,
              });
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
  }, [eventId, urlRaceId]);

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
        // Always fetch both results and startlist in parallel
        const [resultsData, startlistData] = await Promise.all([
          getEventResults(eventId, raceId, {
            catId: selectedCatId ?? undefined,
          }),
          getStartlist(eventId, raceId).catch(() => [] as StartlistEntry[]),
        ]);

        if (cancelled) return;

        dispatch({
          type: 'SET_RESULTS',
          payload: {
            raceId,
            results: resultsData.results,
          },
        });
        setCurrentRaceInfo(resultsData.race);
        setStartlist(startlistData.length > 0 ? startlistData : null);

        // Default to results view when results exist, startlist otherwise
        if (resultsData.results.length > 0) {
          setDataView('results');
        } else if (startlistData.length > 0) {
          setDataView('startlist');
        }

        setResultsState('success');
      } catch {
        if (cancelled) return;
        // Results failed — try startlist as fallback
        try {
          const startlistData = await getStartlist(eventId, raceId);
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

  // Handle class change — auto-select first display race (BR1 filtered out)
  const handleClassChange = useCallback(
    (classId: string) => {
      setSelectedClassId(classId);
      const group = classGroups.find((g) => g.classId === classId);
      if (group && group.displayRaces.length > 0) {
        const newRaceId = group.displayRaces[0].raceId;
        setSelectedRaceId(newRaceId);
        navigate(`/events/${eventId}/race/${newRaceId}`);
      }
    },
    [classGroups, eventId, navigate]
  );

  // Handle race/round change
  const handleRaceChange = useCallback(
    (raceId: string) => {
      setSelectedRaceId(raceId);
      navigate(`/events/${eventId}/race/${raceId}`);
    },
    [eventId, navigate]
  );

  // Handle category change
  const handleCategoryChange = useCallback((catId: string | null) => {
    setSelectedCatId(catId);
  }, []);

  // Handle row expand/collapse with detail data fetching
  const handleToggleExpand = useCallback(
    async (key: string) => {
      const newExpanded = new Set(expandedRows);

      if (newExpanded.has(key)) {
        // Collapse row
        newExpanded.delete(key);
        setExpandedRows(newExpanded);
      } else {
        // Expand row
        newExpanded.add(key);
        setExpandedRows(newExpanded);

        // Check if detail data is already cached
        if (!liveState.detailedCache[key] && selectedRaceId) {
          // Fetch detailed data for the entire race
          setDetailedLoading(prev => new Set([...prev, key]));

          try {
            const resultsData = await getEventResults(eventId, selectedRaceId, {
              detailed: true,
              catId: selectedCatId ?? undefined,
            });

            // Cache detailed data for all results in the race
            resultsData.results.forEach((result) => {
              if (result.bib !== null) {
                dispatch({
                  type: 'CACHE_DETAILED',
                  payload: {
                    raceId: selectedRaceId,
                    bib: result.bib,
                    detail: {
                      dtStart: result.dtStart ?? null,
                      dtFinish: result.dtFinish ?? null,
                      courseGateCount: result.courseGateCount ?? null,
                      gates: result.gates ?? null,
                      prevDtStart: result.prevDtStart ?? null,
                      prevDtFinish: result.prevDtFinish ?? null,
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
    [
      expandedRows,
      liveState.detailedCache,
      selectedRaceId,
      eventId,
      selectedCatId,
      detailedLoading,
      dispatch,
    ]
  );

  // Build human-readable class name map from liveState.classes
  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cls of liveState.classes) {
      map[cls.classId] = cls.name;
    }
    return map;
  }, [liveState.classes]);

  // Search filter for results and startlist
  const filteredResults: ResultsResponse | null = useMemo(() => {
    if (!results) return null;
    if (!searchQuery.trim()) return results;
    const q = searchQuery.trim().toLowerCase();
    const filtered = results.results.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.club && r.club.toLowerCase().includes(q)) ||
      (r.bib != null && String(r.bib).includes(q))
    );
    return { ...results, results: filtered };
  }, [results, searchQuery]);

  const filteredStartlist = useMemo(() => {
    if (!startlist) return null;
    if (!searchQuery.trim()) return startlist;
    const q = searchQuery.trim().toLowerCase();
    return startlist.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.club && s.club.toLowerCase().includes(q)) ||
      (s.bib != null && String(s.bib).includes(q))
    );
  }, [startlist, searchQuery]);

  // Data view tabs
  const hasResults = results && results.results.length > 0;
  const hasStartlist = startlist && startlist.length > 0;
  const dataViewTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = [];
    if (hasResults) tabs.push({ id: 'results', label: 'Výsledky', content: null });
    if (hasStartlist) tabs.push({ id: 'startlist', label: 'Startovka', content: null });
    tabs.push({ id: 'schedule', label: 'Program', content: null });
    return tabs;
  }, [hasResults, hasStartlist]);

  // Search results count
  const searchResultsCount = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    if (dataView === 'results') return filteredResults?.results.length;
    if (dataView === 'startlist') return filteredStartlist?.length;
    return undefined;
  }, [searchQuery, dataView, filteredResults, filteredStartlist]);

  // 404 / error with back link
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

  // Filter classGroups by selected day
  const filteredClassGroups = useMemo(() => {
    if (!selectedDay) return classGroups;
    const dayInfo = days.find((d) => d.date === selectedDay);
    if (!dayInfo) return classGroups;
    return classGroups.filter((g) =>
      g.races.some((r) => dayInfo.raceIds.has(r.raceId))
    );
  }, [classGroups, selectedDay, days]);

  // Day selector tabs
  const dayTabs: TabItem[] = useMemo(() => {
    return days.map((d) => ({ id: d.date, label: d.label, content: null }));
  }, [days]);

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    const items: BreadcrumbItem[] = [
      { id: 'home', label: 'ČSK Live', href: '#/' },
    ];
    if (eventDetail) {
      items.push({ id: 'event', label: eventDetail.mainTitle });
    }
    return items;
  }, [eventDetail]);

  // Find races for selected class
  const selectedGroup = filteredClassGroups.find((g) => g.classId === selectedClassId);
  const selectedRace = races.find((r) => r.raceId === selectedRaceId);
  const showClassTabs = filteredClassGroups.length > 1;
  // Use displayRaces for tabs (BR1 hidden when BR2 exists)
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

      {/* Sub-header: breadcrumbs + DataView tabs */}
      <div className={styles.subHeader}>
        <Breadcrumbs
          items={breadcrumbItems}
          renderLink={(item, children) =>
            item.href ? <Link href={item.href.replace('#', '')}>{children}</Link> : <>{children}</>
          }
        />
        {resultsState === 'success' && (
          <Tabs
            tabs={dataViewTabs}
            activeTab={dataView}
            onChange={(id) => setDataView(id as DataView)}
            variant="pills"
            size="sm"
          />
        )}
      </div>

      <OnCoursePanel
        oncourse={liveState.oncourse}
        isOpen={oncoursePanelOpen}
        onToggle={() => setOncoursePanelOpen(!oncoursePanelOpen)}
      />

      {dataView !== 'schedule' && (
        <>
          {/* Day selector */}
          {days.length > 0 && (
            <div className={styles.daySelector}>
              <Tabs
                tabs={[{ id: '__all__', label: 'Vše', content: null }, ...dayTabs]}
                activeTab={selectedDay ?? '__all__'}
                onChange={(id) => setSelectedDay(id === '__all__' ? null : id)}
                variant="pills"
                size="sm"
              />
            </div>
          )}

          {showClassTabs && (
            <ClassTabs
              classGroups={filteredClassGroups}
              selectedClassId={selectedClassId}
              onClassChange={handleClassChange}
              classNameMap={classNameMap}
            />
          )}

          {showRoundTabs && (
            <RoundTabs
              races={displayRaces}
              selectedRaceId={selectedRaceId}
              onRaceChange={handleRaceChange}
              hasMergedBR={hasMergedBR}
            />
          )}

          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selectedCatId={selectedCatId}
              onCategoryChange={handleCategoryChange}
            />
          )}
        </>
      )}

      {dataView !== 'schedule' && (
        <div className={styles.viewModeToggle}>
          <div className={styles.toolbarRow}>
            {dataView === 'results' && (
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            )}
            <SearchInput
              size="sm"
              placeholder="Hledat závodníka..."
              value={searchQuery}
              onChange={handleSearchChange}
              debounceMs={300}
              resultsCount={searchResultsCount}
              fullWidth
            />
          </div>
        </div>
      )}

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
          updatedBibs={updatedBibs}
        />
      )}

      {resultsState === 'success' && dataView === 'startlist' && filteredStartlist && filteredStartlist.length > 0 && (
        <StartlistTable entries={filteredStartlist} />
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
