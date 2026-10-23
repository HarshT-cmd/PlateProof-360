export interface Ingredient {
  name: string;
  category: string;
  origin: string;
  lotNumber: string;
  supplier: string;
  certifications: string[];
  intakeDate: string;
  storageTemp: string;
  qualityNote: string;
}

export interface AllergenDeclaration {
  name: string;
  type: 'contains' | 'may-contain' | 'cross-contact-risk';
  source: string;
  severity: 'high' | 'medium' | 'low';
  declarationNote: string;
  stationIsolation: string;
}

export interface CookingRecord {
  targetTemp: number;
  recordedTemp: number;
  unit: string;
  probeId: string;
  recordedAt: string;
  durationHoldSeconds: number;
  ccpCode: string;
  operator: string;
  method: string;
  validationRule: string;
}

export interface HygieneCheck {
  id: string;
  checkpoint: string;
  time: string;
  inspector: string;
  status: 'passed' | 'remediated' | 'flagged';
  parameter: string;
  measuredValue: string;
  safeLimit: string;
  evidenceNote: string;
}

export interface OrderSafetyProof {
  orderId: string;
  token: string;
  dishName: string;
  regionalVariant: string;
  kitchenName: string;
  station: string;
  prepTimestamp: string;
  servingWindow: string;
  imageUrl: string;
  description: string;
  isVegetarian: boolean;
  portionWeightGrams: number;
  cookingRecord: CookingRecord;
  allergens: AllergenDeclaration[];
  ingredients: Ingredient[];
  hygieneChecks: HygieneCheck[];
  verificationHash: string;
  fssaiNumber: string;
  isoStandard: string;
  batchVerificationNote: string;
}

export interface TemperatureTrendPoint {
  time: string;
  chillerTemp: number;
  chillerUpperLimit: number;
  grillTemp: number;
  grillLowerLimit: number;
  steamTableTemp: number;
  steamTableLowerLimit: number;
}

export type IncidentSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'warning';

/** Canonical incident lifecycle: Open -> Fixed -> Verified -> Closed. */
export type IncidentStatus =
  | 'open'
  | 'fixed'
  | 'verified'
  | 'closed'
  | 'awaiting-verification'
  | 'in-progress'
  | 'verified-closed';

export interface SafetyIncident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  location: string;
  timestamp: string;
  reportedBy: string;
  supervisorActionNeeded: boolean;
  correctiveActionPlan: string;
  status: IncidentStatus;
  openedAt?: string;
  fixedAt?: string | null;
  verifiedAt?: string | null;
  closedAt?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  customerVisible?: boolean;
  internalNotes?: string;
  linkedComplaintId?: string | null;
  linkedCapaId?: string | null;
  evidence?: EvidenceItem[];
  auditTrail?: AuditEntry[];
}

export interface InventoryRisk {
  id: string;
  ingredient: string;
  batchNumber: string;
  storageLocation: string;
  hoursUntilExpiry: number;
  currentQuantityKg: number;
  riskTier: 'critical' | 'warning' | 'normal';
  suggestedAction: string;
  supplier: string;
}

export interface CorrectiveAction {
  id: string;
  incidentRef: string;
  actionTaken: string;
  assignedStaff: string;
  timestamp: string;
  verificationStatus: 'pending-supervisor' | 'approved' | 'rejected';
  remedialVerificationLog: string;
  evidence?: EvidenceItem[];
  auditTrail?: AuditEntry[];
}

export interface InspectionAuditRecord {
  id: string;
  time: string;
  checkpoint: string;
  supervisor: string;
  result: 'passed' | 'rectified' | 'non-compliant';
  comments: string;
  zone: string;
}

/* ------------------------------------------------------------------ */
/* Complaint, evidence and audit-trail domain                          */
/* ------------------------------------------------------------------ */

/** Severity tiers for a customer / in-house complaint. */
export type ComplaintSeverity = 'critical' | 'high' | 'moderate' | 'low';

/** Lifecycle status of a complaint, from filing through closure. */
export type ComplaintStatus =
  | 'filed'
  | 'under-review'
  | 'investigating'
  | 'resolved-closed'
  | 'escalated';

/** Classification of an incoming complaint, mirroring the diner UI. */
export type ComplaintCategory =
  | 'allergen'
  | 'temperature'
  | 'packaging'
  | 'quality';

