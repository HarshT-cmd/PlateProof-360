-- ====================================================================
-- PlateProof 360 Normalized PostgreSQL Schema
-- Enterprise Culinary Food Safety, Traceability & HACCP Compliance
-- ====================================================================

-- 1. Users and Roles
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('customer', 'staff', 'supervisor', 'auditor')),
  employee_id VARCHAR(64),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Orders (Attestation Anchor)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE,
  dish_name VARCHAR(255) NOT NULL,
  regional_variant VARCHAR(255),
  kitchen_name VARCHAR(255) NOT NULL,
  station VARCHAR(255) NOT NULL,
  prep_timestamp TIMESTAMPTZ NOT NULL,
  serving_window VARCHAR(128),
  image_url TEXT,
  description TEXT,
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  portion_weight_grams INTEGER,
  verification_hash VARCHAR(128) NOT NULL,
  fssai_number VARCHAR(64),
  iso_standard VARCHAR(64),
  batch_verification_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. QR Tokens (Secure, Unpredictable, Order-Specific & Revocable)
CREATE TABLE IF NOT EXISTS qr_tokens (
  id VARCHAR(64) PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_order_id ON qr_tokens(order_id);

-- 4. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  dish_name VARCHAR(255) NOT NULL,
  regional_variant VARCHAR(255),
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  portion_weight_grams INTEGER,
  station VARCHAR(255),
  image_url TEXT
);

-- 5. Cooking Records (Critical Control Points / CCP)
CREATE TABLE IF NOT EXISTS cooking_records (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  target_temp NUMERIC(6,2) NOT NULL,
  recorded_temp NUMERIC(6,2) NOT NULL,
  unit VARCHAR(16) NOT NULL DEFAULT '°C',
  probe_id VARCHAR(64) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  duration_hold_seconds INTEGER NOT NULL,
  ccp_code VARCHAR(32) NOT NULL,
  operator VARCHAR(255) NOT NULL,
  method VARCHAR(255) NOT NULL,
  validation_rule TEXT NOT NULL
);

-- 6. Ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  origin VARCHAR(255) NOT NULL,
  lot_number VARCHAR(128) NOT NULL,
  supplier VARCHAR(255) NOT NULL,
  certifications JSONB DEFAULT '[]'::jsonb,
  intake_date TIMESTAMPTZ NOT NULL,
  storage_temp VARCHAR(64) NOT NULL,
  quality_note TEXT
);

-- 7. Allergens
CREATE TABLE IF NOT EXISTS allergens (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('contains', 'may-contain', 'cross-contact-risk')),
  source VARCHAR(255) NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  declaration_note TEXT,
  station_isolation TEXT
);

-- 8. Hygiene Checks
CREATE TABLE IF NOT EXISTS hygiene_checks (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  checkpoint VARCHAR(255) NOT NULL,
  time VARCHAR(32) NOT NULL,
  inspector VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('passed', 'remediated', 'flagged')),
  parameter VARCHAR(255) NOT NULL,
  measured_value VARCHAR(128) NOT NULL,
  safe_limit VARCHAR(128) NOT NULL,
  evidence_note TEXT
);

