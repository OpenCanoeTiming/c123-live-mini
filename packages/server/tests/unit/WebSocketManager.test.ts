import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { WebSocketManager, type ExtWebSocket } from '../../src/services/WebSocketManager.js';
import type { WsFullPayload, WsDiffPayload } from '@c123-live-mini/shared';

/**
 * Mock WebSocket implementation for testing
 */
class MockWebSocket extends EventEmitter {
  public readonly OPEN = 1;
  public readonly CLOSED = 3;
  public readyState: number = 1; // OPEN
  public isAlive: boolean = true;
  public eventId: string = '';
  public sentMessages: string[] = [];
  public closeCode: number | null = null;
  public closeReason: string | null = null;
  public terminated: boolean = false;

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code: number, reason: string): void {
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = 3; // CLOSED
  }

  ping(): void {
    // Mock ping - in real ws, this triggers a pong event
  }

  terminate(): void {
    this.terminated = true;
    this.readyState = 3; // CLOSED
  }
}

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    // Setup fake timers BEFORE creating WebSocketManager
    // This ensures the heartbeat interval is tracked by fake timers
    vi.useFakeTimers();
    wsManager = new WebSocketManager();
  });

  afterEach(() => {
    wsManager.shutdown();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Room management', () => {
    it('should add socket to room on join', () => {
      const socket = new MockWebSocket() as unknown as ExtWebSocket;
      const eventId = 'TEST.001';

      wsManager.join(eventId, socket);

      expect(socket.eventId).toBe(eventId);
      expect(socket.isAlive).toBe(true);
      expect(wsManager.getConnectionCount(eventId)).toBe(1);
    });

    it('should remove socket from room on leave', () => {
      const socket = new MockWebSocket() as unknown as ExtWebSocket;
      const eventId = 'TEST.001';

      wsManager.join(eventId, socket);
      expect(wsManager.getConnectionCount(eventId)).toBe(1);

      wsManager.leave(socket);
      expect(wsManager.getConnectionCount(eventId)).toBe(0);
    });

    it('should track multiple connections per event', () => {
      const eventId = 'TEST.001';
      const socket1 = new MockWebSocket() as unknown as ExtWebSocket;
      const socket2 = new MockWebSocket() as unknown as ExtWebSocket;
      const socket3 = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(eventId, socket1);
      wsManager.join(eventId, socket2);
      wsManager.join(eventId, socket3);

      expect(wsManager.getConnectionCount(eventId)).toBe(3);
    });

    it('should track connections across multiple events', () => {
      const event1 = 'TEST.001';
      const event2 = 'TEST.002';
      const socket1 = new MockWebSocket() as unknown as ExtWebSocket;
      const socket2 = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(event1, socket1);
      wsManager.join(event2, socket2);

      expect(wsManager.getConnectionCount(event1)).toBe(1);
      expect(wsManager.getConnectionCount(event2)).toBe(1);
    });
  });

  describe('Connection limit enforcement', () => {
    it('should accept connection when under limit (200)', () => {
      const eventId = 'TEST.001';

      // Add 199 connections
      for (let i = 0; i < 199; i++) {
        const socket = new MockWebSocket() as unknown as ExtWebSocket;
        wsManager.join(eventId, socket);
      }

      expect(wsManager.canAcceptConnection(eventId)).toBe(true);
      expect(wsManager.getConnectionCount(eventId)).toBe(199);
    });

    it('should reject connection at limit (200)', () => {
      const eventId = 'TEST.001';

      // Add 200 connections (the limit)
      for (let i = 0; i < 200; i++) {
        const socket = new MockWebSocket() as unknown as ExtWebSocket;
        wsManager.join(eventId, socket);
      }

      expect(wsManager.canAcceptConnection(eventId)).toBe(false);
      expect(wsManager.getConnectionCount(eventId)).toBe(200);
    });

    it('should reject connection when over limit', () => {
      const eventId = 'TEST.001';

      // Add 201 connections (over the limit)
      for (let i = 0; i < 201; i++) {
        const socket = new MockWebSocket() as unknown as ExtWebSocket;
        wsManager.join(eventId, socket);
      }

      expect(wsManager.canAcceptConnection(eventId)).toBe(false);
      expect(wsManager.getConnectionCount(eventId)).toBe(201);
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast full state to all connections in room', () => {
      const eventId = 'TEST.001';
      const socket1 = new MockWebSocket() as unknown as ExtWebSocket;
      const socket2 = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(eventId, socket1);
      wsManager.join(eventId, socket2);

      const payload: WsFullPayload = {
        event: {
          eventId: 'TEST.001',
          mainTitle: 'Test Event',
          subTitle: null,
          location: null,
          startDate: null,
          endDate: null,
          discipline: null,
          status: 'running',
          facility: null,
        },
        classes: [],
        races: [],
        categories: [],
      };

      wsManager.broadcastFull(eventId, payload);

      expect(socket1.sentMessages).toHaveLength(1);
      expect(socket2.sentMessages).toHaveLength(1);

      const msg1 = JSON.parse(socket1.sentMessages[0]);
      expect(msg1.type).toBe('full');
      expect(msg1.data.event.eventId).toBe('TEST.001');
    });

    it('should broadcast diff to correct room only', () => {
      const event1 = 'TEST.001';
      const event2 = 'TEST.002';
      const socket1 = new MockWebSocket() as unknown as ExtWebSocket;
      const socket2 = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(event1, socket1);
      wsManager.join(event2, socket2);

      const payload: WsDiffPayload = { status: 'finished' };
      wsManager.broadcastDiff(event1, payload);

      expect(socket1.sentMessages).toHaveLength(1);
      expect(socket2.sentMessages).toHaveLength(0);

      const msg = JSON.parse(socket1.sentMessages[0]);
      expect(msg.type).toBe('diff');
      expect(msg.data.status).toBe('finished');
    });

    it('should broadcast refresh signal', () => {
      const eventId = 'TEST.001';
      const socket = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(eventId, socket);
      wsManager.broadcastRefresh(eventId);

      expect(socket.sentMessages).toHaveLength(1);
      const msg = JSON.parse(socket.sentMessages[0]);
      expect(msg.type).toBe('refresh');
      expect(msg.data).toBeUndefined();
    });

    it('should handle broadcast when no clients connected (no-op)', () => {
      const eventId = 'TEST.999';
      const payload: WsDiffPayload = { status: 'running' };

      // Should not throw
      expect(() => wsManager.broadcastDiff(eventId, payload)).not.toThrow();
    });
  });

  describe('Heartbeat and stale connection cleanup', () => {
    it('should send ping to all connections on heartbeat interval', () => {
      const eventId = 'TEST.001';
      const socket = new MockWebSocket() as unknown as ExtWebSocket;
      const pingSpy = vi.spyOn(socket, 'ping');

      wsManager.join(eventId, socket);

      // Advance time by heartbeat interval (30s)
      vi.advanceTimersByTime(30_000);

      expect(pingSpy).toHaveBeenCalled();
      expect(socket.isAlive).toBe(false); // Set to false after ping
    });

    it('should terminate connection if no pong received', () => {
      const eventId = 'TEST.001';
      const socket = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(eventId, socket);

      // First heartbeat - mark as not alive
      vi.advanceTimersByTime(30_000);
      expect(socket.isAlive).toBe(false);

      // Second heartbeat - should terminate since no pong
      vi.advanceTimersByTime(30_000);
      expect(socket.terminated).toBe(true);
      expect(wsManager.getConnectionCount(eventId)).toBe(0);
    });

    it('should keep connection alive if pong received', () => {
      const eventId = 'TEST.001';
      const socket = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(eventId, socket);

      // First heartbeat
      vi.advanceTimersByTime(30_000);
      expect(socket.isAlive).toBe(false);

      // Simulate pong response
      socket.emit('pong');
      expect(socket.isAlive).toBe(true);

      // Second heartbeat - should NOT terminate
      vi.advanceTimersByTime(30_000);
      expect(socket.terminated).toBe(false);
      expect(wsManager.getConnectionCount(eventId)).toBe(1);
    });
  });

  describe('Room closure (official state)', () => {
    it('should close all connections in room after grace period', () => {
      const eventId = 'TEST.001';
      const socket1 = new MockWebSocket() as unknown as ExtWebSocket;
      const socket2 = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(eventId, socket1);
      wsManager.join(eventId, socket2);

      wsManager.closeRoom(eventId, 1000, 'Event results are official');

      // Connections should still be open (grace period)
      expect(socket1.closeCode).toBeNull();
      expect(socket2.closeCode).toBeNull();

      // Advance time by grace period (5s)
      vi.advanceTimersByTime(5_000);

      // Now connections should be closed
      expect(socket1.closeCode).toBe(1000);
      expect(socket1.closeReason).toBe('Event results are official');
      expect(socket2.closeCode).toBe(1000);
      expect(socket2.closeReason).toBe('Event results are official');
    });
  });

  describe('Shutdown', () => {
    it('should close all connections and clear rooms', () => {
      const event1 = 'TEST.001';
      const event2 = 'TEST.002';
      const socket1 = new MockWebSocket() as unknown as ExtWebSocket;
      const socket2 = new MockWebSocket() as unknown as ExtWebSocket;

      wsManager.join(event1, socket1);
      wsManager.join(event2, socket2);

      wsManager.shutdown();

      expect(socket1.closeCode).toBe(1001);
      expect(socket1.closeReason).toBe('Server shutting down');
      expect(socket2.closeCode).toBe(1001);
      expect(socket2.closeReason).toBe('Server shutting down');
      expect(wsManager.getConnectionCount(event1)).toBe(0);
      expect(wsManager.getConnectionCount(event2)).toBe(0);
    });
  });
});
