import type { EventListItem } from '../services/api';

interface EventListProps {
  events: EventListItem[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}

/**
 * Display a list of events
 */
export function EventList({
  events,
  selectedEventId,
  onSelectEvent,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <h3 className="empty-state-title">No events available</h3>
          <p className="empty-state-description">
            No events have been created yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list">
      {events.map((event) => (
        <button
          key={event.eventId}
          className={`event-card${selectedEventId === event.eventId ? ' event-card--selected' : ''}`}
          onClick={() => onSelectEvent(event.eventId)}
          type="button"
        >
          <div className="event-card-header">
            <h3 className="event-card-title">{event.mainTitle}</h3>
            <span className={`status-badge status-badge--${event.status}`}>
              {event.status}
            </span>
          </div>
          {event.subTitle && (
            <p className="event-card-subtitle">{event.subTitle}</p>
          )}
          <div className="event-card-meta">
            {event.location && (
              <span className="event-card-location">{event.location}</span>
            )}
            {event.startDate && (
              <span className="event-card-date">{event.startDate}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
