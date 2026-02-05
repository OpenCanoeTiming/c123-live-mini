import { useState, useEffect, useCallback } from 'react';
import { SHARED_VERSION } from '@c123-live-mini/shared';
import {
  PageLayout,
  Header,
  Card,
  SectionHeader,
  LiveIndicator,
  EmptyState,
  Button,
  SkeletonCard,
  Tabs,
  type TabItem,
} from '@czechcanoe/rvp-design-system';
import {
  getEvents,
  getEventDetails,
  getEventResults,
  ApiError,
  type EventListItem,
  type EventDetail,
  type RaceInfo,
  type ResultsResponse,
} from './services/api';
import { EventList } from './components/EventList';
import { ResultList } from './components/ResultList';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface AppState {
  events: EventListItem[];
  eventsState: LoadingState;
  eventsError: string | null;

  selectedEventId: string | null;
  eventDetail: EventDetail | null;
  races: RaceInfo[];
  eventState: LoadingState;
  eventError: string | null;

  selectedRaceId: string | null;
  results: ResultsResponse | null;
  resultsState: LoadingState;
  resultsError: string | null;
}

const initialState: AppState = {
  events: [],
  eventsState: 'idle',
  eventsError: null,

  selectedEventId: null,
  eventDetail: null,
  races: [],
  eventState: 'idle',
  eventError: null,

  selectedRaceId: null,
  results: null,
  resultsState: 'idle',
  resultsError: null,
};

function App() {
  const [state, setState] = useState<AppState>(initialState);

  // Fetch events on mount
  useEffect(() => {
    async function fetchEvents() {
      setState((s) => ({ ...s, eventsState: 'loading', eventsError: null }));
      try {
        const events = await getEvents();
        setState((s) => ({ ...s, events, eventsState: 'success' }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `Server error (${err.status})`
            : 'Failed to connect to server';
        setState((s) => ({
          ...s,
          eventsState: 'error',
          eventsError: message,
        }));
      }
    }
    fetchEvents();
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback(async (eventId: string) => {
    setState((s) => ({
      ...s,
      selectedEventId: eventId,
      eventState: 'loading',
      eventError: null,
      selectedRaceId: null,
      results: null,
      resultsState: 'idle',
    }));

    try {
      const data = await getEventDetails(eventId);
      setState((s) => ({
        ...s,
        eventDetail: data.event,
        races: data.races,
        eventState: 'success',
        // Auto-select first race if available
        selectedRaceId: data.races.length > 0 ? data.races[0].raceId : null,
      }));

      // Auto-fetch results for first race
      if (data.races.length > 0) {
        try {
          setState((s) => ({ ...s, resultsState: 'loading' }));
          const results = await getEventResults(eventId, data.races[0].raceId);
          setState((s) => ({ ...s, results, resultsState: 'success' }));
        } catch (err) {
          const message =
            err instanceof ApiError
              ? `Results error (${err.status})`
              : 'Failed to load results';
          setState((s) => ({
            ...s,
            resultsState: 'error',
            resultsError: message,
          }));
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `Event error (${err.status})`
          : 'Failed to load event';
      setState((s) => ({
        ...s,
        eventState: 'error',
        eventError: message,
      }));
    }
  }, []);

  // Handle race selection
  const handleSelectRace = useCallback(
    async (raceId: string) => {
      if (!state.selectedEventId) return;

      setState((s) => ({
        ...s,
        selectedRaceId: raceId,
        resultsState: 'loading',
        resultsError: null,
      }));

      try {
        const results = await getEventResults(state.selectedEventId, raceId);
        setState((s) => ({ ...s, results, resultsState: 'success' }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `Results error (${err.status})`
            : 'Failed to load results';
        setState((s) => ({
          ...s,
          resultsState: 'error',
          resultsError: message,
        }));
      }
    },
    [state.selectedEventId]
  );

  const isLive = state.eventDetail?.status === 'running';

  // Convert races to Tabs format
  const raceTabs: TabItem[] = state.races.map((race) => ({
    id: race.raceId,
    label: race.classId ?? race.raceId,
    content: null, // Content is rendered separately
  }));

  const headerContent = (
    <Header
      variant="satellite"
      appName="c123-live-mini"
    />
  );

  const footerContent = (
    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--csk-color-text-tertiary)' }}>
      Powered by c123-live-mini (shared v{SHARED_VERSION})
    </div>
  );

  return (
    <PageLayout
      variant="satellite"
      header={headerContent}
      footer={footerContent}
    >
      {/* Events Section */}
      <section>
        <SectionHeader title="Events" />

        {state.eventsState === 'loading' && <SkeletonCard />}

        {state.eventsState === 'error' && (
          <Card>
            <EmptyState
              title="Connection Error"
              description={state.eventsError ?? 'Failed to connect to server'}
              action={
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              }
            />
          </Card>
        )}

        {state.eventsState === 'success' && (
          <EventList
            events={state.events}
            selectedEventId={state.selectedEventId}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </section>

      {/* Event Detail & Results Section */}
      {state.selectedEventId && (
        <section style={{ marginTop: '2rem' }}>
          <SectionHeader
            title={state.eventDetail?.mainTitle ?? 'Loading...'}
            action={isLive ? <LiveIndicator>Live</LiveIndicator> : undefined}
          />

          {state.eventState === 'loading' && <SkeletonCard />}

          {state.eventState === 'error' && (
            <Card>
              <EmptyState
                title="Failed to load event"
                description={state.eventError ?? 'Unknown error'}
              />
            </Card>
          )}

          {state.eventState === 'success' && (
            <>
              {/* Race selector */}
              {state.races.length > 1 && (
                <Tabs
                  tabs={raceTabs}
                  activeTab={state.selectedRaceId ?? undefined}
                  onChange={handleSelectRace}
                  variant="pills"
                  size="sm"
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {/* Results */}
              {state.resultsState === 'loading' && <SkeletonCard />}

              {state.resultsState === 'error' && (
                <Card>
                  <EmptyState
                    title="Failed to load results"
                    description={state.resultsError ?? 'Unknown error'}
                  />
                </Card>
              )}

              {state.resultsState === 'success' && state.results && (
                <ResultList data={state.results} />
              )}

              {state.races.length === 0 && (
                <Card>
                  <EmptyState
                    title="No races available"
                    description="No races have been scheduled for this event."
                  />
                </Card>
              )}
            </>
          )}
        </section>
      )}
    </PageLayout>
  );
}

export default App;
