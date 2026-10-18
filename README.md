# MEIL ESG / BRSR Statutory Reporting Platform

An enterprise-grade ESG (Environmental, Social, and Governance) and statutory SEBI BRSR (Business Responsibility and Sustainability Reporting) Core compliance and assurance platform engineered for **Megha Engineering & Infrastructures Ltd (MEIL)** and its diversified operating entities, power projects, and infrastructure divisions.

---

## 📌 Executive Summary

The **MEIL ESG / BRSR Reporting Platform** provides an end-to-end statutory sustainability reporting architecture. It enables decentralized, site-level operational data capture across large-scale infrastructure projects (hydroelectric plants, solar farms, transmission corridors, and heavy civil works) while enforcing strict multi-tier corporate governance, deterministic greenhouse gas (GHG) calculations, automated reconciliation, and independent third-party auditor assurance compliant with **SEBI BRSR Core**, **GHG Protocol**, and **ISO 14064 / ISAE 3000**.

---

## 🚀 Key Architectural Highlights

### 1. Multi-Tier Corporate Hierarchy & Role-Based Access Control (RBAC)
The platform mirrors MEIL's multi-layered enterprise operational structure with strict data boundary isolation:

* **Tier 1 — Group Corporate Admin (`GROUP_ADMIN`)**:
  * Full conglomerate visibility across all subsidiaries, legal entities, and divisions.
  * User provisioning, role assignment, enterprise emission baselines, consolidated report approval, and regulatory filings.
* **Tier 2 — Company / Legal Entity Head (`COMPANY_USER`)**:
  * Statutory legal entity level disclosures (e.g., Megha Hydro Infra Ltd).
  * Aggregation across divisional business units, BRSR pipeline tracking, and reconciliation resolution.
* **Tier 3 — Business Unit Lead (`BUSINESS_UNIT_USER`)**:
  * Divisional aggregation (e.g., Northern Power Division).
  * Multi-facility review, variance sign-off, and SLA monitoring.
* **Tier 4 — Facility / Project Operator (`PROJECT_USER`)**:
  * Site-level meter logging (e.g., Subansiri Hydro Electric Project).
  * Direct data input for Scope 1 fuel combustion, Scope 2 electricity consumption, water extraction, and waste generation alongside primary audit evidence uploads.
* **Tier 5 — Independent Sustainability Auditor (`AUDITOR`)**:
  * Independent third-party assurance partner (e.g., EY, PwC, KPMG, DNV).
  * Immutable read-access to assigned verification scopes, finding logs, clarification issue trackers, and statutory limited/reasonable assurance opinion generation.
* **Tier 6 — Executive Management & Board (`MANAGEMENT`)**:
  * Read-only analytical oversight for the Board of Directors and ESG Committee.
  * Access to approved, auditor-verified sustainability dossiers and key ESG performance indicators.
  * 
Link for web-https://aistudio.google.com/apps/8e841189-dff3-4837-b3c4-17714cd2e5d3?showAssistant=true&showPreview=true
---

### 2. Deterministic GHG Accounting Engine
Authoritative server-side calculation engine built strictly to international and Indian statutory standards:

* **Scope 1 (Direct Emissions)**:
  * Stationary combustion (diesel gen-sets, boilers, heavy furnaces).
  * Mobile combustion (earthmovers, dumpers, transit mixers, corporate fleet).
  * Process emissions (cement clinker calcination, lime scrubbing).
  * Fugitive emissions (refrigerant leaks, SF6 in switchgear substations).
  * Carbon Capture and Sequestration (CCS) accounting.
* **Scope 2 (Indirect Emissions from Purchased Energy)**:
  * **Location-Based Method**: Utilizes official **CEA (Central Electricity Authority) CO2 Baseline Database for the Indian Power Sector (v19)** with grid emission factors (~0.716 kg CO2e/kWh).
  * **Market-Based Method**: Accounting for Green Energy Open Access, Power Purchase Agreements (PPAs), and Renewable Energy Certificates (RECs).
