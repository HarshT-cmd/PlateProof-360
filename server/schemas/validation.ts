import { z } from 'zod';

export const userRoleSchema = z.enum(['customer', 'staff', 'supervisor', 'auditor']);

export const complaintCategorySchema = z.enum([
  'allergen',
  'temperature',
  'packaging',
  'quality',
]);

export const complaintSeveritySchema = z.enum(['critical', 'high', 'moderate', 'low']);

export const incidentSeveritySchema = z.enum(['critical', 'high', 'moderate', 'low', 'warning']);

export const incidentStatusSchema = z.enum([
  'open',
  'fixed',
  'verified',
  'closed',
  'awaiting-verification',
  'in-progress',
  'verified-closed',
]);

export const fileComplaintSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  token: z.string().min(1, 'Order token is required'),
  dishName: z.string().min(1, 'Dish name is required'),
  category: complaintCategorySchema,
  reportedBy: z.string().min(1, 'Reporter name or seat is required'),
  dinerContact: z.string().min(1, 'Contact number or email is required'),
  seatNumber: z.string().optional().default(''),
  description: z.string().min(3, 'Detailed description is required'),
  idempotencyKey: z.string().optional(),
});

export const assignIncidentSchema = z.object({
  assignee: z.string().min(1, 'Assignee name is required'),
  actor: z.string().optional(),
  actorRole: userRoleSchema.optional(),
});

export const evidenceItemSchema = z.object({
  targetType: z.enum(['incident', 'complaint', 'capa']),
  targetId: z.string().min(1, 'Target entity ID is required'),
  kind: z.enum(['photo', 'probe-reading', 'lab-test', 'document', 'statement']),
  title: z.string().min(2, 'Evidence title is required'),
  reference: z.string().min(1, 'File, URI or document reference is required'),
  notes: z.string().optional().default(''),
  capturedBy: z.string().optional(),
});

export const recordCorrectiveActionSchema = z.object({
  actionTaken: z.string().min(3, 'Action taken must be described'),
  assignedStaff: z.string().optional(),
  fixNotes: z.string().optional(),
  correctiveActionPlan: z.string().optional(),
  evidence: z
    .object({
      kind: z.enum(['photo', 'probe-reading', 'lab-test', 'document', 'statement']),
      title: z.string().min(2),
      reference: z.string().min(1),
      notes: z.string().optional().default(''),
    })
    .optional(),
  actor: z.string().optional(),
  actorRole: userRoleSchema.optional(),
});

export const verifyIncidentSchema = z.object({
  verificationNotes: z.string().min(3, 'Verification notes must be provided'),
  actor: z.string().optional(),
  actorRole: userRoleSchema.optional(),
});

export const closeIncidentSchema = z.object({
  closureNotes: z.string().min(3, 'Closure notes must be provided'),
  actor: z.string().optional(),
  actorRole: userRoleSchema.optional(),
});

export const inspectionChecklistSchema = z.object({
  checkpoint: z.string().min(2, 'Checkpoint name is required'),
  zone: z.string().min(1, 'Zone or kitchen bay is required'),
  passed: z.boolean(),
  comments: z.string().optional().default(''),
  parameter: z.string().optional().default('Standard Inspection Protocol'),
  measuredValue: z.string().optional().default('Visual & Swab Pass'),
  safeLimit: z.string().optional().default('HACCP Standard'),
  inspector: z.string().optional(),
});

export const temperatureReadingSchema = z.object({
  station: z.string().min(1, 'Station location is required'),
  probeId: z.string().min(1, 'Probe ID is required'),
  value: z.number(),
  unit: z.string().optional().default('°C'),
  limitLow: z.number().optional().nullable(),
  limitHigh: z.number().optional().nullable(),
  notes: z.string().optional().default(''),
  recordedBy: z.string().optional(),
});

export const resolveInventoryRiskSchema = z.object({
  actionName: z.string().min(2, 'Resolution action name is required'),
  actor: z.string().optional(),
});

export const expireInventoryBatchSchema = z.object({
  actor: z.string().optional(),
});
