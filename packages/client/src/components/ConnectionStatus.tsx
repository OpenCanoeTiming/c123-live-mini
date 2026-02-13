/**
 * ConnectionStatus Component
 *
 * Displays WebSocket connection state using rvp-design-system components.
 * Shows live indicator when connected, badge when reconnecting/offline.
 *
 * Visual states:
 * - Connected: Green LiveIndicator with "Live" text
 * - Reconnecting: Yellow Badge "Reconnecting..."
 * - Disconnected: Gray Badge "Offline — polling"
 * - Connecting: Gray Badge "Connecting..."
 */

import { LiveIndicator, Badge } from '@czechcanoe/rvp-design-system';
import type { ConnectionState } from '../hooks/useEventWebSocket';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
}

export function ConnectionStatus({ connectionState }: ConnectionStatusProps) {
  if (connectionState === 'connected') {
    return (
      <div className={styles.liveContainer}>
        <LiveIndicator variant="live" color="success" size="sm" />
        <span className={styles.liveText}>Live</span>
      </div>
    );
  }

  if (connectionState === 'reconnecting') {
    return (
      <Badge variant="warning" size="sm">
        Reconnecting...
      </Badge>
    );
  }

  if (connectionState === 'connecting') {
    return (
      <Badge variant="default" size="sm">
        Connecting...
      </Badge>
    );
  }

  // Disconnected - polling fallback
  return (
    <Badge variant="default" size="sm">
      Offline — polling
    </Badge>
  );
}
