import styles from './FavoritesToggle.module.css';

interface FavoritesToggleProps {
  active: boolean;
  count: number;
  onToggle: () => void;
}

export function FavoritesToggle({ active, count, onToggle }: FavoritesToggleProps) {
  if (count === 0 && !active) return null;

  return (
    <button
      className={`${styles.toggleBtn} ${active ? styles.active : ''}`}
      onClick={onToggle}
      aria-label={active ? 'Zobrazit všechny' : 'Zobrazit oblíbené'}
      type="button"
    >
      <span className={styles.star}>{'\u2605'}</span>
      <span className={styles.badge}>{count}</span>
    </button>
  );
}
