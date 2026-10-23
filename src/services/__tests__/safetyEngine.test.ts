import { describe, it, expect } from 'vitest';
import {
  getInitialSeedState,
} from '../safetyStorage';
import {
  determineSeverity,
  validateIncidentTransition,
  fileComplaint,
  signOffCorrectiveAction,
  transitionIncident,
  resolveInventoryRiskItem,
  logManualTemperatureReading,
  attachEvidenceItem,
} from '../safetyEngine';

describe('Safety Engine — Severity & Transition Rules', () => {
  it('correctly maps complaint categories to culinary safety severities', () => {
    expect(determineSeverity('allergen', 'Nuts found')).toBe('critical');
    expect(determineSeverity('temperature', 'Food served lukewarm')).toBe('high');
    expect(determineSeverity('packaging', 'Lid seal broken')).toBe('moderate');
    expect(determineSeverity('quality', 'Too salty')).toBe('low');
  });

  it('escalates severity if critical medical keywords are detected in description', () => {
    expect(determineSeverity('quality', 'Customer reported severe anaphylaxis reaction')).toBe('critical');
    expect(determineSeverity('quality', 'Food was completely raw in center')).toBe('high');
  });

  it('enforces supervisor sign-off before closing or verifying incidents', () => {
    const invalidTransition = validateIncidentTransition('open', 'verified-closed', false);
    expect(invalidTransition.ok).toBe(false);
    expect(invalidTransition.error).toContain('supervisor sign-off');

    const validTransition = validateIncidentTransition('open', 'verified-closed', true);
    expect(validTransition.ok).toBe(true);
  });
});

describe('Safety Engine — Complaint Lifecycle & Auto-Triage', () => {
  it('files an allergen complaint and automatically spawns a linked Safety Incident', () => {
    const initialState = getInitialSeedState();
    const initialComplaintCount = initialState.complaints.length;
    const initialIncidentCount = initialState.incidents.length;

    const { nextState, result } = fileComplaint(initialState, {
      orderId: 'ORD-1042',
      token: 'order-1042',
      dishName: 'Artisanal Paneer Tikka Masala',
      category: 'allergen',
      description: 'Suspected undeclared tree nuts in gravy',
      dinerContact: '+91 99999 88888',
      seatNumber: 'Table 7',
    });

    expect(nextState.complaints.length).toBe(initialComplaintCount + 1);
    expect(result.complaint.category).toBe('allergen');
    expect(result.complaint.severity).toBe('critical');
    expect(result.complaint.status).toBe('investigating');
    expect(result.complaint.auditTrail.length).toBeGreaterThanOrEqual(1);

    // Incident auto-generation check
    expect(result.incident).not.toBeNull();
    expect(result.incident?.severity).toBe('critical');
    expect(result.incident?.supervisorActionNeeded).toBe(true);
    expect(result.incident?.linkedComplaintId).toBe(result.complaint.id);
    expect(nextState.incidents.length).toBe(initialIncidentCount + 1);
  });

  it('files a low-severity quality complaint without spawning a critical incident', () => {
    const initialState = getInitialSeedState();
    const initialIncidentCount = initialState.incidents.length;

    const { nextState, result } = fileComplaint(initialState, {
      orderId: 'ORD-1043',
      token: 'order-1043',
      dishName: 'Slow-Simmered Dal Bukhara',
      category: 'quality',
      description: 'Lacks seasoning salt',
      dinerContact: 'guest@hotel.com',
      seatNumber: 'Table 2',
    });

    expect(result.complaint.severity).toBe('low');
    expect(result.complaint.status).toBe('filed');
    expect(result.incident).toBeNull();
    expect(nextState.incidents.length).toBe(initialIncidentCount);
  });
});

