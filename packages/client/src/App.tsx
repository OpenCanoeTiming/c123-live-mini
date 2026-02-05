import { useState, useEffect, useCallback } from 'react';
import { SHARED_VERSION } from '@c123-live-mini/shared';
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

  return (
    <div className="page-layout">
      <header className="header">
        <div className="header-content">
          <span className="header-title">c123-live-mini</span>
          {isLive && (
            <div className="live-indicator">
              <span className="live-indicator-dot" />
              <span>Live</span>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        {/* Events Section */}
        <section className="section">
          <h2 className="section-header">Events</h2>

          {state.eventsState === 'loading' && (
            <div className="card">
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Loading events...</span>
              </div>
            </div>
          )}

          {state.eventsState === 'error' && (
            <div className="card">
              <div className="error-state">
                <div className="error-state-icon">⚠️</div>
                <h3 className="error-state-title">Connection Error</h3>
                <p className="error-state-description">{state.eventsError}</p>
                <button
                  className="btn btn--primary"
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  Retry
                </button>
              </div>
            </div>
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
          <section className="section">
            <h2 className="section-header">
              {state.eventDetail?.mainTitle ?? 'Loading...'}
            </h2>

            {state.eventState === 'loading' && (
              <div className="card">
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <span>Loading event details...</span>
                </div>
              </div>
            )}

            {state.eventState === 'error' && (
              <div className="card">
                <div className="error-state">
                  <div className="error-state-icon">⚠️</div>
                  <h3 className="error-state-title">Failed to load event</h3>
                  <p className="error-state-description">{state.eventError}</p>
                </div>
              </div>
            )}

            {state.eventState === 'success' && (
              <>
                {/* Race selector */}
                {state.races.length > 1 && (
                  <div className="race-selector">
                    {state.races.map((race) => (
                      <button
                        key={race.raceId}
                        className={`race-btn${state.selectedRaceId === race.raceId ? ' race-btn--selected' : ''}`}
                        onClick={() => handleSelectRace(race.raceId)}
                        type="button"
                      >
                        {race.classId ?? race.raceId}
                      </button>
                    ))}
                  </div>
                )}

                {/* Results */}
                {state.resultsState === 'loading' && (
                  <div className="card">
                    <div className="loading-state">
                      <div className="loading-spinner" />
                      <span>Loading results...</span>
                    </div>
                  </div>
                )}

                {state.resultsState === 'error' && (
                  <div className="card">
                    <div className="error-state">
                      <div className="error-state-icon">⚠️</div>
                      <h3 className="error-state-title">Failed to load results</h3>
                      <p className="error-state-description">
                        {state.resultsError}
                      </p>
                    </div>
                  </div>
                )}

                {state.resultsState === 'success' && state.results && (
                  <ResultList data={state.results} />
                )}

                {state.races.length === 0 && (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-icon">📊</div>
                      <h3 className="empty-state-title">No races available</h3>
                      <p className="empty-state-description">
                        No races have been scheduled for this event.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        Powered by c123-live-mini (shared v{SHARED_VERSION})
      </footer>
    </div>
  );
}

export default App;
