# ADR 003: Web Worker Offloading for CSV Parsing and Analytics

## Context
Parsing multi-megabyte CSV files or computing statistical distributions (min, max, mean, unique values, top frequency histograms) across 50,000+ records requires intensive CPU loops. When executed synchronously on the browser's main thread, JavaScript execution monopolizes the event loop, freezing animations, causing input latency spikes (INP degradation), and triggering "Page Unresponsive" dialogs.

## Decision
We delegate CSV stream parsing (via PapaParse) and heavy statistical aggregations to an isolated dedicated Web Worker (`data.worker.ts`). Communication is managed via a type-safe `WorkerClient` with request-ID correlation, throttled progress updates (every 100ms to avoid message flooding), and cancellation support.

## Alternatives Considered
1. **Synchronous Main-Thread Execution:**
   - *Pros:* Simple synchronous code, no serialization overhead.
   - *Cons:* Complete UI freeze during parsing and aggregation; catastrophic INP and UX failure.
2. **`requestIdleCallback` Chunking:**
   - *Pros:* Runs on main thread during idle frames without worker serialization.
   - *Cons:* Significantly slows down total completion time when the main thread has competing work; unpredictable execution timing across browsers.
3. **WebAssembly Parser:**
   - *Pros:* Raw SIMD and native memory performance.
   - *Cons:* Adds Wasm compilation toolchain complexity and increased bundle size, which is disproportionate for this stage.

## Consequences & Trade-offs
- **Positive:** Main thread remains 100% responsive (0ms main-thread blocking); UI smooth scrolling and typing are never interrupted; user can cancel long-running parse operations.
- **Negative:** `postMessage` structured cloning introduces a small serialization latency when returning the final array of parsed records. Total wall-clock time may be slightly longer than an unblocked synchronous execution, but user responsiveness is vastly superior.
