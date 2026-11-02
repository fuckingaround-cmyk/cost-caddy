# ADR-0021 — MTD hardening: overlap-blocked periods, stop-at-first-gap inclusion, persisted/versioned MTD PDF

Status: accepted · Date: 2026-11-02

## Context
ADR-0006 shipped the MTD consolidated report as a live, recomputed-on-every-view aggregate: it sums every
*published* audit whose `periodStart` falls in a given outlet+month and reruns `computeMetrics` on the
summed raw values. Reviewing that design surfaced three gaps the original ADR didn't address:

1. **No overlap validation.** Nothing stops two audits for the same outlet from having overlapping
   `periodStart`/`periodEnd` ranges. If that happened, the MTD sum would silently double-count whatever
   period both audits covered — there is no guard anywhere in `createAudit` today.
2. **No gap handling.** MTD includes *any* published audit tagged to the month, regardless of order. If
   "Week 3" is published (e.g. backfilled) while "Week 2" is still missing, the live MTD page would sum
   Week 1 + Week 3, silently skipping over the gap — contradicting the "Week 1, then Week 1+2, then
   Week 1+2+3" mental model the feature was built around.
3. **No persisted artifact.** ADR-0006 deliberately chose live-only, explicitly flagging "revisit if the
   firm later needs an archived, point-in-time MTD PDF" as its own escape hatch. The firm now wants that:
   the same durability guarantee a per-audit report has (a versioned, stored PDF, independently retrievable
   later) should also be available for the MTD rollup.

## Decision

**1. Overlap is a hard block, not a warning.** `createAudit` (`lib/actions/audits.ts`) now checks every
existing audit for the same `outletId` (any status) via `findOverlappingAudit`
(`lib/queries/audits.ts`) before inserting. Two inclusive ranges `[aStart,aEnd]` and `[bStart,bEnd]`
overlap iff `aStart <= bEnd AND bStart <= aEnd`; touching-but-not-overlapping ranges (e.g. 1–7 and 8–14)
are correctly allowed. A conflict returns `{ error }` naming the conflicting audit and its period, through
the same error slot the form already renders — no UI changes needed. No DB-level exclusion constraint was
added (`periodStart`/`periodEnd` are plain `date` columns, not `daterange`, and this is a single-admin
console, not concurrent self-service) — deferred as a future option if ever actually needed.

**2. MTD inclusion stops at the first coverage gap.** `lib/report/mtdContiguity.ts::computeMtdContiguity`
sorts an outlet+month's published audits by `periodStart` and walks forward; each next audit counts as
contiguous only if its `periodStart` is within one day of the running `periodEnd`. The first audit that
breaks this — even if published, even if it would be contiguous with something still later — stops the
run; everything from there on is `excluded`, not summed. The live `/mtd/[month]` page and the "Lock &
Publish MTD" action both run this check, so what's locked can never be more inclusive than what's live.
`MtdReportBody` shows a visible (print-included) banner naming the excluded audit(s) and the gap's date
range whenever `excluded.length > 0`.

**3. MTD gains a persisted, versioned PDF, modeled exactly on the per-audit publish pipeline.** A new
`mtdReports` table (`id, orgId, outletId, month, version, token, publishedAt, pdfPath?, note?,
contributingAuditIds[]`) is the MTD analog of `reports`, keyed on `(outletId, month, version)` instead of
`(auditId, version)`. `lib/actions/mtdPublish.ts::lockMtdReport` re-derives the current contiguous subset,
renders `MtdReportBody` (gap banner included) through the same Playwright pipeline as per-audit reports
(extracted into a shared `lib/report/htmlToPdf.ts`), uploads to `{orgId}/mtd-reports/{outletId}/{month}/
v{version}/report.pdf`, and inserts one `mtdReports` row. `contributingAuditIds` freezes which audits a
given locked version actually summed, so a later lock (once more audits publish that month) doesn't need
to re-derive what an earlier version meant. The live page is completely unaffected by locking — it always
shows the current live recompute (ADR-0006's behavior is unchanged) — locking only adds a retrievable
snapshot on top of it. All historical locked versions remain individually downloadable via signed URLs
listed on the live page, plus a convenience `/mtd/[month]/pdf` route (redirect-to-latest-or-render-live,
mirroring the per-audit `pdf/route.ts`). There is deliberately no "unlock"/correction-reopen flow — per-
audit reports don't have one in this codebase either today — locking again later just stamps a new
version.

## Consequences
- Supersedes ADR-0006's "The MTD report has no `reports` row, no version, and no publish action of its
  own" decision statement and its "not downloadable as a fixed, dated artifact" consequence — both ADR-0006
  and `docs/DESIGN.md` UX-021 carry a dated note pointing here. ADR-0006's live-recompute-by-default
  behavior for the unlocked page is otherwise unchanged.
- New table `mtd_reports` (migration `0015`), new modules `lib/report/mtdContiguity.ts`,
  `lib/report/htmlToPdf.ts` (extracted, shared with the per-audit pipeline), `lib/report/
  renderMtdReportPdf.tsx`, `lib/actions/mtdPublish.ts`, new route `app/admin/(protected)/restaurants/[id]/
  mtd/[month]/pdf/route.ts`.
- `createAudit` now does one extra read before every insert (the overlap check) — a small, acceptable cost
  for a single-admin console. A check-then-insert race window exists for two concurrent creates on the same
  outlet; accepted as a known, low-probability gap rather than adding new locking infrastructure.
- A later audit excluded by the gap rule is never silently dropped — it's visible in the banner on both the
  live page and any locked PDF, naming what's missing and why.
