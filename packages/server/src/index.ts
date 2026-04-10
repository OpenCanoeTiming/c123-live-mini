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

    // Admin API safety: in production, MASTER_PASSWORDS is mandatory.
    // Refuse to start with an empty password list to prevent accidentally
    // deploying a public URL with an open admin API.
    if (process.env.NODE_ENV === 'production' && masterPasswords.length === 0) {
      console.error(
        '[FATAL] NODE_ENV=production requires MASTER_PASSWORDS to be set.'
      );
      console.error(
        '[FATAL] Refusing to start with open admin API in production.'
      );
      process.exit(1);
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
