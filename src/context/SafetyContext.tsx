import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  OrderSafetyProof,
  SafetyIncident,
  ComplaintRecord,
  IncidentStatus,
  ComplaintFilingResult,
  EvidenceItem,
  InspectionAuditRecord,
  User,
  UserRole,
} from '../types';
import { sampleUsers } from '../data/mockData';
import {
  loadState,
  saveState,
  type PlateProofState,
} from '../services/safetyStorage';
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
} from '../services/safetyEngine';
import { safetyRepository } from '../services/safetyRepository';
import {
  SafetyContext,
  type SafetyContextValue,
  type BackendHealthStatus,
} from './safetyContextDef';

export const SafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlateProofState>(() => loadState());
  const [currentUser, setCurrentUser] = useState<User>(() => sampleUsers[0]);
  const [backendStatus, setBackendStatus] = useState<BackendHealthStatus>({
    isOnline: false,
    postgresConnected: false,
    database: 'plateproof_360',
    lastChecked: 'Checking...',
  });

  const commitState = useCallback((nextState: PlateProofState) => {
    setState(nextState);
    saveState(nextState);
  }, []);

  const refreshBackendStatus = useCallback(async () => {
    try {
      const t0 = performance.now();
      const res = await fetch('/api/health');
      const latency = Math.round(performance.now() - t0);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus({
          isOnline: true,
          postgresConnected: data.postgres?.connected ?? false,
          database: data.postgres?.database || 'plateproof_360',
          latencyMs: latency,
          lastChecked: new Date().toLocaleTimeString(),
          error: data.postgres?.error,
        });
      } else {
        setBackendStatus((prev) => ({
          ...prev,
          isOnline: false,
          lastChecked: new Date().toLocaleTimeString(),
        }));
      }
    } catch {
      setBackendStatus({
        isOnline: false,
        postgresConnected: false,
        database: 'offline-fallback',
        lastChecked: new Date().toLocaleTimeString(),
      });
    }
  }, []);

  useEffect(() => {
    // Subscribe to repository reactive events
    const unsub = safetyRepository.subscribe((nextState) => {
      setState(nextState);
    });

    // Check backend status asynchronously on mount
    const initialTimer = setTimeout(() => {
      refreshBackendStatus();
    }, 0);
    const timer = setInterval(() => {
      refreshBackendStatus();
    }, 15000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'plateproof_360_store_v1') {
        setState(loadState());
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      clearTimeout(initialTimer);
      clearInterval(timer);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshBackendStatus]);

  const stats = useMemo(() => {
    const openIncidentsCount = state.incidents.filter(
      (i) => i.status !== 'verified-closed' && i.status !== 'closed'
    ).length;
    const criticalRisksCount = state.inventoryRisks.filter(
      (r) => r.riskTier === 'critical'
    ).length;
    const pendingApprovalsCount = state.correctiveActions.filter(
      (c) => c.verificationStatus === 'pending-supervisor'
    ).length;
    const clearedAuditsCount = state.inspectionAudits.filter(
      (a) => a.result === 'passed'
    ).length;

    return {
      ordersCheckedCount: 1482 + state.complaints.length,
      openIncidentsCount,
      criticalRisksCount,
      pendingApprovalsCount,
      clearedAuditsCount,
    };
  }, [state]);

  const getOrder = useCallback(
    (tokenOrId: string): OrderSafetyProof => {
      const normalized = tokenOrId.toLowerCase().replace(/^(order-|ord-)/, '');
      const found = state.orders.find((o) => {
        const oId = o.orderId.toLowerCase().replace(/^(order-|ord-)/, '');
        const oToken = o.token.toLowerCase().replace(/^(order-|ord-)/, '');
        return oId === normalized || oToken === normalized;
      });
      return found || state.orders[0];
    },
    [state.orders]
  );

  const getComplaintsForOrder = useCallback(
    (orderId: string): ComplaintRecord[] => {
      const normalized = orderId.toLowerCase().replace(/^(order-|ord-)/, '');
      return state.complaints.filter((c) => {
        const cId = c.orderId.toLowerCase().replace(/^(order-|ord-)/, '');
        return cId === normalized;
      });
    },
    [state.complaints]
  );

  const getIncidentsForOrder = useCallback(
    (orderId: string): SafetyIncident[] => {
      const complaints = getComplaintsForOrder(orderId);
      const incidentIds = new Set(
        complaints.map((c) => c.linkedIncidentId).filter(Boolean) as string[]
      );
      return state.incidents.filter((i) => incidentIds.has(i.id));
    },
    [getComplaintsForOrder, state.incidents]
  );

  const fileComplaint = useCallback(
    (input: FileComplaintInput): ComplaintFilingResult => {
      // Fire-and-forget HTTP sync to REST API
      safetyRepository.fileComplaint(input).catch(console.error);

      // Instant optimistic local commit
      const { nextState, result } = engineFileComplaint(state, input);
      commitState(nextState);
      return result;
    },
    [state, commitState]
  );

  const resolveComplaint = useCallback(
    (
      complaintId: string,
      resolutionNote: string,
      actor: string = 'Chef R. Suresh (FSS-KA-8819)'
    ) => {
      safetyRepository.resolveComplaint(complaintId, resolutionNote, actor).catch(console.error);
      const { nextState } = engineResolveComplaint(state, complaintId, resolutionNote, actor);
      commitState(nextState);
    },
    [state, commitState]
  );

  const signOffCorrectiveAction = useCallback(
    (
      capaId: string,
      supervisorName: string = 'Chef R. Suresh (FSS-KA-8819)',
      notes: string = 'Verified by physical inspection & secondary probe audit.'
    ) => {
      safetyRepository.signOffCorrectiveAction(capaId, supervisorName, notes).catch(console.error);
      const { nextState } = engineSignOffCapa(state, capaId, supervisorName, notes);
      commitState(nextState);
    },
    [state, commitState]
  );

  const resolveInventoryRisk = useCallback(
    (riskId: string, actionName: string) => {
      safetyRepository.resolveInventoryRisk(riskId, actionName).catch(console.error);
      const nextState = engineResolveRisk(state, riskId, actionName);
      commitState(nextState);
    },
    [state, commitState]
  );

  const logManualTemperature = useCallback(
    (
      probeLocation: string,
      tempC: number,
      notes: string,
      inspector: string = 'Chef R. Suresh'
    ): { auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident } => {
      safetyRepository.logManualTemperature(probeLocation, tempC, notes, inspector).catch(console.error);
      const { nextState, newAuditRecord, alertIncident } = engineLogTemp(
        state,
        probeLocation,
        tempC,
        notes,
        inspector
      );
      commitState(nextState);
      return { auditRecord: newAuditRecord, alertIncident };
    },
    [state, commitState]
  );

  const logHygieneCheck = useCallback(
    (
      checkpoint: string,
      zone: string,
      passed: boolean,
      comments: string,
      inspector: string = currentUser.name
    ): { auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident } => {
      safetyRepository.logHygieneCheck(checkpoint, zone, passed, comments, inspector).catch(console.error);
      const { nextState, auditRecord, alertIncident } = engineLogHygieneCheck(
        state,
        checkpoint,
        zone,
        passed,
        comments,
        inspector
      );
      commitState(nextState);
      return { auditRecord, alertIncident };
    },
    [state, commitState, currentUser.name]
  );

  const reportExpiredIngredient = useCallback(
    (
      riskId: string,
      actor: string = currentUser.name
    ): { alertIncident?: SafetyIncident } => {
      safetyRepository.reportExpiredIngredient(riskId, actor).catch(console.error);
      const { nextState, alertIncident } = engineReportExpiredIngredient(state, riskId, actor);
      commitState(nextState);
      return { alertIncident };
    },
    [state, commitState, currentUser.name]
  );

  const assignIncident = useCallback(
    (
      incidentId: string,
      assignee: string,
      actor: string = currentUser.name,
      actorRole: UserRole = currentUser.role
    ): { incident: SafetyIncident | null; error?: string } => {
      safetyRepository.assignIncident(incidentId, assignee, actor, actorRole).catch(console.error);
      const { nextState, incident, error } = engineAssignIncident(
        state,
        incidentId,
        assignee,
        actor,
        actorRole
      );
      if (!error && incident) {
        commitState(nextState);
      }
      return { incident, error };
    },
    [state, commitState, currentUser.name, currentUser.role]
  );

  const documentIncidentFix = useCallback(
    (
      incidentId: string,
      fixNotes: string,
      correctiveActionPlan: string = '',
      evidenceItem?: Omit<EvidenceItem, 'id' | 'capturedAt'>,
      actor: string = currentUser.name,
      actorRole: UserRole = currentUser.role
    ): { incident: SafetyIncident | null; error?: string } => {
      safetyRepository.documentIncidentFix(incidentId, fixNotes, correctiveActionPlan, evidenceItem, actor, actorRole).catch(console.error);
      const { nextState, incident, error } = engineDocumentIncidentFix(
        state,
        incidentId,
        fixNotes,
        correctiveActionPlan,
        evidenceItem,
        actor,
        actorRole
      );
      if (!error && incident) {
        commitState(nextState);
      }
      return { incident, error };
    },
    [state, commitState, currentUser.name, currentUser.role]
  );

  const verifyIncidentFix = useCallback(
    (
      incidentId: string,
      verificationNotes: string,
      actor: string = currentUser.name,
      actorRole: UserRole = currentUser.role
    ): { incident: SafetyIncident | null; error?: string } => {
      safetyRepository.verifyIncidentFix(incidentId, verificationNotes, actor, actorRole).catch(console.error);
      const { nextState, incident, error } = engineVerifyIncidentFix(
        state,
        incidentId,
        verificationNotes,
        actor,
        actorRole
      );
      if (!error && incident) {
        commitState(nextState);
      }
      return { incident, error };
    },
    [state, commitState, currentUser.name, currentUser.role]
  );

  const closeIncident = useCallback(
    (
      incidentId: string,
      closureNotes: string,
      actor: string = currentUser.name,
      actorRole: UserRole = currentUser.role
    ): { incident: SafetyIncident | null; error?: string } => {
      safetyRepository.closeIncident(incidentId, closureNotes, actor, actorRole).catch(console.error);
      const { nextState, incident, error } = engineCloseIncident(
        state,
        incidentId,
        closureNotes,
        actor,
        actorRole
      );
      if (!error && incident) {
        commitState(nextState);
      }
      return { incident, error };
    },
    [state, commitState, currentUser.name, currentUser.role]
  );

  const transitionIncidentStatus = useCallback(
    (
      incidentId: string,
      targetStatus: IncidentStatus,
      actor: string = currentUser.name,
      notes: string = '',
      actorRole: UserRole = currentUser.role
    ): { success: boolean; error?: string } => {
      safetyRepository.transitionIncident(incidentId, targetStatus, actor, notes, actorRole).catch(console.error);
      const { nextState, success, error } = engineTransitionIncident(
        state,
        incidentId,
        targetStatus,
        actor,
        notes,
        actorRole
      );
      if (success) {
        commitState(nextState);
      }
      return { success, error };
    },
    [state, commitState, currentUser.name, currentUser.role]
  );

  const attachEvidence = useCallback(
    (
      targetType: 'incident' | 'complaint' | 'capa',
      targetId: string,
      evidence: Omit<EvidenceItem, 'id' | 'capturedAt'>,
      actor: string = currentUser.name
    ) => {
      safetyRepository.attachEvidence(targetType, targetId, evidence, actor).catch(console.error);
      const nextState = engineAttachEvidence(state, targetType, targetId, evidence, actor);
      commitState(nextState);
    },
    [state, commitState, currentUser.name]
  );

  const resetDemoData = useCallback(() => {
    safetyRepository.resetDemoData().catch(console.error);
    const seed = safetyRepository.resetDemoData();
    seed.then((s) => setState(s));
  }, []);

  const value: SafetyContextValue = useMemo(
    () => ({
      orders: state.orders,
      incidents: state.incidents,
      complaints: state.complaints,
      correctiveActions: state.correctiveActions,
      inventoryRisks: state.inventoryRisks,
      temperatureTrends: state.temperatureTrends,
      inspectionAudits: state.inspectionAudits,
      currentUser,
      setCurrentUser,
      backendStatus,
      refreshBackendStatus,
      stats,
      getOrder,
      getComplaintsForOrder,
      getIncidentsForOrder,
      fileComplaint,
      resolveComplaint,
      signOffCorrectiveAction,
      resolveInventoryRisk,
      logManualTemperature,
      logHygieneCheck,
      reportExpiredIngredient,
      assignIncident,
      documentIncidentFix,
      verifyIncidentFix,
      closeIncident,
      transitionIncidentStatus,
      attachEvidence,
      resetDemoData,
    }),
    [
      state,
      currentUser,
      backendStatus,
      refreshBackendStatus,
      stats,
      getOrder,
      getComplaintsForOrder,
      getIncidentsForOrder,
      fileComplaint,
      resolveComplaint,
      signOffCorrectiveAction,
      resolveInventoryRisk,
      logManualTemperature,
      logHygieneCheck,
      reportExpiredIngredient,
      assignIncident,
      documentIncidentFix,
      verifyIncidentFix,
      closeIncident,
      transitionIncidentStatus,
      attachEvidence,
      resetDemoData,
    ]
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
};
