import { Dropdown, DropdownButton, type DropdownItem } from '@czechcanoe/rvp-design-system';
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

  const selectedLabel = selectedCatId
    ? categories.find((c) => c.catId === selectedCatId)?.name ?? 'Kategorie'
    : 'Kategorie';

  const items: DropdownItem[] = [
    {
      id: '__all__',
      label: 'Vše',
      onClick: () => onCategoryChange(null),
    },
    ...categories.map((cat) => ({
      id: cat.catId,
      label: cat.name,
      onClick: () => onCategoryChange(cat.catId),
    })),
  ];

  return (
    <Dropdown
      trigger={
        <DropdownButton size="sm" variant="ghost">
          {selectedLabel}
        </DropdownButton>
      }
      items={items}
      size="sm"
      position="bottom-end"
      aria-label="Filtr kategorie"
    />
  );
}
