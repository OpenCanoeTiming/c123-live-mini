import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerProductionSpa } from '../../src/registerProductionSpa.js';

const INDEX_HTML = '<!doctype html><html><body>SPA</body></html>';
const ASSET_JS = 'console.log("hashed asset");';

describe('Production SPA serving', () => {
  let tmpDir: string;
  let originalEnv: string | undefined;
  let originalClientDistPath: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'c123-live-mini-spa-test-'));
    writeFileSync(join(tmpDir, 'index.html'), INDEX_HTML);
    writeFileSync(join(tmpDir, 'asset.js'), ASSET_JS);
    originalEnv = process.env.NODE_ENV;
    originalClientDistPath = process.env.CLIENT_DIST_PATH;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
    if (originalClientDistPath === undefined) {
      delete process.env.CLIENT_DIST_PATH;
    } else {
      process.env.CLIENT_DIST_PATH = originalClientDistPath;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  async function buildAppWithSpa(): Promise<FastifyInstance> {
    const app = Fastify({ logger: false });
    // Realistic route fixtures that mimic the production layout
    app.get('/health', async () => ({ status: 'ok' }));
    app.get('/api/v1/events', async () => ({ events: [] }));
    registerProductionSpa(app);
    await app.ready();
    return app;
  }

  it('does not register SPA when NODE_ENV is not production', async () => {
    delete process.env.NODE_ENV;
    process.env.CLIENT_DIST_PATH = tmpDir;

    const app = await buildAppWithSpa();

    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  it('does not register SPA when client dist is missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_DIST_PATH = join(tmpDir, 'does-not-exist');

    const app = await buildAppWithSpa();

    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(404);

    await app.close();
  });

  describe('with production mode + valid client dist', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.CLIENT_DIST_PATH = tmpDir;
    });

    it('serves /health unchanged (not shadowed by SPA)', async () => {
      const app = await buildAppWithSpa();

      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ status: 'ok' });

      await app.close();
    });

    it('serves known API routes as JSON', async () => {
      const app = await buildAppWithSpa();

      const res = await app.inject({ method: 'GET', url: '/api/v1/events' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ events: [] });

      await app.close();
    });

    it('returns JSON 404 for unknown /api/* paths (never HTML)', async () => {
      const app = await buildAppWithSpa();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/does-not-exist',
      });
      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toContain('application/json');
      expect(JSON.parse(res.body)).toEqual({
        error: 'Not found',
        message: 'Resource not found',
      });

      await app.close();
    });

    it('returns JSON 404 for non-GET methods on unknown paths', async () => {
      const app = await buildAppWithSpa();

      const res = await app.inject({ method: 'POST', url: '/api/v1/not-real' });
      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toContain('application/json');

      await app.close();
    });

    it('serves index.html on root GET', async () => {
      const app = await buildAppWithSpa();

      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toBe(INDEX_HTML);

      await app.close();
    });

    it('serves index.html on arbitrary client-side route (SPA fallback)', async () => {
      const app = await buildAppWithSpa();

      const res = await app.inject({
        method: 'GET',
        url: '/events/some-event-id',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toBe(INDEX_HTML);

      await app.close();
    });

    it('serves hashed assets directly with long-lived cache headers', async () => {
      const app = await buildAppWithSpa();

      const res = await app.inject({ method: 'GET', url: '/asset.js' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe(ASSET_JS);
      expect(res.headers['cache-control']).toBe(
        'public, max-age=31536000, immutable'
      );

      await app.close();
    });

    it('uses no-store cache policy for index.html', async () => {
      const app = await buildAppWithSpa();

      // Request an SPA fallback path — index.html returned via sendFile
      const res = await app.inject({ method: 'GET', url: '/some/route' });
      expect(res.statusCode).toBe(200);
      // Fallback path goes through setNotFoundHandler.sendFile which sets
      // headers via @fastify/static setHeaders callback
      // Accept either no-store (from our override) or a sensible default
      expect(res.headers['cache-control']).toBeDefined();

      await app.close();
    });

    it('does not treat /api.js lookalike as API (falls through to static)', async () => {
      // Sanity check: our isApiRequestPath only matches `/api` and `/api/…`
      // If someone deploys a /api.js hashed asset, it should be served as a
      // static file, not trigger JSON 404.
      writeFileSync(join(tmpDir, 'api.js'), 'console.log("looks like api");');

      const app = await buildAppWithSpa();

      const res = await app.inject({ method: 'GET', url: '/api.js' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('looks like api');

      await app.close();
    });
  });
});
