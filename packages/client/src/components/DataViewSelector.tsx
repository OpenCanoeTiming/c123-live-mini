import {
  Tabs,
  Dropdown,
  DropdownButton,
  type TabItem,
  type DropdownItem,
} from '@czechcanoe/rvp-design-system';
import styles from './DataViewSelector.module.css';

interface DataViewSelectorProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function DataViewSelector({ tabs, activeTab, onChange }: DataViewSelectorProps) {
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? activeTab;

  const items: DropdownItem[] = tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    onClick: () => onChange(tab.id),
  }));

  return (
    <>
      {/* Desktop: pills tabs */}
      <div className={styles.desktopOnly}>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={onChange}
          variant="pills"
          size="sm"
          energyAccent
        />
      </div>
      {/* Mobile: dropdown */}
      <div className={styles.mobileOnly}>
        <Dropdown
          trigger={
            <DropdownButton size="sm" variant="primary">
              {activeLabel}
            </DropdownButton>
          }
          items={items}
          size="sm"
          position="bottom-end"
          aria-label="Zobrazení dat"
        />
      </div>
    </>
  );
}
