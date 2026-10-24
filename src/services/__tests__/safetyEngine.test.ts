import { describe, it, expect } from 'vitest';
import { getInitialSeedState } from '../safetyStorage';
import {
  determineSeverity,
  evaluateSeverityRule,
  validateIncidentTransition,
  fileComplaint,
  assignIncident,
  documentIncidentFix,
  verifyIncidentFix,
  closeIncident,
  logManualTemperatureReading,
  logHygieneCheckResult,
  reportExpiredIngredient,
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

  it('evaluates all 4 configurable demo rules accurately', () => {
    // Rule 1: Failed hygiene check -> Medium severity ('moderate')
    expect(evaluateSeverityRule({ isHygieneFailed: true })).toBe('moderate');

    // Rule 2: Temperature exceeding configured operational limit -> High severity ('high')
    expect(evaluateSeverityRule({ isTempExceeded: true })).toBe('high');

    // Rule 3: Expired ingredient -> Critical severity ('critical')
    expect(evaluateSeverityRule({ isIngredientExpired: true })).toBe('critical');

    // Rule 4: Undercooked-food complaint for demo Order #1042 -> Medium severity ('moderate')
    expect(
      evaluateSeverityRule({
        orderId: 'ORD-1042',
        description: 'Paneer Tikka Masala appears undercooked and soft in core',
        category: 'temperature',
      })
    ).toBe('moderate');
  });

  it('validates explicit canonical lifecycle transitions: Open -> Fixed -> Verified -> Closed', () => {
    // Open -> Fixed is valid
    const openToFixed = validateIncidentTransition('open', 'fixed');
    expect(openToFixed.ok).toBe(true);

    // Skipping from Open to Verified or Closed is invalid
    const openToVerified = validateIncidentTransition('open', 'verified');
    expect(openToVerified.ok).toBe(false);
    expect(openToVerified.error).toContain('Cannot skip');

    const openToClosed = validateIncidentTransition('open', 'closed');
    expect(openToClosed.ok).toBe(false);
    expect(openToClosed.error).toContain('Cannot skip');

    // Fixed -> Verified requires authorized supervisor
    const fixedToVerified = validateIncidentTransition('fixed', 'verified', {
      actor: 'Chef R. Suresh',
      actorRole: 'supervisor',
    });
    expect(fixedToVerified.ok).toBe(true);

    // Fixed -> Closed directly is rejected
    const fixedToClosed = validateIncidentTransition('fixed', 'closed');
    expect(fixedToClosed.ok).toBe(false);
    expect(fixedToClosed.error).toContain('Closure rejected');

    // Verified -> Closed requires evidence
    const verifiedToClosedNoEvidence = validateIncidentTransition('verified', 'closed', {
      actor: 'Chef R. Suresh',
      actorRole: 'supervisor',
      incidentEvidenceCount: 0,
    });
    expect(verifiedToClosedNoEvidence.ok).toBe(false);
    expect(verifiedToClosedNoEvidence.error).toContain('evidence');

    const verifiedToClosedWithEvidence = validateIncidentTransition('verified', 'closed', {
      actor: 'Chef R. Suresh',
      actorRole: 'supervisor',
      incidentEvidenceCount: 1,
    });
    expect(verifiedToClosedWithEvidence.ok).toBe(true);

    // Closed cannot transition further
    const closedToOpen = validateIncidentTransition('closed', 'open');
    expect(closedToOpen.ok).toBe(false);
    expect(closedToOpen.error).toContain('already closed');
  });

  it('enforces role restrictions: staff must not verify their own corrective actions', () => {
    // 1. Staff role cannot verify
    const staffVerify = validateIncidentTransition('fixed', 'verified', {
      actor: 'Ankit Verma',
      actorRole: 'staff',
    });
    expect(staffVerify.ok).toBe(false);
    expect(staffVerify.error).toContain('Staff members cannot verify their own corrective actions');

    // 2. Assigned staff member cannot self-verify even if role not specified
    const selfVerify = validateIncidentTransition('fixed', 'verified', {
      actor: 'Ankit Verma',
      assignedStaff: 'Ankit Verma',
    });
    expect(selfVerify.ok).toBe(false);
    expect(selfVerify.error).toContain('Staff members cannot verify their own corrective actions');

    // 3. Independent supervisor CAN verify
    const supervisorVerify = validateIncidentTransition('fixed', 'verified', {
      actor: 'Chef R. Suresh',
      actorRole: 'supervisor',
      assignedStaff: 'Ankit Verma',
    });
    expect(supervisorVerify.ok).toBe(true);
  });
});

