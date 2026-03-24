import { Switch } from '@czechcanoe/rvp-design-system';

export type ViewMode = 'simple' | 'detailed';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <Switch
      size="sm"
      label="Detailní"
      labelPosition="left"
      checked={viewMode === 'detailed'}
      onChange={(e) => onViewModeChange(e.target.checked ? 'detailed' : 'simple')}
    />
  );
}
