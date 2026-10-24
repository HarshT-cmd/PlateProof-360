import { Router, Request, Response, NextFunction } from 'express';
import { dataStore } from '../db/store';
import {
  temperatureReadingSchema,
  inspectionChecklistSchema,
} from '../schemas/validation';
import { sanitizeForRole } from '../middleware/auth';

const router = Router();

// POST /api/telemetry/temperature - record temperature reading
router.post('/temperature', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = temperatureReadingSchema.parse(req.body);
    const recordedBy = body.recordedBy || req.user?.name || 'Chef R. Suresh';

    const result = await dataStore.recordTemperatureReading({
      station: body.station,
      probeId: body.probeId,
      value: body.value,
      unit: body.unit,
      limitLow: body.limitLow,
      limitHigh: body.limitHigh,
      notes: body.notes,
      recordedBy,
    });

    res.status(201).json({
      success: true,
      message: 'Temperature reading recorded successfully',
      reading: result.reading,
      alertIncident: result.alertIncident ? sanitizeForRole(result.alertIncident, req.user?.role) : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/inspections - complete inspection checklist / hygiene check
export async function inspectionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = inspectionChecklistSchema.parse(req.body);
    const inspector = body.inspector || req.user?.name || 'Chef R. Suresh';

    const result = await dataStore.recordInspection({
      checkpoint: body.checkpoint,
      zone: body.zone,
      passed: body.passed,
      comments: body.comments,
      parameter: body.parameter,
      measuredValue: body.measuredValue,
      safeLimit: body.safeLimit,
      inspector,
    });

    res.status(201).json({
      success: true,
      message: 'Inspection audit logged successfully',
      auditRecord: result.auditRecord,
      alertIncident: result.alertIncident ? sanitizeForRole(result.alertIncident, req.user?.role) : null,
    });
  } catch (err) {
    next(err);
  }
}

export default router;
