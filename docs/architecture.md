# FRONTBENCH System Architecture

FRONTBENCH is an enterprise-grade data exploration and frontend performance engineering platform designed to inspect, analyze, and microbenchmark large tabular datasets under controlled, repeatable workloads.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
  subgraph ClientBrowser ["Browser (Client-Side)"]
    subgraph UI ["React 19 + TypeScript UI"]
      Shell["App Shell & Navigation (tokens.css)"]
      Explorer["Data Explorer (TanStack Table)"]
      VirtualTable["Virtualized Table (TanStack Virtual)"]
      Analytics["Column Analytics & Histograms"]
      Lab["Performance Lab Runner"]
      HistoryUI["Benchmark History & Comparisons"]
    end

    subgraph Workers ["Off-Thread Processing"]
      WebWorker["Dedicated Web Worker (data.worker.ts)"]
      WorkerPapa["PapaParse Stream Parser"]
      WorkerStats["Statistical Aggregation Engine"]
      WorkerPRNG["Mulberry32 Deterministic PRNG"]
    end

    subgraph Storage ["Browser Local Persistence"]
      DexieDB["IndexedDB (Dexie)"]
      ProfilesStore["dataset_profiles store"]
      RecordsStore["records store (batched)"]
      PrefStore["preferences store"]
    end
  end

  subgraph Backend ["Optional REST API & Database"]
    subgraph API ["Fastify Node.js Service (Port 4000)"]
      FastifyRouter["Fastify Routing & Plugins (Cors, Helmet, RateLimit)"]
      ZodValidation["Zod Request / Privacy Envelope Validation"]
      DrizzleORM["Drizzle ORM & Query Builder"]
    end

    subgraph DB ["PostgreSQL 16"]
      ProfilesTable[("dataset_profiles (metadata only)")]
      RunsTable[("benchmark_runs (run environment)")]
      SamplesTable[("benchmark_samples (raw measurements)")]
    end
  end

  Explorer --> WebWorker
  Explorer --> VirtualTable
  Explorer --> DexieDB
  Analytics --> WebWorker
  Lab --> UI
  HistoryUI -.->|GET /api/benchmark-runs| FastifyRouter
  Lab -.->|POST /api/benchmark-runs (atomic)| FastifyRouter
  FastifyRouter --> ZodValidation
  ZodValidation --> DrizzleORM
  DrizzleORM --> DB
```

---

## 2. Component Boundaries & Responsibilities

### 2.1 Frontend Tier (`web/`)
- **React 19 & TypeScript Strict Mode:** Headless UI architecture prioritizing semantic HTML and CSS custom properties (design tokens) over heavy component frameworks.
- **TanStack Table v8:** Headless table state machine controlling column schema definitions, type-safe cell formatting, multi-column sorting, and filtering.
- **TanStack Virtual:** Dynamic row windowing that mounts only the active viewport slice (~20-30 rows) plus overscan buffer, capping active DOM nodes below 300 elements even for 50,000+ records.
- **Dedicated Web Worker (`data.worker.ts`):** Isolates compute-intensive workloads (streaming CSV parsing, schema inference, deterministic synthetic record generation, and column variance/distribution analysis) off the main thread.
- **Dexie (IndexedDB):** Client-side relational key-value storage. Stores imported CSV rows in bounded 2,000-row chunks to prevent main-thread jank and quota faults.

### 2.2 Backend Tier (`api/`)
- **Fastify (Node.js LTS):** High-throughput, low-overhead HTTP service. Configured with security plugins (`@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`).
- **Zod Schema Validation:** Strictly validates all incoming payloads. Specifically guards against privacy violations by rejecting any request containing raw rows or CSV file contents.
- **Drizzle ORM & PostgreSQL 16:** Enforces relational integrity (foreign keys, check constraints, composite unique indexes) and atomic writes across multi-sample benchmark batches.

---

## 3. Data Privacy & Architectural Isolation

A core non-negotiable architectural rule of FRONTBENCH is **client-side data isolation**:

1. **Raw CSV Rows Never Leave the Browser:**
   - When a user uploads a CSV file, it is parsed by the Web Worker and persisted into local IndexedDB (`FrontBenchDB`).
   - The backend API accepts **only** metadata: dataset name, row count, column schema snapshot (`name`, `type`, `nullable`), and file byte size.
2. **Explicit Privacy Barrier in API:**
   - Any `POST` request to `/api/dataset-profiles` containing keys such as `rows`, `data`, `records`, or `file` is immediately aborted with a `400 PRIVACY_VIOLATION` error code.
3. **Offline Resilience:**
   - The frontend is completely decoupled from the backend. If PostgreSQL or the Fastify API is offline, the application functions in **Local Browser Mode**, allowing full data exploration, CSV import/export, and live benchmark execution without throwing errors.

---

## 4. State Ownership Model

| State Type | Mechanism | Lifetime | Scope |
|---|---|---|---|
| **Local View State** | React `useState` / `useMemo` | Component render | Search query, active tab, sort direction, modal visibility |
| **Client Tabular Data** | IndexedDB via `Dexie` | Persistent across sessions | Raw record rows, column schema, local view preferences |
| **Worker Operations** | `WorkerClient` Promises | Operation lifecycle | Request ID correlation, progress updates, cancellation |
| **Server/History State** | Fastify REST API + ETag cache | Persistent in PostgreSQL | Benchmark run environment, individual sample timings |

---

## 5. Error Boundaries & Graceful Degradation

- **Route Error Boundary (`ErrorBoundary.tsx`):** Catches uncaught React render exceptions, displays friendly diagnostics, and provides a safe navigation recovery action.
- **Storage Quota Handling:** If IndexedDB encounters `QuotaExceededError`, the storage manager warns the user and provides options to clear previous local datasets rather than failing silently.
- **Worker Cancellation:** Long-running dataset generations or file parses can be aborted immediately using `cancel()` tokens, signaling the worker to abort PapaParse streams and clean up pending state.