* **Scope 3 (Value Chain Emissions — All 15 Categories)**:
  * Category 1: Purchased Goods and Services (steel, cement, aggregates, professional services) via spend-based and average-data emission factors.
  * Category 2: Capital Goods (machinery, transformers, fleet assets, IT infrastructure).
  * Category 3: Fuel- & Energy-Related Activities (WTT well-to-tank losses, T&D grid losses).
  * Category 4 & 9: Upstream & Downstream Transportation and Distribution (ton-km freight metrics across road, rail, air, and ocean).
  * Category 5: Waste Generated in Operations (hazardous slag, fly ash, municipal waste, effluent treatment).
  * Category 6 & 7: Business Travel & Employee Commuting.
  * Category 8 & 13: Upstream & Downstream Leased Assets.
  * Category 10 & 11: Processing & Use of Sold Products.
  * Category 12: End-of-Life Treatment of Sold Products.
  * Category 14 & 15: Franchises & Project Finance Investments (PCAF methodology).
* **Reference Emission Factors & GWP Metrics**:
  * IPCC Sixth Assessment Report (AR6) and Fifth Assessment Report (AR5) 100-year GWPs.
  * CEA CO2 Baseline Database (India) v19.
  * UK DEFRA / BEIS Conversion Factors.
  * GLEC Framework for freight logistics.
  * World Steel Association benchmark factors.

---

### 3. Primary Evidence Management & Audit Trail
* **Document Vault**: Tamper-evident repository for electric utility bills, fuel delivery challans, weighbridge receipts, NABL-accredited water testing lab reports, and hazardous waste disposal manifests.
* **Inline PDF & Image Preview**: Zero-download in-browser document verification modal.
* **Metadata & Hashing**: Every uploaded file is tagged with unique document IDs, timestamped, mapped to site project IDs, and logged in an immutable audit trail.

---

### 4. Automated Three-Way Reconciliation Engine
Eliminates reporting discrepancies between physical operations and corporate finance:
* **Three-Way Comparison**: Cross-compares **Site Logbook Meters** vs. **DISCOM / Fuel Vendor Invoices** vs. **ERP / SAP Financial Vouchers**.
* **Variance Detection**: Automatically calculates variance percentages, flags deviations exceeding statutory thresholds (e.g., >5% variance), and routes them through a structured resolution and corrective-action workflow.

---

### 5. Statutory SEBI BRSR Reporting & PDF Generator
* Full alignment with **SEBI Circular on Business Responsibility and Sustainability Reporting (BRSR Core)**:
  * **Section A**: General Disclosures (CIN, operational locations, employee statistics).
  * **Section B**: Management and Process Disclosures (governance, policies, board oversight).
  * **Section C**: Principle-Wise Performance Disclosures (Principles 1 to 9, with deep focus on Principle 6: Environmental Sustainability).
* **Snapshot Versioning & Freezing**: Immutable audit snapshots (`v1`, `v2`) once approved by Group Admins.
* **Server-Side PDF Export**: Built-in high-fidelity PDF compilation powered by `pdfkit`, producing formal regulatory dossiers ready for SEBI filings.

---

### 6. Interactive ESG Analytics & Year-on-Year Benchmarking
* Real-time emissions breakdown by scope, facility, fuel type, and business unit.
* Intensity metrics computation:
  * Emissions per Crore of Gross Turnover (tCO2e / ₹ Cr).
  * Emissions per Megawatt-hour generated / installed capacity.
