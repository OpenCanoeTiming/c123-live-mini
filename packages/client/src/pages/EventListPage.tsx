import { useState, useEffect, useCallback } from 'react';
import {
  SectionHeader,
  SkeletonCard,
  Card,
  EmptyState,
  Button,
} from '@czechcanoe/rvp-design-system';
import { useLocation } from 'wouter';
import { getEvents, ApiError, type EventListItem } from '../services/api';
import { EventList } from '../components/EventList';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

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

  return (
    <section>
      <SectionHeader title="Závody" />

      {state === 'loading' && <SkeletonCard />}

      {state === 'error' && (
        <Card>
          <EmptyState
            title="Chyba připojení"
            description={error ?? 'Nepodařilo se připojit k serveru'}
            action={
              <Button onClick={fetchEvents}>Zkusit znovu</Button>
            }
          />
        </Card>
      )}

      {state === 'success' && (
        <EventList
          events={events}
          onSelectEvent={handleSelectEvent}
        />
      )}
    </section>
  );
}
