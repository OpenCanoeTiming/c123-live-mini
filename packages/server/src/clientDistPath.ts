import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Directory containing this server's `package.json` (works from `src/` or compiled `dist/`). */
const SERVER_PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Default Vite output directory relative to the monorepo layout (`packages/client/dist`).
 */
export function defaultClientDistPath(): string {
  return resolve(SERVER_PACKAGE_ROOT, '../client/dist');
}

/**
 * Resolved absolute path to the client SPA assets, or `null` if missing.
 * Override with `CLIENT_DIST_PATH` for container or custom layouts.
 */
export function resolveClientDistDir(): string | null {
  const raw = process.env.CLIENT_DIST_PATH?.trim();
  const dir = raw && raw.length > 0 ? resolve(raw) : defaultClientDistPath();
  return existsSync(dir) ? dir : null;
}