* Year-over-Year (YoY) trajectory visualization against MEIL Net-Zero and decarbonization targets.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **TypeScript** | Functional components, modern hooks, type safety |
| **Styling & UI** | **Tailwind CSS v4** | Clean enterprise styling, responsive data tables |
| **Icons & Motion** | **Lucide React** + **Motion** | Fluid animations, accessible visual cues |
| **Backend Server** | **Express.js** + **Node.js** (`tsx`) | High-throughput REST API with middleware security |
| **Database & Storage** | **Cloud Firestore** + Local Store | Hybrid sync: Cloud Firestore with offline local JSON fallback |
| **PDF Generation** | **PDFKit** | Server-side statutory BRSR PDF rendering |
| **File Handling** | **Multer** | Secure multi-part upload for evidence documentation |
| **Build Tooling** | **Vite 8** | Instant HMR development and optimized production bundling |

---

## 👥 Built-In Demo Personas & Roles

The system comes pre-configured with 6 enterprise personas representing each tier of the MEIL governance model:

| Employee ID | Name | Role | Operational Entity / Scope | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| `PU001` | **Project User** | `PROJECT_USER` | Subansiri Hydro Electric Project (Site Unit) | `demo-password` |
| `BU001` | **BU Manager** | `BUSINESS_UNIT_USER` | Northern Power Division (Divisional Lead) | `demo-password` |
| `CU001` | **Company ESG Manager** | `COMPANY_USER` | Megha Hydro Infra Ltd (Legal Entity Level) | `demo-password` |
| `GA001` | **Group ESG Admin** | `GROUP_ADMIN` | MEIL Group Corporate HQ (Master Console) | `demo-password` |
| `AU001` | **Sustainability Auditor** | `AUDITOR` | Independent Assurance Partner (ISAE 3000) | `demo-password` |
| `MG001` | **Management User** | `MANAGEMENT` | Board & ESG Committee (Read-Only Oversight) | `demo-password` |

> 💡 **Quick Switching**: Users can instantly switch between roles via the user switcher in the top navigation bar or the User & Roles Directory.

---

## 📁 Repository Structure

```
├── .data/                                # Local persistence & storage
│   ├── firestore-store.json              # Local replica of Firestore records
│   └── storage/                          # Evidence files & generated PDFs
│       ├── evidence/                     # Uploaded utility bills, invoices, receipts
│       └── reports/                      # Generated statutory BRSR PDFs
├── backend/
│   ├── config/                           # Environment & system configurations
│   ├── middleware/                       # Authentication & role-authorization gates
│   ├── models/                           # TypeScript interfaces and data models
│   ├── routes/                           # Express API endpoint routes
│   │   ├── analytics.ts                  # ESG analytics and intensity endpoints
│   │   ├── audit.ts                      # Assurance queue, findings, opinions
│   │   ├── auth.ts                       # Session login, logout, profile
│   │   ├── calculations.ts               # GHG calculations API
│   │   ├── dashboard.ts                  # Role-scoped dashboard summary data
│   │   ├── data.ts                       # Master organizations, facilities, periods
│   │   ├── esg.ts                        # Activity data logging and querying
│   │   ├── evidence.ts                   # Upload, download, preview evidence
│   │   ├── health.ts                     # System diagnostics and status
│   │   ├── reconciliation.ts             # Meter vs invoice vs ERP matching
│   │   └── reports.ts                    # BRSR templates, snapshots, PDF export
│   ├── services/                         # Business logic services
│   │   ├── calculationEngine.ts          # GHG Protocol & CEA emission factors
│   │   ├── firestore.ts                  # Database abstraction & synchronization
│   │   ├── pdfGenerator.ts               # PDFKit document creation
│   │   ├── reports.ts                    # Report compilation engine
│   │   └── storage.ts                    # Evidence file storage
│   └── utils/
│       └── logger.ts                     # Formatted application logger
├── src/
│   ├── components/
│   │   ├── common/                       # Shared modal & preview components
│   │   ├── dashboards/                   # 6 role-specific dashboards
│   │   ├── pages/                        # Module pages (ESG Data, Evidence, etc.)
│   │   ├── Header.tsx                    # Corporate header with role switcher
│   │   ├── LoginPage.tsx                 # Authentication screen with demo quick-login
│   │   └── Sidebar.tsx                   # Role-gated navigation rail
│   ├── constants/                        # Demo accounts & metadata
│   ├── services/
│   │   └── api.ts                        # Typed client-side API SDK
│   ├── utils/
│   │   ├── activityCatalogue.ts          # Comprehensive Scope 1/2/3 activity catalogue
│   │   ├── emissions.ts                  # Client-side helper calculations
│   │   └── navigation.ts                 # Role-based route authorization
│   ├── App.tsx                           # Root application component
│   └── main.tsx                          # DOM mount entry point
├── firebase-applet-config.json           # Firebase project configuration
├── firebase-blueprint.json               # Firestore schema blueprint
├── firestore.rules                       # Firestore security rules
├── package.json                          # Dependencies and scripts
├── server.ts                             # Full-stack Express + Vite dev server
└── tsconfig.json                         # TypeScript compiler configuration
```

