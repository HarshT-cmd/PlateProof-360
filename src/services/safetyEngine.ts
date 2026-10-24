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
  UserRole,
  SeverityRule,
  IncidentSeverity,
} from '../types';
import type { PlateProofState } from './safetyStorage';

/**
 * Configurable demo safety rules defining domain severity mappings.
 */
export const DEFAULT_DEMO_RULES: SeverityRule[] = [
  {
    id: 'RULE-01',
    name: 'Failed Hygiene Check',
    condition: 'hygiene-failed',
    severity: 'moderate',
    description: 'Failed hygiene check -> Medium severity.',
  },
  {
    id: 'RULE-02',
    name: 'Operational Temperature Limit Breach',
    condition: 'temp-exceeded',
    severity: 'high',
    description: 'Temperature exceeding a configured operational limit -> High severity.',
  },
  {
    id: 'RULE-03',
    name: 'Expired Ingredient Batch',
    condition: 'ingredient-expired',
    severity: 'critical',
    description: 'Expired ingredient -> Critical severity.',
  },
  {
    id: 'RULE-04',
    name: 'Undercooked Food Complaint for Demo Order #1042',
    condition: 'complaint-undercooked',
    severity: 'moderate',
    description: 'Undercooked-food complaint for demo Order #1042 -> Medium severity.',
  },
];

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
 * Creates an immutable audit entry with customer-visibility segregation and actor roles.
 */
export function createAuditEntry(
  actor: string,
  action: string,
  detail: string,
  previousStatus?: string,
  newStatus?: string,
  customerVisible: boolean = true,
  actorRole?: UserRole
): AuditEntry {
  return {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    at: formatTimestamp(),
    actor,
    actorRole,
    action,
    detail,
    previousStatus,
    newStatus,
    customerVisible,
  };
}

export interface SafetyRuleContext {
  orderId?: string;
  category?: ComplaintCategory;
  description?: string;
  isHygieneFailed?: boolean;
  isTempExceeded?: boolean;
  isIngredientExpired?: boolean;
}

/**
 * Evaluates configurable demo business rules.
 */
export function evaluateSeverityRule(context: SafetyRuleContext): IncidentSeverity {
  // Rule 3: Expired ingredient -> Critical severity
  if (context.isIngredientExpired) {
    return 'critical';
  }

  // Rule 2: Temperature exceeding configured operational limit -> High severity
  if (context.isTempExceeded) {
    return 'high';
  }

  // Rule 1: Failed hygiene check -> Medium severity ('moderate')
  if (context.isHygieneFailed) {
    return 'moderate';
  }

  // Rule 4: Undercooked-food complaint for demo Order #1042 -> Medium severity ('moderate')
  const normalizedOrder = (context.orderId || '').toLowerCase().replace(/^(order-|ord-)/, '');
  const descLower = (context.description || '').toLowerCase();
  if (
    normalizedOrder === '1042' &&
    (descLower.includes('undercooked') || descLower.includes('raw') || context.category === 'temperature')
  ) {
    return 'moderate';
  }

  return determineSeverity(context.category || 'quality', context.description || '', context.orderId);
}

/**
 * Determines complaint severity based on category, description keywords, and order context.
 */
export function determineSeverity(
  category: ComplaintCategory,
  description: string = '',
  orderId?: string
): ComplaintSeverity {
  const lower = description.toLowerCase();
  const normalizedOrder = (orderId || '').toLowerCase().replace(/^(order-|ord-)/, '');

  // Rule 4: Undercooked-food complaint for demo Order #1042 -> Medium severity ('moderate')
  if (
    normalizedOrder === '1042' &&
    (lower.includes('undercooked') || lower.includes('raw') || category === 'temperature')
  ) {
    return 'moderate';
  }

  // Medical / Anaphylaxis / Critical allergen
  if (category === 'allergen' || lower.includes('anaphylaxis') || lower.includes('allergic')) {
    return 'critical';
  }

  // Temperature / raw under normal circumstances -> High
  if (category === 'temperature' || lower.includes('raw') || lower.includes('undercooked')) {
    return 'high';
  }

  // Packaging / Foreign matter -> Moderate
  if (category === 'packaging' || lower.includes('tamper') || lower.includes('spill') || lower.includes('glass')) {
    return 'moderate';
  }

  return 'low';
}

