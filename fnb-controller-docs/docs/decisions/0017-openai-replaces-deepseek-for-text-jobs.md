# 0017 — OpenAI replaces DeepSeek for the submit-time text jobs

Status: accepted · Date: 2026-10-15

## Context
ADR-0011 chose DeepSeek (`deepseek-chat`) for submit-time remark polish + severity scoring, and ADR-0015
reused it for POS-report register findings. OpenAI was already in the stack for evidence-photo extraction
(ADR-0014). The product owner wants one LLM provider across the app. A live audit had also shown
"AI scoring failed" with the DeepSeek job.

## Decision
`lib/ai/scoreAuditRemarks.ts` and `lib/ai/generateRegisterFindings.ts` now call OpenAI Chat Completions
(`gpt-4o-mini`, JSON mode, plain `fetch`, same prompts, schemas, timeouts and failure behaviour). The
`DEEPSEEK_API_KEY` env var is removed; `OPENAI_API_KEY` covers every AI job. Vision extraction stays on
`gpt-4o` (ADR-0014 addendum). **Supersedes ADR-0011 and ADR-0015 on the provider only**; their design
(severity at submit, classifyFinding fallback, register findings) is unchanged.

## Consequences
One key, one vendor, one failure mode to monitor. Severity quality on `gpt-4o-mini` is untested against the
rubric; the model is a single constant (`OPENAI_TEXT_MODEL`) in each file if it needs raising.
