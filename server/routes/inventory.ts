import { Router, Request, Response, NextFunction } from 'express';
import { dataStore } from '../db/store';
import {
  resolveInventoryRiskSchema,
  expireInventoryBatchSchema,
} from '../schemas/validation';
import { sanitizeForRole } from '../middleware/auth';

const router = Router();

// GET /api/inventory - list inventory batches and expiry risks
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await dataStore.getInventory();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/:id/resolve - resolve inventory risk
router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const body = resolveInventoryRiskSchema.parse(req.body);
    await dataStore.resolveInventory(id, body.actionName);
    res.json({
      success: true,
      message: `Inventory risk item ${id} resolved with action "${body.actionName}"`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/:id/expire - report expired ingredient
router.post('/:id/expire', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const body = expireInventoryBatchSchema.parse(req.body);
    const actor = body.actor || req.user?.name || 'Chef R. Suresh';

    const result = await dataStore.expireInventory(id, actor);
    res.json({
      success: true,
      message: `Inventory item ${id} expired and quarantined. Critical safety incident generated.`,
      alertIncident: sanitizeForRole(result.alertIncident, req.user?.role),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
