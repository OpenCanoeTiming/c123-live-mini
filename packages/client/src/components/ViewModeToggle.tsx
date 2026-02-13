/**
 * ViewModeToggle Component
 *
 * Toggle between simple view (compact rows) and detailed view (all rows expanded).
 * Uses rvp-design-system Tabs component with pills variant.
 *
 * Visual states:
 * - Simple (Základní): Default compact view with individual row expansion
 * - Detailed (Detailní): All rows expanded showing gate penalties and timestamps
 */

import { Tabs } from '@czechcanoe/rvp-design-system';

export type ViewMode = 'simple' | 'detailed';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  const tabs = [
    { id: 'simple', label: 'Základní', content: null },
    { id: 'detailed', label: 'Detailní', content: null },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={viewMode}
      onChange={(tabId) => onViewModeChange(tabId as ViewMode)}
      variant="pills"
      size="sm"
    />
  );
}
