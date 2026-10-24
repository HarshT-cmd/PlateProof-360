import { createApp } from './app';
import { config } from './config/env';
import { testConnection } from './db/pool';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';

const app = createApp();

async function startServer() {
  console.log(`[PlateProof 360] Initializing Enterprise Backend...`);

  const dbStatus = await testConnection();
  if (dbStatus.connected) {
    console.log(
      `[PostgreSQL] Connected to database "${dbStatus.database}" on ${dbStatus.host}:${dbStatus.port}.`
    );
    try {
      const migResult = await runMigrations();
      console.log(`[PostgreSQL Migrations] ${migResult.message}`);
      const seedResult = await seedDatabase();
      console.log(`[PostgreSQL Seed] ${seedResult.message}`);
    } catch (err) {
      console.warn('[PostgreSQL Initialization Warning]:', err);
    }
  } else {
    console.warn(
      `[PostgreSQL] Not connected: ${dbStatus.error || 'Check .env credentials'}.`
    );
    console.log(
      `[PlateProof 360] Operating with in-memory resilient fallback store. Ready for instant DB sync once configured.`
    );
  }

  const server = app.listen(config.port, () => {
    console.log(
      `[PlateProof 360 API] Listening on port ${config.port} (CORS: ${config.corsOrigins.join(', ')})`
    );
  });

  return server;
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}

export { startServer };