/** A piece of evidence attached to a complaint or corrective action. */
export interface EvidenceItem {
  id: string;
  kind: 'photo' | 'probe-reading' | 'lab-test' | 'document' | 'statement';
  title: string;
  reference: string;
  capturedAt: string;
  capturedBy: string;
  notes: string;
}

/** A single immutable entry in an audit trail. */
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  previousStatus?: string;
  newStatus?: string;
}

/** A customer / in-house complaint with its full investigative lifecycle. */
export interface ComplaintRecord {
  id: string;
  orderId: string;
  token: string;
  dishName: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  reportedBy: string;
  dinerContact: string;
  seatNumber: string;
  description: string;
  reportedAt: string;
  assignedTo: string;
  linkedIncidentId: string | null;
  linkedCapaId: string | null;
  evidence: EvidenceItem[];
  auditTrail: AuditEntry[];
  resolutionNote: string;
  closedAt: string | null;
}

/** A corrective action with its evidence and verifiable audit history. */
export interface CorrectiveActionWithHistory extends CorrectiveAction {
  evidence: EvidenceItem[];
  auditTrail: AuditEntry[];
}

/** A safety incident enriched with evidence and an immutable audit trail. */
export interface SafetyIncidentWithHistory extends SafetyIncident {
  evidence: EvidenceItem[];
  auditTrail: AuditEntry[];
}

/* ------------------------------------------------------------------ */
/* Users, roles, checklist results, temperature readings, order items */
/* ------------------------------------------------------------------ */

/** Staff roles recognised by the Safety Action Engine. */
export type UserRole = 'customer' | 'staff' | 'supervisor' | 'auditor';

/** A staff member or diner identity record. */
export interface User {
  id: string;
  name: string;
  role: UserRole;
  employeeId: string | null;
  active: boolean;
}

/** A single checklist question with its result. */
export interface ChecklistResult {
  id: string;
  checkpoint: string;
  parameter: string;
  measuredValue: string;
  safeLimit: string;
  result: 'passed' | 'failed' | 'remediated' | 'flagged';
  evidenceNote: string;
  inspector: string;
  time: string;
}

/** A temperature reading taken at a station. */
export interface TemperatureReading {
  id: string;
  station: string;
  probeId: string;
  value: number;
  unit: string;
  limitLow?: number | null;
  limitHigh?: number | null;
  withinLimits: boolean;
  recordedAt: string;
  recordedBy: string;
  notes: string;
}

/** An inventory batch with expiry and risk tier. */
export interface InventoryBatch {
  id: string;
  ingredient: string;
  category: string;
  batchNumber: string;
  supplier: string;
  origin: string;
  lotNumber: string;
  storageLocation: string;
  currentQuantityKg: number;
  unit: 'kg' | 'units' | 'l';
  hoursUntilExpiry: number;
  riskTier: 'critical' | 'warning' | 'normal';
  suggestedAction: string;
  certifications: string[];
}

/** A single line item on an order. */
export interface OrderItem {
  id: string;
  orderId: string;
  dishName: string;
  regionalVariant: string;
  isVegetarian: boolean;
  portionWeightGrams: number;
  station: string;
  imageUrl: string;
  cookingRecord: CookingRecord;
  allergens: AllergenDeclaration[];
  ingredients: Ingredient[];
  hygieneChecks: HygieneCheck[];
}

/* ------------------------------------------------------------------ */
/* Service-layer types                                                 */
/* ------------------------------------------------------------------ */

/** A rule that maps a condition to a severity. Configurable demo rules. */
export interface SeverityRule {
  id: string;
  name: string;
  condition: 'hygiene-failed' | 'temp-exceeded' | 'ingredient-expired' | 'complaint-undercooked';
  threshold?: number;
  severity: IncidentSeverity;
  description: string;
}

/** Result of a validated state transition. */
export interface TransitionResult<T> {
  ok: boolean;
  previousState?: string;
  newState?: string;
  state?: T;
  error?: string;
  auditEntry?: AuditEntry;
}

/** The outcome of filing a complaint (may or may not create an incident). */
export interface ComplaintFilingResult {
  complaint: ComplaintRecord;
  incident: SafetyIncident | null;
  duplicate: boolean;
  auditEntries: AuditEntry[];
}

/** A complaint visible to customers vs. internal staff notes. */
export interface ComplaintTimelineEntry {
  id: string;
  at: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  detail: string;
  customerVisible: boolean;
  status?: string;
}
