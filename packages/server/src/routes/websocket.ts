import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import type { WebSocketManager } from '../services/WebSocketManager.js';
import { EventRepository } from '../db/repositories/EventRepository.js';
import { ClassRepository } from '../db/repositories/ClassRepository.js';
import { RaceRepository } from '../db/repositories/RaceRepository.js';
import { composeFullStatePayload } from '../utils/composeFullStatePayload.js';
import type { WsFullPayload } from '@c123-live-mini/shared';

/**
 * Route params
 */
interface WebSocketParams {
  eventId: string;
}

/**
 * Register WebSocket routes
 *
 * Provides real-time event updates via WebSocket.
 * Connection flow:
 * 1. Pre-upgrade validation (event exists, not draft/official, under connection limit)
 * 2. WebSocket upgrade
 * 3. Join event room
 * 4. Send initial full state
 * 5. Push diffs as data changes (via broadcast triggers in ingest/admin routes)
 * 6. Clean up on disconnect
 */
export function registerWebSocketRoutes(
  app: FastifyInstance,
  db: Kysely<Database>,
  wsManager: WebSocketManager
): void {
  const eventRepo = new EventRepository(db);
  const classRepo = new ClassRepository(db);
  const raceRepo = new RaceRepository(db);

  /**
   * GET /api/v1/events/:eventId/ws
   * WebSocket endpoint for live event updates
   */
  app.get<{ Params: WebSocketParams }>(
    '/api/v1/events/:eventId/ws',
    {
      websocket: true,
      // Pre-upgrade validation hook
      async preValidation(request, reply) {
        const { eventId } = request.params;

        // Event must exist and not be draft
        const event = await eventRepo.findByEventId(eventId);
        if (!event || event.status === 'draft') {
          reply.code(404).send({
            error: 'EventNotFound',
            message: 'Event not found or not publicly available',
          });
          return;
        }

        // Event must not be official (no more updates)
        if (event.status === 'official') {
          reply.code(410).send({
            error: 'EventOfficial',
            message: 'Event results are official. No live updates available.',
          });
          return;
        }

        // Check connection limit
        if (!wsManager.canAcceptConnection(eventId)) {
          reply.code(503).send({
            error: 'ConnectionLimitReached',
            message: 'Maximum number of concurrent connections reached for this event',
            maxConnections: 200,
          });
          return;
        }
      },
    },
    async (connection, request) => {
      // In @fastify/websocket, connection IS the socket
      const socket = connection;
      const { eventId } = request.params;

      try {
        request.log.info(`WebSocket connection for event: ${eventId}`);

        // Join the event room
        wsManager.join(eventId, socket);

        // Compose full state payload
        const fullPayload = await composeFullStatePayload(
          eventId,
          eventRepo,
          classRepo,
          raceRepo
        );

        if (!fullPayload) {
          // Should not happen due to preValidation, but handle defensively
          request.log.error(`Event not found after validation: ${eventId}`);
          socket.close(1002, 'Event not found');
          return;
        }

        request.log.info(
          `Fetched event data: classes=${fullPayload.classes.length}, races=${fullPayload.races.length}, categories=${fullPayload.categories.length}`
        );

        // Send initial full state
        const message = JSON.stringify({ type: 'full', data: fullPayload });
        request.log.info(`Sending full state message: ${message.length} bytes`);
        socket.send(message);

        // Handle WebSocket errors
        socket.on('error', (err) => {
          request.log.error(err, 'WebSocket error');
        });

        // Handle client disconnect
        socket.on('close', () => {
          request.log.info(`WebSocket closed for event: ${eventId}`);
          wsManager.leave(socket);
        });

        // Ignore any client-sent messages (unidirectional server → client)
        socket.on('message', () => {
          // No-op - WebSocket is read-only from client perspective
        });
      } catch (error) {
        request.log.error(error, 'WebSocket handler error');
        socket.close(1011, 'Internal server error');
      }
    }
  );
}
