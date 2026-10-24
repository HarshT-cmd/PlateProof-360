import { Router, Request, Response, NextFunction } from 'express';
import { dataStore } from '../db/store';
import { sanitizeForRole } from '../middleware/auth';

const router = Router();

// GET /api/orders - list all orders
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await dataStore.getOrders();
    res.json(sanitizeForRole(orders, req.user?.role));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:tokenOrId - fetch order-specific safety information
router.get('/:tokenOrId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenOrId = String(req.params.tokenOrId);
    const order = await dataStore.getOrder(tokenOrId);
    if (!order) {
      res.status(404).json({
        error: 'OrderNotFound',
        message: `No order found matching token or ID "${tokenOrId}".`,
      });
      return;
    }

    // Never expose private staff notes through customer endpoints
    res.json(sanitizeForRole(order, req.user?.role));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('revoked') || msg.includes('expired')) {
      res.status(403).json({
        error: 'TokenInvalid',
        message: msg,
      });
      return;
    }
    next(err);
  }
});

export default router;