export interface TransitionContext {
  actor?: string;
  actorRole?: UserRole;
  notes?: string;
  evidenceProvided?: boolean;
  incidentEvidenceCount?: number;
  assignedStaff?: string | null;
  capaApproved?: boolean;
}

/**
 * Validates explicit state transitions across the canonical lifecycle:
 * Open -> Fixed -> Verified -> Closed.
 * Enforces:
 * 1. Staff must not verify their own corrective actions.
 * 2. Closure must be rejected until supervisor verification and evidence exist.
 */
export function validateIncidentTransition(
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus,
  context?: TransitionContext | boolean
): TransitionResult<IncidentStatus> {
  const ctx: TransitionContext = typeof context === 'boolean' ? { capaApproved: context } : (context || {});

  // Normalize canonical aliases
  const normalize = (s: IncidentStatus): 'open' | 'fixed' | 'verified' | 'closed' => {
    if (s === 'in-progress') return 'open';
    if (s === 'awaiting-verification') return 'fixed';
    if (s === 'verified-closed') return 'closed';
    return s;
  };

  const from = normalize(currentStatus);
  const to = normalize(targetStatus);

  if (from === to && currentStatus === targetStatus) {
    return { ok: true, previousState: currentStatus, newState: targetStatus };
  }

  // State 1: Open -> Fixed (or in-progress)
  if (from === 'open') {
    if (to === 'fixed' || targetStatus === 'in-progress' || targetStatus === 'awaiting-verification') {
      return { ok: true, previousState: currentStatus, newState: targetStatus };
    }
    return {
      ok: false,
      previousState: currentStatus,
      newState: targetStatus,
      error: 'Invalid transition: Cannot skip from Open directly to Verified or Closed. Remediation must be documented and marked as Fixed first.',
    };
  }

  // State 2: Fixed -> Verified (Supervisor review)
  if (from === 'fixed') {
    if (to === 'verified') {
      // Role enforcement: Staff must not verify their own corrective actions
      if (ctx.actorRole === 'staff' || ctx.actorRole === 'customer') {
        return {
          ok: false,
          previousState: currentStatus,
          newState: targetStatus,
          error: 'Role restriction: Staff members cannot verify their own corrective actions. Verification requires an authorized supervisor or auditor.',
        };
      }

      if (
        ctx.assignedStaff &&
        ctx.actor &&
        (ctx.actor.toLowerCase().includes(ctx.assignedStaff.toLowerCase()) ||
          ctx.assignedStaff.toLowerCase().includes(ctx.actor.toLowerCase()))
      ) {
        return {
          ok: false,
          previousState: currentStatus,
          newState: targetStatus,
          error: 'Self-verification prohibited: Staff members cannot verify their own corrective actions.',
        };
      }

      return { ok: true, previousState: currentStatus, newState: targetStatus };
    }

    if (to === 'open') {
      // Reopened if fix was insufficient
      return { ok: true, previousState: currentStatus, newState: targetStatus };
    }

    if (to === 'closed') {
      return {
        ok: false,
        previousState: currentStatus,
        newState: targetStatus,
        error: 'Closure rejected: Incident must be reviewed and verified by an authorized supervisor before closure.',
      };
    }
  }

  // State 3: Verified -> Closed
  if (from === 'verified') {
    if (to === 'closed') {
      // Role enforcement: Only supervisor or auditor can close
      if (ctx.actorRole === 'staff' || ctx.actorRole === 'customer') {
        return {
          ok: false,
          previousState: currentStatus,
          newState: targetStatus,
          error: 'Role restriction: Only an authorized supervisor or auditor can close an incident.',
        };
      }

      // Closure must be rejected until required evidence exists
      const evidenceCount = ctx.incidentEvidenceCount ?? 0;
      if (evidenceCount === 0 && !ctx.evidenceProvided) {
        return {
          ok: false,
          previousState: currentStatus,
          newState: targetStatus,
          error: 'Closure rejected: Verifiable evidence (thermocouple log, photo, or swab test) must exist before closing an incident.',
        };
      }
      return { ok: true, previousState: currentStatus, newState: targetStatus };
    }

    if (to === 'open' || to === 'fixed') {
      return { ok: true, previousState: currentStatus, newState: targetStatus };
    }
  }

  // State 4: Closed
  if (from === 'closed') {
    return {
      ok: false,
      previousState: currentStatus,
      newState: targetStatus,
      error: 'Incident is already closed and archived.',
    };
  }

  return { ok: true, previousState: currentStatus, newState: targetStatus };
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
 * Implements idempotent filing to prevent duplicate incidents from repeated clicks.
 */
export function fileComplaint(
  state: PlateProofState,
  input: FileComplaintInput
): { nextState: PlateProofState; result: ComplaintFilingResult } {
  const normalizedOrderId = input.orderId.toLowerCase().replace(/^(order-|ord-)/, '');

  // Idempotency check: prevent duplicate submissions for the same open complaint
  const existingComplaint = state.complaints.find((c) => {
    const cOrder = c.orderId.toLowerCase().replace(/^(order-|ord-)/, '');
    const isSameOrder = cOrder === normalizedOrderId;
    const isSameDish = c.dishName.toLowerCase().trim() === input.dishName.toLowerCase().trim();
    const isSameCategory = c.category === input.category;
    const isSimilarDesc =
      c.description.toLowerCase().trim().includes(input.description.toLowerCase().trim()) ||
      input.description.toLowerCase().trim().includes(c.description.toLowerCase().trim());
    return isSameOrder && isSameDish && (isSameCategory || isSimilarDesc) && c.status !== 'resolved-closed';
  });

  if (existingComplaint) {
    const linkedIncident = existingComplaint.linkedIncidentId
      ? state.incidents.find((i) => i.id === existingComplaint.linkedIncidentId) || null
      : null;

    return {
      nextState: state,
      result: {
        complaint: existingComplaint,
        incident: linkedIncident,
        duplicate: true,
        auditEntries: [],
      },
    };
  }

  const severity = determineSeverity(input.category, input.description, input.orderId);
  const complaintId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowFormatted = formatTimestamp();
  const reporter = input.reportedBy || (input.seatNumber ? `Diner at ${input.seatNumber}` : 'Diner (QR App)');

  // Determine if this is a safety issue requiring supervisor intervention
  const isUndercooked1042 = normalizedOrderId === '1042' && input.description.toLowerCase().includes('undercooked');
  const requiresIncident =
    severity === 'critical' ||
    severity === 'high' ||
    severity === 'moderate' ||
    isUndercooked1042 ||
    input.category === 'temperature' ||
    input.category === 'allergen';

  const incidentId = requiresIncident ? `INC-2026-${Math.floor(100 + Math.random() * 900)}` : null;

  const filingAudit = createAuditEntry(
    reporter,
    'Safety Concern Filed',
    `Diner flagged ${input.category.toUpperCase()} issue for ${input.dishName} (${input.orderId}): "${input.description}"`,
    undefined,
    'filed',
    true,
    'customer'
  );

  const auditEntries: AuditEntry[] = [filingAudit];

  let newIncident: SafetyIncident | null = null;
  const nextIncidents = [...state.incidents];

  if (requiresIncident && incidentId) {
    const triageAudit = createAuditEntry(
      'Safety Action Engine',
      'Incident Escalation',
      `Auto-escalated ${input.category} complaint to ${severity.toUpperCase()} incident. Ready for supervisor triage.`,
      'open',
      'open',
      true,
      'supervisor'
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
      correctiveActionPlan: `Physical verification and secondary probe audit scheduled for order ${input.orderId}.`,
      status: 'open',
      openedAt: nowFormatted,
      fixedAt: null,
      verifiedAt: null,
      closedAt: null,
      assignedTo: null, // Awaiting manager assignment
      createdBy: reporter,
      customerVisible: true,
      internalNotes: `Auto-generated from diner ticket ${complaintId}. Contact: ${input.dinerContact}`,
      linkedComplaintId: complaintId,
      evidence: [],
      auditTrail: [
        createAuditEntry(
          'System Auto-Triage',
          'Incident Created',
          `Linked to diner ticket ${complaintId} for dish ${input.dishName}.`,
          undefined,
          'open',
          true
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
    assignedTo: 'Shift Supervisor Chef R. Suresh',
    linkedIncidentId: incidentId,
    linkedCapaId: null,
    evidence: [],
    auditTrail: auditEntries,
    resolutionNote: '',
    internalNotes: `Diner channel submission. Priority triage code: ${severity.toUpperCase()}`,
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
 * Assigns an incident to a designated staff member with operational audit trail.
 */
export function assignIncident(
  state: PlateProofState,
  incidentId: string,
  assignee: string,
  actor: string = 'Chef R. Suresh',
  actorRole: UserRole = 'supervisor'
): { nextState: PlateProofState; incident: SafetyIncident | null; error?: string } {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    return { nextState: state, incident: null, error: 'Incident not found' };
  }

  const audit = createAuditEntry(
    actor,
    'Incident Assigned',
    `Assigned to ${assignee} for investigation and physical remediation.`,
    incident.status,
    incident.status,
    false,
    actorRole
  );

  const updatedIncident: SafetyIncident = {
    ...incident,
    assignedTo: assignee,
    auditTrail: [...(incident.auditTrail || []), audit],
  };

  const nextIncidents = state.incidents.map((i) => (i.id === incidentId ? updatedIncident : i));

  // If linked to a complaint, reflect the assignment
  const nextComplaints = state.complaints.map((c) => {
    if (c.linkedIncidentId === incidentId) {
      return {
        ...c,
        assignedTo: assignee,
        auditTrail: [...c.auditTrail, audit],
      };
    }
    return c;
  });

  return {
    nextState: {
      ...state,
      incidents: nextIncidents,
      complaints: nextComplaints,
    },
    incident: updatedIncident,
  };
}

/**
 * Staff documents investigation, corrective action, and optional evidence metadata (Open -> Fixed).
 */
export function documentIncidentFix(
  state: PlateProofState,
  incidentId: string,
  fixNotes: string,
  correctiveActionPlan: string = '',
  evidenceItem?: Omit<EvidenceItem, 'id' | 'capturedAt'>,
  actor: string = 'Ankit Verma',
  actorRole: UserRole = 'staff'
): { nextState: PlateProofState; incident: SafetyIncident | null; error?: string } {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    return { nextState: state, incident: null, error: 'Incident not found' };
  }

  const validation = validateIncidentTransition(incident.status, 'fixed', {
    actor,
    actorRole,
    notes: fixNotes,
    assignedStaff: incident.assignedTo,
  });

  if (!validation.ok) {
    return { nextState: state, incident: null, error: validation.error };
  }

  const nowFormatted = formatTimestamp();
  const updatedEvidence = incident.evidence ? [...incident.evidence] : [];

  if (evidenceItem) {
    const newEvidence: EvidenceItem = {
      id: `EVD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      capturedAt: nowFormatted,
      ...evidenceItem,
    };
    updatedEvidence.push(newEvidence);
  }

  const audit = createAuditEntry(
    actor,
    'Remediation Documented (Fixed)',
    fixNotes || `Corrective action executed: ${correctiveActionPlan || 'Standard remediation applied.'}`,
    incident.status,
    'fixed',
    true,
    actorRole
  );

  const updatedIncident: SafetyIncident = {
    ...incident,
    status: 'fixed',
    fixedAt: nowFormatted,
    correctiveActionPlan: correctiveActionPlan || incident.correctiveActionPlan,
    evidence: updatedEvidence,
    auditTrail: [...(incident.auditTrail || []), audit],
  };

  const nextIncidents = state.incidents.map((i) => (i.id === incidentId ? updatedIncident : i));

  // Update linked complaint
  const nextComplaints = state.complaints.map((c) => {
    if (c.linkedIncidentId === incidentId) {
      return {
        ...c,
        status: 'investigating' as const,
        evidence:
          evidenceItem && updatedEvidence.length > 0
            ? [...(c.evidence || []), updatedEvidence[updatedEvidence.length - 1]]
            : c.evidence,
        auditTrail: [...c.auditTrail, audit],
      };
    }
    return c;
  });

  return {
    nextState: {
      ...state,
      incidents: nextIncidents,
      complaints: nextComplaints,
    },
    incident: updatedIncident,
  };
}

/**
 * An authorized supervisor reviews submitted evidence and verifies the fix (Fixed -> Verified).
 * Enforces: Staff must not verify their own corrective actions.
 */
export function verifyIncidentFix(
  state: PlateProofState,
  incidentId: string,
  verificationNotes: string,
  actor: string = 'Chef R. Suresh',
  actorRole: UserRole = 'supervisor'
): { nextState: PlateProofState; incident: SafetyIncident | null; error?: string } {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    return { nextState: state, incident: null, error: 'Incident not found' };
  }

  const validation = validateIncidentTransition(incident.status, 'verified', {
    actor,
    actorRole,
    assignedStaff: incident.assignedTo,
    incidentEvidenceCount: incident.evidence?.length || 0,
    notes: verificationNotes,
  });

  if (!validation.ok) {
    return { nextState: state, incident: null, error: validation.error };
  }

  const nowFormatted = formatTimestamp();
  const audit = createAuditEntry(
    actor,
    'Supervisor Verification Completed',
    `Supervisor physically verified corrective action and probe readings: "${verificationNotes}"`,
    incident.status,
    'verified',
    true,
    actorRole
  );

  const updatedIncident: SafetyIncident = {
    ...incident,
    status: 'verified',
    verifiedAt: nowFormatted,
    auditTrail: [...(incident.auditTrail || []), audit],
  };

  const nextIncidents = state.incidents.map((i) => (i.id === incidentId ? updatedIncident : i));

  const nextComplaints = state.complaints.map((c) => {
    if (c.linkedIncidentId === incidentId) {
      return {
        ...c,
        auditTrail: [...c.auditTrail, audit],
      };
    }
    return c;
  });

  return {
    nextState: {
      ...state,
      incidents: nextIncidents,
      complaints: nextComplaints,
    },
    incident: updatedIncident,
  };
}

/**
 * An authorized supervisor formally closes and certifies the incident (Verified -> Closed).
 * Enforces: Closure must be rejected until required evidence and supervisor verification exist.
 */
export function closeIncident(
  state: PlateProofState,
  incidentId: string,
  closureNotes: string,
  actor: string = 'Chef R. Suresh',
  actorRole: UserRole = 'supervisor'
): { nextState: PlateProofState; incident: SafetyIncident | null; error?: string } {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    return { nextState: state, incident: null, error: 'Incident not found' };
  }

  const validation = validateIncidentTransition(incident.status, 'closed', {
    actor,
    actorRole,
    assignedStaff: incident.assignedTo,
    incidentEvidenceCount: incident.evidence?.length || 0,
    notes: closureNotes,
  });

  if (!validation.ok) {
    return { nextState: state, incident: null, error: validation.error };
  }

  const nowFormatted = formatTimestamp();
  const audit = createAuditEntry(
    actor,
    'Incident Certified & Closed',
    closureNotes || 'Incident formally closed following supervisor review and verified evidence audit.',
    incident.status,
    'closed',
    true,
    actorRole
  );

  const updatedIncident: SafetyIncident = {
    ...incident,
    status: 'closed',
    closedAt: nowFormatted,
    supervisorActionNeeded: false,
    auditTrail: [...(incident.auditTrail || []), audit],
  };

  const nextIncidents = state.incidents.map((i) => (i.id === incidentId ? updatedIncident : i));

  // Close linked complaints
  const nextComplaints = state.complaints.map((c) => {
    if (c.linkedIncidentId === incidentId) {
      return {
        ...c,
        status: 'resolved-closed' as const,
        closedAt: nowFormatted,
        resolutionNote: closureNotes || 'Remedial action verified and approved by Shift Supervisor.',
        auditTrail: [...c.auditTrail, audit],
      };
    }
    return c;
  });

  return {
    nextState: {
      ...state,
      incidents: nextIncidents,
      complaints: nextComplaints,
    },
    incident: updatedIncident,
  };
}

/**
 * Transition incident status with validation and audit logging across the canonical lifecycle:
 * Open -> Fixed -> Verified -> Closed.
 */
export function transitionIncident(
  state: PlateProofState,
  incidentId: string,
  targetStatus: IncidentStatus,
  actor: string = 'Chef R. Suresh',
  notes: string = '',
  actorRole?: UserRole
): { nextState: PlateProofState; success: boolean; error?: string } {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    return { nextState: state, success: false, error: 'Incident not found' };
  }

  const context: TransitionContext = {
    actor,
    actorRole,
    notes,
    assignedStaff: incident.assignedTo,
    incidentEvidenceCount: incident.evidence ? incident.evidence.length : 0,
  };

  const validation = validateIncidentTransition(incident.status, targetStatus, context);
  if (!validation.ok) {
    return { nextState: state, success: false, error: validation.error };
  }

  const nowFormatted = formatTimestamp();
  const isClosing = targetStatus === 'closed' || targetStatus === 'verified-closed';
  const isVerifying = targetStatus === 'verified' || targetStatus === 'verified-closed';
  const isFixing = targetStatus === 'fixed' || targetStatus === 'awaiting-verification';

  const audit = createAuditEntry(
    actor,
    `Status Transition: ${targetStatus}`,
    notes || `Incident transitioned from ${incident.status} to ${targetStatus}.`,
    incident.status,
    targetStatus,
    true,
    actorRole
  );

  const updatedIncident: SafetyIncident = {
    ...incident,
    status: targetStatus,
    supervisorActionNeeded: isClosing ? false : incident.supervisorActionNeeded,
    fixedAt: isFixing ? incident.fixedAt || nowFormatted : incident.fixedAt,
    verifiedAt: isVerifying ? nowFormatted : incident.verifiedAt,
    closedAt: isClosing ? nowFormatted : incident.closedAt,
    auditTrail: [...(incident.auditTrail || []), audit],
  };

  const nextIncidents = state.incidents.map((inc) => (inc.id === incidentId ? updatedIncident : inc));

  // If closing incident, also close linked complaints
  const nextComplaints = state.complaints.map((c) => {
    if (c.linkedIncidentId === incidentId && isClosing) {
      return {
        ...c,
        status: 'resolved-closed' as const,
        closedAt: nowFormatted,
        resolutionNote: notes || 'Incident closed following supervisor verification.',
        auditTrail: [...c.auditTrail, audit],
      };
    }
    return c;
  });

  return {
    nextState: {
      ...state,
      incidents: nextIncidents,
      complaints: nextComplaints,
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
      title: `Operational Temperature Limit Breach at ${probeLocation} (${tempC}°C)`,
      severity: 'high', // Rule 2: Temperature exceeding configured operational limit -> High severity
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
 * Records an inspection hygiene checklist result.
 * Rule 1: Failed hygiene check -> Medium severity ('moderate').
 */
export function logHygieneCheckResult(
  state: PlateProofState,
  checkpoint: string,
  zone: string,
  passed: boolean,
  comments: string,
  inspector: string = 'Chef R. Suresh'
): { nextState: PlateProofState; auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident } {
  const nowFormatted = formatTimestamp();
  const auditId = `AUD-${Math.floor(8000 + Math.random() * 1000)}`;
  const auditRecord: InspectionAuditRecord = {
    id: auditId,
    time: nowFormatted,
    checkpoint,
    supervisor: inspector,
    result: passed ? 'passed' : 'non-compliant',
    comments,
    zone,
  };

  let alertIncident: SafetyIncident | undefined;
  const nextIncidents = [...state.incidents];

  if (!passed) {
    alertIncident = {
      id: `INC-2026-${Math.floor(300 + Math.random() * 700)}`,
      title: `Failed Hygiene Check: ${checkpoint}`,
      severity: 'moderate', // Rule 1: Failed hygiene check -> Medium severity
      location: zone,
      timestamp: `${nowFormatted} (Today)`,
      reportedBy: `${inspector} (Hygiene Checklist Audit)`,
      supervisorActionNeeded: true,
      correctiveActionPlan: 'Sanitation remediation, surface swab audit, and retraining.',
      status: 'open',
      openedAt: nowFormatted,
      fixedAt: null,
      verifiedAt: null,
      closedAt: null,
      assignedTo: null,
      createdBy: inspector,
      customerVisible: false,
      internalNotes: `Hygiene checkpoint failure: ${comments}`,
      evidence: [],
      auditTrail: [
        createAuditEntry(
          inspector,
          'Failed Hygiene Check',
          `Non-compliant result recorded at ${zone}: "${comments}"`
        ),
      ],
    };
    nextIncidents.unshift(alertIncident);
  }

  return {
    nextState: {
      ...state,
      inspectionAudits: [auditRecord, ...state.inspectionAudits],
      incidents: nextIncidents,
    },
    auditRecord,
    alertIncident,
  };
}

/**
 * Flags an expired ingredient batch.
 * Rule 3: Expired ingredient -> Critical severity.
 */
export function reportExpiredIngredient(
  state: PlateProofState,
  riskId: string,
  actor: string = 'Chef R. Suresh'
): { nextState: PlateProofState; alertIncident?: SafetyIncident } {
  const risk = state.inventoryRisks.find((r) => r.id === riskId);
  const nowFormatted = formatTimestamp();

  const nextRisks = state.inventoryRisks.map((r) =>
    r.id === riskId
      ? {
          ...r,
          riskTier: 'critical' as const,
          hoursUntilExpiry: 0,
          suggestedAction: `QUARANTINED: Immediate disposal ordered by ${actor} at ${nowFormatted}.`,
        }
      : r
  );

  const ingredientName = risk ? risk.ingredient : 'Batch';
  const batchNum = risk ? risk.batchNumber : 'N/A';
  const alertIncident: SafetyIncident = {
    id: `INC-2026-${Math.floor(400 + Math.random() * 600)}`,
    title: `Expired Ingredient Discovered: ${ingredientName} (${batchNum})`,
    severity: 'critical', // Rule 3: Expired ingredient -> Critical severity
    location: risk?.storageLocation || 'Dry Storage',
    timestamp: `${nowFormatted} (Today)`,
    reportedBy: `${actor} (Inventory Audit)`,
    supervisorActionNeeded: true,
    correctiveActionPlan: `Immediate quarantine, destruction certificate logging, and batch traceback.`,
    status: 'open',
    openedAt: nowFormatted,
    fixedAt: null,
    verifiedAt: null,
    closedAt: null,
    assignedTo: null,
    createdBy: actor,
    customerVisible: false,
    internalNotes: `Batch ${batchNum} expired. Quarantine initiated.`,
    evidence: [],
    auditTrail: [
      createAuditEntry(
        actor,
        'Expired Ingredient Quarantine',
        `Batch ${batchNum} flagged as expired. Critical incident triggered.`
      ),
    ],
  };

  return {
    nextState: {
      ...state,
      inventoryRisks: nextRisks,
      incidents: [alertIncident, ...state.incidents],
    },
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

/**
 * Resolves a customer or internal complaint with supervisor notes and creates an immutable audit entry.
 */
export function resolveComplaint(
  state: PlateProofState,
  complaintId: string,
  resolutionNote: string,
  actor: string = 'Chef R. Suresh (FSS-KA-8819)'
): { nextState: PlateProofState; complaint: ComplaintRecord | null } {
  const nowFormatted = formatTimestamp();
  const target = state.complaints.find((c) => c.id === complaintId);
  if (!target) {
    return { nextState: state, complaint: null };
  }

  const audit = createAuditEntry(
    actor,
    'Complaint Resolved by Supervisor',
    `Resolution note: "${resolutionNote}"`,
    target.status,
    'resolved-closed'
  );

  const updated: ComplaintRecord = {
    ...target,
    status: 'resolved-closed',
    resolutionNote,
    closedAt: nowFormatted,
    auditTrail: [...target.auditTrail, audit],
  };

  const nextComplaints = state.complaints.map((c) => (c.id === complaintId ? updated : c));

  return {
    nextState: {
      ...state,
      complaints: nextComplaints,
    },
    complaint: updated,
  };
}

