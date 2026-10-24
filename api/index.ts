import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server/app';

const app = createApp();

export default function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  // Normalize URL: Ensure Express route matches whether Vercel passes /api/orders or /orders
  if (req.url) {
    if (!req.url.startsWith('/api') && req.url !== '/') {
      req.url = '/api' + req.url;
    }
  }
  return app(req, res);
}
