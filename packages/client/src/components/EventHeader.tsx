import { HeroSection, LiveIndicator, Badge, type HeroSectionMetaItem } from '@czechcanoe/rvp-design-system';
import type { EventDetail } from '../services/api';
import type { ConnectionState } from '../hooks/useEventWebSocket';

interface EventHeaderProps {
  event: EventDetail;
  connectionState?: ConnectionState;
}

function getInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

function StatusBadges({ status, connectionState }: { status: EventDetail['status']; connectionState?: ConnectionState }) {
  // Connection state takes priority for live events
  if (connectionState === 'reconnecting') {
    return <LiveIndicator variant="connecting" color="warning" size="sm">Obnovování</LiveIndicator>;
  }
  if (connectionState === 'disconnected') {
    return <Badge variant="default" size="sm">Offline</Badge>;
  }

  switch (status) {
    case 'running':
      return <LiveIndicator variant="live" color="success" size="sm" pulse glow>Live</LiveIndicator>;
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

export function EventHeader({ event, connectionState }: EventHeaderProps) {
  const subtitle = [event.subTitle, event.location, event.discipline]
    .filter(Boolean)
    .join(' · ');

  const metadata: HeroSectionMetaItem[] = [];

  const dates = [event.startDate, event.endDate].filter(Boolean).join(' – ');
  if (dates) {
    metadata.push({ key: 'dates', label: 'Termín', value: dates });
  }
  if (event.facility) {
    metadata.push({ key: 'facility', label: 'Areál', value: event.facility });
  }

  return (
    <HeroSection
      variant="compact"
      section="dv"
      title={event.mainTitle}
      subtitle={subtitle || undefined}
      avatarInitials={getInitials(event.mainTitle)}
      badges={<StatusBadges status={event.status} connectionState={connectionState} />}
      metadata={metadata.length > 0 ? metadata : undefined}
      meshBackground
      wave
    />
  );
}