describe('Safety Engine — Complaint Lifecycle & Idempotency', () => {
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

    expect(result.incident).not.toBeNull();
    expect(result.incident?.severity).toBe('critical');
    expect(result.incident?.supervisorActionNeeded).toBe(true);
    expect(result.incident?.linkedComplaintId).toBe(result.complaint.id);
    expect(nextState.incidents.length).toBe(initialIncidentCount + 1);
  });

  it('prevents duplicate incidents through idempotent complaint submission for Order #1042', () => {
    const initialState = getInitialSeedState();

    // First submission
    const { nextState: stateAfterFirst, result: firstResult } = fileComplaint(initialState, {
      orderId: 'ORD-1042',
      token: 'order-1042',
      dishName: 'Artisanal Paneer Tikka Masala',
      category: 'temperature',
      description: 'Paneer Tikka Masala appears undercooked in the core',
      dinerContact: '+91 98765 43210',
      seatNumber: 'Table 4',
    });

    expect(firstResult.duplicate).toBe(false);
    expect(firstResult.complaint).toBeDefined();
    expect(firstResult.incident).toBeDefined();
    expect(firstResult.complaint.severity).toBe('moderate'); // Rule 4!
    const complaintCount = stateAfterFirst.complaints.length;
    const incidentCount = stateAfterFirst.incidents.length;

    // Second submission with same order & dish
    const { nextState: stateAfterSecond, result: secondResult } = fileComplaint(stateAfterFirst, {
      orderId: 'ORD-1042',
      token: 'order-1042',
      dishName: 'Artisanal Paneer Tikka Masala',
      category: 'temperature',
      description: 'Paneer Tikka Masala appears undercooked in the core',
      dinerContact: '+91 98765 43210',
      seatNumber: 'Table 4',
    });

    expect(secondResult.duplicate).toBe(true);
    expect(secondResult.complaint.id).toBe(firstResult.complaint.id);
    expect(secondResult.incident?.id).toBe(firstResult.incident?.id);
    expect(stateAfterSecond.complaints.length).toBe(complaintCount);
    expect(stateAfterSecond.incidents.length).toBe(incidentCount);
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

describe('Safety Engine — End-to-End Workflow (Order #1042 Undercooked Story)', () => {
  it('executes full workflow: customer report -> assignment -> staff fix -> supervisor verify -> close', () => {
    const initialState = getInitialSeedState();

    // Step 1: Customer reports undercooked Paneer Tikka Masala on Order #1042
    const { nextState: s1, result: filing } = fileComplaint(initialState, {
      orderId: 'ORD-1042',
      token: 'order-1042',
      dishName: 'Artisanal Paneer Tikka Masala',
      category: 'temperature',
      description: 'The Paneer Tikka Masala appears undercooked and cool in center',
      dinerContact: '+91 91234 56789',
      seatNumber: 'Table 9',
    });

    expect(filing.complaint).toBeDefined();
    expect(filing.incident).toBeDefined();
    expect(filing.incident?.severity).toBe('moderate'); // Rule 4
    expect(filing.incident?.status).toBe('open');
    const incidentId = filing.incident!.id;
    const complaintId = filing.complaint.id;

    // Step 2: Manager assigns incident to staff Ankit Verma
    const { nextState: s2, incident: assignedInc } = assignIncident(
      s1,
      incidentId,
      'Ankit Verma',
      'Chef R. Suresh',
      'supervisor'
    );
    expect(assignedInc?.assignedTo).toBe('Ankit Verma');

    // Step 3: Staff Ankit Verma investigates, executes fix, and attaches evidence (Open -> Fixed)
    const { nextState: s3, incident: fixedInc } = documentIncidentFix(
      s2,
      incidentId,
      'Re-skewered paneer batch, recalibrated tandoor zone to 320°C, achieved core 84.1°C.',
      'Reheat and secondary digital probe verification',
      {
        kind: 'probe-reading',
        title: 'Core Probe BLE-04 Skewer Log',
        reference: 'PROBE-BLE-84.1C.CSV',
        capturedBy: 'Ankit Verma',
        notes: 'Sustained 84.1°C for 22 seconds.',
      },
      'Ankit Verma',
      'staff'
    );
    expect(fixedInc?.status).toBe('fixed');
    expect(fixedInc?.fixedAt).toBeDefined();
    expect(fixedInc?.evidence?.length).toBe(1);

    // Step 4: Staff Ankit Verma attempts to verify their own fix -> REJECTED
    const selfVerifyAttempt = verifyIncidentFix(
      s3,
      incidentId,
      'Looks good to me',
      'Ankit Verma',
      'staff'
    );
    expect(selfVerifyAttempt.error).toContain('Staff members cannot verify their own corrective actions');

    // Step 5: Supervisor attempts to close without verifying first -> REJECTED
    const prematureClose = closeIncident(
      s3,
      incidentId,
      'Closing early',
      'Chef R. Suresh',
      'supervisor'
    );
    expect(prematureClose.error).toContain('Closure rejected');

    // Step 6: Authorized Supervisor Chef R. Suresh reviews evidence and verifies fix (Fixed -> Verified)
    const { nextState: s4, incident: verifiedInc } = verifyIncidentFix(
      s3,
      incidentId,
      'Audited digital thermocouple trace. Core temp 84.1°C exceeds 74.0°C limit by +10.1°C.',
      'Chef R. Suresh',
      'supervisor'
    );
    expect(verifiedInc?.status).toBe('verified');
    expect(verifiedInc?.verifiedAt).toBeDefined();

    // Step 7: Supervisor closes and certifies the incident (Verified -> Closed)
    const { nextState: s5, incident: closedInc } = closeIncident(
      s4,
      incidentId,
      'Physical inspection complete and safe serving temperature certified.',
      'Chef R. Suresh',
      'supervisor'
    );
    expect(closedInc?.status).toBe('closed');
    expect(closedInc?.closedAt).toBeDefined();

    // Step 8: Verify customer-facing complaint status was cascaded to resolved-closed
    const customerComplaint = s5.complaints.find((c) => c.id === complaintId);
    expect(customerComplaint?.status).toBe('resolved-closed');
    expect(customerComplaint?.resolutionNote).toContain('certified');

    // Step 9: Verify chronological audit events exist and are properly labeled
    const auditEvents = closedInc!.auditTrail || [];
    expect(auditEvents.length).toBeGreaterThanOrEqual(4);
    expect(auditEvents.some((a) => a.action === 'Incident Assigned')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'Remediation Documented (Fixed)')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'Supervisor Verification Completed')).toBe(true);
    expect(auditEvents.some((a) => a.action === 'Incident Certified & Closed')).toBe(true);
  });
});

