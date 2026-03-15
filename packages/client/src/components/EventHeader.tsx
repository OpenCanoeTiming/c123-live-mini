import { SectionHeader, LiveIndicator, Badge } from '@czechcanoe/rvp-design-system';
import type { EventDetail } from '../services/api';
import styles from './EventHeader.module.css';

interface EventHeaderProps {
  event: EventDetail;
}

function StatusIndicator({ status }: { status: EventDetail['status'] }) {
  switch (status) {
    case 'running':
      return <LiveIndicator>Live</LiveIndicator>;
    case 'finished':
      return <Badge variant="default">Dokončeno</Badge>;
    case 'official':
      return <Badge variant="success">Oficiální výsledky</Badge>;
    case 'startlist':
      return <Badge variant="info">Startovní listina</Badge>;
    default:
      return null;
  }
}

export function EventHeader({ event }: EventHeaderProps) {
  const subtitle = [event.subTitle, event.location, event.discipline]
    .filter(Boolean)
    .join(' · ');

  const dates = [event.startDate, event.endDate]
    .filter(Boolean)
    .join(' – ');

  return (
    <div className={styles.wrapper}>
      <SectionHeader
        title={event.mainTitle}
        action={<StatusIndicator status={event.status} />}
      />
      {(subtitle || dates) && (
        <div className={styles.meta}>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {subtitle && dates && <span className={styles.separator}>·</span>}
          {dates && <span className={styles.dates}>{dates}</span>}
        </div>
      )}
    </div>
  );
}
