# ADR-0006 — MTD consolidated report is a new, live-recomputed aggregate, not a versioned publish

Status: accepted · Date: 2026-09-13

> Note (2026-09-22, ADR-0008): `audits.dueStart`/`dueDate`, referenced below by their original names, were
> later renamed to `periodStart`/`periodEnd` to match how this ADR already used them — a coverage period,
> not a deadline. The renamed columns hold the same data; nothing in this ADR's decision changed.

> Note (2026-11-02, ADR-0021): a persisted, versioned MTD PDF ("Lock & Publish MTD") was added on top of
> this ADR's live-recompute page — see ADR-0021. The live page itself is unchanged; this note only flags
> that the "not downloadable as a fixed artifact" consequence below no longer holds. ADR-0021 also adds a
> hard block on overlapping audit periods and stop-at-first-gap MTD inclusion, neither of which existed
> when this ADR was written.

## Context
`Super Admin Flow.dc.html`'s restaurant-detail Reports tab draws a month picker with a "View MTD report"
card above the list of individual audit reports — but its data (`REPORT_MONTHS`/`MONTH_REPORTS`, the
`rdMtdTitle`/`rdMtdPeriod` strings) is hand-authored seed data, not a computed model: three fixed months
with invented report names, unconnected to any real audit. There is no `cadence`/month field on `audits`,
no MTD aggregation logic anywhere in `computeMetrics`/the report pipeline, and no mention of an MTD rollup
in `ARCHITECTURE.md`.

The user asked for the real thing: for a restaurant running (say) three weekly audits in a month, the
Reports tab should show each week's own report, plus one MTD figure that is the cumulative combination of
whichever of that month's audits have been published so far — Week 1 alone after Week 1 publishes, Week 1
+ Week 2 after Week 2 publishes, and so on.

## Options considered
- **Explicit "Generate MTD report" action, versioned like a per-audit publish.** Matches the per-audit
  workflow exactly (a `reports`-style row, a stamped version/date) but means a second kind of storable
  report, a second publish button, and staleness the moment a later week in the same month publishes —
  the admin would need to remember to re-generate it.
- **Live, recomputed on every view — no stored row.** No new "publish" step and nothing to go stale: opening
  the MTD page for a month always recombines whichever audits are published in it, as of that moment.
  Never a versioned artifact of its own, so it can't be separately downloaded/archived as a fixed PDF
  snapshot the way a per-audit report can.

User chose **live, recomputed**.

## Decision
**The MTD report has no `reports` row, no version, and no publish action of its own.** `lib/report/
mtdViewModel.ts::buildMtdViewModel` recombines, on every request, every published audit whose covered
period (`dueStart`) falls in the requested month for that outlet:
- Loads each contributing audit's own frozen `auditMetricDefs`/`auditMetricValues` (same B2/B4 snapshot
  every per-audit report already reads).
- Merges by `metricKey` (already the stable cross-audit identity — `getAuditMetricDefs` maps a def's `id`
  to `metricKey`, never the row's own uuid) — two audits sharing a metric key add together; a metric
  unique to one audit still contributes under its own key.
- Reruns `computeMetrics` (via the existing `buildFinancialReportDraft`/`buildCostingBreakdown`, unchanged)
  on the *summed raw values*, not by adding each audit's own already-derived totals — so pro-rata splits,
  %s, and gross-sale math stay correct instead of double-deriving.
- Renders through a new `MtdReportBody`, reusing the same `KpiStrip`/`RevenueMatrix`/`CompositionDonut`/
  `CostingTable` components as the per-audit report, with a contributing-audits list in place of a single
  audit's compliance checklist (no one coherent checklist exists for a sum of several audits).

Grouping itself — which month a report belongs to — was also fixed alongside this: it's keyed off the
audit's own `dueStart` (the period it covers), not `publishedAt` (when it happened to be reviewed), so a
1–31 Aug audit reviewed in September still files under August.

## Consequences
- New route `app/admin/(protected)/restaurants/[id]/mtd/[month]`, new module `lib/report/mtdViewModel.ts`.
  No schema change — no `cadence` field, no MTD row in `reports`.
- The MTD figure is only ever as current as the last page load; there is nothing to "re-publish" and
  nothing that can drift into staleness the way a cached snapshot could.
- **Not downloadable as a fixed, dated artifact** the way a per-audit report is — printing it (via the
  existing `PrintButton`) captures whatever is live at that moment, but there's no `reports.version` to
  point back to later. Acceptable per the user's choice; revisit if the firm later needs an archived,
  point-in-time MTD PDF.
- Compliance/checklist findings are per-audit only; the MTD page does not attempt to merge checklists
  across differently-templated audits. See `docs/DESIGN.md` UX-021.
