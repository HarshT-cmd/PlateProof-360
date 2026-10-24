import { describe, it, expect, beforeEach } from 'vitest';
import { LocalSafetyRepository } from '../safetyRepository';

describe('SafetyRepository — Async Domain Operations', () => {
  let repo: LocalSafetyRepository;

  beforeEach(async () => {
    repo = new LocalSafetyRepository();
    await repo.resetDemoData();
  });

  it('fetches initialized domain orders and retrieves specific order by token or ID', async () => {
    const orders = await repo.getOrders();
    expect(orders.length).toBeGreaterThanOrEqual(3);

    const order1042 = await repo.getOrder('order-1042');
    expect(order1042).toBeDefined();
    expect(order1042.orderId).toBe('ORD-1042');
    expect(order1042.cookingRecord.recordedTemp).toBe(82.4);

    const orderById = await repo.getOrder('ORD-1043');
    expect(orderById.orderId).toBe('ORD-1043');
  });

  it('handles diner complaint filing, reactive notification, and state consistency', async () => {
    let notified = false;
    const unsubscribe = repo.subscribe(() => {
      notified = true;
    });

    const filing = await repo.fileComplaint({
      orderId: 'ORD-1042',
      token: 'order-1042',
      dishName: 'Artisanal Paneer Tikka Masala',
      category: 'allergen',
      description: 'Customer experienced tingling after tasting gravy (nut check)',
      dinerContact: '+91 91234 56789',
      seatNumber: 'Table 9',
    });

    expect(notified).toBe(true);
    expect(filing.complaint.category).toBe('allergen');
    expect(filing.complaint.severity).toBe('critical');
    expect(filing.incident).not.toBeNull();

    const complaints = await repo.getComplaintsForOrder('ORD-1042');
    expect(complaints.some((c) => c.id === filing.complaint.id)).toBe(true);

    unsubscribe();
  });

  it('resolves a diner complaint with supervisor notes and generates immutable audit entry', async () => {
    const complaints = await repo.getComplaints();
    const target = complaints[0];

    const resolved = await repo.resolveComplaint(
      target.id,
      'Nut segregation confirmed via dedicated ladle and wipe audit. Chef conducted table visit.',
      'Chef R. Suresh (FSS-KA-8819)'
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.status).toBe('resolved-closed');
    expect(resolved?.resolutionNote).toContain('Nut segregation confirmed');
    expect(resolved?.closedAt).toBeTruthy();
    expect(resolved?.auditTrail.some((a) => a.action === 'Complaint Resolved by Supervisor')).toBe(true);
  });

  it('attaches evidence to an incident and cascades update to audit trail', async () => {
    const incidents = await repo.getIncidents();
    const targetIncident = incidents[0];

    await repo.attachEvidence(
      'incident',
      targetIncident.id,
      {
        kind: 'photo',
        title: 'Thermal Imaging of Tandoor Skewer Hearth',
        reference: 'FLIR-IR-8821.JPG',
        capturedBy: 'Chef R. Suresh',
        notes: 'Uniform temperature distribution across all 4 skewer zones verified at 82.4°C.',
      },
      'Chef R. Suresh'
    );

    const updatedIncidents = await repo.getIncidents();
    const updated = updatedIncidents.find((i) => i.id === targetIncident.id);
    expect(updated?.evidence?.some((e) => e.title === 'Thermal Imaging of Tandoor Skewer Hearth')).toBe(true);
    expect(updated?.auditTrail?.some((a) => a.action === 'Evidence Attached')).toBe(true);
  });

  it('attaches evidence to a CAPA and retains it across audit queries', async () => {
    const capas = await repo.getCorrectiveActions();
    const targetCapa = capas[0];

    await repo.attachEvidence(
      'capa',
      targetCapa.id,
      {
        kind: 'lab-test',
        title: 'Secondary Probe Re-Calibration Certificate',
        reference: 'CAL-NABL-2026-901.PDF',
        capturedBy: 'QA Lead K. Meenakshi',
        notes: 'Calibrated against ice-point 0.0°C and boiling-point 100.0°C reference standards.',
      },
      'QA Lead K. Meenakshi'
    );

    const updatedCapas = await repo.getCorrectiveActions();
    const updated = updatedCapas.find((c) => c.id === targetCapa.id);
    expect(updated?.evidence?.some((e) => e.reference === 'CAL-NABL-2026-901.PDF')).toBe(true);
  });
});
