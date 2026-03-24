import { useRef, useEffect } from 'react';
import { Tabs, type TabItem } from '@czechcanoe/rvp-design-system';
import type { ClassGroup } from '../utils/groupRaces';
import styles from './ClassTabs.module.css';

interface ClassTabsProps {
  classGroups: ClassGroup[];
  selectedClassId: string | null;
  onClassChange: (classId: string) => void;
  classNameMap?: Record<string, string>;
}

export function ClassTabs({
  classGroups,
  selectedClassId,
  onClassChange,
  classNameMap,
}: ClassTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected tab into view
  useEffect(() => {
    if (!scrollRef.current || !selectedClassId) return;
    const activeTab = scrollRef.current.querySelector('[role="tab"][aria-selected="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedClassId]);

  const tabs: TabItem[] = classGroups.map((group) => ({
    id: group.classId,
    label: classNameMap?.[group.classId] ?? group.classId,
    content: null,
  }));

  return (
    <div className={styles.carouselWrapper}>
      <div className={styles.carousel} ref={scrollRef}>
        <Tabs
          tabs={tabs}
          activeTab={selectedClassId ?? undefined}
          onChange={onClassChange}
          variant="pills"
        />
      </div>
    </div>
  );
}
