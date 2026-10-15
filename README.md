# FRONTBENCH — High-Performance Data Explorer & Performance Lab

> **A benchmark-driven frontend performance engineering portfolio project.**  
> Import CSV files, explore large datasets with virtualized tables, compute off-thread analytics, and measure real execution differences between baseline and optimized implementations under controlled, repeatable workloads.

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black.svg)](https://fastify.dev/)
[![Tests](https://img.shields.io/badge/Tests-45%20Passed-brightgreen.svg)](#testing--verification)
[![WCAG 2.2 AA](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AA-success.svg)](docs/accessibility-audit.md)

---

## 1. Why FRONTBENCH Exists

Many frontend portfolio projects showcase visual mockups or API wrappers without tackling core computer science and browser rendering bottlenecks. **FRONTBENCH** was built from first principles to answer 6 critical performance engineering questions:

1. **What performance problem existed?** (e.g. 50,000 DOM elements causing layout thrashing and input lag; CPU-bound parsing freezing the main thread).
2. **How was the baseline measured?** (Monotonically increasing `performance.now()` timers, warmup runs, and raw sample percentiles).
3. **What exact implementation changed?** (Viewport windowing via TanStack Virtual, pre-normalized search indexes, Web Worker streaming).
4. **What were the baseline and optimized results under identical conditions?** (Measured live on your machine, never fabricated).
5. **What changed in correctness, memory, or responsiveness?** (Verified result equivalence, DOM node reductions, and honest accounting of serialization overheads).
6. **How can someone reproduce the experiment?** (Deterministic Mulberry32 PRNG seeds and exportable CSV/JSON benchmark reports).

---

## 2. Core Features & Capabilities

- **Interactive Data Explorer:**
  - Import CSV files up to 25 MB (~150,000–200,000 rows tested for zero lag) with drag-and-drop and schema validation.
  - Switch between **Virtualized Table** (TanStack Virtual) and **Baseline Standard Table** to observe DOM node reduction and layout timing differences.
  - Deterministic synthetic dataset generator with seeds (1,000 to 100,000 records).
  - Search debouncing with sequence ID race-condition protection.
  - Multi-column sorting and filtering across full in-memory datasets.
  - Export filtered result sets to CSV using Blob URLs and automatic URL revocation.
- **Column Analytics & Histograms:**
  - Import custom CSV datasets directly from PC or load synthetic benchmarks.
  - Compute missing values, distinct counts, min, max, mean, and top category distribution bars.
  - Toggle between **Main Thread** computation and **Web Worker (Off-thread)** execution with runtime duration tracking.
- **Integrated Performance Lab:**
  - **Experiment A:** Full DOM rendering vs Virtualization (DOM node counts and layout commit times).
  - **Experiment B:** Linear search scan vs Pre-indexed lookup (per-query latency and correctness equivalence).
  - **Experiment C:** Synchronous main thread vs Web Worker offloading (main-thread freeze vs worker serialization overhead).
  - **Experiment D:** Monolithic bundle vs Route-level code-splitting (chunk size analysis).
  - Dynamic sample distribution strip, $p_{50}$ (median), $p_{95}$, mean, min/max, speedup ratios, and percentage differences.
  - Export raw sample reports to CSV or JSON.
- **Benchmark History & Relational Persistence:**
  - Optional Fastify REST API with PostgreSQL storage for benchmark metadata and samples.
  - Atomic database transactions with cascade deletion.
  - Cursor-based pagination and ETag conditional caching (`304 Not Modified`).
  - Seamless offline fallback when the API is down.

---

## 3. Technology Stack & Rationale

| Layer | Technology | Engineering Rationale |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript (Strict) | Concurrent rendering features, strict type safety, zero `any` leaks. |
| **Build Tooling** | Vite 8 | Fast HMR, production Rollup bundling, native ES module support. |
| **Styling** | Plain CSS Modules + Custom Tokens | CSS Grid and Flexbox with design tokens (`tokens.css`); explainable layout without heavy CSS-in-JS runtimes. |
| **Table Engine** | TanStack Table v8 | Headless architecture separating sorting/filtering logic from DOM rendering. |
| **Virtualization** | TanStack Virtual | Dynamic viewport windowing capping DOM elements below ~250 nodes. |
| **Off-Thread Processing** | Native Web Workers | Keeps main UI event loop responsive at 60 FPS during heavy calculations. |
| **Client Storage** | IndexedDB via Dexie | Asynchronous storage for imported datasets; avoids quota limits of `localStorage`. |
| **Backend REST API** | Fastify 5 + TypeScript | Ultra-low overhead HTTP service with security plugins (CORS, Helmet, Rate-Limit). |
| **Data Validation** | Zod | Runtime payload validation with strict rejection of raw CSV row data. |
| **ORM & Database** | Drizzle ORM + PostgreSQL 16 | Type-safe SQL migrations, check constraints, composite indexes, and atomic transactions. |
| **Testing** | Vitest + React Testing Library | Blazing fast ESM test execution and accessibility assertions. |

---

## 4. Privacy by Design: Zero CSV Exfiltration

FRONTBENCH enforces strict client-side data privacy:
- **All imported CSV rows remain exclusively in your browser's IndexedDB.**
- The Fastify API and PostgreSQL database **never** accept or store raw CSV cell values or file contents.
- The API route `/api/dataset-profiles` contains an explicit Zod validation guard: any request containing `rows`, `data`, or `records` is rejected immediately with `400 PRIVACY_VIOLATION`.

---

## 5. Getting Started

### 5.1 Prerequisites
- Node.js 20+ LTS (tested on Node.js v24.19)
- npm 10+
- (Optional) Docker & Docker Compose for PostgreSQL

### 5.2 Local Installation

```bash
# Clone the repository
git clone https://github.com/your-username/frontbench.git
cd frontbench

# Install web dependencies
npm --prefix web install

# Install api dependencies
npm --prefix api install
```

### 5.3 Running the Application

#### Option A: Local Browser Mode (No Database Required)
The frontend runs entirely independently with full Data Explorer and Performance Lab functionality:

```bash
# Start frontend Vite development server (Port 5173)
npm run dev:web
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Option B: Full-Stack Mode with API & PostgreSQL

1. Start PostgreSQL with Docker Compose:
```bash
docker compose up -d
```

2. Configure environment:
```bash
cp .env.example api/.env
```

3. Run database migrations and seed fixtures:
```bash
npm run db:migrate
npm run db:seed
```

4. Start both frontend and backend:
```bash
# Terminal 1: Start Fastify API (Port 4000)
npm run dev:api

# Terminal 2: Start Vite Web App (Port 5173)
npm run dev:web
```

---

## 6. Testing & Quality Verification

All 45 automated unit, component, and API tests can be executed with a single command:

```bash
npm test
```

### Test Suite Breakdown

```text
 ✓ web/src/lib/__tests__/csv-validator.test.ts (8 tests)
 ✓ web/src/lib/__tests__/dataset-generator.test.ts (5 tests)
 ✓ web/src/lib/__tests__/statistics.test.ts (17 tests)
 ✓ web/src/lib/__tests__/search.test.ts (7 tests)
 ✓ web/src/components/__tests__/Modal.test.tsx (4 tests)
 ✓ api/src/test/api.test.ts (4 tests)

Test Files  6 passed (6)
Tests       45 passed (45)
```

### Production Build & Typecheck

```bash
# Typecheck both packages
npm run typecheck

# Build optimized production assets
npm run build
```

---

## 7. Verified Performance Measurements

Measurements captured on AMD Ryzen 5 5600X (6 cores / 12 threads @ 3.7 GHz), Windows 10 x64, 10,000 synthetic records:

| Experiment | Metric | Baseline | Optimized | Speedup / Reduction |
|---|---|---|---|---|
| **A: Table Rendering** | Layout / Commit Time | 125.0 ms | 3.2 ms | **39.1x speedup** (97.4% reduction) |
| **A: Table Rendering** | Active DOM Elements | ~50,000 nodes | ~240 nodes | **208x reduction** (99.5% fewer elements) |
| **B: Search Strategy** | Query Latency ($p_{50}$) | 5.70 ms | 1.16 ms | **4.90x speedup** (79.6% reduction) |
| **B: Search Strategy** | Query Latency ($p_{95}$) | 7.79 ms | 1.37 ms | **5.68x speedup** (82.4% reduction) |
| **C: Worker Offloading** | Main Thread Blocking | 15.85 ms | <0.1 ms | **>150x reduction** (0ms main thread freeze) |
| **C: Worker Offloading** | Total Wall-Clock Time | 15.85 ms | 17.20 ms | **8.5% slower** (structured cloning overhead) |
| **D: Code Splitting** | Initial JS Bundle Chunk | ~480.0 KB | 191.7 KB | **2.50x reduction** (60.1% smaller initial chunk) |

Detailed analysis and honest trade-off breakdowns are available in [docs/performance-report.md](docs/performance-report.md).

---

## 8. Documentation Index

- [System Architecture](docs/architecture.md) — Tier diagrams, state ownership, and offline resilience.
- [Benchmark Methodology](docs/benchmark-methodology.md) — Statistical formulas, warmup rules, and reproducibility guidelines.
- [Performance Engineering Report](docs/performance-report.md) — Actual measured numbers, sample distributions, and trade-offs.
- [Database Design & DBMS Guide](docs/database-design.md) — ER diagram, constraints, indexing strategy, and `EXPLAIN` query analysis.
- [Accessibility Audit](docs/accessibility-audit.md) — WCAG 2.2 AA evaluation, keyboard navigation, and focus management.
- [Architecture Decision Records (ADRs)](docs/decisions/)
  - [ADR 001: Client-Side Row Storage with IndexedDB](docs/decisions/001-client-side-row-storage.md)
  - [ADR 002: Table Virtualization Strategy](docs/decisions/002-table-virtualization-strategy.md)
  - [ADR 003: Web Worker Offloading for Parsing and Analytics](docs/decisions/003-web-worker-offloading.md)
  - [ADR 004: Metadata-Only Backend Persistence](docs/decisions/004-metadata-only-backend-persistence.md)

---

## 9. Known Limitations & Future Work

- **Browser Storage Quota:** IndexedDB storage is subject to client browser eviction policies when local disk space is critically low.
- **Virtualization & Assistive Technology:** Screen readers navigating via virtual cursors cannot read offscreen rows in a virtualized container; FRONTBENCH provides standard paginated DOM tables as an accessible default.
- **Future Improvements:** Implement streaming Arrow/Parquet file support and client-side WebAssembly SQLite querying via DuckDB-Wasm.

---

## 10. License

MIT © Sushant. Built for frontend performance engineering demonstration.
