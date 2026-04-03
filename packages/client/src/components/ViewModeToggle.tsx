import type { ChangeEvent } from 'react';
import { Switch } from '@czechcanoe/rvp-design-system';

function isInputTarget(t: EventTarget | null): t is HTMLInputElement {
  return t !== null && 'checked' in t && typeof (t as HTMLInputElement).checked === 'boolean';
}

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
      onChange={(e: ChangeEvent<HTMLElement>) => {
        const t = e.target;
        if (!isInputTarget(t)) return;
        onViewModeChange(t.checked ? 'detailed' : 'simple');
      }}
    />
  );
}
