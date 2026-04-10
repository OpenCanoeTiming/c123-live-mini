import { Card, Badge, EmptyState, LiveIndicator } from '@czechcanoe/rvp-design-system';
import type { EventListItem } from '../services/api';

interface EventListProps {
  events: EventListItem[];
  onSelectEvent: (eventId: string) => void;
}

/**
 * Map event status to Badge variant
 */
function getStatusVariant(status: string): 'success' | 'default' | 'info' {
  switch (status) {
    case 'running':
      return 'success';
    case 'finished':
    case 'official':
      return 'info';
    default:
      return 'default';
  }
}

/**
 * Map event status to Czech label
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'probíhá';
    case 'finished':
      return 'dokončeno';
    case 'official':
      return 'dokončeno';
    case 'startlist':
      return 'startovní listina';
    case 'draft':
      return 'příprava';
    default:
      return status;
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
 * - range → "1.–3. května 2026"
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

/**
 * Display a list of events using DS components
 */
export function EventList({ events, onSelectEvent }: EventListProps) {
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
        return (
          <Card
            key={event.eventId}
            clickable
            onClick={() => onSelectEvent(event.eventId)}
          >
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
              }}
            >
              {event.imageUrl && (
                <img
                  src={event.imageUrl}
                  alt=""
                  loading="lazy"
                  style={{
                    width: '64px',
                    height: '64px',
                    flexShrink: 0,
                    objectFit: 'cover',
                    borderRadius: 'var(--csk-radius-md, 8px)',
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    marginBottom: '0.25rem',
                  }}
                >
                  {event.mainTitle}
                </div>
                {event.subTitle && (
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--csk-color-text-secondary)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {event.subTitle}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.25rem 1rem',
                    fontSize: '0.875rem',
                    color: 'var(--csk-color-text-tertiary)',
                  }}
                >
                  {event.location && <span>{event.location}</span>}
                  {dateLabel && <span>{dateLabel}</span>}
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
                {event.status === 'running' && <LiveIndicator />}
                <Badge variant={getStatusVariant(event.status)}>
                  {getStatusLabel(event.status)}
                </Badge>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
