# 0020 — Register tables follow the photo's own columns, not a fixed recipe

Status: accepted · Date: 2026-10-15

## Context
ADR-0012 gave each register type a fixed column list that the extraction had to fill positionally. A real
item-cancellation register had a KOT NO column the recipe lacked, so the model had nowhere to put it and
every later cell shifted one column left (KOT under Order Time, order time under Cancel Time, and so on);
a blank Bill No made it invent a value. Registers differ by outlet and POS and will keep changing.

## Decision
The recipe (`lib/ai/evidenceRecipes.ts`) is now a hint only — `typicalColumns` plus a description, used so
the model knows what it is looking at. The extracted table's `columns` are the photo's own printed headers
(verbatim, in order; extra, missing, renamed or reordered columns are all fine). The model returns each row
as an object keyed by those headers, so a dropped cell is a blank in its own place and can never shift the
cells after it; `tableFromKeyedRows` (`lib/evidence/normaliseTable.ts`) converts that to the stored positional
`{ columns, rows }` and counts malformed rows (missing/unknown keys), which trigger one retry and then a
console warning. Both table renderers draw by header position. The vision model is now `gpt-5-mini`
(`reasoning_effort: 'low'`, no `temperature`) for cost; verify its output on real register photos.

## Consequences
Any column set works with no code change. Headers are no longer identical across outlets, so Stage B
analytics that need canonical names must map headers in a separate step — not during transcription.
Supersedes ADR-0012's fixed-recipe rule; the verbatim-only rule, provider (ADR-0014/0017) and single-call
flow (ADR-0018) are unchanged.
