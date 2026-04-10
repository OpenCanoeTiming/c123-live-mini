import { SHARED_VERSION } from '@c123-live-mini/shared';
import { createDatabase, runMigrations } from './db/database.js';
import { createApp } from './app.js';

const start = async () => {
  try {
    // Initialize database
    const dbPath = process.env.DATABASE_PATH ?? './data/live-mini.db';
    const db = createDatabase(dbPath);

    // Run migrations on startup (FR-007)
    await runMigrations(db);

    // Parse master passwords from environment
    const masterPasswords = (process.env.MASTER_PASSWORDS ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    // Admin API safety: refuse to start in production with open admin
    // unless ADMIN_OPEN=1 is explicitly set. This prevents accidental
    // deployment of a public URL with open master-key endpoints.
    const isProd = process.env.NODE_ENV === 'production';
    const adminOpen = process.env.ADMIN_OPEN === '1';
    if (isProd && masterPasswords.length === 0 && !adminOpen) {
      console.error(
        '[FATAL] NODE_ENV=production with no MASTER_PASSWORDS and no ADMIN_OPEN=1'
      );
      console.error(
        '[FATAL] Refusing to start with open admin API in production.'
      );
      console.error(
        '[FATAL] Either set MASTER_PASSWORDS=<comma-separated> to secure admin,'
      );
      console.error(
        '[FATAL] or set ADMIN_OPEN=1 to explicitly allow open admin (bootstrap only).'
      );
      process.exit(1);
    }
    if (isProd && masterPasswords.length === 0 && adminOpen) {
      console.warn(
        '[WARNING] Running in production with open admin API (ADMIN_OPEN=1).'
      );
      console.warn(
        '[WARNING] This is a security risk — intended only for bootstrap.'
      );
      console.warn(
        '[WARNING] Set MASTER_PASSWORDS and unset ADMIN_OPEN as soon as possible.'
      );
    }

    // Create and configure app
    const app = createApp({ db, logger: true, masterPasswords });

    // Start server
    const port = parseInt(process.env.PORT ?? '3000', 10);
    await app.listen({ port, host: '0.0.0.0' });

    console.log(`Server running on http://localhost:${port}`);
    console.log(`Using shared package version: ${SHARED_VERSION}`);
    console.log(`Database path: ${dbPath}`);
    console.log(`Master passwords configured: ${masterPasswords.length > 0 ? masterPasswords.length : 'none (open admin)'}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
