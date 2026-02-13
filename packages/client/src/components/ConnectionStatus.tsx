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

interface ConnectionStatusProps {
  connectionState: ConnectionState;
}

export function ConnectionStatus({ connectionState }: ConnectionStatusProps) {
  if (connectionState === 'connected') {
    return (
      <div className="flex items-center gap-2">
        <LiveIndicator variant="live" color="success" size="sm" />
        <span className="text-sm text-gray-700">Live</span>
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
