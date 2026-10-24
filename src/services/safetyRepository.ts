import type {
  OrderSafetyProof,
  SafetyIncident,
  ComplaintRecord,
  CorrectiveAction,
  InventoryRisk,
  TemperatureTrendPoint,
  InspectionAuditRecord,
  IncidentStatus,
  ComplaintFilingResult,
  EvidenceItem,
  UserRole,
} from '../types';
import {
  loadState,
  saveState,
  resetStateToSeed,
  type PlateProofState,
} from './safetyStorage';
import {
  fileComplaint as engineFileComplaint,
  signOffCorrectiveAction as engineSignOffCapa,
  resolveInventoryRiskItem as engineResolveRisk,
  logManualTemperatureReading as engineLogTemp,
  transitionIncident as engineTransitionIncident,
  assignIncident as engineAssignIncident,
  documentIncidentFix as engineDocumentIncidentFix,
  verifyIncidentFix as engineVerifyIncidentFix,
  closeIncident as engineCloseIncident,
  logHygieneCheckResult as engineLogHygieneCheck,
  reportExpiredIngredient as engineReportExpiredIngredient,
  attachEvidenceItem as engineAttachEvidence,
  resolveComplaint as engineResolveComplaint,
  type FileComplaintInput,
} from './safetyEngine';

export interface ISafetyRepository {
  getState(): Promise<PlateProofState>;
  getOrders(): Promise<OrderSafetyProof[]>;
  getOrder(tokenOrId: string): Promise<OrderSafetyProof>;
  getIncidents(): Promise<SafetyIncident[]>;
  getComplaints(): Promise<ComplaintRecord[]>;
  getComplaintsForOrder(orderId: string): Promise<ComplaintRecord[]>;
  getCorrectiveActions(): Promise<CorrectiveAction[]>;
  getInventoryRisks(): Promise<InventoryRisk[]>;
  getTemperatureTrends(): Promise<TemperatureTrendPoint[]>;
  getInspectionAudits(): Promise<InspectionAuditRecord[]>;

  fileComplaint(input: FileComplaintInput): Promise<ComplaintFilingResult>;
  resolveComplaint(complaintId: string, resolutionNote: string, actor?: string): Promise<ComplaintRecord | null>;
  signOffCorrectiveAction(
    capaId: string,
    supervisorName?: string,
    notes?: string
  ): Promise<{ capa: CorrectiveAction | null; incident: SafetyIncident | null }>;
  resolveInventoryRisk(riskId: string, actionName: string): Promise<void>;
  logManualTemperature(
    probeLocation: string,
    tempC: number,
    notes: string,
    inspector?: string
  ): Promise<{ auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident }>;
  logHygieneCheck(
    checkpoint: string,
    zone: string,
    passed: boolean,
    comments: string,
    inspector?: string
  ): Promise<{ auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident }>;
  reportExpiredIngredient(
    riskId: string,
    actor?: string
  ): Promise<{ alertIncident?: SafetyIncident }>;
  assignIncident(
    incidentId: string,
    assignee: string,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }>;
  documentIncidentFix(
    incidentId: string,
    fixNotes: string,
    correctiveActionPlan?: string,
    evidenceItem?: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }>;
  verifyIncidentFix(
    incidentId: string,
    verificationNotes: string,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }>;
  closeIncident(
    incidentId: string,
    closureNotes: string,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }>;
  transitionIncident(
    incidentId: string,
    targetStatus: IncidentStatus,
    actor?: string,
    notes?: string,
    actorRole?: UserRole
  ): Promise<{ success: boolean; error?: string }>;
  attachEvidence(
    targetType: 'incident' | 'complaint' | 'capa',
    targetId: string,
    evidence: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor?: string
  ): Promise<void>;
  resetDemoData(): Promise<PlateProofState>;

  subscribe(listener: (state: PlateProofState) => void): () => void;
}

/**
 * Enterprise Culinary Food Safety Repository.
 * Provides an asynchronous domain interface isolating UI components
 * from underlying persistence, ready for REST API or PostgreSQL backend integration.
 */
export class LocalSafetyRepository implements ISafetyRepository {
  private state: PlateProofState;
  private listeners: Set<(state: PlateProofState) => void> = new Set();

