import { getPool, testConnection } from './pool';
import { getInitialSeedData } from './seedData';

export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  const conn = await testConnection();
  if (!conn.connected) {
    return {
      success: false,
      message: `Database connection unavailable: ${conn.error}`,
    };
  }

  const pool = getPool();
  const client = await pool.connect();
  const seed = getInitialSeedData();

  try {
    await client.query('BEGIN');

    // 1. Seed Users
    for (const u of seed.users) {
      await client.query(
        `INSERT INTO users (id, name, role, employee_id, active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           employee_id = EXCLUDED.employee_id,
           active = EXCLUDED.active`,
        [u.id, u.name, u.role, u.employeeId, u.active]
      );
    }

    // 2. Seed Orders & related tables
    for (const o of seed.orders) {
      await client.query(
        `INSERT INTO orders (
           id, order_id, dish_name, regional_variant, kitchen_name, station,
           prep_timestamp, serving_window, image_url, description, is_vegetarian,
           portion_weight_grams, verification_hash, fssai_number, iso_standard,
           batch_verification_note
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (order_id) DO UPDATE SET
           dish_name = EXCLUDED.dish_name,
           image_url = EXCLUDED.image_url,
           verification_hash = EXCLUDED.verification_hash`,
        [
          o.orderId,
          o.orderId,
          o.dishName,
          o.regionalVariant,
          o.kitchenName,
          o.station,
          o.servingWindow,
          o.imageUrl,
          o.description,
          o.isVegetarian,
          o.portionWeightGrams,
          o.verificationHash,
          o.fssaiNumber,
          o.isoStandard,
          o.batchVerificationNote,
        ]
      );

      // QR Token
      await client.query(
        `INSERT INTO qr_tokens (id, token, order_id, issued_at, expires_at, revoked)
         VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours', false)
         ON CONFLICT (token) DO UPDATE SET revoked = false`,
        [`QRT-${o.orderId}`, o.token, o.orderId]
      );

      // Cooking record
      if (o.cookingRecord) {
        await client.query(
          `DELETE FROM cooking_records WHERE order_id = $1`,
          [o.orderId]
        );
        await client.query(
          `INSERT INTO cooking_records (
             id, order_id, target_temp, recorded_temp, unit, probe_id,
             recorded_at, duration_hold_seconds, ccp_code, operator, method, validation_rule
           ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11)`,
          [
            `CCP-${o.orderId}`,
            o.orderId,
            o.cookingRecord.targetTemp,
            o.cookingRecord.recordedTemp,
            o.cookingRecord.unit,
            o.cookingRecord.probeId,
            o.cookingRecord.durationHoldSeconds,
            o.cookingRecord.ccpCode,
            o.cookingRecord.operator,
            o.cookingRecord.method,
            o.cookingRecord.validationRule,
          ]
        );
      }

      // Ingredients
      await client.query(`DELETE FROM ingredients WHERE order_id = $1`, [o.orderId]);
      for (let i = 0; i < o.ingredients.length; i++) {
        const ing = o.ingredients[i];
        await client.query(
          `INSERT INTO ingredients (
             id, order_id, name, category, origin, lot_number, supplier,
             certifications, intake_date, storage_temp, quality_note
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '1 day', $9, $10)`,
          [
            `ING-${o.orderId}-${i}`,
            o.orderId,
            ing.name,
            ing.category,
            ing.origin,
            ing.lotNumber,
            ing.supplier,
            JSON.stringify(ing.certifications || []),
            ing.storageTemp,
            ing.qualityNote,
          ]
        );
      }

      // Allergens
      await client.query(`DELETE FROM allergens WHERE order_id = $1`, [o.orderId]);
      for (let i = 0; i < o.allergens.length; i++) {
        const alg = o.allergens[i];
        await client.query(
          `INSERT INTO allergens (
             id, order_id, name, type, source, severity, declaration_note, station_isolation
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `ALG-${o.orderId}-${i}`,
            o.orderId,
            alg.name,
            alg.type,
            alg.source,
            alg.severity,
            alg.declarationNote,
            alg.stationIsolation,
          ]
        );
      }

      // Hygiene checks
      await client.query(`DELETE FROM hygiene_checks WHERE order_id = $1`, [o.orderId]);
      for (const h of o.hygieneChecks) {
        await client.query(
          `INSERT INTO hygiene_checks (
             id, order_id, checkpoint, time, inspector, status, parameter,
             measured_value, safe_limit, evidence_note
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            h.id,
            o.orderId,
            h.checkpoint,
            h.time,
            h.inspector,
            h.status,
            h.parameter,
            h.measuredValue,
            h.safeLimit,
            h.evidenceNote,
          ]
        );
      }
    }

    // 3. Incidents
    for (const inc of seed.incidents) {
      await client.query(
        `INSERT INTO safety_incidents (
           id, title, severity, location, timestamp, reported_by, supervisor_action_needed,
           corrective_action_plan, status, opened_at, fixed_at, verified_at, closed_at,
           assigned_to, created_by, customer_visible, internal_notes
         ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, NOW(), $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           severity = EXCLUDED.severity,
           corrective_action_plan = EXCLUDED.corrective_action_plan`,
        [
          inc.id,
          inc.title,
          inc.severity,
          inc.location,
          inc.reportedBy,
          inc.supervisorActionNeeded,
          inc.correctiveActionPlan,
          inc.status,
          inc.fixedAt || null,
          inc.verifiedAt || null,
          inc.closedAt || null,
          inc.assignedTo || 'Chef R. Suresh',
          inc.createdBy || 'System',
          inc.customerVisible ?? true,
          inc.internalNotes || 'Internal staff notes for root cause analysis.',
        ]
      );
    }

    // 4. Complaints
    for (const c of seed.complaints) {
      await client.query(
        `INSERT INTO complaints (
           id, order_id, token, dish_name, category, severity, status,
           reported_by, diner_contact, seat_number, description, reported_at,
           assigned_to, linked_incident_id, linked_capa_id, resolution_note,
           internal_notes, closed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           resolution_note = EXCLUDED.resolution_note`,
        [
          c.id,
          c.orderId,
          c.token,
          c.dishName,
          c.category,
          c.severity,
          c.status,
          c.reportedBy,
          c.dinerContact,
          c.seatNumber,
          c.description,
          c.assignedTo,
          c.linkedIncidentId,
          c.linkedCapaId,
          c.resolutionNote,
          c.internalNotes || 'Customer relations & kitchen escalation log.',
          c.closedAt ? new Date() : null,
        ]
      );
    }

    // 5. Corrective actions (CAPA)
    for (const capa of seed.correctiveActions) {
      await client.query(
        `INSERT INTO corrective_actions (
           id, incident_ref, action_taken, assigned_staff, timestamp,
           verification_status, remedial_verification_log
         ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           verification_status = EXCLUDED.verification_status,
           remedial_verification_log = EXCLUDED.remedial_verification_log`,
        [
          capa.id,
          capa.incidentRef,
          capa.actionTaken,
          capa.assignedStaff,
          capa.verificationStatus,
          capa.remedialVerificationLog,
        ]
      );
    }

    // 6. Inspection Audits
    for (const aud of seed.inspectionAudits) {
      await client.query(
        `INSERT INTO inspection_audits (
           id, checkpoint, zone, supervisor, result, comments, time, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           result = EXCLUDED.result,
           comments = EXCLUDED.comments`,
        [
          aud.id,
          aud.checkpoint,
          aud.zone,
          aud.supervisor,
          aud.result,
          aud.comments,
          aud.time,
        ]
      );
    }

    // 7. Inventory Batches
    for (const inv of seed.inventoryRisks) {
      await client.query(
        `INSERT INTO inventory_batches (
           id, ingredient, category, batch_number, supplier, origin, lot_number,
           storage_location, current_quantity_kg, unit, hours_until_expiry,
           risk_tier, suggested_action, certifications, created_at
         ) VALUES ($1, $2, 'Raw Material', $3, $4, 'Regional Farm Co-op', $3, $5, $6, 'kg', $7, $8, $9, '[]'::jsonb, NOW())
         ON CONFLICT (batch_number) DO UPDATE SET
           hours_until_expiry = EXCLUDED.hours_until_expiry,
           risk_tier = EXCLUDED.risk_tier,
           suggested_action = EXCLUDED.suggested_action`,
        [
          inv.id,
          inv.ingredient,
          inv.batchNumber,
          inv.supplier,
          inv.storageLocation,
          inv.currentQuantityKg,
          inv.hoursUntilExpiry,
          inv.riskTier,
          inv.suggestedAction,
        ]
      );
    }

    // 8. Temperature Readings
    for (const trend of seed.temperatureTrends) {
      await client.query(
        `INSERT INTO temperature_readings (
           id, station, probe_id, value, unit, limit_low, limit_high,
           within_limits, recorded_at, recorded_by, notes
         ) VALUES ($1, 'Walk-in Chiller 02', 'BLE-CHILL-02', $2, '°C', NULL, $3, $4, NOW(), 'Telemetry Daemon', 'Automatic scheduled probe ping')
         ON CONFLICT (id) DO NOTHING`,
        [
          `TMP-CHILL-${trend.time.replace(':', '')}`,
          trend.chillerTemp,
          trend.chillerUpperLimit,
          trend.chillerTemp <= trend.chillerUpperLimit,
        ]
      );
    }

    await client.query('COMMIT');
    return {
      success: true,
      message: 'PostgreSQL database seeded successfully with PlateProof 360 demo dataset.',
    };
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Database seeding failed: ${msg}`,
    };
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase().then((res) => {
    console.log(res.message);
    process.exit(res.success ? 0 : 1);
  });
}
