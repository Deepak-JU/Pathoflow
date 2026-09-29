# PathoFlow LIMS 🔬
### Full-Stack Pathology Laboratory Information Management System with Real-Time Lineage & Proactive QA

PathoFlow LIMS is a production-grade, full-stack laboratory information management system designed for modern digital and anatomic pathology laboratories. It enforces end-to-end specimen intake, hierarchical sample parentage tracking (`Accession ➔ Specimen ➔ Tissue Block ➔ Glass Slide`), real-time laboratory station orchestration, high-power whole-slide image (WSI) review, diagnostic report sign-off, and proactive automated Quality Assurance (QA) rule evaluations.

---

## 1. System Architecture & Tech Stack

```
                        ┌────────────────────────────────────────────────────────┐
                        │              Client Dashboards (React + TS)            │
                        │  Intake Station │ Grossing / Microtomy │ Cockpit │ QA  │
                        └───────────────────────────▲────────────────────────────┘
                                                    │ SSE / REST
                                                    ▼
                        ┌────────────────────────────────────────────────────────┐
                        │             Express.js (TypeScript) Backend            │
                        │    Lineage Engine  │  CoC Logger  │  QA Anomaly Engine │
                        └───────────────▲─────────────────────────▲──────────────┘
                                        │                         │
                                        ▼                         ▼
                        ┌────────────────────────┐      ┌────────────────────────┐
                        │ PostgreSQL / Prisma    │      │ Redis Cache & Pub/Sub  │
                        │ (Relational & Lineage) │      │ (Live Event Bus)       │
                        └────────────────────────┘      └────────────────────────┘
```

- **Frontend**: React 18+, TypeScript, Tailwind CSS, Lucide React Icons, React Router v6, Vite
- **Backend**: Node.js, Express.js (TypeScript), Prisma ORM
- **Database**: PostgreSQL (relational storage + hierarchical queries) with SQLite zero-dependency local dev fallback
- **Event Bus & Real-Time Sync**: Redis Pub/Sub (with resilient in-memory EventBus fallback) + Server-Sent Events (SSE)
- **Containerization**: Docker & Docker Compose (`app`, `postgres`, `redis`)
- **Testing**: Vitest test suite for automated QA rule enforcement

---

## 2. Domain Models & Relational Schema

PathoFlow LIMS implements 8 core entities:

1. **`Patients`**: `id`, `mrn` (unique Medical Record Number), `full_name`, `dob`, `gender`, `contact_info`, `created_at`
2. **`Accessions`**: `id`, `accession_number` (e.g. `ACC-2026-0001`), `patient_id`, `ordering_physician`, `clinical_history`, `priority` (`ROUTINE`, `URGENT`, `STAT`), `status` (`RECEIVED`, `IN_PROCESSING`, `DIAGNOSED`, `SIGNED_OFF`), `created_at`
3. **`Specimens`**: `id`, `accession_id`, `tissue_type`, `container_barcode`, `collected_at`, `status` (`RECEIVED`, `GROSSED`, `IN_PROCESSING`, `COMPLETED`)
4. **`Blocks`**: `id`, `specimen_id`, `block_number` (e.g. `A1`, `A2`), `cassette_barcode`, `embedding_status` (`PENDING`, `EMBEDDED`, `SECTIONED`), `created_at`
5. **`Slides`**: `id`, `block_id`, `slide_number` (e.g. `A1-1`), `stain_type` (`H&E`, `IHC HER2`, `IHC ER/PR`, `IHC TTF-1`, `FISH`, `PAS`), `slide_barcode`, `status` (`CUT`, `STAINED`, `SCANNED`, `ARCHIVED`), `created_at`
6. **`ChainOfCustodyLogs`**: `id`, `entity_type` (`SPECIMEN`, `BLOCK`, `SLIDE`, `ACCESSION`), `entity_id`, `station` (`INTAKE`, `EMBEDDING`, `MICROTOMY`, `STAINING`, `SCANNING`, `PATHOLOGY`), `action`, `performed_by`, `timestamp`, `metadata`
7. **`Reports`**: `id`, `accession_id`, `pathologist_id`, `microscopic_description`, `diagnosis_code` (ICD-O / SNOMED CT), `impression`, `is_signed_off`, `signed_off_at`
8. **`QA_Alerts`**: `id`, `accession_id`, `alert_type` (`TAT_BREACH`, `MISSING_SLIDE`, `CRITICAL_DIAGNOSIS`, `UNKNOWN_BARCODE`), `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `description`, `is_resolved`, `resolved_by`, `created_at`

---

## 3. Core Engine Implementations

### Module A: Real-Time Hierarchical Lineage Engine
- **Visual Collapsible Tree**: Full depth exploration `Accession ➔ Specimen ➔ Block ➔ Slide` with live status badges.
- **Universal Barcode Scanner**: Resolves any barcode (Accession Number, Cassette Barcode, Slide Barcode, or Specimen Container) to its root parent accession and full custody chain.
- **Immutable Chain of Custody (CoC)**: Every workstation event records an immutable custody event in `ChainOfCustodyLogs` and broadcasts across Redis Pub/Sub and SSE to all connected station dashboards.

### Module B: Proactive QA & Anomaly Engine
1. **TAT Breach Monitor**:
   - Background worker runs on configurable intervals (default: 30 seconds).
   - Scans urgent/STAT specimens in `IN_PROCESSING` for $>4$ hours without slide creation.
   - Raises a `HIGH` severity alert with automated dashboard notification.
2. **Missing Asset Check**:
   - Hardened diagnostic safety lock.
   - Prevents report generation and sign-off if expected slides (including H&E control and IHC diagnostic slides) are not marked as `SCANNED`.
   - Returns a `MISSING_SLIDES_QA_BLOCK` and auto-records an alert.
3. **Critical Value Escalation**:
   - Scans diagnostic reports for critical malignancy keywords (e.g. `Malignant`, `High-grade carcinoma`, `Adenocarcinoma`, `Melanoma`, `Invasive`, `Metastatic`).
   - Auto-triggers a `CRITICAL` alert and logs automated priority notification to the ordering physician in the custody audit trail.

### Module C: Lab Station User Interfaces
1. **Intake & Accessioning** (`/intake`): Rapid case intake, patient registration, priority classification, automated barcode generation, and container label printing simulation.
2. **Grossing & Microtomy Workstation** (`/grossing-microtomy`): Quick-scan cassette and slide barcoding interface, grossing blocks `A1`, `A2`..., microtomy slide cutting, and rack-based staining/scanning status transitions.
3. **Pathologist Cockpit** (`/pathologist`): Split-screen interface:
   - Left: Patient history, clinical history, interactive lineage tree, active QA alerts.
   - Center: High-power digital slide viewer mock with zoom (1x to 40x), pan navigation, H&E/IHC/FISH tissue rendering, cellular annotation markers, and glass barcode label.
   - Right: Diagnostic report editor with ICD-O / SNOMED CT codes, microscopic description, impression, and electronic signature sign-off with QA enforcement.
4. **Operations & QA Dashboard** (`/dashboard`): High-level real-time KPI matrix showing active bottlenecks, turnaround times (TAT), queue metrics across 5 stations, on-demand anomaly scanning, and QA alert triage/resolution center.
5. **Lineage Explorer** (`/lineage`): Full-screen visual lineage hierarchy viewer with universal barcode search and complete Chain of Custody audit logs.

---

## 4. Getting Started & Running the Application

### Option 1: Docker & Docker Compose (Recommended for Production)

Run the full stack containerized with PostgreSQL, Redis, and PathoFlow App:

```bash
docker compose up --build
```

- Web Application & API: [http://localhost:5000](http://localhost:5000)
- PostgreSQL: `localhost:5432` (`pathoflow_db`)
- Redis: `localhost:6379`

### Option 2: Local Development (Bare-Metal)

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Generate Database & Seed Data:**
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   npm run seed
   cd ..
   ```

