# Architecture Decision Records

One file per significant decision, numbered `NNNN-title.md`. Each ADR: **Context · Options considered ·
Decision · Consequences** (including trade-offs accepted). Add a row here when you file one.

The full consolidated decision register (D1–D14) lives in the **Architecture & Execution Plan** and is
summarised in `docs/ARCHITECTURE.md`. ADRs here capture the most load-bearing choices in standalone form
and are where *new* decisions get recorded going forward.

| ID | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-typescript-end-to-end.md) | TypeScript end-to-end on Next.js + Supabase Postgres | accepted | 2026-09-11 |
| [0002](0002-no-offline-server-persisted-drafts.md) | No offline; server-persisted drafts with explicit Save | accepted | 2026-09-11 |
| [0003](0003-super-admin-metric-model-is-canonical.md) | The Super Admin metric model is canonical; the auditor files' is stale | accepted | 2026-09-11 |
| [0004](0004-ai-polishes-remarks-on-submit.md) | AI polishes remarks on submit, replacing the raw text | accepted | 2026-09-11 |
| [0005](0005-pdf-only-export-no-client-portal.md) | Publish ships PDF only; the Client Portal is cut from current scope | accepted | 2026-09-12 |
| [0006](0006-mtd-consolidated-report-is-live-recomputed.md) | MTD consolidated report is a new, live-recomputed aggregate, not a versioned publish | accepted | 2026-09-13 |
| [0007](0007-checklist-item-status-drops-observation.md) | Checklist item status is Pass/Fail/N-A only; "Observation" removed | accepted | 2026-09-22 |
| [0008](0008-audit-date-range-is-a-period-not-a-deadline.md) | Audit date range is the recurring conduct window, not a due date — overdue tracking removed | accepted | 2026-09-22 |
| [0009](0009-evidence-photo-links-use-long-lived-signed-urls.md) | Evidence photo links in the published PDF use long-lived signed URLs, not a redirect route or a public bucket | accepted | 2026-09-22 |
| [0010](0010-pdf-generation-uses-sparticuz-chromium-on-vercel.md) | PDF generation uses `playwright-core` + `@sparticuz/chromium` on Vercel, not full Playwright | accepted | 2026-09-26 |

Statuses: proposed · accepted · superseded (note which ADR supersedes it).
