import {
  Card,
  Badge,
  EmptyState,
  LiveIndicator,
  Icon,
} from '@czechcanoe/rvp-design-system';
import type { PublicEventStatus } from '@c123-live-mini/shared';
import type { EventListItem } from '../services/api';

interface EventListProps {
  events: EventListItem[];
  onSelectEvent: (eventId: string) => void;
  /**
   * Highlight cards in this list as live/important
   * (adds energy glow + elevated card variant).
   */
  emphasised?: boolean;
}

function getStatusVariant(
  status: PublicEventStatus
): 'success' | 'default' | 'info' | 'energy' {
  switch (status) {
    case 'running':
      return 'energy';
    case 'finished':
    case 'official':
      return 'info';
    case 'startlist':
      return 'default';
  }
}

function getStatusLabel(status: PublicEventStatus): string {
  switch (status) {
    case 'running':
      return 'probíhá';
    case 'finished':
    case 'official':
      return 'dokončeno';
    case 'startlist':
      return 'startovní listina';
  }
}

const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dayMonthFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
});

/**
 * Format an event date or date range in Czech locale.
 *
 * - single day → "5. května 2026"
 * - range → "1. května – 3. května 2026"
 * - returns null when both inputs are missing or unparseable
 */
function formatEventDate(
  startDate: string | null,
  endDate: string | null
): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;

  if (!endDate || endDate === startDate) {
    return dateFormatter.format(start);
  }

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) {
    return dateFormatter.format(start);
  }

  return `${dayMonthFormatter.format(start)} – ${dateFormatter.format(end)}`;
}

export function EventList({
  events,
  onSelectEvent,
  emphasised = false,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Žádné závody nejsou k dispozici"
          description="Momentálně nejsou vypsány žádné závody."
        />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {events.map((event) => {
        const dateLabel = formatEventDate(event.startDate, event.endDate);
        const isRunning = event.status === 'running';
        return (
          <Card
            key={event.eventId}
            variant={emphasised ? 'elevated' : 'surface'}
            padding="md"
            clickable
            onClick={() => onSelectEvent(event.eventId)}
            className={emphasised ? 'csk-energy-glow--sm' : undefined}
          >
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              {event.imageUrl && (
                <img
                  src={event.imageUrl}
                  alt=""
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '72px',
                    height: '72px',
                    flexShrink: 0,
                    objectFit: 'cover',
                    borderRadius: 'var(--csk-radius-md, 12px)',
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: emphasised ? '1.25rem' : '1.125rem',
                    fontWeight: 700,
                    lineHeight: 1.25,
                    marginBottom: '0.375rem',
                  }}
                >
                  {event.mainTitle}
                </div>
                {event.subTitle && (
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--csk-color-text-secondary)',
                      marginBottom: '0.375rem',
                    }}
                  >
                    {event.subTitle}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.375rem 1rem',
                    fontSize: '0.875rem',
                    color: 'var(--csk-color-text-tertiary)',
                  }}
                >
                  {event.location && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      <Icon name="map-pin" size="sm" aria-label="Místo" />
                      {event.location}
                    </span>
                  )}
                  {dateLabel && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      <Icon name="calendar" size="sm" aria-label="Datum" />
                      {dateLabel}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0,
                }}
              >
                {isRunning && (
                  <LiveIndicator
                    variant="live"
                    size="sm"
                    energyGlow
                    pulse
                  />
                )}
                <Badge
                  variant={getStatusVariant(event.status)}
                  size="md"
                  glow={isRunning}
                >
                  {getStatusLabel(event.status)}
                </Badge>
                <Icon
                  name="chevron-right"
                  size="md"
                  aria-hidden
                  className="csk-color-on-surface-muted"
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
