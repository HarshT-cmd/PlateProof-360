import { createContext, useContext } from 'react';
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
} from '../types';
import type { FileComplaintInput } from '../services/safetyEngine';

export interface SafetyContextValue {
  orders: OrderSafetyProof[];
  incidents: SafetyIncident[];
  complaints: ComplaintRecord[];
  correctiveActions: CorrectiveAction[];
  inventoryRisks: InventoryRisk[];
  temperatureTrends: TemperatureTrendPoint[];
  inspectionAudits: InspectionAuditRecord[];

  stats: {
    ordersCheckedCount: number;
    openIncidentsCount: number;
    criticalRisksCount: number;
    pendingApprovalsCount: number;
    clearedAuditsCount: number;
  };

  getOrder: (tokenOrId: string) => OrderSafetyProof;
  getComplaintsForOrder: (orderId: string) => ComplaintRecord[];
  getIncidentsForOrder: (orderId: string) => SafetyIncident[];

  fileComplaint: (input: FileComplaintInput) => ComplaintFilingResult;
  signOffCorrectiveAction: (capaId: string, supervisorName?: string, notes?: string) => void;
  resolveInventoryRisk: (riskId: string, actionName: string) => void;
  logManualTemperature: (
    probeLocation: string,
    tempC: number,
    notes: string,
    inspector?: string
  ) => { auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident };
  transitionIncidentStatus: (
    incidentId: string,
    targetStatus: IncidentStatus,
    actor?: string,
    notes?: string
  ) => boolean;
  attachEvidence: (
    targetType: 'incident' | 'complaint' | 'capa',
    targetId: string,
    evidence: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor?: string
  ) => void;
  resetDemoData: () => void;
}

export const SafetyContext = createContext<SafetyContextValue | null>(null);

export const useSafetyContext = (): SafetyContextValue => {
  const ctx = useContext(SafetyContext);
  if (!ctx) {
    throw new Error('useSafetyContext must be used within a <SafetyProvider>');
  }
  return ctx;
};
