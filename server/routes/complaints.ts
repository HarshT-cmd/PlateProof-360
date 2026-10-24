import { Router, Request, Response, NextFunction } from 'express';
import { dataStore } from '../db/store';
import { fileComplaintSchema } from '../schemas/validation';
import { sanitizeForRole } from '../middleware/auth';

const router = Router();

// POST /api/complaints - create and track complaints with auto-triage
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = fileComplaintSchema.parse(req.body);
    const result = await dataStore.fileComplaint(validated);

    // If duplicate idempotent request, return 200, else 201 Created
    const statusCode = result.duplicate ? 200 : 201;

    res.status(statusCode).json({
      success: true,
      duplicate: result.duplicate,
      complaint: sanitizeForRole(result.complaint, req.user?.role),
      incident: result.incident ? sanitizeForRole(result.incident, req.user?.role) : null,
      auditEntries: sanitizeForRole(result.auditEntries, req.user?.role),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints - list all complaints
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const complaints = await dataStore.getComplaints();
    res.json(sanitizeForRole(complaints, req.user?.role));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:orderId/complaints - fetch complaints for specific order
export async function getOrderComplaintsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = String(req.params.orderId);
    const complaints = await dataStore.getComplaintsForOrder(orderId);
    // Never expose private staff notes through customer endpoints
    res.json(sanitizeForRole(complaints, req.user?.role));
  } catch (err) {
    next(err);
  }
}

export default router;
