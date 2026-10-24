import { getPool, isDbConnected } from './pool';
import { getInitialSeedData, SeedDataset } from './seedData';
import {
  OrderSafetyProof,
  SafetyIncident,
  ComplaintRecord,
  CorrectiveAction,
  InventoryRisk,
  InspectionAuditRecord,
  EvidenceItem,
  AuditEntry,
  UserRole,
  ComplaintFilingResult,
} from '../../src/types';

export class SafetyDataStore {
  private inMemory: SeedDataset;
  private idempotencyCache: Map<string, ComplaintFilingResult> = new Map();

  constructor() {
    this.inMemory = getInitialSeedData();
  }

  public async getOrders(): Promise<OrderSafetyProof[]> {
    if (isDbConnected()) {
      try {
        const pool = getPool();
        const res = await pool.query(`SELECT * FROM orders ORDER BY order_id ASC`);
        const orders: OrderSafetyProof[] = [];
        for (const row of res.rows) {
          const fullOrder = await this.getOrder(row.order_id);
          if (fullOrder) orders.push(fullOrder);
        }
        return orders;
      } catch (err) {
        console.warn('[PostgreSQL fallback] getOrders error:', err);
      }
    }
    return this.inMemory.orders;
  }

  public async getOrder(tokenOrId: string): Promise<OrderSafetyProof | null> {
    const normalized = tokenOrId.toLowerCase().replace(/^(order-|ord-)/, '');

    if (isDbConnected()) {
      try {
        const pool = getPool();
        // Lookup by order_id or qr_token
        const orderRes = await pool.query(
          `SELECT o.*, qt.token as qr_token, qt.revoked as token_revoked, qt.expires_at as token_expires_at
           FROM orders o
           LEFT JOIN qr_tokens qt ON qt.order_id = o.order_id
           WHERE LOWER(REPLACE(o.order_id, 'ORD-', '')) = $1
              OR LOWER(REPLACE(qt.token, 'order-', '')) = $1
              OR LOWER(qt.token) = $2
           LIMIT 1`,
          [normalized, tokenOrId.toLowerCase()]
        );

        if (orderRes.rowCount && orderRes.rowCount > 0) {
          const row = orderRes.rows[0];

          // Check if token revoked or expired
          if (row.token_revoked) {
            throw new Error('This QR token has been revoked by food safety authority.');
          }
          if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
            throw new Error('This QR token has expired.');
          }

          const [cookingRes, ingRes, algRes, hygRes] = await Promise.all([
            pool.query(`SELECT * FROM cooking_records WHERE order_id = $1 LIMIT 1`, [row.order_id]),
            pool.query(`SELECT * FROM ingredients WHERE order_id = $1`, [row.order_id]),
            pool.query(`SELECT * FROM allergens WHERE order_id = $1`, [row.order_id]),
            pool.query(`SELECT * FROM hygiene_checks WHERE order_id = $1`, [row.order_id]),
          ]);

          const cooking = cookingRes.rows[0]
            ? {
                targetTemp: Number(cookingRes.rows[0].target_temp),
                recordedTemp: Number(cookingRes.rows[0].recorded_temp),
                unit: cookingRes.rows[0].unit,
                probeId: cookingRes.rows[0].probe_id,
                recordedAt: cookingRes.rows[0].recorded_at.toISOString(),
                durationHoldSeconds: cookingRes.rows[0].duration_hold_seconds,
                ccpCode: cookingRes.rows[0].ccp_code,
                operator: cookingRes.rows[0].operator,
                method: cookingRes.rows[0].method,
                validationRule: cookingRes.rows[0].validation_rule,
              }
            : this.inMemory.orders[0].cookingRecord;

          return {
            orderId: row.order_id,
            token: row.qr_token || `order-${normalized}`,
            dishName: row.dish_name,
            regionalVariant: row.regional_variant || '',
            kitchenName: row.kitchen_name,
            station: row.station,
            prepTimestamp: row.prep_timestamp ? new Date(row.prep_timestamp).toLocaleTimeString() : 'Today',
            servingWindow: row.serving_window || '',
            imageUrl: row.image_url || '/images/paneer_tikka_masala.jpg',
            description: row.description || '',
            isVegetarian: row.is_vegetarian,
            portionWeightGrams: row.portion_weight_grams || 340,
            cookingRecord: cooking,
            allergens: algRes.rows.map((a: any) => ({
              name: a.name,
              type: a.type,
              source: a.source,
              severity: a.severity,
              declarationNote: a.declaration_note || '',
              stationIsolation: a.station_isolation || '',
            })),
            ingredients: ingRes.rows.map((i: any) => ({
              name: i.name,
              category: i.category,
              origin: i.origin,
              lotNumber: i.lot_number,
              supplier: i.supplier,
              certifications: i.certifications || [],
              intakeDate: i.intake_date ? new Date(i.intake_date).toLocaleDateString() : 'Today',
              storageTemp: i.storage_temp,
              qualityNote: i.quality_note || '',
            })),
            hygieneChecks: hygRes.rows.map((h: any) => ({
              id: h.id,
              checkpoint: h.checkpoint,
              time: h.time,
              inspector: h.inspector,
              status: h.status,
              parameter: h.parameter,
              measuredValue: h.measured_value,
              safeLimit: h.safe_limit,
              evidenceNote: h.evidence_note || '',
            })),
            verificationHash: row.verification_hash,
            fssaiNumber: row.fssai_number || 'FSSAI Lic. No. 11224333000918',
            isoStandard: row.iso_standard || 'ISO 22000:2018 Certified',
            batchVerificationNote: row.batch_verification_note || '',
          };
        }
      } catch (err: unknown) {
        if (err instanceof Error && (err.message.includes('revoked') || err.message.includes('expired'))) {
          throw err;
        }
        console.warn('[PostgreSQL fallback] getOrder error:', err);
      }
    }

