import { Tabs, type TabItem } from '@czechcanoe/rvp-design-system';
import type { CategoryInfo } from '../services/api';

interface CategoryFilterProps {
  categories: CategoryInfo[];
  selectedCatId: string | null;
  onCategoryChange: (catId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedCatId,
  onCategoryChange,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  const tabs: TabItem[] = [
    { id: '__all__', label: 'Vše', content: null },
    ...categories.map((cat) => ({
      id: cat.catId,
      label: cat.name,
      content: null,
    })),
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={selectedCatId ?? '__all__'}
      onChange={(id) => onCategoryChange(id === '__all__' ? null : id)}
      variant="pills"
      size="sm"
      style={{ marginBottom: '0.75rem' }}
    />
  );
}
