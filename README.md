# PlateProof 360 — Backend & PostgreSQL Architecture

Enterprise culinary food safety, traceability, and HACCP compliance platform with React frontend, Node.js + Express + TypeScript backend, and normalized PostgreSQL persistence.

---

## Architecture Overview

```
Frontend (React 19, Tailwind CSS v4, Lucide)
   │
   ▼
HttpSafetyRepository (src/services/safetyRepository.ts)
   │
   ▼  REST API (JSON over HTTP, Port 3001)
Express Server (server/app.ts, server/server.ts)
   ├── Zod Schemas & Payloads (server/schemas/validation.ts)
   ├── Role Permissions & Privacy Sanitization (server/middleware/auth.ts)
   ├── Unified Data Store & Transactions (server/db/store.ts)
   └── PostgreSQL Connection Pool (server/db/pool.ts)
         │
         ▼ (Port 5432)
   PostgreSQL 18 Normalized Database (`plateproof_360`)
```

---

## Database Setup

PlateProof 360 connects to PostgreSQL 18. If database credentials are not yet supplied, the server automatically starts in resilient fallback mode, allowing uninterrupted development while remaining ready to sync with PostgreSQL upon configuration.

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` to configure your credentials:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# PostgreSQL Settings
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_postgres_password_here
PGDATABASE=plateproof_360

# Or using a single connection string:
# DATABASE_URL=postgresql://postgres:your_postgres_password_here@localhost:5432/plateproof_360
```

### 2. Run Database Migrations

Applies the DDL schema in [`server/db/schema.sql`](file:///d:/COLLEGE/projects/PlateProof%20360/server/db/schema.sql):

```bash
npm run db:migrate
```

### 3. Seed Demo Data

Populates users, Order #1042 (*Artisanal Paneer Tikka Masala*), cooking records, ingredients, allergens, hygiene checks, inventory batches, and sample incidents:

```bash
npm run db:seed
```

---

## Normalized Database Schema

The normalized relational database schema includes:

1. **`users`**: Staff and diner identities with roles (`customer`, `staff`, `supervisor`, `auditor`).
2. **`orders`**: Attestation anchor with dish metadata, cooking probe readings, FSSAI numbers, and cryptographic verification hash.
3. **`qr_tokens`**: Secure, unpredictable, order-specific QR tokens with expiry dates and revocation flags (`revoked`, `revoked_reason`).
4. **`order_items`**: Line items per order with station and weight specifications.
5. **`cooking_records`**: CCP critical control points (recorded temperature, hold duration, probe ID, operator).
6. **`ingredients`**: Lot numbers, origins, suppliers, certifications, and intake temperatures.
7. **`allergens`**: Declared allergens, contamination risks, and station isolation notes.
8. **`hygiene_checks`**: ATP bioluminescence swabs, handler wellness, and extraction velocities.
9. **`inspection_audits`**: Checkpoint inspections with supervisor sign-off and pass/fail states.
10. **`temperature_readings`**: Continuous station telemetry readings with upper/lower threshold limits.
11. **`inventory_batches`**: Expiry tracking, risk tier categorization (`critical`, `warning`, `normal`), and suggested actions.
12. **`safety_incidents`**: Full lifecycle incident tracking (`open` &rarr; `fixed` &rarr; `verified` &rarr; `closed`).
13. **`complaints`**: Customer and in-house complaints with auto-triage and resolution tracking.
14. **`corrective_actions`**: CAPA records linked to incidents with verification statuses.
15. **`evidence_items`**: Polymorphic evidence metadata (photos, probe logs, lab tests, documents).
16. **`audit_events`**: Immutable, append-only audit trail logging all lifecycle state transitions.

---

## REST API Reference

All requests are validated with **Zod** and return consistent JSON payloads.

| Method | Endpoint | Description | Role / Security |
|---|---|---|---|
| `GET` | `/api/health` | System and PostgreSQL connectivity health check | Public |
| `GET` | `/api/orders` | List order safety attestations | Sanitized for public |
| `GET` | `/api/orders/:tokenOrId` | Get order-specific safety information & CCP logs | Validates token; strips internal notes |
| `GET` | `/api/orders/:orderId/complaints`| List complaints for a given order | Strips internal notes for customers |
| `POST` | `/api/complaints` | File complaint with auto-triage & incident spawning | Idempotent |
| `GET` | `/api/incidents` | List and filter incidents (`status`, `severity`, `location`) | Internal / Sanitized |
| `POST` | `/api/incidents/:id/assign` | Assign incident to a staff member | Supervisor / Auditor |
| `POST` | `/api/incidents/:id/actions` | Document corrective action & set status to `fixed` | Staff / Supervisor |
| `POST` | `/api/incidents/:id/verify` | Verify corrective action | **Supervisor / Auditor Only** (rejects self-verification) |
| `POST` | `/api/incidents/:id/close` | Formally close incident and resolve linked complaint | **Supervisor / Auditor Only** (requires evidence) |
| `POST` | `/api/evidence` | Submit evidence metadata (photo, probe log, certificate) | Authenticated staff |
| `POST` | `/api/telemetry/temperature` | Record temperature reading (spawns high incident if breached) | Telemetry / Staff |
| `POST` | `/api/inspections` | Complete hygiene inspection checklist | Staff / Supervisor |
| `GET` | `/api/inventory` | List inventory items and expiry risk tiers | Authenticated staff |
| `POST` | `/api/inventory/:id/resolve` | Mark inventory risk item as resolved | Authenticated staff |
| `POST` | `/api/inventory/:id/expire` | Expire and quarantine batch (spawns critical incident) | Authenticated staff |
| `POST` | `/api/demo/reset` | Reset demo dataset and re-seed database | Demo / Admin |

---

## Security & Verification Guarantees

- **Role Permissions**: Enforced server-side via `server/middleware/auth.ts`.
- **Self-Verification Guard**: Staff members cannot verify their own corrective actions (`assignedTo === actor` or `role !== 'supervisor' && role !== 'auditor'`). Returns HTTP 403.
- **Evidence-Backed Closure**: Incidents cannot be closed without prior supervisor verification and verifiable evidence metadata (`evidence.length > 0`). Returns HTTP 400.
- **Customer Privacy**: Internal staff notes (`internalNotes`) are stripped from all public customer endpoints (`/api/orders/:tokenOrId`, `/api/orders/:orderId/complaints`).
- **Cryptographic QR Tokens**: Orders are bound to unique, unpredictable tokens supporting expiry and revocation.
- **Transaction Integrity**: All multi-step operations (e.g. complaint filing &rarr; incident creation &rarr; audit trail) execute inside ACID database transactions (`BEGIN ... COMMIT / ROLLBACK`).

---

## Running the Application

### 1. Start the Backend API Server
```bash
npm run server
```
Runs the Express TypeScript server on `http://localhost:3001`.

### 2. Start the Frontend Development Server
```bash
npm run dev
```
Runs the Vite development server on `http://localhost:5173` (or `http://localhost:5174`).

### 3. Run Automated Tests
```bash
# Run all test suites (Frontend + Safety Engine + Backend REST API)
npm test

# Run backend API integration tests only
npm run test:server
```

### 4. Code Quality & Build Checks
```bash
npm run lint   # Oxlint check (0 warnings, 0 errors)
npm run build  # Production TypeScript & Vite bundle compilation
```
