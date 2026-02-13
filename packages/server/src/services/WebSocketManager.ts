import type { WebSocket } from '@fastify/websocket';
import type {
  WsFullPayload,
  WsDiffPayload,
  WsMessage,
} from '@c123-live-mini/shared';

/**
 * Extended WebSocket with connection tracking metadata
 */
export interface ExtWebSocket extends WebSocket {
  /** Heartbeat tracking flag - set to false on ping, reset to true on pong */
  isAlive: boolean;
  /** Event ID this connection is watching */
  eventId: string;
}

/**
 * WebSocket connection manager for per-event rooms and broadcasting
 *
 * Handles:
 * - Room-based connection tracking (Map<eventId, Set<WebSocket>>)
 * - Connection limit enforcement (max 200 per event)
 * - Heartbeat ping/pong with stale connection cleanup
 * - Broadcasting (full state, diffs, refresh signals)
 * - Graceful room closure for official events
 *
 * Reference: specs/009-live-data-pipeline/plan.md
 */
export class WebSocketManager {
  /** Room tracking: eventId → Set of connected sockets */
  private rooms: Map<string, Set<ExtWebSocket>> = new Map();

  /** Configuration */
  private readonly maxConnectionsPerEvent: number = 200; // FR-012
  private readonly heartbeatInterval: number = 30_000; // FR-017: 30 seconds
  private readonly heartbeatTimeout: number = 10_000; // FR-017: 10 seconds
  private readonly officialGracePeriod: number = 5_000; // FR-018: 5 seconds

  /** Heartbeat interval timer */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Start the heartbeat ping/pong cycle
   *
   * Sends ping frames to all connections every 30s.
   * Connections that don't respond with pong within 10s are terminated.
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.rooms.forEach((sockets) => {
        sockets.forEach((socket) => {
          if (!socket.isAlive) {
            // No pong received since last ping - terminate connection
            socket.terminate();
            this.leave(socket);
            return;
          }

          // Mark as pending pong response
          socket.isAlive = false;
          socket.ping();
        });
      });
    }, this.heartbeatInterval);
  }

  /**
   * Join a WebSocket connection to an event room
   *
   * @param eventId - Event identifier
   * @param socket - WebSocket connection to add
   */
  join(eventId: string, socket: WebSocket): void {
    const extSocket = socket as ExtWebSocket;
    extSocket.isAlive = true;
    extSocket.eventId = eventId;

    // Setup pong handler to mark connection as alive
    extSocket.on('pong', () => {
      extSocket.isAlive = true;
    });

    // Get or create room
    if (!this.rooms.has(eventId)) {
      this.rooms.set(eventId, new Set());
    }

    const room = this.rooms.get(eventId)!;
    room.add(extSocket);
  }

  /**
   * Remove a WebSocket connection from its event room
   *
   * @param socket - WebSocket connection to remove
   */
  leave(socket: WebSocket): void {
    const extSocket = socket as ExtWebSocket;
    const eventId = extSocket.eventId;

    if (!eventId) return;

    const room = this.rooms.get(eventId);
    if (!room) return;

    room.delete(extSocket);

    // Clean up empty room
    if (room.size === 0) {
      this.rooms.delete(eventId);
    }
  }

  /**
   * Broadcast full state message to all connections in an event room
   *
   * @param eventId - Event identifier
   * @param payload - Full state payload
   */
  broadcastFull(eventId: string, payload: WsFullPayload): void {
    const message: WsMessage = { type: 'full', data: payload };
    this.broadcast(eventId, message);
  }

  /**
   * Broadcast diff message to all connections in an event room
   *
   * @param eventId - Event identifier
   * @param payload - Diff payload (changed entities only)
   */
  broadcastDiff(eventId: string, payload: WsDiffPayload): void {
    const message: WsMessage = { type: 'diff', data: payload };
    this.broadcast(eventId, message);
  }

  /**
   * Broadcast refresh signal to all connections in an event room
   *
   * @param eventId - Event identifier
   */
  broadcastRefresh(eventId: string): void {
    const message: WsMessage = { type: 'refresh' };
    this.broadcast(eventId, message);
  }

  /**
   * Internal broadcast method - sends message to all connections in a room
   *
   * @param eventId - Event identifier
   * @param message - Message to send
   */
  private broadcast(eventId: string, message: WsMessage): void {
    const room = this.rooms.get(eventId);
    if (!room || room.size === 0) return;

    const payload = JSON.stringify(message);

    room.forEach((socket) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    });
  }

  /**
   * Get current connection count for an event
   *
   * @param eventId - Event identifier
   * @returns Number of active connections
   */
  getConnectionCount(eventId: string): number {
    const room = this.rooms.get(eventId);
    return room ? room.size : 0;
  }

  /**
   * Check if a new connection can be accepted for an event
   *
   * @param eventId - Event identifier
   * @returns True if under connection limit, false otherwise
   */
  canAcceptConnection(eventId: string): boolean {
    return this.getConnectionCount(eventId) < this.maxConnectionsPerEvent;
  }

  /**
   * Close all connections for an event room with grace period
   *
   * Used when event transitions to official state.
   * Waits 5 seconds to ensure clients receive final state update before disconnecting.
   *
   * @param eventId - Event identifier
   * @param code - WebSocket close code (1000 = Normal Closure)
   * @param reason - Close reason message
   */
  closeRoom(eventId: string, code: number, reason: string): void {
    setTimeout(() => {
      const room = this.rooms.get(eventId);
      if (!room) return;

      room.forEach((socket) => {
        if (socket.readyState === socket.OPEN) {
          socket.close(code, reason);
        }
      });

      this.rooms.delete(eventId);
    }, this.officialGracePeriod);
  }

  /**
   * Shutdown the WebSocket manager
   *
   * Clears heartbeat timer and closes all connections.
   */
  shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.rooms.forEach((room, eventId) => {
      room.forEach((socket) => {
        socket.close(1001, 'Server shutting down');
      });
    });

    this.rooms.clear();
  }
}
