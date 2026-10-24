import { Router, Request, Response, NextFunction } from 'express';
import { dataStore } from '../db/store';
import {
  assignIncidentSchema,
  recordCorrectiveActionSchema,
  verifyIncidentSchema,
  closeIncidentSchema,
} from '../schemas/validation';
import { sanitizeForRole } from '../middleware/auth';

const router = Router();

// GET /api/incidents - list and filter incidents
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, severity, assignedTo, location } = req.query;
    const incidents = await dataStore.getIncidents({
      status: status as string,
      severity: severity as string,
      assignedTo: assignedTo as string,
      location: location as string,
    });
    res.json(sanitizeForRole(incidents, req.user?.role));
  } catch (err) {
    next(err);
  }
});

// GET /api/incidents/:id - get specific incident
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const incident = await dataStore.getIncidentById(id);
    if (!incident) {
      res.status(404).json({
        error: 'IncidentNotFound',
        message: `Incident ${id} not found`,
      });
      return;
    }
    res.json(sanitizeForRole(incident, req.user?.role));
  } catch (err) {
    next(err);
  }
});

// POST /api/incidents/:id/assign - assign incident to staff
router.post('/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const body = assignIncidentSchema.parse(req.body);
    const actor = body.actor || req.user?.name || 'Chef R. Suresh';
    const actorRole = body.actorRole || req.user?.role || 'supervisor';

    const incident = await dataStore.assignIncident(id, body.assignee, actor, actorRole);
    res.json({
      success: true,
      message: `Incident ${id} assigned to ${body.assignee}`,
      incident: sanitizeForRole(incident, req.user?.role),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/incidents/:id/actions OR /api/incidents/:id/fix - record corrective action
const fixHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const body = recordCorrectiveActionSchema.parse(req.body);
    const actor = body.actor || req.user?.name || 'Ankit Verma';
    const actorRole = body.actorRole || req.user?.role || 'staff';

    const result = await dataStore.recordCorrectiveAction(
      id,
      body.actionTaken,
      body.assignedStaff || actor,
      body.fixNotes,
      body.correctiveActionPlan,
      body.evidence,
      actor,
      actorRole
    );

    res.json({
      success: true,
      message: `Corrective action recorded for incident ${id}`,
      incident: sanitizeForRole(result.incident, req.user?.role),
      capa: result.capa,
    });
  } catch (err) {
    next(err);
  }
};

router.post('/:id/actions', fixHandler);
router.post('/:id/fix', fixHandler);

// POST /api/incidents/:id/verify - supervisor verification
router.post('/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const body = verifyIncidentSchema.parse(req.body);
    const actor = body.actor || req.user?.name || 'Chef R. Suresh';
    const actorRole = body.actorRole || req.user?.role || 'supervisor';

    const incident = await dataStore.verifyIncident(id, body.verificationNotes, actor, actorRole);
    res.json({
      success: true,
      message: `Incident ${id} verified by supervisor ${actor}`,
      incident: sanitizeForRole(incident, req.user?.role),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/incidents/:id/close - official closure
router.post('/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const body = closeIncidentSchema.parse(req.body);
    const actor = body.actor || req.user?.name || 'Chef R. Suresh';
    const actorRole = body.actorRole || req.user?.role || 'supervisor';

    const incident = await dataStore.closeIncident(id, body.closureNotes, actor, actorRole);
    res.json({
      success: true,
      message: `Incident ${id} formally closed by supervisor ${actor}`,
      incident: sanitizeForRole(incident, req.user?.role),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
