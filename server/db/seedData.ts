import {
  sampleOrder1042,
  sampleOrder1043,
  sampleOrder1044,
  sampleTemperatureTrends,
  sampleSafetyIncidents,
  sampleInventoryRisks,
  sampleCorrectiveActions,
  sampleInspectionAudits,
  sampleComplaints,
  sampleUsers,
} from '../../src/data/mockData';
import {
  OrderSafetyProof,
  SafetyIncident,
  ComplaintRecord,
  CorrectiveAction,
  InventoryRisk,
  TemperatureTrendPoint,
  InspectionAuditRecord,
  User,
} from '../../src/types';

export interface SeedDataset {
  orders: OrderSafetyProof[];
  incidents: SafetyIncident[];
  complaints: ComplaintRecord[];
  correctiveActions: CorrectiveAction[];
  inventoryRisks: InventoryRisk[];
  temperatureTrends: TemperatureTrendPoint[];
  inspectionAudits: InspectionAuditRecord[];
  users: User[];
}

export function getInitialSeedData(): SeedDataset {
  return {
    orders: [
      JSON.parse(JSON.stringify(sampleOrder1042)),
      JSON.parse(JSON.stringify(sampleOrder1043)),
      JSON.parse(JSON.stringify(sampleOrder1044)),
    ],
    incidents: JSON.parse(JSON.stringify(sampleSafetyIncidents)),
    complaints: JSON.parse(JSON.stringify(sampleComplaints)),
    correctiveActions: JSON.parse(JSON.stringify(sampleCorrectiveActions)),
    inventoryRisks: JSON.parse(JSON.stringify(sampleInventoryRisks)),
    temperatureTrends: JSON.parse(JSON.stringify(sampleTemperatureTrends)),
    inspectionAudits: JSON.parse(JSON.stringify(sampleInspectionAudits)),
    users: JSON.parse(JSON.stringify(sampleUsers)),
  };
}
