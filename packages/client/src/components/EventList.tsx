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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {events.map((event) => (
        <Card
          key={event.eventId}
          clickable
          onClick={() => onSelectEvent(event.eventId)}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
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
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--csk-color-text-tertiary)',
                }}
              >
                {event.location && <span>{event.location}</span>}
                {event.startDate && <span>{event.startDate}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {event.status === 'running' && <LiveIndicator />}
              <Badge variant={getStatusVariant(event.status)}>
                {getStatusLabel(event.status)}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
