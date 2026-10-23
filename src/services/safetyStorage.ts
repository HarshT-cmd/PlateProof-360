import type {
  OrderSafetyProof,
  SafetyIncident,
  ComplaintRecord,
  CorrectiveAction,
  InventoryRisk,
  TemperatureTrendPoint,
  InspectionAuditRecord,
} from '../types';
import {
  sampleOrdersList,
  sampleSafetyIncidents,
  sampleComplaints,
  sampleCorrectiveActions,
  sampleInventoryRisks,
  sampleTemperatureTrends,
  sampleInspectionAudits,
} from '../data/mockData';

export interface PlateProofState {
  version: number;
  lastUpdated: string;
  orders: OrderSafetyProof[];
  incidents: SafetyIncident[];
  complaints: ComplaintRecord[];
  correctiveActions: CorrectiveAction[];
  inventoryRisks: InventoryRisk[];
  temperatureTrends: TemperatureTrendPoint[];
  inspectionAudits: InspectionAuditRecord[];
}

const STORAGE_KEY = 'plateproof_360_store_v1';
const CURRENT_VERSION = 1;

/**
 * Returns a clean initial seed snapshot sourced from official culinary telemetry.
 */
export function getInitialSeedState(): PlateProofState {
  return {
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
    orders: JSON.parse(JSON.stringify(sampleOrdersList)),
    incidents: JSON.parse(JSON.stringify(sampleSafetyIncidents)),
    complaints: JSON.parse(JSON.stringify(sampleComplaints)),
    correctiveActions: JSON.parse(JSON.stringify(sampleCorrectiveActions)),
    inventoryRisks: JSON.parse(JSON.stringify(sampleInventoryRisks)),
    temperatureTrends: JSON.parse(JSON.stringify(sampleTemperatureTrends)),
    inspectionAudits: JSON.parse(JSON.stringify(sampleInspectionAudits)),
  };
}

/**
 * Loads persistent state from localStorage, initializing with default culinary records if absent.
 */
export function loadState(): PlateProofState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getInitialSeedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedState();
      saveState(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as PlateProofState;
    if (!parsed || parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.orders)) {
      const fallback = getInitialSeedState();
      saveState(fallback);
      return fallback;
    }

    return parsed;
  } catch (err) {
    console.warn('[PlateProof Storage] Failed to parse stored state, re-seeding defaults:', err);
    return getInitialSeedState();
  }
}

/**
 * Persists updated state snapshot into localStorage safely.
 */
export function saveState(state: PlateProofState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const payload = {
      ...state,
      lastUpdated: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('[PlateProof Storage] Failed to persist state:', err);
    return false;
  }
}

/**
 * Resets local storage and returns fresh seed records.
 */
export function resetStateToSeed(): PlateProofState {
  const seed = getInitialSeedState();
  saveState(seed);
  return seed;
}
