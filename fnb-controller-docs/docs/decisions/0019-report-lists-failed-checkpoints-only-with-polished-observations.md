# ADR-0019 — The report lists failed checkpoints only; only Fail remarks go to the AI; raw remarks never reach the report

**Status:** accepted · 2026-10-15 · refines ADR-0011/ADR-0017 (scope of the submit-time job) and Report v4 §2 (columns, rows)

## Context
Client feedback on the first reports: Pass and N/A rows are noise, the auditors' shorthand must never appear,
and the compliance table should read Checkpoint · Observation · Risk Severity · Operational Impact ·
Corrective Action · SLA · Evidence. ADR-0011's job polished every non-pass remark, so N/A remarks were sent
to the model for text no one would read.

## Decision
- The submit-time OpenAI job (`scoreAuditRemarks`) sends **Fail checkpoints with a remark only**. Pass and N/A
  are never sent. Each returns a polished remark plus the finding fields.
- An item counts as **polished** once the job has stamped `ai_assessment` on it (also when scoring was partial;
  C3's classifier fills the rest at Generate report). `AuditItemRow.polished` exposes this.
- The report (§2) shows **Fail checkpoints only**; a department with none is omitted. The Observation is the
  polished remark; an unpolished one renders "—" — the raw text is never shown in the report.
- Columns follow the owner's order; the Ref ID column is dropped. The ribbon is Failed / High / Medium / Low.

## Consequences
- Fewer tokens per submit. "Generate report" retries the polish for Fail points the submit job missed
  (`scoreAuditRemarks(auditId, { onlyUnpolished: true })`): it sets only the observation on points that already
  have finding fields (classifier- or reviewer-set) and fills all fields on points that have none. If that retry
  also fails, observations stay "—" (finding fields still come from C3's fallback).
- The reviewer screen and auditor's own view still show the item's stored remark — polished once the job ran.
- Checkpoint photos are not sent to the model; only POS register photos are (ADR-0018).
