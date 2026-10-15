# ADR 004: Metadata-Only Backend Persistence Architecture

## Context
FrontBench includes an optional Node.js / Fastify REST API backed by PostgreSQL for saving benchmark history, environment metadata, and dataset profiles. We must decide what data belongs in PostgreSQL versus what stays exclusively in client-side storage.

## Decision
PostgreSQL stores **only** benchmark run metadata, individual execution sample timings, environment descriptors, and schema column definitions. Raw CSV rows, file contents, and cell values are **strictly forbidden** from being transmitted to or stored in PostgreSQL. Strict Zod schemas reject incoming requests containing raw row payloads.

## Alternatives Considered
1. **Full Dataset Ingestion into PostgreSQL:**
   - *Pros:* Allows SQL queries directly across uploaded data; centralized backup.
   - *Cons:* Breaches local data privacy expectations; requires server-side storage provisioning, multi-tenant row isolation, and complex cleanup routines.
2. **Purely In-Memory Client Storage with No Backend:**
   - *Pros:* Zero backend maintenance.
   - *Cons:* Fails to demonstrate full-stack proficiency, database modeling, ACID transactional integrity, SQL indexing, and REST API design.

## Consequences & Trade-offs
- **Positive:** Preserves user privacy by design; keeps database size minimal and query execution times sub-millisecond; allows the frontend to run entirely offline when the API is down without breaking core exploration capabilities.
- **Negative:** Users cannot share a live dataset view with another browser without exporting and re-importing the CSV file.
