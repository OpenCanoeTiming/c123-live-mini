import { useState, useCallback } from 'react';
import styles from './NotificationPrompt.module.css';

interface NotificationPromptProps {
  favoritesCount: number;
  notificationsEnabled: boolean;
  onEnable: () => void;
}

export function NotificationPrompt({
  favoritesCount,
  notificationsEnabled,
  onEnable,
}: NotificationPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleAllow = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      onEnable();
    }
    setDismissed(true);
  }, [onEnable]);

  if (favoritesCount === 0) return null;
  if (notificationsEnabled) return null;
  if (dismissed) return null;
  if (typeof Notification === 'undefined') return null;
  if (Notification.permission === 'denied') return null;

  return (
    <div className={styles.prompt}>
      <span className={styles.icon}>{'\uD83D\uDD14'}</span>
      <span className={styles.text}>
        Chcete dostávat notifikace o startu a dojetí oblíbených?
      </span>
      <div className={styles.actions}>
        <button className={styles.btnAllow} onClick={handleAllow} type="button">
          Povolit
        </button>
        <button className={styles.btnDismiss} onClick={() => setDismissed(true)} type="button">
          Ne
        </button>
      </div>
    </div>
  );
}
