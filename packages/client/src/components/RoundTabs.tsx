import { Tabs, type TabItem } from '@czechcanoe/rvp-design-system';
import type { RaceInfo } from '../services/api';
import { getRaceTypeLabel } from '../utils/raceTypeLabels';

interface RoundTabsProps {
  races: RaceInfo[];
  selectedRaceId: string | null;
  onRaceChange: (raceId: string) => void;
}

export function RoundTabs({
  races,
  selectedRaceId,
  onRaceChange,
}: RoundTabsProps) {
  const tabs: TabItem[] = races.map((race) => ({
    id: race.raceId,
    label: getRaceTypeLabel(race.raceType),
    content: null,
  }));

  return (
    <Tabs
      tabs={tabs}
      activeTab={selectedRaceId ?? undefined}
      onChange={onRaceChange}
      variant="pills"
      size="sm"
      style={{ marginBottom: '0.75rem' }}
    />
  );
}
