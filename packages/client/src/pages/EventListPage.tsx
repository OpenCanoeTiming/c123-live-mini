import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HeroSection,
  SectionHeader,
  SkeletonCard,
  Card,
  EmptyState,
  Button,
  Badge,
  LiveIndicator,
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

interface StatusSectionConfig {
  key: keyof EventGroups;
  title: string;
  isLive?: boolean;
}

const STATUS_SECTIONS: StatusSectionConfig[] = [
  { key: 'running', title: 'Probíhá živě', isLive: true },
  { key: 'upcoming', title: 'Nadcházející' },
  { key: 'finished', title: 'Skončené' },
];

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
  const liveCount = groups.running.length;

  return (
    <>
      <HeroSection
        variant="compact"
        section="dv"
        title={branding.appSubtitle}
        meshBackground
        patternOverlay
        wave
        badges={
          liveCount > 0 ? (
            <Badge variant="energy" size="lg" glow>
              LIVE • {liveCount}
            </Badge>
          ) : undefined
        }
        className="csk-reveal csk-reveal-1"
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          paddingBlock: '1.5rem',
        }}
      >
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
          <Card>
            <EmptyState
              title="Žádné závody nejsou k dispozici"
              description="Momentálně nejsou vypsány žádné závody."
            />
          </Card>
        )}

        {state === 'success' &&
          hasAnyEvents &&
          STATUS_SECTIONS.map(({ key, title, isLive }, idx) =>
            groups[key].length > 0 ? (
              <section
                key={key}
                className={`csk-reveal csk-reveal-${idx + 2}`}
              >
                <SectionHeader
                  title={title}
                  badge={
                    isLive ? (
                      <LiveIndicator
                        variant="live"
                        size="md"
                        energyGlow
                        pulse
                      />
                    ) : (
                      <Badge variant="default" size="sm">
                        {groups[key].length}
                      </Badge>
                    )
                  }
                />
                <EventList
                  events={groups[key]}
                  onSelectEvent={handleSelectEvent}
                  emphasised={isLive}
                />
              </section>
            ) : null
          )}
      </div>
    </>
  );
}
