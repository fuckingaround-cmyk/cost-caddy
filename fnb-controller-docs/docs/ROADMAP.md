# Roadmap

Four phases, ~18 weeks, per the signed proposal and the Architecture & Execution Plan. Two stages:
**Stage A** = the audit portal (Phases 1–2); **Stage B** = the analytics/AI engine (Phase 3);
Phase 4 = QA + deploy. Foundations sit at the front of Phase 1, not a separate billed phase.

| Phase | Goal | Weeks | Status |
|---|---|---|---|
| Foundations | Repo, CI, strict TS, tokens, schema (`org_id` day 1), own-auth skeleton, storage, deploy | ~1 | 🟡 in progress |
| **1 — Auditor Portal** | Internal mobile-first capture core: admin setup, audit mgmt, auditor capture, server-save, submit | 7 | 🟡 in progress |
| 2 — AI reports | Review → AI-assisted report → versioned, published PDF | 2 | ⚪ not started |
| 3 — Analytics & insight engine | Excel intake + mapping; recipe costing, COGS variance, PO reconciliation, POS analysis; AI-narrated dashboards | 7 | ⚪ not started |
| 4 — QA, hardening & deploy | E2E vs "Done when…", LLM figure-tracing, photo/PDF fidelity, security review, deployment | 2 | ⚪ not started |

**Current focus (your ask):** the Super Admin flow, the responsive Auditor flow (mobile + laptop) with
server-persisted session/drafts, and report v4 — i.e. Stage A. Live working set in `docs/TASKS.md`.

**Build order lives in `docs/EXECUTION.md`** — Stage A as dependency-ordered work packages
(`F1–F7` foundations · `A1–A5` Super Admin · `B1–B6` Auditor · `C1–C5` review and report export), each
with its design file, screen keys and "done when" clause. This file stays the owner of phases and dates.

---

## Foundations (front of Phase 1)
Repo, CI, strict TS. Design tokens + primitives. Postgres schema + migrations — **`org_id` from day 1
with the brand → outlet hierarchy** (D13). Own-auth skeleton with RBAC roles (users, sessions, argon2).
Storage bucket + signed URLs. Deploy pipeline. `CLAUDE.md`.

## Phase 1 — Auditor Portal (7 wks) · maps proposal Phase 1
- **Admin setup:** brands + outlets CRUD; auditors CRUD (create/reset password **shown once**,
  suspend/reactivate, outlet access, remove-keeps-audits); templates library + Template Builder
  (calculated metric rows, departments with auto-generated reference codes, preview tabs).
- **Audit management:** create/assign/track audits and visits; shareable audit URL per assignment;
  **template snapshot on assign** (copy-on-assign).
- **Auditor capture (the core):** pending list; Metrics step (calculated rows read-only, live totals);
  Checklist step (Pass/Fail/N-A, required remarks, N/A reason, photos uploaded on capture);
  **corrective actions** (owner + action + status on findings, D14); explicit **Save** (server draft,
  cross-device); Submit blocked until complete with a **named count of what's missing**; Submit →
  immutable → review queue.

## Phase 2 — AI reports (2 wks) · maps proposal Phase 2
- **Review + report:** review screen (submission as captured; correct status/remark; open photos);
  generate report (findings from every Fail; financial sections from captured metrics);
  **AI-assisted narration grounded in captured values** (D12); edit findings; publish → versioned +
  frozen; report v4 render; **PDF (Playwright, version-stamped)** — the only export format;
  evidence photos render as real clickable/embedded thumbnails, both on the Report screen and in the
  PDF (D4, UX-017).
- **MTD consolidated report** (ADR-0006, ADR-0021): a live-recomputed rollup of a month's published audits
  per outlet, reachable from the restaurant's Reports tab — hardened with overlap-blocked audit periods,
  stop-at-first-gap inclusion, and an optional persisted/versioned "Lock & Publish MTD" PDF. Shipped.
- **No Client Portal for now.** The admin delivers the PDF directly; the white-labelled, token-accessed
  read-only Client Portal is designed (`Super Admin Flow.dc.html`) but out of current scope — see
  `EXECUTION.md` R12 and "Not yet designed."

## Phase 3 — Analytics & insight engine (7 wks) · maps proposal Phase 3
Stage B, the real engineering — isolated behind a contract (D11), async background worker (D11/D12).
- **Data intake + mapping:** upload client Excel (POS/purchase/sales); map each format → schema (one-time
  per-format config); "no data → needs data, never zero." **Gate:** collect real client samples before
  designing; decide TS-vs-Python ingestion here (D11).
- **Analytics modules:** recipe costing (menu engineering); standard-vs-actual COGS variance + leakage
  flags; PO & invoice reconciliation; POS analysis (voids/comps/settlements).
- **Insight + dashboards:** AI insight narration grounded in computed numbers; executive dashboards +
  RAG variance views, internal to the Auditor Portal.

## Phase 4 — QA, hardening & deploy (2 wks) · maps proposal Phase 4
E2E vs the user stories' "Done when…"; **LLM output review** (every AI figure traces to a computed
value); photo pipeline under real conditions; print/PDF fidelity; **unsaved-changes guard**; security
review (auth, sessions, signed URLs, financial-data-to-LLM boundary); `org_id`/brand/outlet boundary
check; perf; deployment + managed-service setup.

---

## Scope changes vs the original handover
Now **in** scope: corrective-action tracking (Phase 1) and basic audit scheduling/assignment; the
analytics/AI engine (Phase 3). Now **out** (for now): the white-labelled Client Portal and XLSX report
export — designed, but cut from Phase 2; PDF is the only deliverable and the admin delivers it directly
(`EXECUTION.md` R12). Still **out**: live integrations and any outlet-facing task app.
