import { basename } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import { resolveClientDistDir } from './clientDistPath.js';

/**
 * Returns the URL path without query string.
 */
function pathnameOnly(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/**
 * Exact-match test for the API mount point. Returns true for `/api` and
 * `/api/*`, but NOT for lookalikes such as `/api.js` — those should fall
 * through to the SPA static handler.
 */
function isApiRequestPath(url: string): boolean {
  const p = pathnameOnly(url);
  return p === '/api' || p.startsWith('/api/');
}

function sendJsonNotFound(reply: FastifyReply): void {
  reply.code(404).send({
    error: 'Not found',
    message: 'Resource not found',
  });
}

/**
 * Register static SPA hosting with a client-side routing fallback.
 *
 * Only activates when `NODE_ENV=production` and the client `dist` directory
 * can be resolved on disk (or `CLIENT_DIST_PATH` is set). In dev mode, the
 * SPA is served by Vite's dev server on a different port, so nothing is
 * registered here.
 *
 * The registration runs in a nested plugin context via `app.register` so
 * that cache headers and the `setNotFoundHandler` are scoped locally and do
 * not leak into the API context. The API and WebSocket routes must be
 * registered on `app` BEFORE calling this function.
 *
 * Key configuration:
 * - `wildcard: false` — disables the default `GET /*` handler that would
 *   otherwise conflict with `/api/*` routes and `@fastify/websocket`'s
 *   upgrade interception.
 * - `index: false` — disables auto-serving of `index.html` on `/`; the
 *   `setNotFoundHandler` takes care of that so the SPA fallback logic is
 *   centralized.
 * - `setNotFoundHandler` — unknown `/api/*` paths return JSON 404 (for
 *   predictable client error handling); other GET/HEAD requests fall back
 *   to `index.html` (SPA client-side routing); other methods return 404
 *   JSON.
 */
export function registerProductionSpa(app: FastifyInstance): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const root = resolveClientDistDir();
  if (!root) {
    app.log.warn(
      'Production mode: client dist directory not found; SPA static hosting disabled. Build the client (`npm run build`) or set CLIENT_DIST_PATH.'
    );
    return;
  }

  app.register(async (instance) => {
    await instance.register(fastifyStatic, {
      root,
      prefix: '/',
      wildcard: false,
      index: false,
      cacheControl: false,
      setHeaders: (res, filePath) => {
        if (basename(filePath) === 'index.html') {
          res.setHeader('Cache-Control', 'no-store, max-age=0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    });

    instance.setNotFoundHandler(
      (request: FastifyRequest, reply: FastifyReply) => {
        if (isApiRequestPath(request.url)) {
          return sendJsonNotFound(reply);
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return sendJsonNotFound(reply);
        }
        return reply.type('text/html').sendFile('index.html');
      }
    );
  });
}
