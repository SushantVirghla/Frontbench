# FRONTBENCH Accessibility Audit & WCAG 2.2 AA Compliance

This document records the accessibility design decisions, automated checks, and manual keyboard testing protocols implemented across FRONTBENCH to ensure conformance with WCAG 2.2 Level AA principles.

---

## 1. Compliance Checklist & Audit Results

| Principle | Guideline / Success Criterion | Status | Implementation Details |
|---|---|---|---|
| **1.1 Text Alternatives** | 1.1.1 Non-text Content | **Pass** | All icons and emoji badges are paired with text or explicitly marked `aria-hidden="true"`. Screen-reader only utility `.sr-only` provides accessible names where visual design is compact. |
| **1.3 Adaptable** | 1.3.1 Info and Relationships | **Pass** | Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<table>`, `<th>`, `<tr>`, `<td>`, `<dl>`, `<dt>`, `<dd>`). Column headers feature `role="columnheader"` and `aria-sort` attributes. |
| **1.4 Distinguishable** | 1.4.1 Use of Color | **Pass** | Benchmark results never rely on color alone. Statuses pair color with explicit text labels (`Improvement`, `Regression`, `Neutral`), percentage signs (`+`, `-`), and speedup multipliers. |
| **1.4 Distinguishable** | 1.4.3 Contrast (Minimum) | **Pass** | Text tokens maintain contrast ratios ≥ 4.5:1 against backgrounds (`#212529` text on `#ffffff` surface has contrast 16.1:1; accent `#0d6efd` on white is 4.56:1). |
| **2.1 Keyboard Accessible** | 2.1.1 Keyboard Navigation | **Pass** | Every interactive element (buttons, tabs, inputs, table sorting headers, dialog controls) is operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`). |
| **2.1 Keyboard Accessible** | 2.1.2 No Keyboard Trap | **Pass** | The `Modal` component traps focus within the dialog while open, and releases focus when dismissed via `Escape` or the close button, restoring focus to the trigger element. |
| **2.4 Navigable** | 2.4.7 Focus Visible | **Pass** | High-contrast `:focus-visible` ring defined in design tokens (`0 0 0 2px var(--color-accent), 0 0 0 4px rgba(13, 110, 253, 0.25)`). Focus rings are never globally removed with `outline: none`. |
| **2.3 Seizures & Physical** | 2.3.3 Animation from Interactions | **Pass** | `@media (prefers-reduced-motion: reduce)` disables spinner rotation and modal zoom animations, replacing them with static high-visibility states. |
| **4.1 Compatible** | 4.1.2 Name, Role, Value | **Pass** | Progress bars feature `role="status"` and accessible percentage labels. Segmented radio controls use `role="radiogroup"` and `aria-checked`. |

---

## 2. Modal Dialog Keyboard & Focus Protocol

The `Modal` component (`web/src/components/ui/Modal.tsx`) strictly follows WAI-ARIA Dialog (Modal) design patterns:
1. **Focus Initialization:** When opened, focus shifts automatically to the first focusable interactive element inside the modal.
2. **Focus Trap:** Pressing `Tab` on the last interactive element loops focus back to the first element; pressing `Shift+Tab` on the first element moves focus to the last element.
3. **Escape to Close:** Pressing the `Escape` key anywhere in the document dismisses the modal.
4. **Focus Restoration:** Upon closing, focus is automatically returned to `previousActiveElement.current` (the button or trigger that opened the modal).

---

## 3. Table Virtualization Accessibility Analysis

Virtualization improves browser frame rates by only mounting rows visible in the viewport. However, unmounted offscreen rows cannot be read by screen-reader virtual cursors.

### FRONTBENCH Mitigation Strategy:
1. **Accessible Table Structure:** The virtualized container declares `role="table"` with `aria-rowcount={rows.length}` and `aria-colcount={columns.length}`. Each rendered row features `role="row"` and `aria-rowindex={virtualRow.index + 1}`, informing assistive technology of the true position in the overall dataset.
2. **Accessible Baseline Fallback:** When full in-DOM inspection is required by assistive tech, users can toggle from the virtualized view to the **Baseline DOM Table**, which renders standard semantic `<table>` elements with pagination.

---

## 4. Manual Keyboard Verification Checklist

- [x] Navigate through sidebar links using `Tab` and select routes using `Enter`.
- [x] Open the Import CSV modal, tab through dropzone and action buttons.
- [x] Dismiss the modal with `Escape` key and verify focus returns to the trigger button.
- [x] In Data Explorer, focus on search input, type query, and press `Tab` to reach table headers.
- [x] Press `Enter` or `Space` on table headers to toggle sorting between ascending and descending.
- [x] In Performance Lab, switch experiment tabs using arrow keys / tab and trigger benchmark using `Enter`.
- [x] Verify live progress updates are announced via `role="status"`.