    const found = this.inMemory.orders.find((o: OrderSafetyProof) => {
      const oId = o.orderId.toLowerCase().replace(/^(order-|ord-)/, '');
      const oToken = o.token.toLowerCase().replace(/^(order-|ord-)/, '');
      return oId === normalized || oToken === normalized;
    });

    return found || this.inMemory.orders[0];
  }

  public async getComplaints(): Promise<ComplaintRecord[]> {
    if (isDbConnected()) {
      try {
        const pool = getPool();
        const res = await pool.query(`SELECT * FROM complaints ORDER BY reported_at DESC`);
        return res.rows.map(this.mapDbComplaint);
      } catch (err) {
        console.warn('[PostgreSQL fallback] getComplaints error:', err);
      }
    }
    return this.inMemory.complaints;
  }

  public async getComplaintsForOrder(orderId: string): Promise<ComplaintRecord[]> {
    const normalized = orderId.toLowerCase().replace(/^(order-|ord-)/, '');
    if (isDbConnected()) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT * FROM complaints
           WHERE LOWER(REPLACE(order_id, 'ORD-', '')) = $1
              OR LOWER(order_id) = $2
           ORDER BY reported_at DESC`,
          [normalized, orderId.toLowerCase()]
        );
        return res.rows.map(this.mapDbComplaint);
      } catch (err) {
        console.warn('[PostgreSQL fallback] getComplaintsForOrder error:', err);
      }
    }
    return this.inMemory.complaints.filter((c: ComplaintRecord) => {
      const cId = c.orderId.toLowerCase().replace(/^(order-|ord-)/, '');
      return cId === normalized;
    });
  }

  public async fileComplaint(input: {
    orderId: string;
    token: string;
    dishName: string;
    category: 'allergen' | 'temperature' | 'packaging' | 'quality';
    reportedBy: string;
    dinerContact: string;
    seatNumber?: string;
    description: string;
    idempotencyKey?: string;
  }): Promise<ComplaintFilingResult> {
    const dedupeKey =
      input.idempotencyKey ||
      `${input.orderId}:${input.dishName}:${input.category}:${input.description.trim().toLowerCase()}`;

    if (this.idempotencyCache.has(dedupeKey)) {
      const existing = this.idempotencyCache.get(dedupeKey)!;
      return { ...existing, duplicate: true };
    }

    const complaintId = `CMP-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // Auto-triage severity rule
    let severity: 'critical' | 'high' | 'moderate' | 'low' = 'moderate';
    let createsIncident = false;
    let incidentSeverity: 'critical' | 'high' | 'moderate' | 'low' = 'moderate';

    if (input.category === 'allergen') {
      severity = 'critical';
      incidentSeverity = 'critical';
      createsIncident = true;
    } else if (
      input.category === 'temperature' &&
      input.description.toLowerCase().includes('undercook')
    ) {
      severity = 'moderate';
      incidentSeverity = 'moderate';
      createsIncident = true;
    } else if (input.category === 'temperature') {
      severity = 'high';
      incidentSeverity = 'high';
      createsIncident = true;
    }

    let incident: SafetyIncident | null = null;
    const auditEntries: AuditEntry[] = [];

    const fileAudit: AuditEntry = {
      id: `AUD-${Date.now()}-1`,
      at: nowIso,
      actor: input.reportedBy || 'Diner',
      actorRole: 'customer',
      action: 'Complaint Filed',
      detail: `Complaint registered under category [${input.category.toUpperCase()}].`,
      newStatus: 'filed',
      customerVisible: true,
    };
    auditEntries.push(fileAudit);

    if (createsIncident) {
      const incId = `INC-${Date.now().toString().slice(-6)}`;
      incident = {
        id: incId,
        title: `Customer Complaint Investigation: ${input.dishName} (${input.category})`,
        severity: incidentSeverity,
        location: `Dining Bay / Canteen — Order #${input.orderId}`,
        timestamp: nowIso,
        reportedBy: `Diner (${input.reportedBy}) via QR Portal`,
        supervisorActionNeeded: true,
        correctiveActionPlan: `Conduct physical temperature & hygiene audit for Order #${input.orderId}. Re-verify CCP records.`,
        status: 'open',
        openedAt: nowIso,
        assignedTo: 'Chef R. Suresh',
        createdBy: 'Auto-Triage Engine',
        customerVisible: true,
        internalNotes: `Private QA Audit: Trace back lot number and examine probe calibration for Order #${input.orderId}.`,
        linkedComplaintId: complaintId,
        evidence: [],
        auditTrail: [
          {
            id: `AUD-INC-${Date.now()}`,
            at: nowIso,
            actor: 'Auto-Triage Engine',
            action: 'Incident Created from Complaint',
            detail: `Automated incident creation triggered by ${input.category} complaint.`,
            newStatus: 'open',
            customerVisible: true,
          },
        ],
      };

      const triageAudit: AuditEntry = {
        id: `AUD-${Date.now()}-2`,
        at: nowIso,
        actor: 'Auto-Triage Engine',
        actorRole: 'supervisor',
        action: 'Incident Created',
        detail: `Linked to safety incident ${incId} with ${incidentSeverity} severity.`,
        previousStatus: 'filed',
        newStatus: 'investigating',
        customerVisible: true,
      };
      auditEntries.push(triageAudit);
    }

    const complaint: ComplaintRecord = {
      id: complaintId,
      orderId: input.orderId,
      token: input.token,
      dishName: input.dishName,
      category: input.category,
      severity,
      status: createsIncident ? 'investigating' : 'filed',
      reportedBy: input.reportedBy,
      dinerContact: input.dinerContact,
      seatNumber: input.seatNumber || '',
      description: input.description,
      reportedAt: nowIso,
      assignedTo: 'Chef R. Suresh',
      linkedIncidentId: incident ? incident.id : null,
      linkedCapaId: null,
      evidence: [],
      auditTrail: auditEntries,
      resolutionNote: '',
      internalNotes: `Sensitive internal notes: Customer contact verified. Station logs requested.`,
      closedAt: null,
    };

    if (isDbConnected()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (incident) {
          await client.query(
            `INSERT INTO safety_incidents (
               id, title, severity, location, timestamp, reported_by,
               supervisor_action_needed, corrective_action_plan, status,
               opened_at, assigned_to, created_by, customer_visible, internal_notes, linked_complaint_id
             ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), $9, $10, $11, $12, $13)`,
            [
              incident.id,
              incident.title,
              incident.severity,
              incident.location,
              incident.reportedBy,
              incident.supervisorActionNeeded,
              incident.correctiveActionPlan,
              incident.status,
              incident.assignedTo,
              incident.createdBy,
              incident.customerVisible,
              incident.internalNotes,
              complaintId,
            ]
          );
        }

        await client.query(
          `INSERT INTO complaints (
             id, order_id, token, dish_name, category, severity, status,
             reported_by, diner_contact, seat_number, description, reported_at,
             assigned_to, linked_incident_id, linked_capa_id, resolution_note, internal_notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16)`,
          [
            complaint.id,
            complaint.orderId,
            complaint.token,
            complaint.dishName,
            complaint.category,
            complaint.severity,
            complaint.status,
            complaint.reportedBy,
            complaint.dinerContact,
            complaint.seatNumber,
            complaint.description,
            complaint.assignedTo,
            complaint.linkedIncidentId,
            complaint.linkedCapaId,
            complaint.resolutionNote,
            complaint.internalNotes,
          ]
        );

        for (const a of auditEntries) {
          await client.query(
            `INSERT INTO audit_events (
               id, entity_type, entity_id, at, actor, actor_role, action, detail, previous_status, new_status, customer_visible
             ) VALUES ($1, 'complaint', $2, NOW(), $3, $4, $5, $6, $7, $8, $9)`,
            [
              a.id,
              complaintId,
              a.actor,
              a.actorRole,
              a.action,
              a.detail,
              a.previousStatus || null,
              a.newStatus || null,
              a.customerVisible ?? true,
            ]
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL complaint filing failed, using fallback]:', err);
        this.inMemory.complaints.unshift(complaint);
        if (incident) this.inMemory.incidents.unshift(incident);
      } finally {
        client.release();
      }
    } else {
      this.inMemory.complaints.unshift(complaint);
      if (incident) this.inMemory.incidents.unshift(incident);
    }

    const result: ComplaintFilingResult = {
      complaint,
      incident,
      duplicate: false,
      auditEntries,
    };

    this.idempotencyCache.set(dedupeKey, result);
    return result;
  }

  public async getIncidents(filter?: {
    status?: string;
    severity?: string;
    assignedTo?: string;
    location?: string;
  }): Promise<SafetyIncident[]> {
    if (isDbConnected()) {
      try {
        const pool = getPool();
        let query = `SELECT * FROM safety_incidents WHERE 1=1`;
        const params: unknown[] = [];
        if (filter?.status) {
          params.push(filter.status);
          query += ` AND status = $${params.length}`;
        }
        if (filter?.severity) {
          params.push(filter.severity);
          query += ` AND severity = $${params.length}`;
        }
        if (filter?.assignedTo) {
          params.push(filter.assignedTo);
          query += ` AND assigned_to ILIKE $${params.length}`;
        }
        if (filter?.location) {
          params.push(`%${filter.location}%`);
          query += ` AND location ILIKE $${params.length}`;
        }
        query += ` ORDER BY timestamp DESC`;
        const res = await pool.query(query, params);
        const incidents: SafetyIncident[] = [];
        for (const row of res.rows) {
          const inc = await this.getIncidentById(row.id);
          if (inc) incidents.push(inc);
        }
        return incidents;
      } catch (err) {
        console.warn('[PostgreSQL fallback] getIncidents error:', err);
      }
    }

    let list = this.inMemory.incidents;
    if (filter?.status) {
      list = list.filter((i: SafetyIncident) => i.status === filter.status);
    }
    if (filter?.severity) {
      list = list.filter((i: SafetyIncident) => i.severity === filter.severity);
    }
    if (filter?.assignedTo) {
      list = list.filter((i: SafetyIncident) =>
        i.assignedTo?.toLowerCase().includes(filter.assignedTo!.toLowerCase())
      );
    }
    return list;
  }

  public async getIncidentById(id: string): Promise<SafetyIncident | null> {
    if (isDbConnected()) {
      try {
        const pool = getPool();
        const res = await pool.query(`SELECT * FROM safety_incidents WHERE id = $1`, [id]);
        if (res.rowCount && res.rowCount > 0) {
          const row = res.rows[0];
          const [evRes, audRes] = await Promise.all([
            pool.query(
              `SELECT * FROM evidence_items WHERE entity_type = 'incident' AND entity_id = $1`,
              [id]
            ),
            pool.query(
              `SELECT * FROM audit_events WHERE entity_type = 'incident' AND entity_id = $1 ORDER BY at ASC`,
              [id]
            ),
          ]);

          return {
            id: row.id,
            title: row.title,
            severity: row.severity,
            location: row.location,
            timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : 'Today',
            reportedBy: row.reported_by,
            supervisorActionNeeded: row.supervisor_action_needed,
            correctiveActionPlan: row.corrective_action_plan || '',
            status: row.status,
            openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : undefined,
            fixedAt: row.fixed_at ? new Date(row.fixed_at).toISOString() : null,
            verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
            closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
            assignedTo: row.assigned_to,
            createdBy: row.created_by,
            customerVisible: row.customer_visible,
            internalNotes: row.internal_notes,
            linkedComplaintId: row.linked_complaint_id,
            linkedCapaId: row.linked_capa_id,
            evidence: evRes.rows.map((e: any) => ({
              id: e.id,
              kind: e.kind,
              title: e.title,
              reference: e.reference,
              capturedAt: e.captured_at ? new Date(e.captured_at).toISOString() : 'Today',
              capturedBy: e.captured_by,
              notes: e.notes || '',
            })),
            auditTrail: audRes.rows.map((a: any) => ({
              id: a.id,
              at: a.at ? new Date(a.at).toISOString() : 'Today',
              actor: a.actor,
              actorRole: a.actor_role,
              action: a.action,
              detail: a.detail,
              previousStatus: a.previous_status,
              newStatus: a.new_status,
              customerVisible: a.customer_visible,
            })),
          };
        }
      } catch (err) {
        console.warn('[PostgreSQL fallback] getIncidentById error:', err);
      }
    }

    return this.inMemory.incidents.find((i: SafetyIncident) => i.id === id) || null;
  }

  public async assignIncident(
    id: string,
    assignee: string,
    actor: string = 'Chef R. Suresh',
    actorRole: UserRole = 'supervisor'
  ): Promise<SafetyIncident> {
    const inc = await this.getIncidentById(id);
    if (!inc) {
      throw new Error(`Incident ${id} not found`);
    }

    const previousAssignee = inc.assignedTo;
    inc.assignedTo = assignee;
    if (inc.status === 'open') {
      inc.status = 'in-progress';
    }

    const auditEntry: AuditEntry = {
      id: `AUD-ASG-${Date.now()}`,
      at: new Date().toISOString(),
      actor,
      actorRole,
      action: 'Incident Assigned',
      detail: `Assigned to ${assignee} (previously: ${previousAssignee || 'none'}).`,
      customerVisible: true,
    };

    if (!inc.auditTrail) inc.auditTrail = [];
    inc.auditTrail.push(auditEntry);

    if (isDbConnected()) {
      try {
        const pool = getPool();
        await pool.query(
          `UPDATE safety_incidents
           SET assigned_to = $1, status = $2
           WHERE id = $3`,
          [assignee, inc.status, id]
        );
        await pool.query(
          `INSERT INTO audit_events (
             id, entity_type, entity_id, at, actor, actor_role, action, detail, new_status, customer_visible
           ) VALUES ($1, 'incident', $2, NOW(), $3, $4, $5, $6, $7, true)`,
          [auditEntry.id, id, actor, actorRole, auditEntry.action, auditEntry.detail, inc.status]
        );
        return (await this.getIncidentById(id))!;
      } catch (err) {
        console.warn('[PostgreSQL assign fallback]:', err);
      }
    }

    return inc;
  }

  public async recordCorrectiveAction(
    id: string,
    actionTaken: string,
    assignedStaff: string = 'Ankit Verma',
    fixNotes: string = '',
    correctiveActionPlan: string = '',
    evidenceItem?: {
      kind: 'photo' | 'probe-reading' | 'lab-test' | 'document' | 'statement';
      title: string;
      reference: string;
      notes?: string;
    },
    actor: string = 'Ankit Verma',
    actorRole: UserRole = 'staff'
  ): Promise<{ incident: SafetyIncident; capa: CorrectiveAction }> {
    const inc = await this.getIncidentById(id);
    if (!inc) throw new Error(`Incident ${id} not found`);

    const nowIso = new Date().toISOString();
    const prevStatus = inc.status;
    inc.status = 'fixed';
    inc.fixedAt = nowIso;
    if (correctiveActionPlan) inc.correctiveActionPlan = correctiveActionPlan;

    const capaId = `CAPA-${Date.now().toString().slice(-6)}`;
    const capa: CorrectiveAction = {
      id: capaId,
      incidentRef: id,
      actionTaken: actionTaken || fixNotes,
      assignedStaff,
      timestamp: nowIso,
      verificationStatus: 'pending-supervisor',
      remedialVerificationLog: `Fix documented by ${actor}. Awaiting supervisor digital sign-off.`,
    };

    if (evidenceItem) {
      const ev: EvidenceItem = {
        id: `EVD-${Date.now()}`,
        kind: evidenceItem.kind,
        title: evidenceItem.title,
        reference: evidenceItem.reference,
        capturedAt: nowIso,
        capturedBy: actor,
        notes: evidenceItem.notes || '',
      };
      if (!inc.evidence) inc.evidence = [];
      inc.evidence.push(ev);
    }

    const audit: AuditEntry = {
      id: `AUD-FIX-${Date.now()}`,
      at: nowIso,
      actor,
      actorRole,
      action: 'Corrective Action Documented',
      detail: `Status updated to fixed. Action: ${actionTaken || fixNotes}.`,
      previousStatus: prevStatus,
      newStatus: 'fixed',
      customerVisible: true,
    };
    if (!inc.auditTrail) inc.auditTrail = [];
    inc.auditTrail.push(audit);

    if (isDbConnected()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE safety_incidents
           SET status = 'fixed', fixed_at = NOW(), corrective_action_plan = $1, linked_capa_id = $2
           WHERE id = $3`,
          [inc.correctiveActionPlan, capaId, id]
        );
        await client.query(
          `INSERT INTO corrective_actions (
             id, incident_ref, action_taken, assigned_staff, timestamp, verification_status, remedial_verification_log
           ) VALUES ($1, $2, $3, $4, NOW(), 'pending-supervisor', $5)`,
          [capa.id, id, capa.actionTaken, capa.assignedStaff, capa.remedialVerificationLog]
        );
        if (evidenceItem) {
          await client.query(
            `INSERT INTO evidence_items (
               id, entity_type, entity_id, kind, title, reference, captured_at, captured_by, notes
             ) VALUES ($1, 'incident', $2, $3, $4, $5, NOW(), $6, $7)`,
            [
              `EVD-${Date.now()}`,
              id,
              evidenceItem.kind,
              evidenceItem.title,
              evidenceItem.reference,
              actor,
              evidenceItem.notes || '',
            ]
          );
        }
        await client.query(
          `INSERT INTO audit_events (
             id, entity_type, entity_id, at, actor, actor_role, action, detail, previous_status, new_status, customer_visible
           ) VALUES ($1, 'incident', $2, NOW(), $3, $4, $5, $6, $7, 'fixed', true)`,
          [audit.id, id, actor, actorRole, audit.action, audit.detail, prevStatus]
        );
        await client.query('COMMIT');
        return { incident: (await this.getIncidentById(id))!, capa };
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL corrective action error, falling back]:', err);
      } finally {
        client.release();
      }
    }

    this.inMemory.correctiveActions.unshift(capa);
    return { incident: inc, capa };
  }

  public async verifyIncident(
    id: string,
    verificationNotes: string,
    actor: string = 'Chef R. Suresh',
    actorRole: UserRole = 'supervisor'
  ): Promise<SafetyIncident> {
    const inc = await this.getIncidentById(id);
    if (!inc) throw new Error(`Incident ${id} not found`);

    // Strict Security Guard 1: Role check
    if (actorRole !== 'supervisor' && actorRole !== 'auditor') {
      const err = new Error(
        `Permission denied: Only supervisors and auditors can verify corrective actions. Current role: ${actorRole}`
      );
      (err as { status?: number }).status = 403;
      throw err;
    }

    // Strict Security Guard 2: Prevent staff from verifying their own corrective action
    const assignedLower = (inc.assignedTo || '').toLowerCase();
    const actorLower = actor.toLowerCase();
    if (assignedLower && (assignedLower === actorLower || assignedLower.includes(actorLower) || actorLower.includes(assignedLower))) {
      const err = new Error(
        `Security violation: Staff member cannot verify their own corrective action (${inc.assignedTo}). Independent supervisor verification required.`
      );
      (err as { status?: number }).status = 403;
      throw err;
    }

    const nowIso = new Date().toISOString();
    const prevStatus = inc.status;
    inc.status = 'verified';
    inc.verifiedAt = nowIso;

    const audit: AuditEntry = {
      id: `AUD-VRF-${Date.now()}`,
      at: nowIso,
      actor,
      actorRole,
      action: 'Supervisor Verification Completed',
      detail: verificationNotes,
      previousStatus: prevStatus,
      newStatus: 'verified',
      customerVisible: true,
    };
    if (!inc.auditTrail) inc.auditTrail = [];
    inc.auditTrail.push(audit);

    if (isDbConnected()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE safety_incidents
           SET status = 'verified', verified_at = NOW()
           WHERE id = $1`,
          [id]
        );
        await client.query(
          `UPDATE corrective_actions
           SET verification_status = 'approved', remedial_verification_log = $1
           WHERE incident_ref = $2`,
          [verificationNotes, id]
        );
        await client.query(
          `INSERT INTO audit_events (
             id, entity_type, entity_id, at, actor, actor_role, action, detail, previous_status, new_status, customer_visible
           ) VALUES ($1, 'incident', $2, NOW(), $3, $4, $5, $6, $7, 'verified', true)`,
          [audit.id, id, actor, actorRole, audit.action, audit.detail, prevStatus]
        );
        await client.query('COMMIT');
        return (await this.getIncidentById(id))!;
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL verify fallback]:', err);
      } finally {
        client.release();
      }
    }

    return inc;
  }

  public async closeIncident(
    id: string,
    closureNotes: string,
    actor: string = 'Chef R. Suresh',
    actorRole: UserRole = 'supervisor'
  ): Promise<SafetyIncident> {
    const inc = await this.getIncidentById(id);
    if (!inc) throw new Error(`Incident ${id} not found`);

    // Strict Security Guard 1: Supervisor/Auditor role
    if (actorRole !== 'supervisor' && actorRole !== 'auditor') {
      const err = new Error(
        `Permission denied: Only supervisors or auditors can officially close an incident. Current role: ${actorRole}`
      );
      (err as { status?: number }).status = 403;
      throw err;
    }

    // Strict Security Guard 2: Evidence check
    const hasEvidence = (inc.evidence && inc.evidence.length > 0);
    if (!hasEvidence && inc.status !== 'verified') {
      const err = new Error(
        `Closure rejected: Cannot close incident without verifiable evidence metadata and prior supervisor verification.`
      );
      (err as { status?: number }).status = 400;
      throw err;
    }

    const nowIso = new Date().toISOString();
    const prevStatus = inc.status;
    inc.status = 'closed';
    inc.closedAt = nowIso;

    const audit: AuditEntry = {
      id: `AUD-CLS-${Date.now()}`,
      at: nowIso,
      actor,
      actorRole,
      action: 'Incident Formally Closed',
      detail: closureNotes,
      previousStatus: prevStatus,
      newStatus: 'closed',
      customerVisible: true,
    };
    if (!inc.auditTrail) inc.auditTrail = [];
    inc.auditTrail.push(audit);

    if (isDbConnected()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE safety_incidents
           SET status = 'closed', closed_at = NOW()
           WHERE id = $1`,
          [id]
        );
        // Also close linked complaint if present
        if (inc.linkedComplaintId) {
          await client.query(
            `UPDATE complaints
             SET status = 'resolved-closed', closed_at = NOW(), resolution_note = $1
             WHERE id = $2`,
            [`Resolved via Safety Incident closure: ${closureNotes}`, inc.linkedComplaintId]
          );
        }
        await client.query(
          `INSERT INTO audit_events (
             id, entity_type, entity_id, at, actor, actor_role, action, detail, previous_status, new_status, customer_visible
           ) VALUES ($1, 'incident', $2, NOW(), $3, $4, $5, $6, $7, 'closed', true)`,
          [audit.id, id, actor, actorRole, audit.action, audit.detail, prevStatus]
        );
        await client.query('COMMIT');
        return (await this.getIncidentById(id))!;
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL close fallback]:', err);
      } finally {
        client.release();
      }
    }

    return inc;
  }

  public async attachEvidence(
    targetType: 'incident' | 'complaint' | 'capa',
    targetId: string,
    evidence: {
      kind: 'photo' | 'probe-reading' | 'lab-test' | 'document' | 'statement';
      title: string;
      reference: string;
      notes: string;
      capturedBy?: string;
    }
  ): Promise<EvidenceItem> {
    const item: EvidenceItem = {
      id: `EVD-${Date.now()}`,
      kind: evidence.kind,
      title: evidence.title,
      reference: evidence.reference,
      capturedAt: new Date().toISOString(),
      capturedBy: evidence.capturedBy || 'Chef R. Suresh',
      notes: evidence.notes || '',
    };

    if (isDbConnected()) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO evidence_items (
             id, entity_type, entity_id, kind, title, reference, captured_at, captured_by, notes
           ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)`,
          [
            item.id,
            targetType,
            targetId,
            item.kind,
            item.title,
            item.reference,
            item.capturedBy,
            item.notes,
          ]
        );
        return item;
      } catch (err) {
        console.warn('[PostgreSQL evidence fallback]:', err);
      }
    }

    if (targetType === 'incident') {
      const inc = this.inMemory.incidents.find((i: SafetyIncident) => i.id === targetId);
      if (inc) {
        if (!inc.evidence) inc.evidence = [];
        inc.evidence.push(item);
      }
    }
    return item;
  }

  public async recordInspection(data: {
    checkpoint: string;
    zone: string;
    passed: boolean;
    comments?: string;
    parameter?: string;
    measuredValue?: string;
    safeLimit?: string;
    inspector?: string;
  }): Promise<{ auditRecord: InspectionAuditRecord; alertIncident?: SafetyIncident }> {
    const auditRecord: InspectionAuditRecord = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkpoint: data.checkpoint,
      supervisor: data.inspector || 'Chef R. Suresh',
      result: data.passed ? 'passed' : 'non-compliant',
      comments: data.comments || (data.passed ? 'Routine inspection passed' : 'Checkpoint threshold failure'),
      zone: data.zone,
    };

    let alertIncident: SafetyIncident | undefined;
    if (!data.passed) {
      alertIncident = {
        id: `INC-HYG-${Date.now().toString().slice(-4)}`,
        title: `Hygiene Non-Compliance: ${data.checkpoint}`,
        severity: 'moderate',
        location: data.zone,
        timestamp: new Date().toISOString(),
        reportedBy: data.inspector || 'Chef R. Suresh',
        supervisorActionNeeded: true,
        correctiveActionPlan: `Immediate sanitization re-cycle required for ${data.zone}.`,
        status: 'open',
        openedAt: new Date().toISOString(),
        assignedTo: 'Ankit Verma',
        createdBy: 'Hygiene Inspection Checklist',
        customerVisible: true,
        internalNotes: `Failed parameter: ${data.parameter || 'Surface hygiene'}. Measured: ${data.measuredValue || 'Fail'}. Safe: ${data.safeLimit || '<30 RLU'}.`,
        evidence: [],
      };
    }

    if (isDbConnected()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO inspection_audits (
             id, checkpoint, zone, supervisor, result, comments, time, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            auditRecord.id,
            auditRecord.checkpoint,
            auditRecord.zone,
            auditRecord.supervisor,
            auditRecord.result,
            auditRecord.comments,
            auditRecord.time,
          ]
        );
        if (alertIncident) {
          await client.query(
            `INSERT INTO safety_incidents (
               id, title, severity, location, timestamp, reported_by,
               supervisor_action_needed, corrective_action_plan, status,
               opened_at, assigned_to, created_by, customer_visible, internal_notes
             ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), $9, $10, true, $11)`,
            [
              alertIncident.id,
              alertIncident.title,
              alertIncident.severity,
              alertIncident.location,
              alertIncident.reportedBy,
              alertIncident.supervisorActionNeeded,
              alertIncident.correctiveActionPlan,
              alertIncident.status,
              alertIncident.assignedTo,
              alertIncident.createdBy,
              alertIncident.internalNotes,
            ]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL inspection fallback]:', err);
        this.inMemory.inspectionAudits.unshift(auditRecord);
        if (alertIncident) this.inMemory.incidents.unshift(alertIncident);
      } finally {
        client.release();
      }
    } else {
      this.inMemory.inspectionAudits.unshift(auditRecord);
      if (alertIncident) this.inMemory.incidents.unshift(alertIncident);
    }

    return { auditRecord, alertIncident };
  }

  public async recordTemperatureReading(data: {
    station: string;
    probeId: string;
    value: number;
    unit?: string;
    limitLow?: number | null;
    limitHigh?: number | null;
    notes?: string;
    recordedBy?: string;
  }): Promise<{ reading: unknown; alertIncident?: SafetyIncident }> {
    const isOverHigh = data.limitHigh !== null && data.limitHigh !== undefined && data.value > data.limitHigh;
    const isUnderLow = data.limitLow !== null && data.limitLow !== undefined && data.value < data.limitLow;
    const withinLimits = !isOverHigh && !isUnderLow;

    let alertIncident: SafetyIncident | undefined;
    if (!withinLimits) {
      alertIncident = {
        id: `INC-TEMP-${Date.now().toString().slice(-4)}`,
        title: `Temperature Limit Exceeded at ${data.station} (${data.value}${data.unit || '°C'})`,
        severity: 'high',
        location: data.station,
        timestamp: new Date().toISOString(),
        reportedBy: `${data.probeId} (Telemetry)`,
        supervisorActionNeeded: true,
        correctiveActionPlan: `Check cooling/heating element at ${data.station}. Isolate affected batch.`,
        status: 'open',
        openedAt: new Date().toISOString(),
        assignedTo: 'Chef R. Suresh',
        createdBy: 'Telemetry Sentinel',
        customerVisible: true,
        internalNotes: `Probe reading: ${data.value}. Limits: Low ${data.limitLow ?? 'N/A'}, High ${data.limitHigh ?? 'N/A'}.`,
        evidence: [],
      };
    }

    const readingRecord = {
      id: `TMP-${Date.now()}`,
      station: data.station,
      probeId: data.probeId,
      value: data.value,
      unit: data.unit || '°C',
      limitLow: data.limitLow ?? null,
      limitHigh: data.limitHigh ?? null,
      withinLimits,
      recordedAt: new Date().toISOString(),
      recordedBy: data.recordedBy || 'Telemetry',
      notes: data.notes || '',
    };

    if (isDbConnected()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO temperature_readings (
             id, station, probe_id, value, unit, limit_low, limit_high, within_limits, recorded_at, recorded_by, notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
          [
            readingRecord.id,
            readingRecord.station,
            readingRecord.probeId,
            readingRecord.value,
            readingRecord.unit,
            readingRecord.limitLow,
            readingRecord.limitHigh,
            readingRecord.withinLimits,
            readingRecord.recordedBy,
            readingRecord.notes,
          ]
        );
        if (alertIncident) {
          await client.query(
            `INSERT INTO safety_incidents (
               id, title, severity, location, timestamp, reported_by,
               supervisor_action_needed, corrective_action_plan, status,
               opened_at, assigned_to, created_by, customer_visible, internal_notes
             ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), $9, $10, true, $11)`,
            [
              alertIncident.id,
              alertIncident.title,
              alertIncident.severity,
              alertIncident.location,
              alertIncident.reportedBy,
              alertIncident.supervisorActionNeeded,
              alertIncident.correctiveActionPlan,
              alertIncident.status,
              alertIncident.assignedTo,
              alertIncident.createdBy,
              alertIncident.internalNotes,
            ]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL telemetry fallback]:', err);
        if (alertIncident) this.inMemory.incidents.unshift(alertIncident);
      } finally {
        client.release();
      }
    } else if (alertIncident) {
      this.inMemory.incidents.unshift(alertIncident);
    }

    return { reading: readingRecord, alertIncident };
  }

  public async getInventory(): Promise<InventoryRisk[]> {
    if (isDbConnected()) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT * FROM inventory_batches ORDER BY hours_until_expiry ASC`
        );
        return res.rows.map((row: any) => ({
          id: row.id,
          ingredient: row.ingredient,
          batchNumber: row.batch_number,
          storageLocation: row.storage_location,
          hoursUntilExpiry: row.hours_until_expiry,
          currentQuantityKg: Number(row.current_quantity_kg),
          riskTier: row.risk_tier,
          suggestedAction: row.suggested_action,
          supplier: row.supplier,
        }));
      } catch (err) {
        console.warn('[PostgreSQL inventory fallback]:', err);
      }
    }
    return this.inMemory.inventoryRisks;
  }

  public async resolveInventory(id: string, actionName: string): Promise<void> {
    if (isDbConnected()) {
      try {
        const pool = getPool();
        await pool.query(
          `UPDATE inventory_batches
           SET risk_tier = 'normal', suggested_action = $1
           WHERE id = $2`,
          [`Resolved: ${actionName}`, id]
        );
        return;
      } catch (err) {
        console.warn('[PostgreSQL inventory resolve fallback]:', err);
      }
    }
    this.inMemory.inventoryRisks = this.inMemory.inventoryRisks.filter((r: InventoryRisk) => r.id !== id);
  }

  public async expireInventory(
    id: string,
    actor: string = 'Chef R. Suresh'
  ): Promise<{ alertIncident: SafetyIncident }> {
    const item = (await this.getInventory()).find((r: InventoryRisk) => r.id === id);
    const ingredientName = item ? item.ingredient : `Ingredient Batch ${id}`;

    const alertIncident: SafetyIncident = {
      id: `INC-EXP-${Date.now().toString().slice(-4)}`,
      title: `Critical Expired Batch Quarantined: ${ingredientName}`,
      severity: 'critical',
      location: item ? item.storageLocation : 'Walk-in Chiller',
      timestamp: new Date().toISOString(),
      reportedBy: actor,
      supervisorActionNeeded: true,
      correctiveActionPlan: `Physically segregate batch ${item?.batchNumber || id} into bio-waste holding bin. Quarantine lot.`,
      status: 'open',
      openedAt: new Date().toISOString(),
      assignedTo: 'Ankit Verma',
      createdBy: 'Inventory Expiry Guardian',
      customerVisible: true,
      internalNotes: `Critical shelf-life expiration threshold reached (0h). Batch locked from kitchen line production.`,
      evidence: [],
    };

    if (isDbConnected()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE inventory_batches
           SET hours_until_expiry = 0, risk_tier = 'critical', suggested_action = 'Quarantined & Discarded'
           WHERE id = $1`,
          [id]
        );
        await client.query(
          `INSERT INTO safety_incidents (
             id, title, severity, location, timestamp, reported_by,
             supervisor_action_needed, corrective_action_plan, status,
             opened_at, assigned_to, created_by, customer_visible, internal_notes
           ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), $9, $10, true, $11)`,
          [
            alertIncident.id,
            alertIncident.title,
            alertIncident.severity,
            alertIncident.location,
            alertIncident.reportedBy,
            alertIncident.supervisorActionNeeded,
            alertIncident.correctiveActionPlan,
            alertIncident.status,
            alertIncident.assignedTo,
            alertIncident.createdBy,
            alertIncident.internalNotes,
          ]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn('[PostgreSQL expire fallback]:', err);
        this.inMemory.incidents.unshift(alertIncident);
      } finally {
        client.release();
      }
    } else {
      this.inMemory.incidents.unshift(alertIncident);
    }

    return { alertIncident };
  }

  public async resetDemoData(): Promise<SeedDataset> {
    this.inMemory = getInitialSeedData();
    this.idempotencyCache.clear();
    return this.inMemory;
  }

  private mapDbComplaint(row: any): ComplaintRecord {
    return {
      id: row.id,
      orderId: row.order_id,
      token: row.token,
      dishName: row.dish_name,
      category: row.category,
      severity: row.severity,
      status: row.status,
      reportedBy: row.reported_by,
      dinerContact: row.diner_contact,
      seatNumber: row.seat_number || '',
      description: row.description,
      reportedAt: row.reported_at ? new Date(row.reported_at).toISOString() : 'Today',
      assignedTo: row.assigned_to,
      linkedIncidentId: row.linked_incident_id,
      linkedCapaId: row.linked_capa_id,
      evidence: [],
      auditTrail: [],
      resolutionNote: row.resolution_note || '',
      internalNotes: row.internal_notes,
      closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    };
  }
}

export const dataStore = new SafetyDataStore();
