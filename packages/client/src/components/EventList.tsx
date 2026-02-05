import { Card, Badge, EmptyState } from '@czechcanoe/rvp-design-system';
import type { EventListItem } from '../services/api';

interface EventListProps {
  events: EventListItem[];
  selectedEventId: string | null;
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
      return 'info';
    default:
      return 'default';
  }
}

/**
 * Display a list of events using DS components
 */
export function EventList({
  events,
  selectedEventId,
  onSelectEvent,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No events available"
          description="No events have been created yet."
        />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {events.map((event) => (
        <Card
          key={event.eventId}
          clickable
          onClick={() => onSelectEvent(event.eventId)}
          variant={selectedEventId === event.eventId ? 'elevated' : 'surface'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {event.mainTitle}
              </div>
              {event.subTitle && (
                <div style={{ fontSize: '0.875rem', color: 'var(--csk-color-text-secondary)', marginBottom: '0.25rem' }}>
                  {event.subTitle}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--csk-color-text-tertiary)' }}>
                {event.location && <span>{event.location}</span>}
                {event.startDate && <span>{event.startDate}</span>}
              </div>
            </div>
            <Badge variant={getStatusVariant(event.status)}>
              {event.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
