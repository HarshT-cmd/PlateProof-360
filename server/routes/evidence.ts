import { Router, Request, Response, NextFunction } from 'express';
import { dataStore } from '../db/store';
import { evidenceItemSchema } from '../schemas/validation';

const router = Router();

// POST /api/evidence - submit evidence metadata
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = evidenceItemSchema.parse(req.body);
    const capturedBy = body.capturedBy || req.user?.name || 'Chef R. Suresh';

    const evidence = await dataStore.attachEvidence(body.targetType, body.targetId, {
      kind: body.kind,
      title: body.title,
      reference: body.reference,
      notes: body.notes,
      capturedBy,
    });

    res.status(201).json({
      success: true,
      message: `Evidence attached to ${body.targetType} ${body.targetId}`,
      evidence,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
