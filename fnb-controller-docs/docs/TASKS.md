# Tasks

Current working set only, in execution order. Each line carries its `docs/EXECUTION.md` package id — that
file holds the deliverable, design file, dependencies and "done when" clause. Done tasks get removed and
rolled into `docs/archive/` monthly or past ~40 lines. Not a PM tool — just what's active.

Legend: ☐ todo · ◐ in progress · ☑ done (clear on next rollup)

## Foundations
- ☑ Repo, strict TS, lint, CI; fill Run/build/test into CLAUDE.md · F1 (CI deferred — no
  remote yet; add with F6 deploy pipeline)
- ☑ Token layer + 12 primitives, App UI and Report kept separate · F2
- ☑ Drizzle schema + migration 1: org_id everywhere, brand→outlet, FK ids · F3
- ☑ Own-auth: users, sessions, argon2, RBAC, end all sessions · F4
- ☑ Supabase Storage bucket + signed URLs · F5
- ☐ Deploy pipeline · F6
- ☑ Shared calculation core `computeMetrics` + ₹ formatter, unit-tested vs seed · F7

## Super Admin
- ☑ Login + one-message error · A1
- ☑ Restaurants CRUD + detail with Audits/Reports tabs · A2
- ☑ Auditors CRUD — password shown once, access, suspend, remove-keeps-audits · A3
- ☑ Templates library + Template Builder, auto-renumbering reference codes · A4
- ☑ Audit create/assign, share token, template snapshot on assign · A5

## Auditor
- ☑ Responsive shell + login + pending list · B1
- ☑ Metrics step — calculated rows read-only, live totals from F7 · B2
- ☑ Checklist step — Pass/Fail/N-A, remarks, photos; N/A from spec · B3
- ☑ Explicit Save → server draft; assigned→in-progress; photos on capture · B4
- ☑ Submit gate naming what's missing → immutable · B5
- ◐ AI remark polish + severity scoring on submit (DeepSeek, replacing Anthropic; scoring
  rubric; non-blocking failure path falls back to C3's classifier) · B6, ADR-0011 — code
  written, needs `DEEPSEEK_API_KEY` set and an end-to-end submit test before marking done

## Review and report export
- ☑ Review queue + review as captured + operational file attach · C1
- ☑ Financial engine — pure (auditSnapshot, imports) → reportDraft · C2
- ☑ Findings generation from every Fail, reviewer-editable · C3 (now the fallback
  classifier behind B6's AI scoring — ADR-0011)
- ☑ Report v4 render — §1, §1B, §2; no §3; print-first · C4
- ☑ Publish: version stamp, PDF via Playwright — the only export format; split from share link · C5

No Client Portal, no XLSX, for now — cut from scope (`EXECUTION.md` R12; formerly C6).

F1–F5, F7, A1–A5, B1–B5, C1–C5 done. B6 is mid-rework (ADR-0011: DeepSeek replaces Anthropic, adds severity
scoring) — code written, needs a live `DEEPSEEK_API_KEY` and an end-to-end submit test to close out. F6
(deploy pipeline) is the other work left on the board; nothing else is scoped (Client Portal/XLSX cut, R12).
Pending migrations `0002`–`0004` still need `db:migrate` run against a real database before any of this
is exercised end-to-end.
Completed docs work rolled to `docs/archive/2026-09-tasks.md`.
