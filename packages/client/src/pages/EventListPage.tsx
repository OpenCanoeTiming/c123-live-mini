import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HeroSection,
  SectionHeader,
  SkeletonCard,
  Card,
  EmptyState,
  Button,
} from '@czechcanoe/rvp-design-system';
import { useLocation } from 'wouter';
import { getEvents, ApiError, type EventListItem } from '../services/api';
import { EventList } from '../components/EventList';
import { branding } from '../config/branding';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface EventGroups {
  running: EventListItem[];
  upcoming: EventListItem[];
  finished: EventListItem[];
}

function groupEventsByStatus(events: EventListItem[]): EventGroups {
  const groups: EventGroups = { running: [], upcoming: [], finished: [] };
  for (const event of events) {
    switch (event.status) {
      case 'running':
        groups.running.push(event);
        break;
      case 'startlist':
        groups.upcoming.push(event);
        break;
      case 'finished':
      case 'official':
        groups.finished.push(event);
        break;
      default:
        // draft and unknown statuses are excluded from the public list
        break;
    }
  }
  return groups;
}

export function EventListPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const fetchEvents = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const data = await getEvents();
      setEvents(data);
      setState('success');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `Chyba serveru (${err.status})`
          : 'Chyba připojení';
      setError(message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      navigate(`/events/${eventId}`);
    },
    [navigate]
  );

  const groups = useMemo(() => groupEventsByStatus(events), [events]);
  const hasAnyEvents = events.length > 0;

  return (
    <>
      <HeroSection
        variant="minimal"
        section="generic"
        title={branding.appName}
        subtitle={branding.appSubtitle}
        meshBackground
        wave
      />

      {state === 'loading' && <SkeletonCard />}

      {state === 'error' && (
        <Card>
          <EmptyState
            title="Chyba připojení"
            description={error ?? 'Nepodařilo se připojit k serveru'}
            action={<Button onClick={fetchEvents}>Zkusit znovu</Button>}
          />
        </Card>
      )}

      {state === 'success' && !hasAnyEvents && (
        <EventList events={[]} onSelectEvent={handleSelectEvent} />
      )}

      {state === 'success' && hasAnyEvents && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {groups.running.length > 0 && (
            <section>
              <SectionHeader title="Probíhá živě" />
              <EventList
                events={groups.running}
                onSelectEvent={handleSelectEvent}
              />
            </section>
          )}
          {groups.upcoming.length > 0 && (
            <section>
              <SectionHeader title="Nadcházející" />
              <EventList
                events={groups.upcoming}
                onSelectEvent={handleSelectEvent}
              />
            </section>
          )}
          {groups.finished.length > 0 && (
            <section>
              <SectionHeader title="Skončené" />
              <EventList
                events={groups.finished}
                onSelectEvent={handleSelectEvent}
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
