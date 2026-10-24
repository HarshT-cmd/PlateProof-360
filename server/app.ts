import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { authenticateUser } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import ordersRouter from './routes/orders';
import complaintsRouter, { getOrderComplaintsHandler } from './routes/complaints';
import incidentsRouter from './routes/incidents';
import evidenceRouter from './routes/evidence';
import telemetryRouter, { inspectionHandler } from './routes/telemetry';
import inventoryRouter from './routes/inventory';
import demoRouter from './routes/demo';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman, vitest)
        if (!origin) return callback(null, true);
        if (
          config.corsOrigins.includes(origin) ||
          config.corsOrigins.includes('*') ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy does not allow access from ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Role', 'X-User-Name', 'X-User-Id'],
    })
  );

  // Body parser
  app.use(express.json());

  // Identity and role context
  app.use(authenticateUser);

  // Root health & API directory route
  app.get('/', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PlateProof 360 — Backend API Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f1c15; color: #f5f1e8; margin: 0; padding: 40px; }
    .card { max-width: 780px; margin: 0 auto; background: #183c2b; border: 1px solid rgba(185,154,96,0.3); border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #f5f1e8; font-size: 26px; margin-top: 0; display: flex; align-items: center; gap: 10px; }
    .badge { background: #22c55e; color: #052e16; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
    .gold { color: #b99a60; font-style: italic; }
    p { color: #d4cfc4; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 24px; }
    .item { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 8px; }
    .item strong { color: #b99a60; display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    a { color: #6ee7b7; text-decoration: none; font-weight: 500; font-size: 14px; word-break: break-all; }
    a:hover { text-decoration: underline; }
    .btn { display: inline-block; background: #b99a60; color: #183c2b; font-weight: 700; padding: 10px 20px; border-radius: 6px; margin-top: 24px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
    .btn:hover { background: #d4b882; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>PlateProof<span class="gold">360</span> <span class="badge">Online</span></h1>
    <p>Enterprise Culinary Safety & HACCP REST API Server running on <strong>Port 3001</strong>.</p>

    <div class="grid">
      <div class="item">
        <strong>Health & Status</strong>
        <a href="/api/health">/api/health</a>
      </div>
      <div class="item">
        <strong>Order Safety Proof #1042</strong>
        <a href="/api/orders/order-1042">/api/orders/order-1042</a>
      </div>
      <div class="item">
        <strong>Incidents API</strong>
        <a href="/api/incidents">/api/incidents</a>
      </div>
      <div class="item">
        <strong>Complaints API</strong>
        <a href="/api/complaints">/api/complaints</a>
      </div>
      <div class="item">
        <strong>Inventory Batches</strong>
        <a href="/api/inventory">/api/inventory</a>
      </div>
      <div class="item">
        <strong>Frontend Web App</strong>
        <a href="http://localhost:5174/" target="_blank">http://localhost:5174/</a>
      </div>
    </div>

    <p style="margin-top: 24px; font-size: 13px; color: #a39e93;">
      PostgreSQL connection pooling, Zod validation, role authorization & audit trails are active.
    </p>
  </div>
</body>
</html>`);
  });

  // Route registration
  app.use('/api/orders', ordersRouter);
  app.get('/api/orders/:orderId/complaints', getOrderComplaintsHandler);
  app.use('/api/complaints', complaintsRouter);
  app.use('/api/incidents', incidentsRouter);
  app.use('/api/evidence', evidenceRouter);
  app.use('/api/telemetry', telemetryRouter);
  app.post('/api/inspections', inspectionHandler);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/demo', demoRouter);
  app.use('/api', demoRouter);

  // Global error handler
  app.use(errorHandler);

  return app;
}
