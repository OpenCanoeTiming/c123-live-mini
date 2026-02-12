import { SectionHeader, LiveIndicator } from '@czechcanoe/rvp-design-system';
import type { EventDetail } from '../services/api';

interface EventHeaderProps {
  event: EventDetail;
}

export function EventHeader({ event }: EventHeaderProps) {
  const isLive = event.status === 'running';

  const subtitle = [event.subTitle, event.location, event.discipline]
    .filter(Boolean)
    .join(' · ');

  const dates = [event.startDate, event.endDate]
    .filter(Boolean)
    .join(' – ');

  return (
    <div style={{ marginBottom: '1rem' }}>
      <SectionHeader
        title={event.mainTitle}
        action={isLive ? <LiveIndicator>Live</LiveIndicator> : undefined}
      />
      {(subtitle || dates) && (
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--csk-color-text-secondary)',
            marginTop: '-0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          {subtitle}
          {subtitle && dates && ' · '}
          {dates}
        </div>
      )}
    </div>
  );
}
