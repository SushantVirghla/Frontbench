# ADR 002: Table Virtualization Strategy (TanStack Virtual)

## Context
Rendering a DOM table with 10,000 to 50,000 rows generates between 90,000 and 450,000 DOM elements. In standard DOM trees, this causes catastrophic layout computation times (hundreds of milliseconds per reflow), memory bloat, and frame rates dropping below 10 FPS during scrolling.

## Decision
We implement a virtualized viewport table using `@tanstack/react-virtual` alongside headless `@tanstack/react-table`. The virtualizer mounts only the rows currently visible within the scrolling container (approx. 20–30 rows) plus a 10-row overscan buffer. A standard, unvirtualized DOM table is preserved as the baseline implementation for controlled performance comparison.

## Alternatives Considered
1. **Server-Side Pagination:**
   - *Pros:* Small page sizes (e.g. 25 rows per page).
   - *Cons:* Requires round-trips for every page navigation; does not demonstrate client-side high-throughput rendering capability.
2. **Infinite Scroll with Full DOM Appending:**
   - *Pros:* Familiar user interaction.
   - *Cons:* As the user scrolls deeper, DOM node count increases indefinitely, reintroducing memory leaks and scroll degradation.
3. **Manual Windowing Math:**
   - *Pros:* Zero external dependencies.
   - *Cons:* Reinventing edge-case handling for dynamic row heights, scroll momentum, and overscan buffers.

## Consequences & Trade-offs
- **Positive:** Reduces active DOM elements from >100,000 to ~250 regardless of total dataset size; maintains rock-solid 60 FPS scrolling; enables instantaneous sorting and filtering over the logical in-memory dataset.
- **Negative:** Virtualization removes offscreen rows from the accessibility tree, which can impair full-text screen reader navigation if not accompanied by ARIA row counts and viewport region attributes. We provide bounded pagination as an accessible alternative.
