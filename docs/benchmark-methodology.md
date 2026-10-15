# FRONTBENCH Benchmark Methodology & Integrity Guide

This document establishes the scientific principles, measurement protocols, statistical formulas, and repeatability guidelines governing all performance benchmarks in FRONTBENCH.

---

## 1. Non-Negotiable Integrity Rules

1. **Zero Fabrication:** Every displayed metric must originate from real executions captured via `performance.now()`. No numbers are hardcoded, mocked, or artificially inflated.
2. **Identical Workloads:** Baseline and optimized implementations are executed against identical generated datasets (same Mulberry32 PRNG seed and row count), identical query terms, and identical browser conditions.
3. **Warm-up Phases:** JIT compilation engines (V8 Turbofan, SpiderMonkey) optimize bytecode during initial executions. Every benchmark runs 3 untallied warm-up passes before recording sample timings.
4. **Honest Outlier & Regression Reporting:** If an optimized variant causes a regression (e.g. serialization overhead in small workloads) or neutral performance (within ±5%), it is reported honestly without selective trial filtering.
5. **No Claims of Field Core Web Vitals:** In-page lab microbenchmarks measure browser execution latency on the local machine under controlled conditions. They must never be portrayed as field Core Web Vitals collected across 75th percentile real-user sessions.

---

## 2. Core Experiments Architecture

### Experiment A: Table Rendering (DOM Nodes vs Virtualization)
- **Workload:** Mount 1,000, 10,000, or 50,000 tabular rows.
- **Baseline:** Standard unvirtualized HTML `<table>` rendering. All rows and cells are mounted into the DOM. A forced synchronous layout check (`void container.offsetHeight`) measures true layout and reflow costs.
- **Optimized:** Viewport windowing using `@tanstack/react-virtual`. Only visible rows (~25 rows) plus a 10-row overscan buffer are mounted, with absolute transform positioning.
- **Primary Metrics:**
  - `render_duration` (milliseconds, lower is better)
  - `dom_nodes_count` (integer count, lower is better)

### Experiment B: Search Strategy (Full Scan vs Pre-Indexed Lookup)
- **Workload:** Search across 10,000 to 50,000 records using a fixed sequence of benchmark terms (`'alice'`, `'electronics'`, `'north'`, `'active'`, `'order for'`).
- **Baseline:** Linear substring scan across all record values using `String.prototype.toLowerCase().includes()`.
- **Optimized:** Pre-normalized search index mapping each record ID to a single concatenated lowercase string, evaluated without per-query field iteration.
- **Correctness Gate:** Both baseline and optimized search functions must return identical matching record IDs.
- **Primary Metric:** `search_duration` (milliseconds, lower is better).

### Experiment C: Web Worker Offloading (Main Thread vs Background Thread)
- **Workload:** Compute statistical distributions (min, max, mean, missing values, top 10 frequencies) across all columns for a 50,000-row dataset.
- **Baseline:** Synchronous execution on the browser main thread.
- **Optimized:** Asynchronous execution inside a dedicated Web Worker (`data.worker.ts`).
- **Primary Metrics:**
  - `total_duration` (milliseconds, lower is better)
  - `main_thread_blocking` (milliseconds, lower is better; measures time the main event loop is frozen)

### Experiment D: Initial Bundle & Code Splitting
- **Workload:** Measure initial JavaScript payload required to display the application landing page.
- **Baseline:** Monolithic single bundle with all route dependencies (TanStack Virtual, PapaParse, Dexie) eagerly loaded.
- **Optimized:** Dynamic `React.lazy()` chunking with route code-splitting and Web Worker code isolation.
- **Primary Metrics:**
  - `initial_bundle_size` (kilobytes uncompressed, lower is better)
  - `transfer_size_compressed` (kilobytes gzip/brotli, lower is better)

---

## 3. Mathematical & Statistical Formulas

All statistics in FRONTBENCH are computed by `web/src/lib/statistics.ts` directly from raw sample arrays:

### 3.1 Mean
$$\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i$$

### 3.2 Median ($p_{50}$)
For sorted sample array $S$ of length $n$:
$$\text{Median} = \begin{cases} S[\frac{n-1}{2}] & \text{if } n \text{ is odd} \\ \frac{S[\frac{n}{2} - 1] + S[\frac{n}{2}]}{2} & \text{if } n \text{ is even} \end{cases}$$

### 3.3 95th Percentile ($p_{95}$)
Computed via linear rank interpolation:
$$\text{rank} = \frac{95}{100} \cdot (n - 1)$$
$$p_{95} = S[\lfloor \text{rank} \rfloor] + (\text{rank} - \lfloor \text{rank} \rfloor) \cdot (S[\lceil \text{rank} \rceil] - S[\lfloor \text{rank} \rfloor])$$

### 3.4 Relative Percentage Difference
For lower-is-better metrics where baseline median $> 0$:
$$\text{Percentage Reduction} = \frac{\text{Baseline Median} - \text{Optimized Median}}{\text{Baseline Median}} \times 100\%$$

### 3.5 Speedup Ratio
$$\text{Speedup Ratio} = \frac{\text{Baseline Median}}{\text{Optimized Median}}$$

---

## 4. How to Reproduce Benchmarks Locally

1. **Environment Setup:**
   - Launch Google Chrome or Chromium in an isolated incognito window with extensions disabled.
   - Close competing heavy background applications.
   - Run production build assets (`npm run build:web && npm run preview`) to eliminate React development mode profiling overhead.
2. **Execution Steps:**
   - Navigate to `/performance-lab`.
   - Select Experiment A, B, C, or D.
   - Select row count (e.g. 10,000 rows), warmup runs (3), and measured trials (15-20).
   - Click **Run Benchmark**.
   - Inspect raw sample distribution, computed p50/p95, and export JSON/CSV reports.
