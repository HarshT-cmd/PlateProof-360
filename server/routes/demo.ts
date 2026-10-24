import { Router, Request, Response, NextFunction } from 'express';
import { dataStore } from '../db/store';
import { isDbConnected, getLastError, testConnection } from '../db/pool';
import { seedDatabase } from '../db/seed';

const router = Router();

// POST /api/demo/reset - reset demo state
router.post('/reset', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await dataStore.resetDemoData();
    if (isDbConnected()) {
      await seedDatabase();
    }
    res.json({
      success: true,
      message: 'Demo state and database reset to baseline seed data successfully.',
      databaseConnected: isDbConnected(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/health - server & database health check
router.get('/health', async (_req: Request, res: Response) => {
  const conn = await testConnection();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    postgres: {
      connected: conn.connected,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      error: conn.error || getLastError(),
    },
  });
});

export default router;