describe('Safety Engine — Telemetry & Rules Execution', () => {
  it('triggers a high severity incident when a temperature check breaches limits (Rule 2)', () => {
    const initialState = getInitialSeedState();
    const { nextState, newAuditRecord, alertIncident } = logManualTemperatureReading(
      initialState,
      'Walk-in Chiller 1',
      7.8,
      'Chiller door left ajar during stock intake'
    );

    expect(newAuditRecord.result).toBe('non-compliant');
    expect(alertIncident).toBeDefined();
    expect(alertIncident?.severity).toBe('high'); // Rule 2
    expect(alertIncident?.supervisorActionNeeded).toBe(true);
    expect(nextState.incidents[0].id).toBe(alertIncident?.id);
  });

  it('triggers a medium severity incident when hygiene checklist fails (Rule 1)', () => {
    const initialState = getInitialSeedState();
    const { nextState, auditRecord, alertIncident } = logHygieneCheckResult(
      initialState,
      'Food Handler Sanitization & Wellness',
      'Prep Bay 2',
      false,
      'Handwash station soap dispenser depleted during shift change'
    );

    expect(auditRecord.result).toBe('non-compliant');
    expect(alertIncident).toBeDefined();
    expect(alertIncident?.severity).toBe('moderate'); // Rule 1
    expect(nextState.incidents[0].id).toBe(alertIncident?.id);
  });

  it('triggers a critical severity incident when an ingredient expires (Rule 3)', () => {
    const initialState = getInitialSeedState();
    const targetRiskId = initialState.inventoryRisks[0].id;

    const { nextState, alertIncident } = reportExpiredIngredient(
      initialState,
      targetRiskId,
      'Chef R. Suresh'
    );

    expect(alertIncident).toBeDefined();
    expect(alertIncident?.severity).toBe('critical'); // Rule 3
    const risk = nextState.inventoryRisks.find((r) => r.id === targetRiskId);
    expect(risk?.riskTier).toBe('critical');
    expect(risk?.hoursUntilExpiry).toBe(0);
  });
});
