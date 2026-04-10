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
 * The `@fastify/static` plugin is registered inside a nested
 * `app.register(async ...)` scope so the reply decorators (`sendFile`) and
 * the `setHeaders` callback live in an encapsulated plugin context. Note
 * that `instance.setNotFoundHandler` called from a plugin whose effective
 * prefix is `/` does **not** create a scoped handler — Fastify replaces the
 * app-wide 404 handler in place (see `fastify/lib/four-oh-four.js`). This
 * is acceptable because the handler explicitly forwards `/api/*` paths to
 * JSON 404, but it means no other code may call `setNotFoundHandler` after
 * this runs. The API and WebSocket routes must be registered on `app`
 * BEFORE calling this function.
 *
 * Key configuration:
 * - `wildcard: false` — disables the default `GET /*` handler that would
 *   otherwise conflict with `/api/*` routes and `@fastify/websocket`'s
 *   upgrade interception. With `wildcard: false` the plugin globs `dist`
 *   at registration time and registers one explicit HEAD+GET route per
 *   file. Consequence: if a file in `dist` ever collides with an API
 *   route name (e.g. `dist/health`), Fastify throws at `ready()` time.
 * - `index: false` — disables auto-serving of `index.html` on `/`; the
 *   `setNotFoundHandler` takes care of that so the SPA fallback logic is
 *   centralized.
 * - `setNotFoundHandler` — returns JSON 404 for:
 *     • unknown `/api/*` paths (predictable client error handling)
 *     • non-GET/HEAD methods
 *     • requests without `Accept: text/html` (e.g. stale hashed asset
 *       fetches from the browser — these must not receive `index.html`
 *       as HTML because the SPA would silently fail to boot with
 *       "Unexpected token '<'")
 *   Otherwise serves `index.html` for SPA client-side routing.
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
        // Only serve the SPA shell to browser navigations. A stale or
        // missing hashed asset (e.g. `/assets/index-abc123.js` after a
        // redeploy) must not be answered with `index.html` as HTML — that
        // would break the SPA boot and potentially get cached by the
        // browser/CDN against the asset URL.
        const accept = String(request.headers.accept ?? '');
        if (!accept.includes('text/html')) {
          return sendJsonNotFound(reply);
        }
        return reply.type('text/html').sendFile('index.html');
      }
    );
  });
}