3. **Start Development Servers (Concurrent Full-Stack):**
   ```bash
   npm run dev
   ```
   - Frontend Client: [http://localhost:3000](http://localhost:3000)
   - Backend Server: [http://localhost:5000](http://localhost:5000)
   - Real-Time SSE Stream: [http://localhost:5000/sse](http://localhost:5000/sse)

---

## 5. Automated Test Suite

Run the Vitest test suite covering all 3 Proactive QA rules, Chain of Custody logging, and Lineage Tree hierarchy:

```bash
npm test
```

Expected output:
```
 ✓ tests/qa_rules.test.ts (4 tests)
   - Rule 1 (TAT Breach Monitor): Detects STAT accessions >4h without slides
   - Rule 2 (Missing Asset Check): Blocks sign-off when unscanned slides exist
   - Rule 3 (Critical Value Escalation): Detects malignant keywords and notifies physician
   - Chain of Custody & Lineage: Validates tree generation and barcode resolution
```

---

## 6. REST API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/accessions` | List accessions (filterable by status, priority, search) |
| `POST` | `/api/accessions` | Create new accession with auto-generated barcode |
| `GET` | `/api/accessions/:id` | Get accession details with specimens, blocks, and slides |
| `POST` | `/api/specimens` | Intake specimen and generate container barcode |
| `POST` | `/api/blocks` | Gross specimen into block and generate cassette barcode |
| `POST` | `/api/slides` | Cut block into slide and generate slide barcode |
| `PATCH` | `/api/slides/:id/status` | Advance slide status (`CUT` ➔ `STAINED` ➔ `SCANNED`) |
| `POST` | `/api/stations/scan-action` | Universal station barcode scanner trigger |
| `GET` | `/api/lineage/accession/:id` | Full hierarchical lineage tree & custody logs |
| `GET` | `/api/lineage/barcode/:barcode` | Universal barcode resolution |
| `GET` | `/api/lineage/custody-logs` | Immutable Chain of Custody audit logs |
| `POST` | `/api/reports/save-draft` | Save report draft |
| `POST` | `/api/reports/sign-off` | Diagnostic sign-off with QA Missing Asset & Critical rules |
| `GET` | `/api/qa/alerts` | Active QA alerts list (filterable by severity & status) |
| `POST` | `/api/qa/alerts/:id/resolve` | Resolve QA alert with resolution notes |
| `POST` | `/api/qa/run-worker` | Trigger on-demand QA TAT anomaly scan |
| `GET` | `/api/qa/stats` | High-level KPI matrix and station bottleneck metrics |
| `GET` | `/sse` | Server-Sent Events real-time event bus stream |
