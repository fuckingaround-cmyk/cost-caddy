# 0013 — Reviewer drafts, DeepSeek polishes, Findings/Corrective Measures for evidence registers

Status: accepted · Date: 2026-09-27

## Context
ADR-0012 gave each evidence register (Discount Register, Bill Modification Log, etc.) a verbatim
extracted table in its own report section. The product owner then asked for that section to carry a
narrative, matching a reference report format: a heading per register type, a **Findings and
Observations** write-up, the table itself, and a **Corrective Measures** write-up — the same shape a
checklist finding already has (Operational Impact / Corrective Action), just for a whole register's
worth of rows instead of one checkpoint.

The reference examples shown compared figures against a policy limit (e.g. "exceeds standard 10% limit
by 20%") — a computed delta. That would put an LLM in the business of deriving a number, which D12
forbids outright (unlike ADR-0011's severity narrowing, this isn't even a category judgement — it's
arithmetic). This ADR does not carve out a new exception for that; it avoids the conflict instead.

## Decision
**Source of the text**: the reviewer writes the raw draft (`updateEvidenceFindings`); a "Polish with AI"
action (`lib/ai/polishEvidenceFindings.ts`, DeepSeek, same provider/style as ADR-0004's remark polish)
rewrites it in place, grounded in that evidence type's own extracted table rows so it can reference real
values without inventing any. Reviewer-triggered, not automatic at submit or at Generate report — the
admin clicks it when the draft is ready to polish, and can keep editing after.

**Granularity**: one Findings + one Corrective Measures pair **per evidence type per audit**
(`audit_evidence_findings`, unique on `(audit_id, evidence_type)`) — not per photo or per row. A register
with five discount photos gets one shared write-up, not five.

**No computed deltas, ever.** The polish prompt explicitly instructs DeepSeek to make only *qualitative*
comparisons against a policy-context blurb (e.g. "above the restaurant's normal range") and never compute
an exact percentage-point difference, sum, average, or count. It may quote a figure verbatim from a row,
but never derive a new one. This keeps D12 intact without a new narrowing: the model still never computes,
it only quotes and characterizes.

**Policy context is plain text in code, not a config system, for now.** The product owner explicitly chose
this over building a settings screen: `lib/ai/evidenceFindingsPolicyContext.ts` holds one shared string,
included in every type's polish prompt regardless of evidence type, with a placeholder note that it should
be edited to match a real client's SOPs. No per-org/per-type storage yet.

## Consequences
- New table `audit_evidence_findings` (`org_id`, `audit_id`, `evidence_type`, `findings`,
  `corrective_measures`, `ai_polished_at`, `updated_at`), unique on `(audit_id, evidence_type)`.
- Reuses the DeepSeek provider already in Stage A (no new env var) — a third independent AI job
  alongside `scoreAuditRemarks` (ADR-0011) and `extractEvidenceTable` (ADR-0012), all reviewer/auditor-
  triggered or fire-and-forget in their own lanes, none aware of the others' input.
- The report's "Section 3 · Evidence Registers" (ADR-0012) is restructured per type: heading → Findings
  and Observations → table(s) → Corrective Measures, recorded as DESIGN Part B **UX-027** (supersedes
  UX-026's plain-table-only layout).
- If a real policy-threshold config is wanted later (numeric limits per type, enforced deterministically
  so the model only narrates a pre-computed exceeds/within-limit result, consistent with D12 as
  originally written), that's a follow-up — this ADR deliberately avoids building it now.
