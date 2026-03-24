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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, classGroups]);

  // Auto-scroll selected tab into view
  useEffect(() => {
    if (!scrollRef.current || !selectedClassId) return;
    const activeTab = scrollRef.current.querySelector('[role="tab"][aria-selected="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedClassId]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const tabs: TabItem[] = classGroups.map((group) => ({
    id: group.classId,
    label: classNameMap?.[group.classId] ?? group.classId,
    content: null,
  }));

  return (
    <div className={styles.carouselWrapper}>
      {canScrollLeft && (
        <button
          className={`${styles.scrollArrow} ${styles.scrollArrowLeft}`}
          onClick={() => scroll('left')}
          aria-label="Posunout vlevo"
          type="button"
        >
          ‹
        </button>
      )}
      <div className={styles.carousel} ref={scrollRef}>
        <Tabs
          tabs={tabs}
          activeTab={selectedClassId ?? undefined}
          onChange={onClassChange}
          variant="pills"
          energyAccent
        />
      </div>
      {canScrollRight && (
        <button
          className={`${styles.scrollArrow} ${styles.scrollArrowRight}`}
          onClick={() => scroll('right')}
          aria-label="Posunout vpravo"
          type="button"
        >
          ›
        </button>
      )}
    </div>
  );
}
