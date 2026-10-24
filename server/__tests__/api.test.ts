import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { dataStore } from '../db/store';

describe('PlateProof 360 — Backend REST API Integration Tests', () => {
  const app = createApp();

  beforeEach(async () => {
    await dataStore.resetDemoData();
  });

  describe('1. Health and Demo Endpoints', () => {
    it('GET /api/health returns healthy status and PostgreSQL connection metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.postgres).toBeDefined();
    });

    it('POST /api/demo/reset resets data state to baseline', async () => {
      const res = await request(app).post('/api/demo/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Order Safety Attestation Lookup & Customer Privacy', () => {
    it('GET /api/orders/:tokenOrId returns Order #1042 safety proof', async () => {
      const res = await request(app).get('/api/orders/order-1042');
      expect(res.status).toBe(200);
      expect(res.body.orderId).toBe('ORD-1042');
      expect(res.body.dishName).toBe('Artisanal Paneer Tikka Masala');
      expect(res.body.cookingRecord.recordedTemp).toBe(82.4);
      expect(res.body.ingredients.length).toBeGreaterThan(0);
      expect(res.body.allergens.length).toBeGreaterThan(0);
      expect(res.body.hygieneChecks.length).toBeGreaterThan(0);
    });

    it('GET /api/orders/:tokenOrId works with ORD-1042 prefix', async () => {
      const res = await request(app).get('/api/orders/ORD-1042');
      expect(res.status).toBe(200);
      expect(res.body.orderId).toBe('ORD-1042');
    });

    it('Never exposes private internalNotes to customer/public requests', async () => {
      const res = await request(app)
        .get('/api/orders/ORD-1042')
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(res.body.internalNotes).toBeUndefined();
      expect(res.body.internal_notes).toBeUndefined();
    });
  });

  describe('3. Complaint Filing, Auto-Triage & Idempotency', () => {
    it('POST /api/complaints creates complaint with auto-triage to critical for allergens', async () => {
      const payload = {
        orderId: 'ORD-1042',
        token: 'order-1042',
        dishName: 'Artisanal Paneer Tikka Masala',
        category: 'allergen',
        reportedBy: 'Diner Priya R.',
        dinerContact: '+91 9988776655',
        seatNumber: 'Table 4',
        description: 'Possible trace peanut cross contact observed on garnish spoon',
      };

      const res = await request(app).post('/api/complaints').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.complaint.severity).toBe('critical');
      expect(res.body.complaint.status).toBe('investigating');
      expect(res.body.incident).not.toBeNull();
      expect(res.body.incident.severity).toBe('critical');
    });

    it('POST /api/complaints handles undercooked food complaint for Order #1042 with moderate severity', async () => {
      const payload = {
        orderId: 'ORD-1042',
        token: 'order-1042',
        dishName: 'Artisanal Paneer Tikka Masala',
        category: 'temperature',
        reportedBy: 'Diner Vikram K.',
        dinerContact: '+91 9988774433',
        description: 'Paneer center feels slightly undercooked and cold in center core',
      };

      const res = await request(app).post('/api/complaints').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.complaint.severity).toBe('moderate');
      expect(res.body.incident).not.toBeNull();
      expect(res.body.incident.severity).toBe('moderate');
    });

    it('Enforces idempotency on duplicate complaint submissions', async () => {
      const payload = {
        orderId: 'ORD-1042',
        token: 'order-1042',
        dishName: 'Artisanal Paneer Tikka Masala',
        category: 'packaging',
        reportedBy: 'Diner Test',
        dinerContact: '+91 9999999999',
        description: 'Tamper tape was half peeled upon tray pickup',
        idempotencyKey: 'idemp-key-1042-pkg',
      };

      const first = await request(app).post('/api/complaints').send(payload);
      expect(first.status).toBe(201);
      expect(first.body.duplicate).toBe(false);

      const second = await request(app).post('/api/complaints').send(payload);
      expect(second.status).toBe(200);
      expect(second.body.duplicate).toBe(true);
      expect(second.body.complaint.id).toBe(first.body.complaint.id);
    });

    it('GET /api/orders/:orderId/complaints strips internal staff notes for diners', async () => {
      const res = await request(app)
        .get('/api/orders/ORD-1041/complaints')
        .set('X-User-Role', 'customer');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const item of res.body) {
        expect(item.internalNotes).toBeUndefined();
      }
    });

    it('Rejects invalid complaint payload with 400 Bad Request', async () => {
      const res = await request(app).post('/api/complaints').send({
        orderId: 'ORD-1042',
        // missing required fields
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });
  });

  describe('4. Incident Lifecycle, Corrective Actions & Role Permissions', () => {
    it('GET /api/incidents returns incidents and supports status filtering', async () => {
      const res = await request(app).get('/api/incidents?status=in-progress');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((inc: { status: string }) => {
        expect(inc.status).toBe('in-progress');
      });
    });

    it('POST /api/incidents/:id/assign assigns incident to staff member', async () => {
      const res = await request(app)
        .post('/api/incidents/INC-2026-088/assign')
        .set('X-User-Role', 'supervisor')
        .set('X-User-Name', 'Chef R. Suresh')
        .send({ assignee: 'Ankit Verma' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.incident.assignedTo).toBe('Ankit Verma');
    });

    it('POST /api/incidents/:id/actions records corrective action and advances status to fixed', async () => {
      const res = await request(app)
        .post('/api/incidents/INC-2026-088/actions')
        .set('X-User-Role', 'staff')
        .set('X-User-Name', 'Ankit Verma')
        .send({
          actionTaken: 'Steam well heating element descaled and calibrated to 74C',
          assignedStaff: 'Ankit Verma',
          evidence: {
            kind: 'probe-reading',
            title: 'Recalibrated probe BLE-04 log',
            reference: 'LOG-BLE-04-CAL.PDF',
            notes: 'Steady holding at 74.2C verified',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.incident.status).toBe('fixed');
      expect(res.body.capa.verificationStatus).toBe('pending-supervisor');
    });

    it('POST /api/incidents/:id/verify PREVENTS staff self-verification (HTTP 403)', async () => {
      // First assign incident to Ankit Verma
      await request(app)
        .post('/api/incidents/INC-2026-088/assign')
        .set('X-User-Role', 'supervisor')
        .send({ assignee: 'Ankit Verma' });

      // Ankit Verma attempts to verify his own corrective action
      const res = await request(app)
        .post('/api/incidents/INC-2026-088/verify')
        .set('X-User-Role', 'staff')
        .set('X-User-Name', 'Ankit Verma')
        .send({
          verificationNotes: 'I verify my own fix.',
          actor: 'Ankit Verma',
          actorRole: 'staff',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Permission denied|Security violation/i);
    });

    it('POST /api/incidents/:id/verify allows authorized supervisor to verify', async () => {
      const res = await request(app)
        .post('/api/incidents/INC-2026-088/verify')
        .set('X-User-Role', 'supervisor')
        .set('X-User-Name', 'Chef R. Suresh')
        .send({
          verificationNotes: 'Physical thermocouple verification confirmed holding at 74.2C.',
          actor: 'Chef R. Suresh',
          actorRole: 'supervisor',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.incident.status).toBe('verified');
    });

    it('POST /api/incidents/:id/close rejects closure if non-supervisor tries to close (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/incidents/INC-2026-088/close')
        .set('X-User-Role', 'staff')
        .set('X-User-Name', 'Ankit Verma')
        .send({
          closureNotes: 'Staff attempting closure',
          actor: 'Ankit Verma',
          actorRole: 'staff',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('5. Evidence Metadata Submission', () => {
    it('POST /api/evidence submits evidence metadata', async () => {
      const res = await request(app)
        .post('/api/evidence')
        .set('X-User-Role', 'supervisor')
        .send({
          targetType: 'incident',
          targetId: 'INC-2026-088',
          kind: 'photo',
          title: 'Heating Element Thermal Imaging Scan',
          reference: 'IMG-BAY1-THERMAL-SCAN.PNG',
          notes: 'Thermal camera shows uniform heat distribution at 74.5C',
          capturedBy: 'Chef R. Suresh',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.evidence.kind).toBe('photo');
      expect(res.body.evidence.reference).toBe('IMG-BAY1-THERMAL-SCAN.PNG');
    });
  });

  describe('6. Telemetry and Inspections', () => {
    it('POST /api/telemetry/temperature logs reading; alerts if limit exceeded', async () => {
      // Exceeds high limit (chiller temp > 4.0C)
      const res = await request(app)
        .post('/api/telemetry/temperature')
        .send({
          station: 'Walk-in Chiller 02',
          probeId: 'BLE-CHILL-02',
          value: 7.8,
          unit: '°C',
          limitHigh: 4.0,
          limitLow: 0.0,
          notes: 'Door left open during delivery intake',
        });

      expect(res.status).toBe(201);
      expect(res.body.reading.withinLimits).toBe(false);
      expect(res.body.alertIncident).not.toBeNull();
      expect(res.body.alertIncident.severity).toBe('high');
    });

    it('POST /api/inspections logs inspection; creates incident if failed', async () => {
      const res = await request(app)
        .post('/api/inspections')
        .send({
          checkpoint: 'Tandoor Grill Sanitization Swab',
          zone: 'Tandoor Bay 3',
          passed: false,
          comments: 'High ATP count detected after shift change',
          parameter: 'ATP Bioluminescence',
          measuredValue: '75 RLU',
          safeLimit: '< 30 RLU',
          inspector: 'K. Meenakshi',
        });

      expect(res.status).toBe(201);
      expect(res.body.auditRecord.result).toBe('non-compliant');
      expect(res.body.alertIncident).not.toBeNull();
      expect(res.body.alertIncident.severity).toBe('moderate');
    });
  });

  describe('7. Inventory and Expiry Batches', () => {
    it('GET /api/inventory lists inventory items', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /api/inventory/:id/resolve resolves an inventory risk', async () => {
      const res = await request(app)
        .post('/api/inventory/INV-RSK-02/resolve')
        .send({ actionName: 'Incorporated into 1:00 PM lunch gravy prep' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/inventory/:id/expire quarantines batch and creates critical incident', async () => {
      const res = await request(app)
        .post('/api/inventory/INV-RSK-01/expire')
        .send({ actor: 'Chef R. Suresh' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.alertIncident.severity).toBe('critical');
    });
  });

  describe('8. End-to-End Complaint-to-Closure Full Workflow', () => {
    it('executes the full lifecycle: File -> Assign -> Fix -> Evidence -> Verify -> Close', async () => {
      // Step 1: Diner files undercooked food complaint for Order #1042
      const fileRes = await request(app).post('/api/complaints').send({
        orderId: 'ORD-1042',
        token: 'order-1042',
        dishName: 'Artisanal Paneer Tikka Masala',
        category: 'temperature',
        reportedBy: 'Diner Sunita M.',
        dinerContact: '+91 98450 99881',
        seatNumber: 'Table 12',
        description: 'Tandoor paneer undercooked center cold core',
      });

      expect(fileRes.status).toBe(201);
      const complaintId = fileRes.body.complaint.id;
      const incidentId = fileRes.body.incident.id;
      expect(complaintId).toBeDefined();
      expect(incidentId).toBeDefined();

      // Step 2: Supervisor assigns incident to Ankit Verma
      const assignRes = await request(app)
        .post(`/api/incidents/${incidentId}/assign`)
        .set('X-User-Role', 'supervisor')
        .set('X-User-Name', 'Chef R. Suresh')
        .send({ assignee: 'Ankit Verma' });
      expect(assignRes.status).toBe(200);

      // Step 3: Ankit Verma documents fix
      const fixRes = await request(app)
        .post(`/api/incidents/${incidentId}/actions`)
        .set('X-User-Role', 'staff')
        .set('X-User-Name', 'Ankit Verma')
        .send({
          actionTaken: 'Recalibrated tandoor hearth temperature to 350C and checked probe insertion depth.',
          assignedStaff: 'Ankit Verma',
          evidence: {
            kind: 'probe-reading',
            title: 'Hearth probe recalibration reading',
            reference: 'PROBE-HEARTH-RECAL.CSV',
            notes: 'Hearth core temp holding at 352C',
          },
        });
      expect(fixRes.status).toBe(200);
      expect(fixRes.body.incident.status).toBe('fixed');

      // Step 4: Staff member attempts self-verification -> REJECTED (403)
      const selfVerifyRes = await request(app)
        .post(`/api/incidents/${incidentId}/verify`)
        .set('X-User-Role', 'staff')
        .set('X-User-Name', 'Ankit Verma')
        .send({
          verificationNotes: 'Self sign-off attempt',
          actor: 'Ankit Verma',
          actorRole: 'staff',
        });
      expect(selfVerifyRes.status).toBe(403);

      // Step 5: Authorized supervisor verifies
      const supervisorVerifyRes = await request(app)
        .post(`/api/incidents/${incidentId}/verify`)
        .set('X-User-Role', 'supervisor')
        .set('X-User-Name', 'Chef R. Suresh')
        .send({
          verificationNotes: 'Secondary probe test verified core at 83.2C. Skewer certified.',
          actor: 'Chef R. Suresh',
          actorRole: 'supervisor',
        });
      expect(supervisorVerifyRes.status).toBe(200);
      expect(supervisorVerifyRes.body.incident.status).toBe('verified');

      // Step 6: Authorized supervisor formally closes incident
      const closeRes = await request(app)
        .post(`/api/incidents/${incidentId}/close`)
        .set('X-User-Role', 'supervisor')
        .set('X-User-Name', 'Chef R. Suresh')
        .send({
          closureNotes: 'Customer contacted, fresh portion served. Probe calibrated and signed off.',
          actor: 'Chef R. Suresh',
          actorRole: 'supervisor',
        });
      expect(closeRes.status).toBe(200);
      expect(closeRes.body.incident.status).toBe('closed');
      expect(closeRes.body.incident.closedAt).toBeDefined();
    });
  });
});
