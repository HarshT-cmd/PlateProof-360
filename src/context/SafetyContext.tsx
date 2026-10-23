import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  OrderSafetyProof,
  SafetyIncident,
  ComplaintRecord,
  IncidentStatus,
  ComplaintFilingResult,
  EvidenceItem,
  InspectionAuditRecord,
} from '../types';
import {
  loadState,
  saveState,
  resetStateToSeed,
  type PlateProofState,
} from '../services/safetyStorage';
import {
  fileComplaint as engineFileComplaint,
  signOffCorrectiveAction as engineSignOffCapa,
  resolveInventoryRiskItem as engineResolveRisk,
  logManualTemperatureReading as engineLogTemp,
  transitionIncident as engineTransitionIncident,
  attachEvidenceItem as engineAttachEvidence,
  type FileComplaintInput,
} from '../services/safetyEngine';
import { SafetyContext, type SafetyContextValue } from './safetyContextDef';

export const SafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlateProofState>(() => loadState());

  const commitState = useCallback((nextState: PlateProofState) => {
    setState(nextState);
    saveState(nextState);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'plateproof_360_store_v1') {
        setState(loadState());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
      const { nextState, result } = engineFileComplaint(state, input);
      commitState(nextState);
      return result;
    },
    [state, commitState]
  );

  const signOffCorrectiveAction = useCallback(
    (
      capaId: string,
      supervisorName: string = 'Chef R. Suresh (FSS-KA-8819)',
      notes: string = 'Verified by physical inspection & secondary probe audit.'
    ) => {
      const { nextState } = engineSignOffCapa(state, capaId, supervisorName, notes);
      commitState(nextState);
    },
    [state, commitState]
  );

  const resolveInventoryRisk = useCallback(
    (riskId: string, actionName: string) => {
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

  const transitionIncidentStatus = useCallback(
    (
      incidentId: string,
      targetStatus: IncidentStatus,
      actor: string = 'Chef R. Suresh',
      notes: string = ''
    ): boolean => {
      const { nextState, success } = engineTransitionIncident(
        state,
        incidentId,
        targetStatus,
        actor,
        notes
      );
      if (success) {
        commitState(nextState);
      }
      return success;
    },
    [state, commitState]
  );

  const attachEvidence = useCallback(
    (
      targetType: 'incident' | 'complaint' | 'capa',
      targetId: string,
      evidence: Omit<EvidenceItem, 'id' | 'capturedAt'>,
      actor: string = 'Chef R. Suresh'
    ) => {
      const nextState = engineAttachEvidence(state, targetType, targetId, evidence, actor);
      commitState(nextState);
    },
    [state, commitState]
  );

  const resetDemoData = useCallback(() => {
    const seed = resetStateToSeed();
    setState(seed);
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
      stats,
      getOrder,
      getComplaintsForOrder,
      getIncidentsForOrder,
      fileComplaint,
      signOffCorrectiveAction,
      resolveInventoryRisk,
      logManualTemperature,
      transitionIncidentStatus,
      attachEvidence,
      resetDemoData,
    }),
    [
      state,
      stats,
      getOrder,
      getComplaintsForOrder,
      getIncidentsForOrder,
      fileComplaint,
      signOffCorrectiveAction,
      resolveInventoryRisk,
      logManualTemperature,
      transitionIncidentStatus,
      attachEvidence,
      resetDemoData,
    ]
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
};