-- 9. Inspection Audits & Checklist Results
CREATE TABLE IF NOT EXISTS inspection_audits (
  id VARCHAR(64) PRIMARY KEY,
  checkpoint VARCHAR(255) NOT NULL,
  zone VARCHAR(128) NOT NULL,
  supervisor VARCHAR(255) NOT NULL,
  result VARCHAR(32) NOT NULL CHECK (result IN ('passed', 'rectified', 'non-compliant')),
  comments TEXT,
  time VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Temperature Readings & Telemetry
CREATE TABLE IF NOT EXISTS temperature_readings (
  id VARCHAR(64) PRIMARY KEY,
  station VARCHAR(255) NOT NULL,
  probe_id VARCHAR(64) NOT NULL,
  value NUMERIC(6,2) NOT NULL,
  unit VARCHAR(16) NOT NULL DEFAULT '°C',
  limit_low NUMERIC(6,2),
  limit_high NUMERIC(6,2),
  within_limits BOOLEAN NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by VARCHAR(255) NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_temp_readings_station ON temperature_readings(station, recorded_at DESC);

-- 11. Inventory and Expiry Batches
CREATE TABLE IF NOT EXISTS inventory_batches (
  id VARCHAR(64) PRIMARY KEY,
  ingredient VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  batch_number VARCHAR(128) NOT NULL UNIQUE,
  supplier VARCHAR(255) NOT NULL,
  origin VARCHAR(255) NOT NULL,
  lot_number VARCHAR(128) NOT NULL,
  storage_location VARCHAR(255) NOT NULL,
  current_quantity_kg NUMERIC(8,2) NOT NULL,
  unit VARCHAR(16) NOT NULL DEFAULT 'kg',
  hours_until_expiry INTEGER NOT NULL,
  risk_tier VARCHAR(32) NOT NULL CHECK (risk_tier IN ('critical', 'warning', 'normal')),
  suggested_action TEXT NOT NULL,
  certifications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_risk_tier ON inventory_batches(risk_tier);

-- 12. Safety Incidents
CREATE TABLE IF NOT EXISTS safety_incidents (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  severity VARCHAR(32) NOT NULL CHECK (severity IN ('critical', 'high', 'moderate', 'low', 'warning')),
  location VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_by VARCHAR(255) NOT NULL,
  supervisor_action_needed BOOLEAN NOT NULL DEFAULT true,
  corrective_action_plan TEXT,
  status VARCHAR(32) NOT NULL CHECK (status IN ('open', 'fixed', 'verified', 'closed', 'awaiting-verification', 'in-progress', 'verified-closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fixed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  assigned_to VARCHAR(255),
  created_by VARCHAR(255),
  customer_visible BOOLEAN NOT NULL DEFAULT true,
  internal_notes TEXT,
  linked_complaint_id VARCHAR(64),
  linked_capa_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON safety_incidents(severity);

-- 13. Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL,
  dish_name VARCHAR(255) NOT NULL,
  category VARCHAR(32) NOT NULL CHECK (category IN ('allergen', 'temperature', 'packaging', 'quality')),
  severity VARCHAR(32) NOT NULL CHECK (severity IN ('critical', 'high', 'moderate', 'low')),
  status VARCHAR(32) NOT NULL CHECK (status IN ('filed', 'under-review', 'investigating', 'resolved-closed', 'escalated')),
  reported_by VARCHAR(255) NOT NULL,
  diner_contact VARCHAR(255) NOT NULL,
  seat_number VARCHAR(64),
  description TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_to VARCHAR(255) NOT NULL,
  linked_incident_id VARCHAR(64) REFERENCES safety_incidents(id) ON DELETE SET NULL,
  linked_capa_id VARCHAR(64),
  resolution_note TEXT NOT NULL DEFAULT '',
  internal_notes TEXT,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_token ON complaints(token);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- 14. Corrective Actions (CAPA)
CREATE TABLE IF NOT EXISTS corrective_actions (
  id VARCHAR(64) PRIMARY KEY,
  incident_ref VARCHAR(64) NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,
  action_taken TEXT NOT NULL,
  assigned_staff VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_status VARCHAR(32) NOT NULL CHECK (verification_status IN ('pending-supervisor', 'approved', 'rejected')),
  remedial_verification_log TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_incident ON corrective_actions(incident_ref);

-- 15. Evidence Metadata
CREATE TABLE IF NOT EXISTS evidence_items (
  id VARCHAR(64) PRIMARY KEY,
  entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN ('incident', 'complaint', 'capa')),
  entity_id VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL CHECK (kind IN ('photo', 'probe-reading', 'lab-test', 'document', 'statement')),
  title VARCHAR(255) NOT NULL,
  reference TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by VARCHAR(255) NOT NULL,
  notes TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_items(entity_type, entity_id);

-- 16. Audit Events (Immutable Append-Only Audit Trail)
CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(64) PRIMARY KEY,
  entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN ('incident', 'complaint', 'capa', 'order', 'telemetry', 'inventory')),
  entity_id VARCHAR(64) NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor VARCHAR(255) NOT NULL,
  actor_role VARCHAR(32),
  action VARCHAR(128) NOT NULL,
  detail TEXT NOT NULL,
  previous_status VARCHAR(64),
  new_status VARCHAR(64),
  customer_visible BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id, at DESC);
