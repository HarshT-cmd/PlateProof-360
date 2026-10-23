import type {
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintRecord,
  ComplaintFilingResult,
  SafetyIncident,
  CorrectiveAction,
  AuditEntry,
  EvidenceItem,
  IncidentStatus,
  TransitionResult,
  InspectionAuditRecord,
} from '../types';
import type { PlateProofState } from './safetyStorage';

/**
 * Format current timestamp in culinary standard format (e.g. "12:54 PM IST").
 */
export function formatTimestamp(date: Date = new Date()): string {
  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${timeStr} IST`;
}

/**
 * Creates an immutable audit entry.
 */
export function createAuditEntry(
  actor: string,
  action: string,
  detail: string,
  previousStatus?: string,
  newStatus?: string
): AuditEntry {
  return {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    at: formatTimestamp(),
    actor,
    action,
    detail,
    previousStatus,
    newStatus,
  };
}

/**
 * Determines complaint severity based on category and description keywords.
 */
export function determineSeverity(
  category: ComplaintCategory,
  description: string = ''
): ComplaintSeverity {
  const lower = description.toLowerCase();
  if (category === 'allergen' || lower.includes('anaphylaxis') || lower.includes('allergic')) {
    return 'critical';
  }
  if (category === 'temperature' || lower.includes('raw') || lower.includes('undercooked')) {
    return 'high';
  }
  if (category === 'packaging' || lower.includes('tamper') || lower.includes('spill')) {
    return 'moderate';
  }
  return 'low';
}

/**
 * Validates state transition for a safety incident.
 * Enforces rule: Cannot transition to 'verified' or 'verified-closed' without supervisor review.
 */
export function validateIncidentTransition(
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus,
  hasSupervisorSignOff: boolean
): TransitionResult<IncidentStatus> {
  const canonicalClosed: IncidentStatus[] = ['verified-closed', 'verified', 'closed'];

  if (canonicalClosed.includes(targetStatus) && !hasSupervisorSignOff) {
    return {
      ok: false,
      previousState: currentStatus,
      newState: targetStatus,
      error: 'Cannot transition to verified/closed status without verified CAPA and supervisor sign-off.',
    };
  }

  return {
    ok: true,
    previousState: currentStatus,
    newState: targetStatus,
  };
}

export interface FileComplaintInput {
  orderId: string;
  token: string;
  dishName: string;
  category: ComplaintCategory;
  description: string;
  dinerContact: string;
  seatNumber: string;
  reportedBy?: string;
}

/**
 * Files a diner food safety concern, automatically triaging severity,
 * creating an immutable audit trail, and spawning an operational incident if required.
 */
export function fileComplaint(
  state: PlateProofState,
  input: FileComplaintInput
): { nextState: PlateProofState; result: ComplaintFilingResult } {
  const severity = determineSeverity(input.category, input.description);
  const complaintId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowFormatted = formatTimestamp();
  const reporter = input.reportedBy || (input.seatNumber ? `Diner at ${input.seatNumber}` : 'Diner (QR App)');

  // Determine if this is an urgent safety issue requiring supervisor intervention
  const requiresIncident = severity === 'critical' || severity === 'high';
  const incidentId = requiresIncident ? `INC-2026-${Math.floor(100 + Math.random() * 900)}` : null;

  const filingAudit = createAuditEntry(
    reporter,
    'Safety Concern Filed',
    `Diner flagged ${input.category.toUpperCase()} issue for ${input.dishName} (${input.orderId}): "${input.description}"`,
    undefined,
    'filed'
  );

  const auditEntries: AuditEntry[] = [filingAudit];

  let newIncident: SafetyIncident | null = null;
  const nextIncidents = [...state.incidents];

  if (requiresIncident && incidentId) {
    const triageAudit = createAuditEntry(
      'Safety Engine Auto-Triage',
      'Incident Escalation',
      `Auto-escalated ${input.category} complaint to ${severity.toUpperCase()} incident. Assigned to Shift Supervisor Chef R. Suresh.`,
      'filed',
      'awaiting-verification'
    );
    auditEntries.push(triageAudit);

    newIncident = {
      id: incidentId,
      title: `${input.category === 'allergen' ? 'Allergen Alert' : 'Thermal Hold Alert'}: ${input.dishName}`,
      severity,
      location: `Service Bay 3 / Table ${input.seatNumber || 'N/A'}`,
      timestamp: `${nowFormatted} (Today)`,
      reportedBy: `${reporter} (via PlateProof QR)`,
      supervisorActionNeeded: true,
      correctiveActionPlan: `Immediate station isolation and supervisor audit initiated for order ${input.orderId}. Table visit and CCP verification scheduled.`,
      status: 'awaiting-verification',
      openedAt: nowFormatted,
      fixedAt: null,
      verifiedAt: null,
      closedAt: null,
      assignedTo: 'Chef R. Suresh (FSS-KA-8819)',
      createdBy: reporter,
      customerVisible: true,
      internalNotes: `Auto-generated from diner ticket ${complaintId}. Contact: ${input.dinerContact}`,
      linkedComplaintId: complaintId,
      evidence: [],
      auditTrail: [
        createAuditEntry(
          'System Auto-Triage',
          'Incident Created',
          `Linked to diner ticket ${complaintId} for dish ${input.dishName}.`
        ),
      ],
    };

    nextIncidents.unshift(newIncident);
  }

  const newComplaint: ComplaintRecord = {
    id: complaintId,
    orderId: input.orderId,
    token: input.token,
    dishName: input.dishName,
    category: input.category,
    severity,
    status: requiresIncident ? 'investigating' : 'filed',
    reportedBy: reporter,
    dinerContact: input.dinerContact,
    seatNumber: input.seatNumber,
    description: input.description,
    reportedAt: nowFormatted,
    assignedTo: 'Chef R. Suresh (FSS-KA-8819)',
    linkedIncidentId: incidentId,
    linkedCapaId: null,
    evidence: [],
    auditTrail: auditEntries,
    resolutionNote: '',
    closedAt: null,
  };

  const nextComplaints = [newComplaint, ...state.complaints];

  const nextState: PlateProofState = {
    ...state,
    complaints: nextComplaints,
    incidents: nextIncidents,
  };

  return {
    nextState,
    result: {
      complaint: newComplaint,
      incident: newIncident,
      duplicate: false,
      auditEntries,
    },
  };
}

/**
 * Supervisor signs off on a Corrective Action (CAPA).
 * Cascades approval to linked incident and resolution to linked complaints.
 */
export function signOffCorrectiveAction(
  state: PlateProofState,
  capaId: string,
  supervisorName: string = 'Chef R. Suresh (FSS-KA-8819)',
  notes: string = 'Verified by physical inspection & secondary probe audit.'
): {
  nextState: PlateProofState;
  capa: CorrectiveAction | null;
  incident: SafetyIncident | null;
} {
  const nowFormatted = formatTimestamp();
  const capaIndex = state.correctiveActions.findIndex((c) => c.id === capaId);
  if (capaIndex === -1) {
    return { nextState: state, capa: null, incident: null };
  }

  const targetCapa = state.correctiveActions[capaIndex];
  const auditEntry = createAuditEntry(
    supervisorName,
    'CAPA Supervisor Approval',
    `Supervisor verified corrective remedial action for incident ${targetCapa.incidentRef}. Notes: ${notes}`,
    targetCapa.verificationStatus,
    'approved'
  );

  const updatedCapa: CorrectiveAction = {
    ...targetCapa,
    verificationStatus: 'approved',
    remedialVerificationLog: `${targetCapa.remedialVerificationLog} [Approved by ${supervisorName} at ${nowFormatted}]`,
    auditTrail: [...(targetCapa.auditTrail || []), auditEntry],
  };

  const nextCorrectiveActions = [...state.correctiveActions];
  nextCorrectiveActions[capaIndex] = updatedCapa;

  // Update associated incident
  let updatedIncident: SafetyIncident | null = null;
  const nextIncidents = state.incidents.map((inc) => {
    if (inc.id === targetCapa.incidentRef) {
      const incAudit = createAuditEntry(
        supervisorName,
        'Incident Verified & Closed',
        `Closed following successful CAPA sign-off (${capaId}).`,
        inc.status,
        'verified-closed'
      );
      updatedIncident = {
        ...inc,
        status: 'verified-closed',
        supervisorActionNeeded: false,
        verifiedAt: nowFormatted,
        closedAt: nowFormatted,
        auditTrail: [...(inc.auditTrail || []), incAudit],
      };
      return updatedIncident;
    }
    return inc;
  });

  // Update any linked complaints
  const nextComplaints = state.complaints.map((cmp) => {
    if (cmp.linkedIncidentId === targetCapa.incidentRef || cmp.linkedCapaId === capaId) {
      const cmpAudit = createAuditEntry(
        supervisorName,
        'Complaint Resolved & Closed',
        `Remedial action verified and approved by Shift Supervisor (${capaId}).`,
        cmp.status,
        'resolved-closed'
      );
      return {
        ...cmp,
        status: 'resolved-closed' as const,
        resolutionNote: `Resolved following supervisor sign-off on CAPA ${capaId}: ${updatedCapa.actionTaken}`,
        closedAt: nowFormatted,
        auditTrail: [...cmp.auditTrail, cmpAudit],
      };
    }
    return cmp;
  });

  const nextState: PlateProofState = {
    ...state,
    correctiveActions: nextCorrectiveActions,
    incidents: nextIncidents,
    complaints: nextComplaints,
  };

  return {
    nextState,
    capa: updatedCapa,
    incident: updatedIncident,
  };
}

/**
 * Transition incident status with validation and audit logging.
 */
export function transitionIncident(
  state: PlateProofState,
  incidentId: string,
  targetStatus: IncidentStatus,
  actor: string = 'Chef R. Suresh',
  notes: string = ''
): { nextState: PlateProofState; success: boolean; error?: string } {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    return { nextState: state, success: false, error: 'Incident not found' };
  }

  // Check if target status requires supervisor sign-off
  const isClosing = targetStatus === 'verified-closed' || targetStatus === 'closed' || targetStatus === 'verified';
  const validation = validateIncidentTransition(incident.status, targetStatus, isClosing);
  if (!validation.ok) {
    return { nextState: state, success: false, error: validation.error };
  }

  const nowFormatted = formatTimestamp();
  const audit = createAuditEntry(
    actor,
    `Status Transition: ${targetStatus}`,
    notes || `Incident transitioned from ${incident.status} to ${targetStatus}.`,
    incident.status,
    targetStatus
  );

  const nextIncidents = state.incidents.map((inc) => {
    if (inc.id === incidentId) {
      return {
        ...inc,
        status: targetStatus,
        supervisorActionNeeded: isClosing ? false : inc.supervisorActionNeeded,
        closedAt: isClosing ? nowFormatted : inc.closedAt,
        verifiedAt: targetStatus === 'verified' || targetStatus === 'verified-closed' ? nowFormatted : inc.verifiedAt,
        auditTrail: [...(inc.auditTrail || []), audit],
      };
    }
    return inc;
  });

  return {
    nextState: {
      ...state,
      incidents: nextIncidents,
    },
    success: true,
  };
}

/**
 * Resolves an inventory expiry risk item.
 */
export function resolveInventoryRiskItem(
  state: PlateProofState,
  riskId: string,
  actionName: string
): PlateProofState {
  const nextRisks = state.inventoryRisks.map((item) =>
    item.id === riskId
      ? {
          ...item,
          riskTier: 'normal' as const,
          suggestedAction: `Resolved: ${actionName} at ${formatTimestamp()}`,
        }
      : item
  );

  return {
    ...state,
    inventoryRisks: nextRisks,
  };
}

/**
 * Logs a manual handheld probe check, evaluates CCP limits,
 * records an inspection audit log, and spawns an alert incident if temperature breaches limits.
 */
export function logManualTemperatureReading(
  state: PlateProofState,
  probeLocation: string,
  tempC: number,
  notes: string,
  inspector: string = 'Chef R. Suresh'
): { nextState: PlateProofState; newAuditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident } {
  const nowFormatted = formatTimestamp();
  let status: 'passed' | 'rectified' | 'non-compliant' = 'passed';
  let safeLimitDesc = '';
  let isBreached = false;

  const loc = probeLocation.toLowerCase();
  if (loc.includes('chiller')) {
    safeLimitDesc = 'Safe: ≤4.0°C';
    if (tempC > 4.0) isBreached = true;
  } else if (loc.includes('grill') || loc.includes('tandoor')) {
    safeLimitDesc = 'Safe: ≥74.0°C (CCP-1)';
    if (tempC < 74.0) isBreached = true;
  } else if (loc.includes('warmer') || loc.includes('steam')) {
    safeLimitDesc = 'Safe: ≥63.0°C';
    if (tempC < 63.0) isBreached = true;
  }

  if (isBreached) {
    status = 'non-compliant';
  }

  const auditId = `AUD-${Math.floor(8900 + Math.random() * 1000)}`;
  const newAuditRecord: InspectionAuditRecord = {
    id: auditId,
    time: nowFormatted,
    checkpoint: `Manual Probe Spot Check: ${probeLocation}`,
    supervisor: inspector,
    result: status,
    comments: `Recorded ${tempC}°C (${safeLimitDesc}). ${notes}`,
    zone: probeLocation,
  };

  let alertIncident: SafetyIncident | undefined;
  const nextIncidents = [...state.incidents];

  if (isBreached) {
    alertIncident = {
      id: `INC-2026-${Math.floor(200 + Math.random() * 800)}`,
      title: `Critical Temperature Breach at ${probeLocation} (${tempC}°C)`,
      severity: 'critical',
      location: probeLocation,
      timestamp: `${nowFormatted} (Today)`,
      reportedBy: `${inspector} (Handheld Spot Check)`,
      supervisorActionNeeded: true,
      correctiveActionPlan: `Immediate thermal intervention required. Food holding suspended until recalibration and re-heat/re-chill verified.`,
      status: 'open',
      openedAt: nowFormatted,
      fixedAt: null,
      verifiedAt: null,
      closedAt: null,
      assignedTo: inspector,
      createdBy: inspector,
      customerVisible: false,
      internalNotes: `Manual check showed ${tempC}°C against rule ${safeLimitDesc}`,
      evidence: [],
      auditTrail: [
        createAuditEntry(
          inspector,
          'Breach Logged',
          `Manual thermocouple reading recorded at ${tempC}°C.`
        ),
      ],
    };
    nextIncidents.unshift(alertIncident);
  }

  const nextState: PlateProofState = {
    ...state,
    incidents: nextIncidents,
    inspectionAudits: [newAuditRecord, ...state.inspectionAudits],
  };

  return {
    nextState,
    newAuditRecord,
    alertIncident,
  };
}

/**
 * Adds an evidence item (photo, lab test, probe log) to an incident, complaint, or CAPA.
 */
export function attachEvidenceItem(
  state: PlateProofState,
  targetType: 'incident' | 'complaint' | 'capa',
  targetId: string,
  evidenceInput: Omit<EvidenceItem, 'id' | 'capturedAt'>,
  actor: string = 'Chef R. Suresh'
): PlateProofState {
  const newEvidence: EvidenceItem = {
    id: `EVD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    capturedAt: formatTimestamp(),
    ...evidenceInput,
  };

  const audit = createAuditEntry(
    actor,
    'Evidence Attached',
    `Attached ${newEvidence.kind.toUpperCase()} evidence: "${newEvidence.title}" (${newEvidence.reference})`
  );

  if (targetType === 'complaint') {
    return {
      ...state,
      complaints: state.complaints.map((c) =>
        c.id === targetId
          ? {
              ...c,
              evidence: [...(c.evidence || []), newEvidence],
              auditTrail: [...c.auditTrail, audit],
            }
          : c
      ),
    };
  }

  if (targetType === 'incident') {
    return {
      ...state,
      incidents: state.incidents.map((i) =>
        i.id === targetId
          ? {
              ...i,
              evidence: [...(i.evidence || []), newEvidence],
              auditTrail: [...(i.auditTrail || []), audit],
            }
          : i
      ),
    };
  }

  if (targetType === 'capa') {
    return {
      ...state,
      correctiveActions: state.correctiveActions.map((ca) =>
        ca.id === targetId
          ? {
              ...ca,
              evidence: [...(ca.evidence || []), newEvidence],
              auditTrail: [...(ca.auditTrail || []), audit],
            }
          : ca
      ),
    };
  }

  return state;
}
