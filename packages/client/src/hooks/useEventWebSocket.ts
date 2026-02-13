/**
 * useEventWebSocket Hook
 *
 * Manages WebSocket connection to event live data endpoint with automatic reconnection.
 * Unidirectional: server → client only.
 *
 * Features:
 * - Automatic connection when eventId provided and event status is 'running' or 'startlist'
 * - Exponential backoff reconnection (1s, 2s, 4s, 8s, 15s cap)
 * - Connection state tracking
 * - Cleanup on unmount
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WsMessage } from '@c123-live-mini/shared';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface UseEventWebSocketReturn {
  connectionState: ConnectionState;
}

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 15000]; // ms
const MAX_BACKOFF_INDEX = BACKOFF_DELAYS.length - 1;

/**
 * Custom hook for managing WebSocket connection to event live data
 *
 * @param eventId - Event ID to connect to (null = no connection)
 * @param onMessage - Callback for incoming WebSocket messages
 * @returns Connection state
 */
export function useEventWebSocket(
  eventId: string | null,
  onMessage: (message: WsMessage) => void
): UseEventWebSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const shouldConnectRef = useRef(false);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref up to date without triggering reconnection
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!eventId) return;

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/events/${eventId}/ws`;

    setConnectionState(retryCountRef.current > 0 ? 'reconnecting' : 'connecting');

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[useEventWebSocket] Connected to event ${eventId}`);
      setConnectionState('connected');
      retryCountRef.current = 0; // Reset retry count on successful connection
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        onMessageRef.current(message);
      } catch (error) {
        console.error('[useEventWebSocket] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[useEventWebSocket] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[useEventWebSocket] Connection closed');
      wsRef.current = null;

      // Only reconnect if we should still be connected
      if (shouldConnectRef.current) {
        const backoffIndex = Math.min(retryCountRef.current, MAX_BACKOFF_INDEX);
        const delay = BACKOFF_DELAYS[backoffIndex];

        console.log(`[useEventWebSocket] Reconnecting in ${delay}ms (attempt ${retryCountRef.current + 1})`);
        setConnectionState('reconnecting');

        reconnectTimeoutRef.current = window.setTimeout(() => {
          retryCountRef.current++;
          connect();
        }, delay);
      } else {
        setConnectionState('disconnected');
      }
    };

    wsRef.current = ws;
  }, [eventId]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket if open
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    retryCountRef.current = 0;
    setConnectionState('disconnected');
  }, []);

  // Connect/disconnect based on eventId
  useEffect(() => {
    if (eventId) {
      shouldConnectRef.current = true;
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [eventId, connect, disconnect]);

  // Handle device sleep/wake reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && eventId && shouldConnectRef.current) {
        // Page became visible again - check if connection is lost and reconnect
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('[useEventWebSocket] Page visible after sleep - reconnecting');
          // Clear any pending reconnect timeout
          if (reconnectTimeoutRef.current !== null) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          // Reset retry count for immediate reconnect
          retryCountRef.current = 0;
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [eventId, connect]);

  return { connectionState };
}