describe('Safety Engine — Corrective Action (CAPA) Workflow', () => {
  it('approving a CAPA cascades status closure to linked incidents and complaints', () => {
    const initialState = getInitialSeedState();

    // In seed data: CAPA-2026-44 is pending-supervisor and linked to INC-2026-088 and CMP-2026-088
    const { nextState, capa, incident } = signOffCorrectiveAction(
      initialState,
      'CAPA-2026-44',
      'Chef R. Suresh (FSS-KA-8819)',
      'Probe tested and heating coils replaced'
    );

    expect(capa?.verificationStatus).toBe('approved');
    expect(incident?.status).toBe('verified-closed');
    expect(incident?.supervisorActionNeeded).toBe(false);

    // Check linked incident in state
    const targetInc = nextState.incidents.find((i) => i.id === 'INC-2026-088');
    expect(targetInc?.status).toBe('verified-closed');
    expect(targetInc?.auditTrail?.some((a) => a.action === 'Incident Verified & Closed')).toBe(true);

    // Check linked complaint in state
    const targetCmp = nextState.complaints.find((c) => c.id === 'CMP-2026-088');
    expect(targetCmp?.status).toBe('resolved-closed');
    expect(targetCmp?.auditTrail.some((a) => a.action === 'Complaint Resolved & Closed')).toBe(true);
  });
});

describe('Safety Engine — Telemetry & Evidence Recording', () => {
  it('logs a compliant temperature reading without spawning an alert incident', () => {
    const initialState = getInitialSeedState();
    const { nextState, newAuditRecord, alertIncident } = logManualTemperatureReading(
      initialState,
      'Tandoor Grill B',
      83.5,
      'Spot check with calibrated probe'
    );

    expect(newAuditRecord.result).toBe('passed');
    expect(alertIncident).toBeUndefined();
    expect(nextState.inspectionAudits[0].result).toBe('passed');
  });

  it('triggers a critical incident when a temperature check breaches safety thresholds', () => {
    const initialState = getInitialSeedState();
    // Chiller limit is <= 4.0°C; 7.8°C is a severe breach
    const { nextState, newAuditRecord, alertIncident } = logManualTemperatureReading(
      initialState,
      'Walk-in Chiller 1',
      7.8,
      'Chiller door left ajar during stock intake'
    );

    expect(newAuditRecord.result).toBe('non-compliant');
    expect(alertIncident).toBeDefined();
    expect(alertIncident?.severity).toBe('critical');
    expect(alertIncident?.supervisorActionNeeded).toBe(true);
    expect(nextState.incidents[0].id).toBe(alertIncident?.id);
  });

  it('transitions incident status through approved stages with audit trail', () => {
    const initialState = getInitialSeedState();
    const incidentId = 'INC-2026-089';

    const { nextState, success } = transitionIncident(
      initialState,
      incidentId,
      'in-progress',
      'Chef R. Suresh',
      'Investigation underway on chiller seal'
    );

    expect(success).toBe(true);
    const updated = nextState.incidents.find((i) => i.id === incidentId);
    expect(updated?.status).toBe('in-progress');
    expect(updated?.auditTrail?.some((a) => a.action === 'Status Transition: in-progress')).toBe(true);
  });

  it('attaches evidence to a complaint and updates the immutable audit trail', () => {
    const initialState = getInitialSeedState();
    const targetComplaintId = initialState.complaints[0].id;

    const nextState = attachEvidenceItem(
      initialState,
      'complaint',
      targetComplaintId,
      {
        kind: 'photo',
        title: 'Microbial Swab Test Plate',
        reference: 'LAB-SWAB-8812.JPG',
        capturedBy: 'QA Lead K. Meenakshi',
        notes: 'Negative for Salmonella & Listeria.',
      }
    );

    const updated = nextState.complaints.find((c) => c.id === targetComplaintId);
    expect(updated?.evidence.some((e) => e.title === 'Microbial Swab Test Plate')).toBe(true);
    expect(updated?.auditTrail.some((a) => a.action === 'Evidence Attached')).toBe(true);
  });

  it('resolves inventory expiry risk with timestamped audit', () => {
    const initialState = getInitialSeedState();
    const nextState = resolveInventoryRiskItem(
      initialState,
      'INV-RSK-01',
      'Moved to blast freezer at -18°C'
    );

    const updated = nextState.inventoryRisks.find((r) => r.id === 'INV-RSK-01');
    expect(updated?.riskTier).toBe('normal');
    expect(updated?.suggestedAction).toContain('Moved to blast freezer');
  });
});
