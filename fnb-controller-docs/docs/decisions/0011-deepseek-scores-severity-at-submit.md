# ADR-0011 — DeepSeek scores severity at submit, alongside the remark polish

Status: accepted · Date: 2026-09-26

## Context
ADR-0004/B6 gave the auditor's remark one AI pass at submit — Anthropic (`claude-opus-5`) rewrote non-pass
remarks into report prose. That model never touched severity, category, impact, corrective action, SLA, or
ownership. Those fields were assigned later and separately: only when the admin clicked "Generate report,"
by `lib/report/classify.ts`'s `classifyFinding` — a deterministic, LLM-free keyword-matching engine ported
verbatim from the design mock (10 category rules + a fixed fallback). The reviewer could freely override
any finding field, including severity, via `FindingPanel.tsx` → `updateFinding()`.

The product owner wants the remark and its severity assessed together, at submit, by a model — using a
defined scoring matrix so the judgment is grounded rather than freeform — rather than a fixed keyword
table. The provider also changes: DeepSeek replaces Anthropic for this job (not layered alongside it).

## Options considered
- **Keep the split (Anthropic polishes prose, classify.ts assigns severity at Generate report).** No
  architecture change, but the reviewer opens a submission with prose already polished yet every Fail item
  unassessed until they click Generate — the two AI-adjacent moments stay out of sync.
- **DeepSeek assigns severity but Anthropic still polishes prose (two calls).** Keeps Anthropic in the
  loop but adds a second provider and a second round-trip for no real benefit — nothing about severity
  scoring needs a different model from the prose rewrite, and the user asked for DeepSeek to replace
  Anthropic outright.
- **One DeepSeek call at submit does both, `classify.ts` becomes a fallback.** Chosen. Single round-trip,
  single provider, and the existing deterministic engine isn't thrown away — it already had exactly the
  idempotent "only fill what's missing" behavior (`if (item.severity !== null) continue`) this needs as a
  safety net for when the AI call fails or times out.

## Decision
`lib/ai/scoreAuditRemarks.ts` (replacing `lib/ai/polishRemarks.ts`) runs at submit, queued via `after()`
exactly as B6 was. In one DeepSeek (`deepseek-chat`) call it: rewrites every non-pass remark into report
prose (unchanged from ADR-0004 — no verbatim copy kept), and for every **Fail** item additionally assigns
`category`, `severity` (High/Medium/Low), `impact`, `correctiveAction`, `sla`, and `ownership`, guided by a
scoring rubric (`lib/ai/severityRubric.ts`) adapted from `classify.ts`'s existing category knowledge rather
than inventing a new taxonomy. The full raw model output per item is also stored (`auditItems.aiAssessment`,
jsonb) — a superset of the discrete columns, kept so a later report-layout change can read more of what the
model already said without re-running scoring.

**The reviewer's ability to override every finding field, severity included, is unchanged.** Only the
starting value's source (DeepSeek instead of a keyword table) and its timing (present at submit, not only
after "Generate report") change. `updateFinding()` and `FindingPanel.tsx` needed no changes.

`classify.ts`/`classifyFinding` is kept, demoted from primary classifier to **fallback**: `generateReport()`
still only classifies items with no severity yet, so it now typically has nothing to do (DeepSeek already
filled it in) except for items the AI call didn't reach — it failed or timed out, or the item was corrected
into Fail after submit, when there's no per-item submit-time call left to redo.

The audit's polish-state column is renamed `polishState` → `aiState` in code (its Postgres name is left as
`polish_state` — a TS-only rename, no migration) since it now gates a job that does more than polish; it is
now also surfaced on the admin review screen, not just the auditor's pending list, since a `failed` state
now means findings are missing, not just that prose reads as typed.

## Consequences
- **D12 ("LLM never computes") is narrowed, explicitly.** It has always meant the model never derives a
  number the report shows — MTD figures, compliance %, totals. Severity classification was never a number;
  it was, however, always a *computed* value — first by a keyword rule, now by a model judgment. This ADR
  states plainly that D12 covers numeric/financial figures, not categorical severity classification, so no
  doc silently contradicts the code.
- Anthropic is no longer a dependency of Stage A (`@anthropic-ai/sdk` removed from `package.json`). CLAUDE.md's
  stack section previously said Stage B's analytics narration "reuses the same client" — that claim no
  longer holds; Stage B's LLM provider is now an open decision to make when that phase starts, not
  necessarily DeepSeek.
- A new env var, `DEEPSEEK_API_KEY`, is required for the submit-time job to succeed; its absence degrades
  gracefully to the existing failure path (unpolished remarks, findings via the Generate-report fallback) —
  the same resilience ADR-0004 already established, not a new failure mode.
- Supersedes ADR-0004 on the "what the AI call does" and "which provider" points; ADR-0004's core
  data-model decision (polish replaces the raw remark, no verbatim kept) is unchanged and still in force.
  Recorded as DESIGN Part B **UX-010** (updated in place, same entry).
