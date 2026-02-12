import { useState, useEffect, useCallback } from 'react';
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

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface EventDetailPageProps {
  eventId: string;
  raceId?: string;
}

export function EventDetailPage({ eventId, raceId: urlRaceId }: EventDetailPageProps) {
  const [, navigate] = useLocation();

  // Event data
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [eventState, setEventState] = useState<LoadingState>('idle');
  const [eventError, setEventError] = useState<string | null>(null);

  // Selection state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Results/startlist state
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [startlist, setStartlist] = useState<StartlistEntry[] | null>(null);
  const [resultsState, setResultsState] = useState<LoadingState>('idle');

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

        setEventDetail(eventData.event);
        setRaces(eventData.races);
        setCategories(cats);

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
      setResults(null);
      setStartlist(null);

      const selectedRace = races.find((r) => r.raceId === raceId);
      const isBR = selectedRace ? isBestRunRace(selectedRace.raceType) : false;

      try {
        const resultsData = await getEventResults(eventId, raceId, {
          catId: selectedCatId ?? undefined,
          includeAllRuns: isBR || undefined,
        });

        if (cancelled) return;

        if (resultsData.results.length > 0) {
          setResults(resultsData);
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
          setResultsState('success');
        }
      }
    }

    loadResults();
    return () => { cancelled = true; };
  }, [eventId, selectedRaceId, selectedCatId, races, eventState]);

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

      {resultsState === 'loading' && <SkeletonCard />}

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

      {races.length === 0 && (
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