  constructor() {
    this.state = loadState();

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'plateproof_360_store_v1') {
          this.state = loadState();
          this.notify();
        }
      });
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[SafetyRepository] Listener error:', err);
      }
    }
  }

  private commit(nextState: PlateProofState) {
    this.state = nextState;
    saveState(nextState);
    this.notify();
  }

  public subscribe(listener: (state: PlateProofState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async getState(): Promise<PlateProofState> {
    return { ...this.state };
  }

  public async getOrders(): Promise<OrderSafetyProof[]> {
    return [...this.state.orders];
  }

  public async getOrder(tokenOrId: string): Promise<OrderSafetyProof> {
    const normalized = tokenOrId.toLowerCase().replace(/^(order-|ord-)/, '');
    const found = this.state.orders.find((o) => {
      const oId = o.orderId.toLowerCase().replace(/^(order-|ord-)/, '');
      const oToken = o.token.toLowerCase().replace(/^(order-|ord-)/, '');
      return oId === normalized || oToken === normalized;
    });
    return found || this.state.orders[0];
  }

  public async getIncidents(): Promise<SafetyIncident[]> {
    return [...this.state.incidents];
  }

  public async getComplaints(): Promise<ComplaintRecord[]> {
    return [...this.state.complaints];
  }

  public async getComplaintsForOrder(orderId: string): Promise<ComplaintRecord[]> {
    const normalized = orderId.toLowerCase().replace(/^(order-|ord-)/, '');
    return this.state.complaints.filter((c) => {
      const cId = c.orderId.toLowerCase().replace(/^(order-|ord-)/, '');
      return cId === normalized;
    });
  }

  public async getCorrectiveActions(): Promise<CorrectiveAction[]> {
    return [...this.state.correctiveActions];
  }

  public async getInventoryRisks(): Promise<InventoryRisk[]> {
    return [...this.state.inventoryRisks];
  }

  public async getTemperatureTrends(): Promise<TemperatureTrendPoint[]> {
    return [...this.state.temperatureTrends];
  }

  public async getInspectionAudits(): Promise<InspectionAuditRecord[]> {
    return [...this.state.inspectionAudits];
  }

  public async fileComplaint(input: FileComplaintInput): Promise<ComplaintFilingResult> {
    const { nextState, result } = engineFileComplaint(this.state, input);
    this.commit(nextState);
    return result;
  }

  public async resolveComplaint(
    complaintId: string,
    resolutionNote: string,
    actor: string = 'Chef R. Suresh (FSS-KA-8819)'
  ): Promise<ComplaintRecord | null> {
    const { nextState, complaint } = engineResolveComplaint(
      this.state,
      complaintId,
      resolutionNote,
      actor
    );
    if (complaint) {
      this.commit(nextState);
    }
    return complaint;
  }

  public async signOffCorrectiveAction(
    capaId: string,
    supervisorName: string = 'Chef R. Suresh (FSS-KA-8819)',
    notes: string = 'Verified by physical inspection & secondary probe audit.'
  ): Promise<{ capa: CorrectiveAction | null; incident: SafetyIncident | null }> {
    const { nextState, capa, incident } = engineSignOffCapa(
      this.state,
      capaId,
      supervisorName,
      notes
    );
    this.commit(nextState);
    return { capa, incident };
  }

  public async resolveInventoryRisk(riskId: string, actionName: string): Promise<void> {
    const nextState = engineResolveRisk(this.state, riskId, actionName);
    this.commit(nextState);
  }

  public async logManualTemperature(
    probeLocation: string,
    tempC: number,
    notes: string,
    inspector: string = 'Chef R. Suresh'
  ): Promise<{ auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident }> {
    const { nextState, newAuditRecord, alertIncident } = engineLogTemp(
      this.state,
      probeLocation,
      tempC,
      notes,
      inspector
    );
    this.commit(nextState);
    return { auditRecord: newAuditRecord, alertIncident };
  }

  public async logHygieneCheck(
    checkpoint: string,
    zone: string,
    passed: boolean,
    comments: string,
    inspector: string = 'Chef R. Suresh'
  ): Promise<{ auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident }> {
    const { nextState, auditRecord, alertIncident } = engineLogHygieneCheck(
      this.state,
      checkpoint,
      zone,
      passed,
      comments,
      inspector
    );
    this.commit(nextState);
    return { auditRecord, alertIncident };
  }

  public async reportExpiredIngredient(
    riskId: string,
    actor: string = 'Chef R. Suresh'
  ): Promise<{ alertIncident?: SafetyIncident }> {
    const { nextState, alertIncident } = engineReportExpiredIngredient(this.state, riskId, actor);
    this.commit(nextState);
    return { alertIncident };
  }

  public async assignIncident(
    incidentId: string,
    assignee: string,
    actor: string = 'Chef R. Suresh',
    actorRole: UserRole = 'supervisor'
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    const { nextState, incident, error } = engineAssignIncident(
      this.state,
      incidentId,
      assignee,
      actor,
      actorRole
    );
    if (!error && incident) {
      this.commit(nextState);
    }
    return { incident, error };
  }

  public async documentIncidentFix(
    incidentId: string,
    fixNotes: string,
    correctiveActionPlan: string = '',
    evidenceItem?: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor: string = 'Ankit Verma',
    actorRole: UserRole = 'staff'
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    const { nextState, incident, error } = engineDocumentIncidentFix(
      this.state,
      incidentId,
      fixNotes,
      correctiveActionPlan,
      evidenceItem,
      actor,
      actorRole
    );
    if (!error && incident) {
      this.commit(nextState);
    }
    return { incident, error };
  }

  public async verifyIncidentFix(
    incidentId: string,
    verificationNotes: string,
    actor: string = 'Chef R. Suresh',
    actorRole: UserRole = 'supervisor'
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    const { nextState, incident, error } = engineVerifyIncidentFix(
      this.state,
      incidentId,
      verificationNotes,
      actor,
      actorRole
    );
    if (!error && incident) {
      this.commit(nextState);
    }
    return { incident, error };
  }

  public async closeIncident(
    incidentId: string,
    closureNotes: string,
    actor: string = 'Chef R. Suresh',
    actorRole: UserRole = 'supervisor'
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    const { nextState, incident, error } = engineCloseIncident(
      this.state,
      incidentId,
      closureNotes,
      actor,
      actorRole
    );
    if (!error && incident) {
      this.commit(nextState);
    }
    return { incident, error };
  }

  public async transitionIncident(
    incidentId: string,
    targetStatus: IncidentStatus,
    actor: string = 'Chef R. Suresh',
    notes: string = '',
    actorRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    const { nextState, success, error } = engineTransitionIncident(
      this.state,
      incidentId,
      targetStatus,
      actor,
      notes,
      actorRole
    );
    if (success) {
      this.commit(nextState);
    }
    return { success, error };
  }

  public async attachEvidence(
    targetType: 'incident' | 'complaint' | 'capa',
    targetId: string,
    evidence: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor: string = 'Chef R. Suresh'
  ): Promise<void> {
    const nextState = engineAttachEvidence(this.state, targetType, targetId, evidence, actor);
    this.commit(nextState);
  }

  public async resetDemoData(): Promise<PlateProofState> {
    const seed = resetStateToSeed();
    this.state = seed;
    this.notify();
    return seed;
  }
}

/**
 * HTTP REST API-Backed Safety Repository.
 * Transparently queries the Express + PostgreSQL backend with automatic local fallback.
 */
export class HttpSafetyRepository implements ISafetyRepository {
  private local: LocalSafetyRepository;
  private apiBase: string;

  constructor(apiBase?: string) {
    this.local = new LocalSafetyRepository();
    this.apiBase =
      apiBase ||
      (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE) ||
      (typeof window !== 'undefined' && (window as unknown as { VITE_API_BASE?: string }).VITE_API_BASE) ||
      '/api';
  }

  public subscribe(listener: (state: PlateProofState) => void): () => void {
    return this.local.subscribe(listener);
  }

  public async getState(): Promise<PlateProofState> {
    return this.local.getState();
  }

  public async getOrders(): Promise<OrderSafetyProof[]> {
    try {
      const res = await fetch(`${this.apiBase}/orders`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return this.local.getOrders();
  }

  public async getOrder(tokenOrId: string): Promise<OrderSafetyProof> {
    try {
      const res = await fetch(`${this.apiBase}/orders/${tokenOrId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return this.local.getOrder(tokenOrId);
  }

  public async getIncidents(): Promise<SafetyIncident[]> {
    try {
      const res = await fetch(`${this.apiBase}/incidents`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return this.local.getIncidents();
  }

  public async getComplaints(): Promise<ComplaintRecord[]> {
    try {
      const res = await fetch(`${this.apiBase}/complaints`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return this.local.getComplaints();
  }

  public async getComplaintsForOrder(orderId: string): Promise<ComplaintRecord[]> {
    try {
      const res = await fetch(`${this.apiBase}/orders/${orderId}/complaints`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return this.local.getComplaintsForOrder(orderId);
  }

  public async getCorrectiveActions(): Promise<CorrectiveAction[]> {
    return this.local.getCorrectiveActions();
  }

  public async getInventoryRisks(): Promise<InventoryRisk[]> {
    try {
      const res = await fetch(`${this.apiBase}/inventory`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return this.local.getInventoryRisks();
  }

  public async getTemperatureTrends(): Promise<TemperatureTrendPoint[]> {
    return this.local.getTemperatureTrends();
  }

  public async getInspectionAudits(): Promise<InspectionAuditRecord[]> {
    return this.local.getInspectionAudits();
  }

  public async fileComplaint(input: FileComplaintInput): Promise<ComplaintFilingResult> {
    try {
      const res = await fetch(`${this.apiBase}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        // Also sync local state
        await this.local.fileComplaint(input);
        return {
          complaint: data.complaint,
          incident: data.incident,
          duplicate: data.duplicate ?? false,
          auditEntries: data.auditEntries ?? [],
        };
      }
    } catch {
      // Offline fallback
    }
    return this.local.fileComplaint(input);
  }

  public async resolveComplaint(
    complaintId: string,
    resolutionNote: string,
    actor?: string
  ): Promise<ComplaintRecord | null> {
    return this.local.resolveComplaint(complaintId, resolutionNote, actor);
  }

  public async signOffCorrectiveAction(
    capaId: string,
    supervisorName?: string,
    notes?: string
  ): Promise<{ capa: CorrectiveAction | null; incident: SafetyIncident | null }> {
    return this.local.signOffCorrectiveAction(capaId, supervisorName, notes);
  }

  public async resolveInventoryRisk(riskId: string, actionName: string): Promise<void> {
    try {
      await fetch(`${this.apiBase}/inventory/${riskId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionName }),
      });
    } catch {
      // Offline fallback
    }
    return this.local.resolveInventoryRisk(riskId, actionName);
  }

  public async logManualTemperature(
    probeLocation: string,
    tempC: number,
    notes: string,
    inspector?: string
  ): Promise<{ auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident }> {
    try {
      const res = await fetch(`${this.apiBase}/telemetry/temperature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station: probeLocation,
          probeId: 'Manual Inspection Probe',
          value: tempC,
          notes,
          recordedBy: inspector,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.local.logManualTemperature(probeLocation, tempC, notes, inspector);
        return { auditRecord: data.reading, alertIncident: data.alertIncident };
      }
    } catch {
      // Offline fallback
    }
    return this.local.logManualTemperature(probeLocation, tempC, notes, inspector);
  }

  public async logHygieneCheck(
    checkpoint: string,
    zone: string,
    passed: boolean,
    comments: string,
    inspector?: string
  ): Promise<{ auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident }> {
    try {
      const res = await fetch(`${this.apiBase}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoint,
          zone,
          passed,
          comments,
          inspector,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.local.logHygieneCheck(checkpoint, zone, passed, comments, inspector);
        return { auditRecord: data.auditRecord, alertIncident: data.alertIncident };
      }
    } catch {
      // Offline fallback
    }
    return this.local.logHygieneCheck(checkpoint, zone, passed, comments, inspector);
  }

  public async reportExpiredIngredient(
    riskId: string,
    actor?: string
  ): Promise<{ alertIncident?: SafetyIncident }> {
    try {
      const res = await fetch(`${this.apiBase}/inventory/${riskId}/expire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.local.reportExpiredIngredient(riskId, actor);
        return { alertIncident: data.alertIncident };
      }
    } catch {
      // Offline fallback
    }
    return this.local.reportExpiredIngredient(riskId, actor);
  }

  public async assignIncident(
    incidentId: string,
    assignee: string,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    try {
      const res = await fetch(`${this.apiBase}/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': actorRole || 'supervisor',
          'X-User-Name': actor || 'Chef R. Suresh',
        },
        body: JSON.stringify({ assignee, actor, actorRole }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.local.assignIncident(incidentId, assignee, actor, actorRole);
        return { incident: data.incident };
      }
    } catch {
      // Offline fallback
    }
    return this.local.assignIncident(incidentId, assignee, actor, actorRole);
  }

  public async documentIncidentFix(
    incidentId: string,
    fixNotes: string,
    correctiveActionPlan?: string,
    evidenceItem?: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    try {
      const res = await fetch(`${this.apiBase}/incidents/${incidentId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': actorRole || 'staff',
          'X-User-Name': actor || 'Ankit Verma',
        },
        body: JSON.stringify({
          actionTaken: fixNotes,
          fixNotes,
          correctiveActionPlan,
          evidence: evidenceItem,
          actor,
          actorRole,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.local.documentIncidentFix(incidentId, fixNotes, correctiveActionPlan, evidenceItem, actor, actorRole);
        return { incident: data.incident };
      }
    } catch {
      // Offline fallback
    }
    return this.local.documentIncidentFix(incidentId, fixNotes, correctiveActionPlan, evidenceItem, actor, actorRole);
  }

  public async verifyIncidentFix(
    incidentId: string,
    verificationNotes: string,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    try {
      const res = await fetch(`${this.apiBase}/incidents/${incidentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': actorRole || 'supervisor',
          'X-User-Name': actor || 'Chef R. Suresh',
        },
        body: JSON.stringify({ verificationNotes, actor, actorRole }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        return { incident: null, error: errJson.message || 'Verification rejected by server' };
      }
      const data = await res.json();
      await this.local.verifyIncidentFix(incidentId, verificationNotes, actor, actorRole);
      return { incident: data.incident };
    } catch {
      // Offline fallback
    }
    return this.local.verifyIncidentFix(incidentId, verificationNotes, actor, actorRole);
  }

  public async closeIncident(
    incidentId: string,
    closureNotes: string,
    actor?: string,
    actorRole?: UserRole
  ): Promise<{ incident: SafetyIncident | null; error?: string }> {
    try {
      const res = await fetch(`${this.apiBase}/incidents/${incidentId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': actorRole || 'supervisor',
          'X-User-Name': actor || 'Chef R. Suresh',
        },
        body: JSON.stringify({ closureNotes, actor, actorRole }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        return { incident: null, error: errJson.message || 'Closure rejected by server' };
      }
      const data = await res.json();
      await this.local.closeIncident(incidentId, closureNotes, actor, actorRole);
      return { incident: data.incident };
    } catch {
      // Offline fallback
    }
    return this.local.closeIncident(incidentId, closureNotes, actor, actorRole);
  }

  public async transitionIncident(
    incidentId: string,
    targetStatus: IncidentStatus,
    actor?: string,
    notes?: string,
    actorRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    return this.local.transitionIncident(incidentId, targetStatus, actor, notes, actorRole);
  }

  public async attachEvidence(
    targetType: 'incident' | 'complaint' | 'capa',
    targetId: string,
    evidence: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor?: string
  ): Promise<void> {
    try {
      await fetch(`${this.apiBase}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          ...evidence,
          capturedBy: actor,
        }),
      });
    } catch {
      // Offline fallback
    }
    return this.local.attachEvidence(targetType, targetId, evidence, actor);
  }

  public async resetDemoData(): Promise<PlateProofState> {
    try {
      await fetch(`${this.apiBase}/demo/reset`, { method: 'POST' });
    } catch {
      // Offline fallback
    }
    return this.local.resetDemoData();
  }
}

export const safetyRepository: ISafetyRepository = new HttpSafetyRepository();
