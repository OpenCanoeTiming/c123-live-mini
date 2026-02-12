import { Tabs, type TabItem } from '@czechcanoe/rvp-design-system';
import type { ClassGroup } from '../utils/groupRaces';

interface ClassTabsProps {
  classGroups: ClassGroup[];
  selectedClassId: string | null;
  onClassChange: (classId: string) => void;
}

export function ClassTabs({
  classGroups,
  selectedClassId,
  onClassChange,
}: ClassTabsProps) {
  const tabs: TabItem[] = classGroups.map((group) => ({
    id: group.classId,
    label: group.classId,
    content: null,
  }));

  return (
    <Tabs
      tabs={tabs}
      activeTab={selectedClassId ?? undefined}
      onChange={onClassChange}
      variant="pills"
      style={{ marginBottom: '0.5rem' }}
    />
  );
}
