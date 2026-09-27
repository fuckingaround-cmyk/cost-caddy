# 0012 — Gemini vision extracts evidence-photo tables as OCR/data-entry, distinct from D12

Status: accepted · Date: 2026-09-27

## Context
Auditors attach evidence photos to checklist items (`auditItemFiles`), and some of those photos are
photographs of a tabular financial record — a discount register, a voids/cancellations log, a
non-chargeable report — rather than a photo of, say, a fire extinguisher or a dirty shelf. Today
every evidence photo renders identically: a thumbnail in the compliance matrix's Evidence column, a
click away from the full-size image. A reviewer wanting the discount register's actual figures has
to zoom into a phone photo of a spreadsheet or printed log and read it by eye.

The product owner wants these register photos parsed into real, structured rows — Date, Bill No,
Discount Reason, Bill Amt, Discount Amt, Percentage, Table, for a discount register — and rendered
as an actual table in the report, not just an embedded photo. DeepSeek (`deepseek-chat`, ADR-0011)
is text-only, so this needs a vision-capable model: Gemini (`gemini-2.5-flash`).

This also runs into CLAUDE.md's D12 invariant, "LLM never computes — it narrates numbers computed
deterministically; every AI-stated figure must trace to a computed value." D12 was written for
*narration* of figures the deterministic engine already computed (MTD totals, compliance %). ADR-0011
already narrowed it once, for severity classification (a judgment, not a number). Reading a bill
amount off a photo is neither of those: it is not narrating an existing computed figure (nothing in
the system has computed or even seen that figure before), and it is not deriving a new figure either
— it's verbatim transcription of a value that is only ever the auditor's own photographed evidence.

## Options considered
- **Treat this as covered by ADR-0011's carve-out.** Rejected — ADR-0011 explicitly scoped its
  narrowing of D12 to categorical severity, not numeric/financial figures. A bill amount lifted from
  a photo is exactly the kind of figure D12 was written to protect; silently reusing ADR-0011's
  language here would contradict it.
- **Extract only text/date columns, never numeric ones (Bill Amt, Discount Amt, Percentage).**
  Rejected — the numeric columns are the primary reason the feature is wanted; a table missing them
  isn't useful, and the risk (a misread digit) is better addressed by keeping the reviewer able to
  correct every cell than by refusing to extract numbers at all.
- **A new, narrower carve-out: vision OCR/data-entry, verbatim-only, reviewer-editable exactly like
  severity.** Chosen.

## Decision
A new AI role is defined — **vision OCR/data-entry** — bound by:
1. Every returned cell must be exactly what's visible in the photo. The model never sums, averages,
   rounds, recomputes a percentage, reformats a date, or fills in an illegible/blank cell with a
   guess — an unreadable cell is an empty string, never invented.
2. Extraction is **recipe-based, not freeform**: a fixed column set + prompt per evidence type
   (`lib/ai/evidenceRecipes.ts`), so the same register type reads with consistent headers across
   audits and outlets. The auditor picks the type per photo (`lib/actions/checklist.ts`'s
   `setEvidencePhotoType`); a checklist checkpoint can only *suggest* a default
   (`lib/evidence/suggest.ts`) since one checkpoint can imply more than one register type (e.g.
   `POS-01 "Voids & Discounts"` implies both a void log and a discount register).
3. **Provider: Gemini (`gemini-2.5-flash`), added alongside DeepSeek, not replacing it.** Stage A now
   has two independent AI jobs doing unrelated things — DeepSeek still owns remark polish/severity at
   submit (ADR-0011); Gemini only ever sees evidence photos, never remark text or financial totals.
   Stage B's own LLM provider (ADR-0011, still undecided) is unaffected either way.
4. **Trust model matches severity, not a stricter gate**: an extracted table shows immediately in
   the admin review screen and the report, editable/overridable by the reviewer via
   `updateEvidenceTable()` — the same trust model `updateFinding()` already gives AI-assigned
   severity. There is no separate "confirm before it counts" step.
5. **Retries overwrite**, no extraction history kept — `auditItemFiles.extractedTable` holds only the
   latest attempt, matching how `classifyFinding`/`scoreAuditRemarks` already treat "regenerate" as
   idempotent overwrite, not versioned.
6. **v1 is `kind = 'image'` only.** `kind = 'file'` (PDF exports of a register) is out of scope; a
   fast-follow if needed.
7. **A failure or timeout here never blocks upload or submit**, and is never surfaced to the
   auditor — same resilience pattern as `scoreAuditRemarks` (ADR-0011): the file is left without a
   table, and the admin review screen offers a manual retry.

Extraction is triggered at capture time (`setEvidencePhotoType`, fire-and-forget via `after()`), with
a safety-net sweep (`sweepEvidenceExtraction`) queued from `submitAudit` alongside the existing
`scoreAuditRemarks` call, for any photo whose capture-time trigger never fired.

Extracted tables render in a **new report section** ("Section 3 · Evidence Registers",
`EvidenceRegisterSection.tsx`), grouped by evidence type across the whole audit — not nested under
the compliance matrix's Evidence column, which keeps showing plain thumbnails unchanged for every
photo. This follows the report design's own precedent (`Audit report v4.dc.html`): every existing
data table (the Sales & Revenue Matrix, the Cost Analysis breakdown) is its own full-width section,
not a row expanding under another row. It reuses `docs/DESIGN.md`'s existing "Report table / KPI
strip" token verbatim — no new style invented. Recorded as DESIGN Part B **UX-026**.

## Consequences
- **D12 is narrowed a second time, explicitly**, the same way ADR-0011 did: D12 covers a figure the
  model *derives or restates as fact without a traceable source*; verbatim transcription of a
  photographed figure, reviewer-editable before publish, is neither. This ADR states that plainly so
  no doc silently contradicts the code.
- A new env var, `GEMINI_API_KEY`, is required for extraction to succeed; its absence degrades
  gracefully — every photo simply stays without a table, and the admin review screen's retry surfaces
  the failure, the same resilience ADR-0004/ADR-0011 already established for DeepSeek.
- New schema on `auditItemFiles`: `evidenceType`, `extractionStatus`, `extractedTable` (jsonb, `{
  columns: string[], rows: string[][] }`, positional not keyed), `extractionModel`, `extractedAt`.
- ARCHITECTURE §10's "data-to-LLM boundary" open question now also covers evidence photos, leaving
  the boundary to Google (Gemini) as well as DeepSeek.
