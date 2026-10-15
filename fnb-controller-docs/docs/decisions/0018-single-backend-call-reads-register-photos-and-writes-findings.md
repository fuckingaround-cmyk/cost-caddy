# 0018 — One backend OpenAI call reads register photos and writes their findings

Status: accepted · Date: 2026-10-15

## Context
ADR-0012/0014 extracted each register photo's table as soon as it was uploaded, and ADR-0015 then made a
second, text-only call at submit to write Findings and Corrective Measures from the stored table. The
product owner wants the auditor's job to end at submit, no AI work during capture, and one call that both
reads the photo and writes the findings, visible to the admin under the restaurant's report.

## Decision
`lib/ai/analyseRegisterEvidence.ts` makes one `gpt-4o` vision call per POS report, sending all its photos
and the auditor's status/remark and returning one table per photo plus findings and corrective measures.
It runs only in the backend, via `after()` in `submitAudit` (in parallel with `scoreAuditRemarks`); upload
no longer triggers anything and the capture-time trigger and sweep are removed. Findings remain editable;
a retry or "Generate report" only fills what is missing and keeps admin-written text. The findings
"Regenerate" button stays text-only from the stored table so reviewer corrections to a misread cell flow
into the text.

## Consequences
Admin sees tables and findings only after submit processing finishes (status "Reading this photo…" until
then). Findings are written from the model's own transcription in the same call, so a misread cell is
repeated in the findings until the admin corrects the table and regenerates. Cost is one vision call per
report instead of one per photo plus a text call. Supersedes ADR-0012/0015 on when and how the calls run;
the recipes, verbatim-only rule and provider (ADR-0014/0017) are unchanged.
