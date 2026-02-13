import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SkeletonCard,
  Card,
  EmptyState,
  Button,
} from '@czechcanoe/rvp-design-system';
import { useLocation } from 'wouter';
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
import { groupRaces, type ClassGroup } from '../utils/groupRaces';
import { isBestRunRace } from '../utils/raceTypeLabels';
import { EventHeader } from '../components/EventHeader';
import { ClassTabs } from '../components/ClassTabs';
import { RoundTabs } from '../components/RoundTabs';
import { CategoryFilter } from '../components/CategoryFilter';
import { ResultList } from '../components/ResultList';
import { StartlistTable } from '../components/StartlistTable';
import { OnCoursePanel } from '../components/OnCoursePanel';
import { ViewModeToggle, type ViewMode } from '../components/ViewModeToggle';
import { useEventLiveState } from '../hooks/useEventLiveState';
import { useEventWebSocket } from '../hooks/useEventWebSocket';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { getOnCourse } from '../services/api';
import type { PublicClass, PublicRace, WsMessage } from '@c123-live-mini/shared';

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

  const racesRef = useRef<PublicRace[]>([]);
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
        break;

      case 'diff':
        dispatch({
          type: 'WS_DIFF',
          payload: message.data,
        });
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
                  results: resultsData.results as any,
                },
              });
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
                payload: oncourseData as any,
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

  useEffect(() => {
    // Start polling when disconnected and should be connected
    if (connectionState === 'disconnected' && shouldConnect && selectedRaceId) {
      console.log('[EventDetailPage] Starting polling fallback (15s interval)');

      const poll = async () => {
        try {
          // Fetch current race results
          const resultsData = await getEventResults(eventId, selectedRaceId, {
            catId: selectedCatId ?? undefined,
          });
          dispatch({
            type: 'SET_RESULTS',
            payload: {
              raceId: selectedRaceId,
              results: resultsData.results as any,
            },
          });

          // Fetch oncourse data
          const oncourseData = await getOnCourse(eventId);
          dispatch({
            type: 'SET_ONCOURSE',
            payload: oncourseData as any,
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
  }, [connectionState, shouldConnect, eventId, selectedRaceId, selectedCatId, dispatch]);

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
                const detailedResult = result as any;
                dispatch({
                  type: 'CACHE_DETAILED',
                  payload: {
                    raceId: selectedRaceId,
                    bib: result.bib,
                    detail: {
                      dtStart: detailedResult.dtStart ?? null,
                      dtFinish: detailedResult.dtFinish ?? null,
                      courseGateCount: detailedResult.courseGateCount ?? null,
                      gates: detailedResult.gates ?? null,
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

        // Dispatch to reducer instead of individual setState
        // Note: API types are compatible with Public types (same structure, different names)
        dispatch({
          type: 'SET_INITIAL',
          payload: {
            event: eventData.event as any, // EventDetail → PublicEventDetail
            classes: eventData.classes as any, // ClassInfo[] → PublicClass[]
            races: eventData.races as any, // RaceInfo[] → PublicRace[]
            categories: cats as any, // CategoryInfo[] → PublicAggregatedCategory[]
          },
        });

        racesRef.current = eventData.races as any;

        const groups = groupRaces(eventData.races);
        setClassGroups(groups);

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
          // Auto-select first class and first race
          setSelectedClassId(groups[0].classId);
          setSelectedRaceId(groups[0].races[0].raceId);
        }

        setEventState('success');

        // Fetch initial oncourse data for running events
        if (eventData.event.status === 'running') {
          getOnCourse(eventId)
            .then((oncourseData) => {
              if (cancelled) return;
              dispatch({
                type: 'SET_ONCOURSE',
                payload: oncourseData as any,
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

      const selectedRace = racesRef.current.find((r) => r.raceId === raceId);
      const isBR = selectedRace ? isBestRunRace(selectedRace.raceType) : false;

      try {
        const resultsData = await getEventResults(eventId, raceId, {
          catId: selectedCatId ?? undefined,
          includeAllRuns: isBR || undefined,
        });

        if (cancelled) return;

        if (resultsData.results.length > 0) {
          // Dispatch results to reducer
          // Note: ResultEntry is compatible with PublicResult
          dispatch({
            type: 'SET_RESULTS',
            payload: {
              raceId,
              results: resultsData.results as any,
            },
          });
          // Store race metadata for ResultList
          setCurrentRaceInfo(resultsData.race);
          setResultsState('success');
        } else {
          // No results — try startlist
          try {
            const startlistData = await getStartlist(eventId, raceId);
            if (cancelled) return;
            setStartlist(startlistData);
          } catch {
            // No startlist either — that's fine
          }
          setResultsState('success');
        }
      } catch {
        if (cancelled) return;
        // Results failed — try startlist as fallback
        try {
          const startlistData = await getStartlist(eventId, raceId);
          if (cancelled) return;
          setStartlist(startlistData);
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

  // Handle class change
  const handleClassChange = useCallback(
    (classId: string) => {
      setSelectedClassId(classId);
      const group = classGroups.find((g) => g.classId === classId);
      if (group && group.races.length > 0) {
        const newRaceId = group.races[0].raceId;
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
          setDetailedLoading(new Set([...detailedLoading, key]));

          try {
            const resultsData = await getEventResults(eventId, selectedRaceId, {
              detailed: true,
              catId: selectedCatId ?? undefined,
            });

            // Cache detailed data for all results in the race
            resultsData.results.forEach((result) => {
              if (result.bib !== null) {
                const resultKey = `${selectedRaceId}-${result.bib}`;
                // Type assertion: detailed results have the extra fields
                const detailedResult = result as any;
                dispatch({
                  type: 'CACHE_DETAILED',
                  payload: {
                    raceId: selectedRaceId,
                    bib: result.bib,
                    detail: {
                      dtStart: detailedResult.dtStart ?? null,
                      dtFinish: detailedResult.dtFinish ?? null,
                      courseGateCount: detailedResult.courseGateCount ?? null,
                      gates: detailedResult.gates ?? null,
                    },
                  },
                });
              }
            });
          } catch (err) {
            console.error('[EventDetailPage] Failed to fetch detailed results:', err);
          } finally {
            const newLoading = new Set(detailedLoading);
            newLoading.delete(key);
            setDetailedLoading(newLoading);
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

  // Find races for selected class
  const selectedGroup = classGroups.find((g) => g.classId === selectedClassId);
  const selectedRace = races.find((r) => r.raceId === selectedRaceId);
  const showClassTabs = classGroups.length > 1;
  const showRoundTabs = selectedGroup ? selectedGroup.races.length > 1 : false;
  const isBR = selectedRace ? isBestRunRace(selectedRace.raceType) : false;

  return (
    <section>
      {eventDetail && (
        <EventHeader event={eventDetail} />
      )}

      {shouldConnect && (
        <div style={{ marginBottom: '1rem' }}>
          <ConnectionStatus connectionState={connectionState} />
        </div>
      )}

      <OnCoursePanel
        oncourse={liveState.oncourse}
        isOpen={oncoursePanelOpen}
        onToggle={() => setOncoursePanelOpen(!oncoursePanelOpen)}
      />

      {showClassTabs && (
        <ClassTabs
          classGroups={classGroups}
          selectedClassId={selectedClassId}
          onClassChange={handleClassChange}
        />
      )}

      {showRoundTabs && selectedGroup && (
        <RoundTabs
          races={selectedGroup.races}
          selectedRaceId={selectedRaceId}
          onRaceChange={handleRaceChange}
        />
      )}

      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selectedCatId={selectedCatId}
          onCategoryChange={handleCategoryChange}
        />
      )}

      <div style={{ marginBottom: '1rem' }}>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
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

      {resultsState === 'success' && results && results.results.length === 0 && selectedCatId && (
        <Card>
          <EmptyState
            title="V této kategorii nejsou žádní závodníci v tomto závodě"
            description="Zkuste vybrat jinou kategorii nebo zrušte filtr."
          />
        </Card>
      )}

      {resultsState === 'success' && results && (results.results.length > 0 || !selectedCatId) && (
        <ResultList
          data={results}
          isBestRun={isBR}
          selectedCatId={selectedCatId}
          expandedRows={expandedRows}
          onToggleExpand={handleToggleExpand}
          detailedCache={liveState.detailedCache}
          detailedLoading={detailedLoading}
          viewMode={viewMode}
        />
      )}

      {resultsState === 'success' && !results && startlist && startlist.length > 0 && (
        <StartlistTable entries={startlist} />
      )}

      {resultsState === 'success' && !results && (!startlist || startlist.length === 0) && (
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
