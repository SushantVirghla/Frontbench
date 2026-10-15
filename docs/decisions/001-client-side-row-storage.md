# ADR 001: Client-Side Row Storage via IndexedDB (Dexie)

## Context
FRONTBENCH is an interactive data exploration tool that processes user-provided CSV files and synthetic datasets ranging from 1,000 to 100,000 rows. A central requirement is data privacy: user CSV rows must never be exfiltrated to the backend server. Furthermore, holding 100,000 object records entirely in volatile JavaScript memory can cause garbage collection pressure and tab crashes on memory-constrained devices.

## Decision
We store imported dataset rows, schema snapshots, and view preferences client-side in the browser using IndexedDB wrapped by Dexie. Records are written in chunks of 2,000 rows to prevent event-loop starvation and quota exhaustion.

## Alternatives Considered
1. **In-Memory JavaScript State Only (`useState` / Redux):**
   - *Pros:* Simple implementation.
   - *Cons:* Data is lost on page refresh; large arrays cause memory pressure and GC pauses during UI renders.
2. **Uploading to PostgreSQL Backend:**
   - *Pros:* Server-side SQL queries, pagination, and persistent sharing.
   - *Cons:* Directly violates user privacy; introduces network latency and server storage costs for arbitrary user files.
3. **`localStorage`:**
   - *Pros:* Native key-value API.
   - *Cons:* Synchronous blocking API with a strict 5MB quota; completely unsuitable for datasets with tens of thousands of records.

## Consequences & Trade-offs
- **Positive:** Absolute data privacy; zero network latency for data access; survives page reloads; quota handling handles up to hundreds of megabytes.
- **Negative:** Storage can be cleared by the browser or user clearing site data; structured cloning overhead when reading large datasets into memory.
