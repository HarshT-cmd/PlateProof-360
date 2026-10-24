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
  User,
  UserRole,
} from '../types';
import type { FileComplaintInput } from '../services/safetyEngine';

export interface BackendHealthStatus {
  isOnline: boolean;
  postgresConnected: boolean;
  database: string;
  latencyMs?: number;
  lastChecked?: string;
  error?: string;
}

export interface SafetyContextValue {
  orders: OrderSafetyProof[];
  incidents: SafetyIncident[];
  complaints: ComplaintRecord[];
  correctiveActions: CorrectiveAction[];
  inventoryRisks: InventoryRisk[];
  temperatureTrends: TemperatureTrendPoint[];
  inspectionAudits: InspectionAuditRecord[];

  currentUser: User;
  setCurrentUser: (user: User) => void;

  backendStatus: BackendHealthStatus;
  refreshBackendStatus: () => Promise<void>;

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
  resolveComplaint: (complaintId: string, resolutionNote: string, actor?: string) => void;
  signOffCorrectiveAction: (capaId: string, supervisorName?: string, notes?: string) => void;
  resolveInventoryRisk: (riskId: string, actionName: string) => void;
  logManualTemperature: (
    probeLocation: string,
    tempC: number,
    notes: string,
    inspector?: string
  ) => { auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident };
  logHygieneCheck: (
    checkpoint: string,
    zone: string,
    passed: boolean,
    comments: string,
    inspector?: string
  ) => { auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident };
  reportExpiredIngredient: (riskId: string, actor?: string) => { alertIncident?: SafetyIncident };
  assignIncident: (
    incidentId: string,
    assignee: string,
    actor?: string,
    actorRole?: UserRole
  ) => { incident: SafetyIncident | null; error?: string };
  documentIncidentFix: (
    incidentId: string,
    fixNotes: string,
    correctiveActionPlan?: string,
    evidenceItem?: Omit<EvidenceItem, 'id' | 'capturedAt'>,
    actor?: string,
    actorRole?: UserRole
  ) => { incident: SafetyIncident | null; error?: string };
  verifyIncidentFix: (
    incidentId: string,
    verificationNotes: string,
    actor?: string,
    actorRole?: UserRole
  ) => { incident: SafetyIncident | null; error?: string };
  closeIncident: (
    incidentId: string,
    closureNotes: string,
    actor?: string,
    actorRole?: UserRole
  ) => { incident: SafetyIncident | null; error?: string };
  transitionIncidentStatus: (
    incidentId: string,
    targetStatus: IncidentStatus,
    actor?: string,
    notes?: string,
    actorRole?: UserRole
  ) => { success: boolean; error?: string };
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
