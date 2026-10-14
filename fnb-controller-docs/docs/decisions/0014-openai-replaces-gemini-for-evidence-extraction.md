# 0014 — OpenAI (`gpt-4o-mini` → `gpt-4o`, see addendum) replaces Gemini for evidence-table extraction

Status: accepted · Date: 2026-09-28

## Context
ADR-0012 chose Gemini (`gemini-2.5-flash`) as the vision provider for evidence-photo table extraction.
On first real-world test, every extraction attempt failed with HTTP 429 from Google:
`RESOURCE_EXHAUSTED`, `quota_limit_value: "0"` for the Generative Language API in the key's region — the
Google Cloud project behind that API key has no request-per-minute quota provisioned at all, not a
transient rate limit. Confirmed by calling the Gemini endpoint directly with the same request the app
sends: the request reaches Google and is rejected purely on account/quota grounds, not a bug in the
extraction code. Rather than spend time provisioning that Google Cloud project's quota/billing, the
product owner asked to switch providers outright.

## Options considered
- **Fix the Google Cloud project's quota/billing and keep Gemini.** Possible, but depends on Google
  Cloud Console access and billing setup outside this codebase's control, with no guaranteed timeline.
- **Keep Gemini as a fallback, add OpenAI as primary (or vice versa).** Rejected by the product owner
  directly — doubles the code path and cost-tracking complexity for what is a one-time account
  configuration problem on one provider, not a recurring reliability issue worth hedging against.
- **Replace Gemini with OpenAI outright.** Chosen. OpenAI's Chat Completions API accepts image input
  (`image_url` with a base64 data URL) and JSON-mode output in the same shape the pipeline already
  produces for Gemini — a like-for-like swap with no change to the extraction contract, the recipe
  system, or anything downstream of `extractEvidenceTable`.

## Decision
`lib/ai/extractEvidenceTable.ts` now calls `https://api.openai.com/v1/chat/completions` with
`model: 'gpt-4o-mini'` (chosen over `gpt-4o` for cost — the same reasoning that picked DeepSeek over a
pricier model for the text jobs; revisit if `gpt-4o-mini` misreads real registers in testing),
`response_format: { type: 'json_object' }`, and the image as an `image_url` content part
(`data:${mimeType};base64,...}`), plain `fetch`, no SDK — same no-SDK convention as DeepSeek. The new env
var is `OPENAI_API_KEY`, replacing `GEMINI_API_KEY`. Everything else — the recipe system
(`lib/ai/evidenceRecipes.ts`), the verbatim-only prompt discipline, the checkpoint-label suggestion
(`lib/evidence/suggest.ts`), the reviewer-editable/shown-immediately trust model, retries-overwrite, and
the whole "Section 3 · Evidence Registers" report structure (ADR-0012/ADR-0013) — is unchanged.

**Supersedes ADR-0012 on the provider choice only.** ADR-0012's core decision — a new vision OCR/data-entry
AI role, distinct from narration and severity classification, verbatim-only, recipe-based, reviewer-
editable — is unchanged and still in force.

## Consequences
- `GEMINI_API_KEY` is no longer read anywhere; `OPENAI_API_KEY` is required instead for extraction to
  succeed (same graceful-degradation behavior on a missing/invalid key — the file stays without a table,
  admin retry surfaces the failure).
- `auditItemFiles.extractionModel` now records `'gpt-4o-mini'` for newly extracted tables; rows already
  extracted under Gemini (none existed successfully at the time of this switch — every real attempt had
  failed with the quota error) keep whatever model string they had, if any.
- CLAUDE.md's stack line and `docs/ARCHITECTURE.md`'s LLM/vision layer table are updated to name OpenAI
  instead of Gemini; ADR-0012's own file is left as written (matching how ADR-0004 was left unedited when
  ADR-0011 superseded it on provider) — this ADR is the record of the change.

## Addendum (2026-09-28) — model raised to `gpt-4o`
Real testing (discount register, item-cancellation log) showed `gpt-4o-mini` fabricating and blending rows
on dense 14-column screenshots — the revisit condition this ADR named. Extraction now uses `gpt-4o` with
`temperature: 0` and `detail: "high"` on the image, and the prompt requires strict row-by-row transcription
with header-by-meaning matching. Higher per-photo cost accepted; still a fire-and-forget job.
