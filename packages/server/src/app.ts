import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from './db/schema.js';
import { registerEventsRoutes } from './routes/events.js';
import { registerResultsRoutes } from './routes/results.js';
import { registerStartlistRoutes } from './routes/startlist.js';
import { registerIngestRoutes } from './routes/ingest.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerOnCourseRoutes } from './routes/oncourse.js';
import { registerCategoriesRoutes } from './routes/categories.js';
import { AppError } from './utils/errors.js';

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

  // Global error handler following contracts/api.md error format
  app.setErrorHandler(
    (error: FastifyError | AppError | Error, request, reply) => {
      request.log.error(error);

      // Handle custom application errors
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }

      // Handle Fastify validation errors
      if ('validation' in error && error.validation) {
        return reply.code(400).send({
          error: 'Invalid request',
          message: error.message,
        });
      }

      // Handle other Fastify errors with status codes
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        const statusCode = error.statusCode;
        let errorType = 'Internal error';

        if (statusCode === 400) errorType = 'Invalid request';
        else if (statusCode === 401) errorType = 'Unauthorized';
        else if (statusCode === 404) errorType = 'Not found';
        else if (statusCode === 409) errorType = 'Conflict';

        return reply.code(statusCode).send({
          error: errorType,
          message: error.message,
        });
      }

      // Default 500 error
      reply.code(500).send({
        error: 'Internal error',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred',
      });
    }
  );

  return app;
}
