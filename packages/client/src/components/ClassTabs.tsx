import { useRef, useEffect, useState, useCallback } from 'react';
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
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled((scrollRef.current?.scrollLeft ?? 0) > 4);
  }, []);

  // On mobile: scroll active tab into view
  useEffect(() => {
    if (!scrollRef.current || !selectedClassId) return;
    const activeTab = scrollRef.current.querySelector('[role="tab"][aria-selected="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [selectedClassId]);

  const tabs: TabItem[] = classGroups.map((group) => ({
    id: group.classId,
    label: classNameMap?.[group.classId] ?? group.classId,
    content: null,
  }));

  return (
    <div className={`${styles.carouselWrapper} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.carousel} ref={scrollRef} onScroll={handleScroll}>
        <Tabs
          tabs={tabs}
          activeTab={selectedClassId ?? undefined}
          onChange={onClassChange}
          variant="pills"
          energyAccent
        />
      </div>
    </div>
  );
}
