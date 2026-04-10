import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Directory containing this server package root (works from both `src/` and
 * compiled `dist/`, since the package layout is preserved).
 */
const SERVER_PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Default path to the client SPA build, relative to the monorepo layout:
 * `packages/server/` is sibling to `packages/client/`, so the default
 * resolves to `packages/client/dist`.
 */
export function defaultClientDistPath(): string {
  return resolve(SERVER_PACKAGE_ROOT, '../client/dist');
}

/**
 * Resolve the directory that holds the client SPA (index.html + assets).
 * Honors `CLIENT_DIST_PATH` env var for custom deployment layouts, and falls
 * back to the default monorepo path.
 *
 * Returns `null` if the resolved directory does not exist on disk — callers
 * should treat this as "skip SPA static hosting" (e.g. dev mode, or missing
 * build).
 */
export function resolveClientDistDir(): string | null {
  const raw = process.env.CLIENT_DIST_PATH?.trim();
  const dir = raw && raw.length > 0 ? resolve(raw) : defaultClientDistPath();
  return existsSync(dir) ? dir : null;
}
