import { basename } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import { resolveClientDistDir } from './clientDistPath.js';

function pathnameOnly(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/** True for real API URLs — avoids treating `/api.js` etc. as API (broken `startsWith('/api')`). */
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
 * In production, serve the Vite client build from disk and fall back to `index.html`
 * for client-side routes. API and WebSocket paths stay on Fastify handlers registered earlier.
 */
export async function registerProductionSpa(app: FastifyInstance): Promise<void> {
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

  await app.register(fastifyStatic, {
    root,
    prefix: '/',
    wildcard: false,
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
      }
    },
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    if (isApiRequestPath(request.url)) {
      return sendJsonNotFound(reply);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return sendJsonNotFound(reply);
    }
    return reply
      .type('text/html')
      .sendFile('index.html', { maxAge: 0, immutable: false });
  });
}
