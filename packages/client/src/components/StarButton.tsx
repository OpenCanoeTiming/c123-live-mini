import styles from './StarButton.module.css';

interface StarButtonProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function StarButton({ active, onClick }: StarButtonProps) {
  return (
    <button
      className={`${styles.starBtn} ${active ? styles.active : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      aria-label={active ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
      type="button"
    >
      {active ? '\u2605' : '\u2606'}
    </button>
  );
}
