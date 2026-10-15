# 0015 — POS Report is a third template section; register findings are generated at submit

Status: accepted · Date: 2026-09-28

## Context
ADR-0012 gave register photos (discount, item cancellation, bill modification, complimentary) verbatim
table extraction, and ADR-0013 had the admin hand-write each register's Findings and Corrective Measures
(with a "Polish with AI" button). Registers were still just ordinary checklist checkpoints under a "POS
Report" department, the auditor picked an evidence type per photo, and the report's compliance matrix and
scoring mixed them with every other checkpoint. The product owner wants POS reports to be first-class:
a dedicated template section, a dedicated auditor tab, a dedicated report section, and findings that come
from what the auditor already captured rather than from the admin.

## Decision
1. **Template**: a third section, "Part 3 · POS Report" (`template_pos_reports`), where the admin picks from
   a dropdown: Discount, Item Cancellation, Bill Modification, Complimentary (at most one of each;
   Complimentary reuses the `non_chargeable` recipe).
2. **Audit**: on assign, each becomes an `audit_items` row with `section = 'pos_report'` and `report_type`
   (snapshot invariant preserved; code prefix `RPT-`). POS items are ordinary items otherwise — same
   Pass/Fail/N-A, remark, photos, save-draft and submit gating (`isItemAnswered`) — so the auditor sees up to
   three tabs (MTD Metrics / Departmental Checklist / POS Report), each only if the template has it.
3. **Photo type is implied by the item** — the per-photo evidence-type picker and the label-based
   suggestion (`lib/evidence/suggest.ts`) are removed. `uploadItemPhoto` sets `evidence_type` from the
   item's `report_type` and queues the extraction itself.
4. **Findings/Corrective Measures are generated at submit** by DeepSeek (`lib/ai/generateRegisterFindings.ts`)
   from the auditor's remark + the table extracted from the photo (text only — the photo is already
   transcribed, so every quotable figure traces to a stored cell). Supersedes ADR-0013's reviewer-drafted /
   "Polish with AI" flow. Runs sequentially after remark scoring and the extraction sweep in one `after()`
   job; a failure never blocks submit and leaves the text empty. "Generate report" fills any that are
   missing (never overwrites). One Findings + one Corrective Measures block per report type. The
   no-computed-deltas rule and plain-text policy context from ADR-0013 are kept. The text is a
   deliberately brief summary (two short sentences each; the table below carries the detail) that may quote
   the lowest–highest verbatim figure as a range (e.g. "discounts from 20% to 53%, above the 10% threshold")
   but never derives a number.
5. **Admin review**: POS reports are their own group; the Findings/Corrective Measures panel is pre-filled and
   editable (Save), with **Regenerate** replacing "Polish with AI". Extracted-table cells are no longer
   editable (status, original photo and Retry only).
6. **Fully separate from compliance**: POS items are excluded from the Section 2 matrix, its ribbon counts and
   compliance %, from `scoreAuditRemarks` and from `classifyFinding`, and carry no per-item severity/SLA
   finding. The report renders them as "Section 3 · POS Reports": heading → Findings and Observations →
   table(s) → Corrective Measures.

## Consequences
- Supersedes ADR-0012 on the per-photo type picker (its verbatim-OCR role, recipes and provider — see
  ADR-0014 — are unchanged) and ADR-0013 on who writes the text (the no-computed-deltas rule stays).
- New schema: `item_section` enum, `template_pos_reports`, `audit_items.section` (default `checklist`) and
  `audit_items.report_type`. Existing rows are unaffected.
- Photos previously tagged with an evidence type on ordinary checklist items are no longer rendered as
  registers (test data only; no backfill).
- The submit job is now sequential external calls inside one `after()`; keep per-call timeouts and watch the
  route's `maxDuration` on Vercel.
- Recorded as DESIGN Part B **UX-028**.

## Addendum (2026-10-15) — custom-named reports
A template may also hold admin-named reports: stored as `report_type = 'other'` with the name in the new
`template_pos_reports.label` (unique per template on type + label). `audit_evidence_findings` gains
`report_label` (`''` for presets) so several custom reports on one audit don't share a write-up; its unique
key is now `(audit_id, evidence_type, report_label)`. Migration 0013. Recorded as DESIGN **UX-032**.
