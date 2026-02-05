import Fastify, { type FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from './db/schema.js';
import { registerEventsRoutes } from './routes/events.js';
import { registerResultsRoutes } from './routes/results.js';
import { registerStartlistRoutes } from './routes/startlist.js';
import { registerIngestRoutes } from './routes/ingest.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerOnCourseRoutes } from './routes/oncourse.js';
import { registerCategoriesRoutes } from './routes/categories.js';

/**
 * App configuration options
 */
export interface AppOptions {
  db: Kysely<Database>;
  logger?: boolean;
}

/**
 * Create and configure Fastify app
 */
export function createApp(options: AppOptions): FastifyInstance {
  const { db, logger = true } = options;

  const app = Fastify({ logger });

  // Health check endpoint
  app.get('/health', async () => ({ status: 'ok' }));

  // Register API routes
  registerEventsRoutes(app, db);
  registerResultsRoutes(app, db);
  registerStartlistRoutes(app, db);
  registerIngestRoutes(app, db);
  registerAdminRoutes(app, db);
  registerOnCourseRoutes(app, db);
  registerCategoriesRoutes(app, db);

  // Global error handler
  app.setErrorHandler((error: Error, request, reply) => {
    request.log.error(error);

    // Send generic error response
    reply.code(500).send({
      error: 'Internal error',
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'An unexpected error occurred',
    });
  });

  return app;
}
