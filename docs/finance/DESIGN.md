# Finance workspace design lock — 7 September 2026

Designing the MRLC web finance module for school administrators and community finance officers. Goal: record, independently review, and trace funds without confusing invoices, cash, or pledges. Direct build within the existing School Operations Fieldbook system (docs/ui/REFERO-UI-AUDIT.md).

Research: three style searches; full Attio (9f0c028b-6b11-415e-ab92-f32e4597cbe2), Ramp (0eba5a60-4fd9-44fc-b430-8345454f09d5), and Increase (9d8d6c7a-019f-4c0e-99a6-eee747f4379a) styles; Mercury expenses screen cc994704-4376-4bb4-893a-3f8384164405. Mercury's described submission → receipt review → decision → reconciliation journey supplies the workflow pattern.

Primary build target: existing Fieldbook design system. Preserve IBM Plex Sans, flat ruled panels, navy structure, teal links, gold primary actions, coral attention. No marketing imagery is required for a working ledger. Use real records, Lucide icons, and data charts. Reject decorative gradients, invented bank balances, unreadable micro-labels, and animation of financial values.

| Decision | Source | Role | Reason |
| --- | --- | --- | --- |
| Shared finance navigation and flat panel structure | Existing Fieldbook; React Bits Pro dashboard-11 already installed | Product chrome | Keep reports and registers connected |
| Distinct cash summary and decision queue | Mercury expenses screen | Review workflow | Expose evidence and pending decisions |
| 12px minimum supporting text, tabular amounts | Increase technical data clarity, existing IBM Plex | Financial data | Read long values without truncation |
| Restrained focus and hover transitions | Attio controls; installed Pro motion pattern | Interactive feedback only | Keyboard and reduced-motion support |
| Explicit recording forms with date, amount, reference and notes | User procedure brief; Mercury receipt review | Payment evidence | Replace browser prompts and support partial payments |

React Bits Pro provenance: adapt the installed components/blocks/dashboard-11.tsx structure and reduced-motion-aware entrance pattern. New registry access was denied by automatic approval review; no fresh Pro download is claimed.

## Visual QA result

Passed against the existing Fieldbook lock at 1440×1050 and 390×844, including dark theme. The overview has clear cash/commitment roles and a readable review queue; payment forms work at mobile width. Automated WCAG A/AA checks found no serious/critical violations in the finance overview after correcting text-accent contrast and naming the fiscal-year selector. Viewport screenshots are saved in outputs/finance-audit. The app's scrolling content area means a screenshot captures the current viewport, not every report row.

Validation: all 273 unit tests; five PostgreSQL concurrency scenarios (six test-runner entries including the parent); five live API/browser tests. TypeScript and production build pass. Database testing used only a disposable local cluster. No production migration was applied.

Dark-theme QA explicitly selected the Dark menu item and verified the html.dark class before the accessibility scan; the corrected dark screenshot is included.
