import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HeroSection,
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

/** Czech pluralization for "závod" (race). */
function raceCountLabel(count: number): string {
  if (count === 1) return '1 závod';
  if (count >= 2 && count <= 4) return `${count} závody`;
  return `${count} závodů`;
}

const SECTION_DESCRIPTIONS: Record<keyof EventGroups, (n: number) => string> = {
  running: (n) => `${raceCountLabel(n)} běží právě teď`,
  upcoming: (n) => `${raceCountLabel(n)} v nejbližší době`,
  finished: (n) => `${raceCountLabel(n)} už máme za sebou`,
};

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

interface SectionHeadingProps {
  title: string;
  description: string;
  isLive?: boolean;
}

/**
 * Custom section heading with stronger visual hierarchy than the
 * design-system `SectionHeader` (which is intentionally subtle).
 *
 * Live sections get a coral accent bar, an inline pulsing live dot,
 * and a slightly larger title — so spectators immediately spot the
 * "Probíhá živě" block when they land on the page.
 */
function SectionHeading({ title, description, isLive }: SectionHeadingProps) {
  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        marginBottom: '0.875rem',
        paddingLeft: isLive ? '0.875rem' : 0,
        borderLeft: isLive
          ? '4px solid var(--color-energy-500, #f97316)'
          : undefined,
      }}
    >
      <h2
        style={{
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          fontSize: isLive ? '1.5rem' : '1.25rem',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          color: 'var(--csk-color-on-surface, var(--color-text-primary))',
        }}
      >
        {title}
        {isLive && (
          <LiveIndicator variant="live" size="md" energyGlow pulse />
        )}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: '0.9375rem',
          color:
            'var(--csk-color-on-surface-muted, var(--color-text-secondary))',
        }}
      >
        {description}
      </p>
    </header>
  );
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
  const visibleSectionCount = STATUS_SECTIONS.filter(
    (s) => groups[s.key].length > 0
  ).length;
  // When only a single status group is non-empty, the section heading is
  // redundant — the hero badge + the cards' own status badges already
  // tell the user what they're looking at. Skip headings in that case.
  const showHeadings = visibleSectionCount > 1;

  return (
    <>
      <HeroSection
        variant="compact"
        section="dv"
        title={branding.appSubtitle}
        titleAccent="kanoistického slalomu"
        meshBackground
        patternOverlay
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
        className="csk-mesh-bg--subtle"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2.25rem',
          paddingBlock: '2rem',
          paddingInline: '1rem',
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
                {showHeadings && (
                  <SectionHeading
                    title={title}
                    description={SECTION_DESCRIPTIONS[key](groups[key].length)}
                    isLive={isLive}
                  />
                )}
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