---

## ⚡ Getting Started

### Prerequisites
* **Node.js**: `v20.x` or later
* **npm**: `v10.x` or later (or `bun` / `pnpm`)

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file from the example template:
```bash
cp .env.example .env
```

Key environment variables:
```env
# Optional Gemini API key for automated regulatory validation
GEMINI_API_KEY="your-gemini-api-key"

# Hosting URL
APP_URL="http://localhost:3000"

# Firebase Cloud Firestore (if connecting to remote instance)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
FIREBASE_DATABASE_ID="your-database-id"
```
*(Note: If Cloud Firestore credentials are not supplied, the platform automatically runs on its local, self-contained persistence store in `.data/firestore-store.json`.)*

### 3. Running the Development Server
Launch the unified full-stack server (runs Express API backend with Vite dev middleware on port 3000):
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

### 4. Type Checking & Verification
Validate TypeScript compilation across both frontend and backend codebases:
```bash
npm run lint
```

### 5. Production Build
Compile client-side assets for production deployment:
```bash
npm run build
```

To run the production server:
```bash
npm run start
```

---

## 🌐 API Route Overview

| Path | Methods | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check and Firestore synchronization diagnostics |
| `/api/auth/login` | `POST` | Authenticate with credentials or employee ID |
| `/api/auth/me` | `GET` | Retrieve session profile, role permissions, and active route |
| `/api/dashboard` | `GET` | Role-filtered operational summaries and KPI cards |
| `/api/data/*` | `GET` | Master registries for organizations, business units, projects, and fiscal periods |
| `/api/esg/activities` | `GET, POST, PUT, DELETE` | ESG operational activity logging across Scopes 1, 2, and 3 |
| `/api/calculations/estimate` | `POST` | Live deterministic GHG calculation and emission factor lookup |
| `/api/evidence/*` | `GET, POST, DELETE` | Upload, stream, and manage primary audit evidence documents |
| `/api/reconciliation/*` | `GET, POST` | Run three-way invoice vs. meter reconciliation and resolve variances |
| `/api/audit/*` | `GET, POST` | Auditor queue, finding issuance, clarifications, and assurance opinions |
| `/api/reports/*` | `GET, POST` | SEBI BRSR snapshot compilation, disclosures, and PDF download |
| `/api/analytics/*` | `GET` | Consolidated emissions, intensity ratios, and trend forecasting |

---

## 🔒 Security & Compliance Standards

* **Role Isolation**: Strict server-side route guards ensure facility operators cannot modify group policies or inspect unauthorized divisions.
* **Audit Immutability**: All ESG entries, reconciliation notes, and auditor clarifications preserve user attribution, timestamps, and previous state hashes.
* **Zero Client Secret Exposure**: All sensitive database operations, calculation logic, and file uploads are handled through secure server-side API proxy routes.

---

## 📄 License
Internal proprietary software developed for **Megha Engineering & Infrastructures Ltd (MEIL)**. All rights reserved.
