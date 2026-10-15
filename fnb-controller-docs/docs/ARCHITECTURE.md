# Architecture

Living document — current system design and the technical decisions behind it. Edit **in place** when
the design changes; this describes current state, not history (the *why* and superseded options live in
`docs/decisions/` and in the consolidated **Architecture & Execution Plan**).

> **Sources & precedence.** The **Architecture & Execution Plan** is the consolidated post-scoping
> decision record and supersedes the `HANDOVER.md` where they differ. `DESIGN-SYSTEM.md` governs
> tokens; the Product Spec governs behaviour except where the Plan explicitly reverses it.

---

## 1. What this is, technically
A cloud SaaS platform for one F&B audit firm, delivered as the **Auditor Portal** — internal,
mobile-friendly capture-and-publish core, over a single RBAC-governed Postgres database. A
white-labelled, read-only **Client Portal** (per-client branding, token access) is designed but out of
current scope; see `EXECUTION.md` R12 and `ROADMAP.md`.

The firm serves **multiple restaurant brands and outlets under one account**: a brand → outlet
hierarchy sits under a single `org_id`, modelled from the first migration.

Two delivery stages:
- **Stage A (Phases 1–2)** — the audit portal: templates, assignment, field capture (metrics +
  checklist + photos + corrective actions), submit-once immutable, admin review, AI-assisted report,
  versioned PDF delivered directly by the admin. Conventional online web app + deterministic report
  engine.
- **Stage B (Phase 3)** — the financial analytics & insight engine: upload client Excel → map →
  recipe costing, COGS variance, PO/invoice reconciliation, POS analysis → dashboards with
  LLM-narrated (never LLM-computed) insight. Isolated behind a contract with an async worker.

---

## 2. Stack (current)

| Layer | Choice | Notes |
|---|---|---|
| App framework | **Next.js (App Router) + TypeScript** | One deployable. Server-persisted drafts, report render and PDF all live server-side; auditor screens are client components in one responsive tree (mobile + laptop). |
| PWA | Installable shell via **Serwist / `next-pwa`** (optional) | Home-screen icon + app feel **only**. No offline data layer. |
| Database | **PostgreSQL on Supabase** | Relational, versioned, financial data. Managed Postgres + bundled object storage. Standard Postgres → portable off Supabase later. |
| ORM / migrations | **Drizzle** | SQL-first, type-safe, explicit migrations; DB-generated types so code can't drift from schema. |
| Auth | **Own it** — `users` table, **argon2** hashes, **signed-cookie sessions** (Lucia or Auth.js Credentials) | Admin-issues-and-resets model doesn't fit self-service auth. **Not** Supabase Auth — our own code on the same Postgres. No outlet-facing auth for now — there is no outlet portal (`EXECUTION.md` R12). |
| Storage | **Supabase Storage** (S3-compatible, signed URLs) | Holds auditor photos, generated report PDFs, imported operational files. Cloudflare R2 is the fallback only if this ever gets high-traffic/file-heavy. |
| PDF export | **Playwright** (headless Chromium) against the print CSS | Report is already print-first (`data-avoid` / `data-break`). Version-stamped output. The only export format shipped — no XLSX for now (`EXECUTION.md` R12). |
| Hosting | **Cloudflare or Vercel** (free tier at this scale) | Next.js app here; Supabase holds Postgres + Storage. Portable for eventual client handover. |
| LLM layer | **OpenAI** (`gpt-4o-mini`, ADR-0017 — was DeepSeek, plain `fetch`, no SDK) | Introduced in **B6** (submit-time remark polish + severity scoring, ADR-0011 — was Anthropic under ADR-0004) — earlier than originally planned. Stage B's analytics narration provider is not yet decided; it is no longer assumed to reuse this client. No job queue yet: B6 uses Next's `after()` to run the job post-response rather than Stage B's Graphile Worker/pg-boss, since Stage A has no worker host. |
| Vision layer | **OpenAI** (`gpt-4o`, plain `fetch`, no SDK) | Introduced in **B7** (evidence-photo table extraction, ADR-0012) — a separate job from the text LLM layer, sees only evidence photos, never remark text or financial figures. Same `after()`-based, fire-and-forget pattern as B6; a failure never blocks upload or submit. Was Gemini until ADR-0014 (the original project had zero API quota provisioned). |

**Why TypeScript end-to-end (not a Python backend):** the frontend is TS regardless; a single language
gives shared types across the wire (no Pydantic-vs-TS drift on deep, versioned shapes), a near-mechanical
port of the design files' existing JS state machine and financial calc (vs re-verifying a Python
translation), and far more reliable AI-agent development (one runtime, types catch mistakes, no
frontend/backend seam). The analytics workload is arithmetic/joins/thresholds — not data science — and
the "AI" is LLM API calls (first-class in TS). See **ADR-0001**.

**Infra cost (locked):** ~$0 in dev (Supabase + Cloudflare/Vercel free tiers), ~$25/mo in production
(Supabase Pro covers managed Postgres *and* object storage in one fee). AWS/GCP/Firebase compared and
rejected: no lower floor, more billing complexity, and Firebase would mean abandoning Postgres.

### Stage B additions (Phase 3)
Excel ingestion **SheetJS**; mapping engine **typed TS** (+ optional **Arquero**); analytics **TS**;
LLM layer **not yet decided** (OpenAI is Stage A's choice for B6; Stage B may reuse it or pick another —
open per ADR-0011); background jobs **Graphile Worker / pg-boss** (Postgres-backed);
worker host a small always-on container (Fly/Railway) since long parse+LLM jobs exceed serverless
timeouts; dashboards **Recharts**; white-label theming via the existing CSS-variable token layer.

---

## 3. Session & draft model ("save the session")
The requirement — *the auditor is never signed out mid-audit, and nothing typed is lost* — is met
**without an offline engine**:

- **No offline; explicit Save, not autosave** (D1). Assumes connectivity while auditing — the one
  assumption to confirm with the client (§9.1 of the Plan).
- **Sessions** are signed-cookie based and persist across a phone restart or a dead zone. The admin can
  **end all sessions** for an auditor from the auditor row (revocation).
- **Drafts persist server-side** (D2). The server is the single source of truth, so **the same
  in-progress audit opens on any device** — mobile→laptop handoff is free. First edit/Save flips the
  audit `assigned → in-progress`.
- **Photos upload one-by-one on capture** (D3), compressed + EXIF-normalised client-side first, so Save
  only writes small structured data and stays fast; a photo taken on mobile is already on the laptop.
- **Belt-and-braces (Phase 4):** a `localStorage` cache of the active form + a navigate-away warning, so
  an accidental tab-close doesn't lose typed remarks. This reinstates the "nothing is lost" intent
  cheaply — it is *not* an offline sync layer. See **ADR-0002**.

---

## 4. Auth & roles
Three roles, RBAC-gated: `super_admin`, `auditor`, `outlet` (reader, **no login this build**).
- Admin **creates and resets** auditor passwords; the generated value is shown **once** at set/reset and
  stored only as an argon2 hash — **no reveal-anytime, no recoverable plaintext** (D7, reverses the
  design's Show/Hide row, with client sign-off). No self-service signup or email-invite flow this build.
- Outlet report access = an **unguessable token** on the report row; no user account (D5).

Built in `lib/auth/` (F4) — hand-rolled rather than Lucia (deprecated) or Auth.js: argon2
hash/verify, a signed-cookie session (random id + HMAC-SHA256 signature, so a tampered cookie is
rejected before any DB read) backed by the `sessions` table, `getCurrentUser`/`requireRole` for
RBAC, and the admin-side account actions (`createAuditor`, `resetPassword`, `forceSignOut`,
`setAuditorStatus`) that A3 calls into. No screens yet — A1/B1 build the login UI against this.

---

## 5. Data model
Inferred from the design seed data (the closest thing to a schema), reconciled with the Plan, and built
as Drizzle schema + migration 1 in `db/schema/` (F3). The shape below now matches the real tables; the
migration additionally normalises MetricDef/ChecklistPoint into their own tables (`template_metrics`,
`template_departments`, `template_checklist_points`), each frozen into `audit_metric_defs`/`audit_items`
at assign, and stores only raw entered figures in `audit_metric_values` — calculated totals are never
persisted (F7 derives them at read time).

```
Org            { id }                              // single firm; org_id on every table from migration 1
Brand          { id, org_id, name }               // brand → outlet hierarchy (D13)
Outlet/Restaurant { id, brand_id, name, status: 'active'|'suspended' }
User           { id, org_id, role, name, email, phone, pwd_hash, status }   // argon2; shown-once
Session        { id, user_id, ... }               // signed-cookie; admin can end all
Template       { id, name, archivedAt?, metrics: MetricDef[], items: ChecklistPoint[] }  // archivedAt: hidden, kept for audits that used it (ADR-0016)
  MetricDef      { id, label, section: 'covers'|'sales'|'discount'|'tax'|'cost',
                   revGroup?: 'bar'|'kitchen',        // sales — which revenue bucket
                   kind?:     'tax'|'charge',         // tax — 'charge' excluded from Total Taxes
                   group?:    'bar'|'kitchen'|'nc',   // cost — which cost bucket
                   den?:      'net'|'bar'|'kitchen'|<metricId>,  // cost — the % denominator
                   unit?:     'currency'|'count' }
  Department     { cat, code, items[] }             // code e.g. 'KIT','OTH'; reference codes auto-renumber
  ChecklistPoint { label, guidance, freeform?, cat, catCode, code }   // code = 'KIT-03'
Audit          { id, token, outletId, auditorId, templateId, periodStart?, periodEnd,
                 // periodStart/periodEnd: the recurring audit-conduct window, not a due
                 // date — ADR-0008. No overdue/deadline concept exists on an audit.
                 status: 'assigned'|'in-progress'|'submitted'|'published',
                 metricDefs: MetricDef[],                 // FROZEN copy taken at creation
                 submittedAt?, publishedAt?, version?, metrics{}, items[],
                 aiState?: 'polishing'|'ready'|'failed' }             // ADR-0011 (was polishState, ADR-0004)
AuditItem      { id, code, cat, catCode, label, guidance, freeform,
                 status: 'pending'|'pass'|'fail'|'na',
                 remark, naReason?, photos:n, files[],
                 severity?: 'High'|'Medium'|'Low',        // fail only; AI-assigned at submit (ADR-0011),
                                                           // reviewer-editable, classify.ts is the fallback
                 impact?, correctiveAction?, sla?, ownership?,
                 resolutionStatus?: 'Pending'|'Resolved', // corrective-action tracking (D14)
                 refId?, category?,                       // set by the AI job or report generation
                 aiAssessment?: object }                  // raw AI output per item (ADR-0011, forward-compat)
OperationalFile { id, auditId, type, period, name, format, storagePath,
                  parseStatus: 'parsed'|'unreadable', coverageSummary? }  // attached in review (C1)
Report         { auditId, version, findings[], attachments[], token, publishedAt }
```

**Deletes never cascade.** Every FK is `ON DELETE no action`, so removing an audit deletes its children
explicitly, in FK order, inside one transaction and sweeps its Storage files after commit; a restaurant can
only be deleted when it has no audits; a template is hard-deleted when unused and archived when any audit
references it (ADR-0016, `lib/actions/{audits,restaurants,templates}.ts`).

**Operational files are per-audit, not a global inbox.** The design's `sReports` screen draws a single
firm-wide upload list keyed loosely to restaurant/period strings; C1 instead attaches each file to the
specific audit under review, since C2's financial engine needs `(auditSnapshot, operationalImports)` for
*that* audit, not a firm-wide pool. See `docs/DESIGN.md` Part B **UX-012**.
**The Super Admin design file is the canonical source for this shape** — the auditor files carry an older,
incompatible metric model (`DEFAULT_METRIC_CATS`) and a different checklist seed; neither is built.
See **ADR-0003** and `EXECUTION.md` R1/R2. `deferred` is a Client Portal screen, not an audit status.
Severity is High/Medium/Low only — the seed's `Critical` is dropped (UX-006).

---

## 6. Screen state machine
**The `.dc.html` design files define the UI, layout and per-screen behaviour — build each screen from its
file (exact inline values, state machine and calculations read out of its logic class), not from
description.** Map in `CLAUDE.md` → "Design source files". Each design file switches on a stable **screen
key**; reuse these as route names.
- **Super Admin:** `login`, `restaurants`, `restaurantDetail` (tabs Audits/Reports), `auditors`,
  `templates`, `builder` (csv/paste import), `assign`, `reviewQueue`, `review`
  (`reportNotReady`→`reportReady`→generate→edit→publish), `reports` (`detail`, `reportDoc`), `deferred`.
  The design file also references a `dashboard` key that has **no markup** — a dead key; route it to
  `restaurantDetail`.
- **Auditor (mobile + laptop, one tree):** `login`, `pending`, `checklist` (tabs `metrics`/`checklist`
  on mobile; stacked steps 1 & 2 on laptop), `report` (post-submit read-only).

**Responsive:** mobile is the primary target; laptop is the widened variant (tabs + bottom submit →
stacked steps + right-aligned progress). Layout differs; behaviour and data are identical.

---

## 7. Report pipeline
**Submit → AI (OpenAI) polishes every Fail remark into report prose, replacing the raw text (Pass/N-A are never sent, ADR-0019), and
scores severity/category/impact/corrective-action/SLA/ownership for every Fail item** against a defined
rubric (async job with an `aiState`; a failure never blocks or reverses the submit — ADR-0011, was
ADR-0004) → Review (submission shown **exactly as captured**, never edited in place; findings usually
already populated, reviewer can still override any field) → attach operational reports → **Generate
report** (financial sections from captured metrics; fills severity/findings only for whatever Fail items
the AI job didn't reach, via the deterministic fallback classifier; the LLM narrates financial figures only
and **never computes numbers**, D12 — severity classification is a stated exception, ADR-0011) → edit
findings → **Publish** (versioned + frozen; a separate action from
copying the share link) → render report v4 → **PDF via Playwright, version-stamped**
(`v1 · 21 Jul 2026`) — the only export format — delivered directly by the admin (no Client Portal for
now; `EXECUTION.md` R12).

- **Financial engine** is `lib/report/financialDraft.ts`'s `buildFinancialReportDraft` — a pure, tested
  `(defs, values, operationalFiles) → reportDraft` module built on top of F7's `computeMetrics`, never
  reimplementing its cascade. Formulas (report's own note): *sales − discount = net sales; + taxes +
  service charge = gross; taxes/service-charge allocated pro-rata on net sales; APC on covers.* Every
  figure is a `ReportFigure` (`ok`/`needs-data`) so **"no data → 'needs data', never zero"** is a type,
  not a convention to remember. The revenue matrix has two groups — Kitchen and Bar — matching F7's own
  `revGroup: 'bar'|'kitchen'` model, not the report mock's three-way Food/Bar/Liquor split (`DESIGN.md`
  Part B **UX-014**). Operational-file import sits behind a per-client adapter interface (formats vary,
  not yet designed) — C2 only carries each attached file's type/period/parse-status through untouched.
- **Findings generation** is primarily `lib/ai/scoreAuditRemarks.ts` now (ADR-0011) — OpenAI assigns
  category/severity/impact/correctiveAction/sla/ownership for every Fail item at submit, against
  `lib/ai/severityRubric.ts`'s scoring matrix. `lib/report/classify.ts`'s `classifyFinding` — the mock's
  `CATEGORY_RULES`/`classify` ported verbatim (10 keyword rules over label+remark, Operational
  Control/Medium fallback) — is kept as the **fallback**: "Generate report" (`generateReport`) still
  classifies every Fail with no severity yet — idempotent, so Regenerate never overwrites an AI-set or
  reviewer-edited finding — and stamps `audits.reportGeneratedAt`. Normally there is nothing left for it to
  classify.
  `refId` is always the item's own template code (e.g. `KIT-03`), never a generated `EQ-01` sequence
  (`DESIGN.md` Part B **UX-015**) — every real audit item already has one from the template snapshot
  (A5), so there's nothing for a fallback scheme to cover. Pass/N-A items are never classified; a status
  correction (C1) that moves an item away from Fail clears any existing finding so "Pass
  carries no severity" keeps holding after an edit.
- **Evidence-photo read + findings** (`lib/ai/analyseRegisterEvidence.ts`, ADR-0018, supersedes the
  two-step flow of ADR-0012/0015, **B7/C6**) is one OpenAI vision call per POS report: every photo of the
  register plus the auditor's status/remark in; each photo's verbatim table (fixed recipe columns,
  `lib/ai/evidenceRecipes.ts`) and the Findings and Observations + Corrective Measures out. Nothing is
  read at upload or in the auditor's request — `submitAudit` queues it with `after()` (alongside
  `scoreAuditRemarks`, in parallel), so the auditor is never blocked. Tables are stored per photo
  (`audit_item_files.extracted_table`), findings per report (`audit_evidence_findings`, keyed
  `(audit_id, evidence_type, report_label)` via `posFindingsKey`). Everything is reviewer-editable and
  shown immediately (same trust model as AI-assigned severity). "Generate report" and the per-photo
  retry re-run it for anything missing, keeping findings an admin already wrote; "Regenerate" on the
  findings is text-only from the stored (possibly corrected) table (`generateRegisterFindings.ts`).
- **POS reports** (ADR-0015, **C6**) are a third template section (`template_pos_reports`) that snapshots
  onto the audit as `audit_items` with `section = 'pos_report'` and a `report_type` (the recipe of every photo
  attached, so no picker). The prompt forbids computing an exact numeric delta against the plain-text policy
  context (`lib/ai/evidenceFindingsPolicyContext.ts`), keeping D12 intact. POS items are excluded from the
  compliance matrix, scoring, `scoreAuditRemarks` and `classifyFinding`. A report is a preset type or an
  admin-named custom one (`report_type = 'other'` + `template_pos_reports.label`); findings are keyed
  `(audit_id, evidence_type, report_label)` (`posFindingsKey` — `''` for presets, the name for custom).
- **Report v4** (`app/admin/(protected)/review/[id]/report/`) has its own type system (Inter Tight +
  IBM Plex Mono `tabular-nums`, Material Symbols), is print-first (`[data-avoid]`/`[data-break]` in
  `globals.css`), and renders §1 (KPI strip + revenue matrix + two composition donuts), §1B (costing via
  `lib/report/costingBreakdown.ts`), §2 (per-department table of **failed** checkpoints only — Checkpoint · Observation · Risk Severity · Operational Impact · Corrective Action · SLA · Evidence; observation is the AI-polished text, never raw — ADR-0019), and §3
  (**POS Reports**, `PosReportSection.tsx` — per POS report: heading → Findings and
  Observations → OpenAI-extracted table(s) → Corrective Measures, ADR-0012/ADR-0014/ADR-0015; not R9's Findings
  Register, which is still cut). `showCharts`/`showSummaryRibbon` are
  real flags that both default true (no story asks to hide either yet). The Evidence column carries real photo thumbnails, clickable both on the web and in
  the PDF — the PDF thumbnail is wrapped in a real `<a href>` backed by a long-lived (10-year)
  signed URL, since a published PDF is opened long after the storage layer's normal 1-hour default
  would expire (ADR-0009) — `DESIGN.md` Part B **UX-016**/**UX-017**/**UX-025**. Reached from the
  review screen's "View report" once `reportGeneratedAt` is set. Currency is Indian short-scale via one
  centralised formatter.
- **Publish** (`lib/actions/publish.ts`) is the only way `reportGeneratedAt` data becomes a durable
  artifact. `lib/report/reportViewModel.ts` assembles the same `{ audit, draft, costing, departments,
  slices }` shape for both the interactive report page and the PDF, and both render the same
  `ReportBody` component — so the on-screen report and the published PDF cannot drift into showing
  different figures for one audit. Publishing bumps `audits.version`, sets `publishedAt`, flips
  `status → 'published'` (every correction/finding-edit/attach/generate action already refuses anything
  but `status === 'submitted'`, so publish *is* the freeze), and inserts a new `reports` row holding that
  version's PDF path — earlier rows are never touched, so versioning is the sole history. `react-dom/server`
  is imported dynamically inside the publish action only, since Next refuses a static import of it
  anywhere in the server bundle graph (it owns RSC rendering itself); this runs entirely outside any
  request-render path, so it doesn't touch Next's own rendering. No "Share" action exists — R12 cut the
  Client Portal, so there's no public destination a share link could point to; R5's "publish separate
  from sharing" holds vacuously rather than by building a link to nowhere (`DESIGN.md` Part B **UX-017**).

---

## 8. Architecture-shaping invariants
Correctness load-bearers — encode in schema, guard in review:
- **Template snapshot on assign.** An audit copies the template at creation; later template edits never
  touch a running or submitted audit.
- **Submit is one-way.** `assigned → in-progress → submitted`; Submit is confirmed once and makes the
  audit immutable for the auditor. No unsubmit — corrections are admin-side.
- **Publish freezes; correction versions.** A correction is `v2` with a revision note; earlier versions
  remain. With no audit trail (D9), versioning is the **sole** history. (Freezing guards against edits — the
  admin can still delete a whole audit, ADR-0016.)
- **Calculated is never typed.** Any derivable figure is read-only everywhere; totals recompute live.
- **N/A is neither fail nor blank.** Requires a reason, excluded from compliance %, listed separately.
  Compliance is `pass / (pass + fail)` — N/A is excluded from the denominator (UX-007, revised —
  the checklist item status is now Pass/Fail/N-A only; see UX-018).
- **Remarks are AI-polished on submit, and the polish is the record.** The rewrite happens once, at
  submit, and replaces the raw text; no verbatim copy is kept, so nothing can be reverted. The model
  rewrites prose only and never touches a number. The raw wording is never shown in the report; only Fail remarks are sent (ADR-0019). Severity/impact/corrective-action are still set by the
  **reviewer**, never in the field. **ADR-0004** / UX-010 — this reverses the earlier
  "remarks are quoted, not rewritten" rule and records the trade-off.
- **Evidence-table extraction is verbatim OCR, not narration or computation.** OpenAI transcribes
  exactly what's visible in an evidence photo under a fixed recipe's columns — it never sums, rounds,
  recomputes a percentage, or invents an illegible cell. D12 ("LLM never computes") is narrowed a
  second time to state this plainly, the same way ADR-0011 narrowed it for severity. **ADR-0012** /
  UX-026.

---

## 9. Not built (by decision)
Offline engine · autosave · **live POS/accounting/inventory sync** (all financial data enters by upload)
· reminders / overdue tracking / push notifications · outlet logins & an outlet-facing task app
(corrective actions are tracked *within* the system, shown read-only) · in-app chat · field-set severity
· audit trail · reveal-anytime passwords · multi-firm signup / isolation UI.

## 10. Open technical questions
Carried from the Plan §9 — resolve before the dependent work: (1) connectivity while auditing (validates
the no-offline bet); (2) real client Excel samples before Phase 3 (drive the mapping engine + the
TS-vs-Python ingestion call, D11); (3) which Phase 3 modules are truly in the 7 weeks; (4) **data-to-LLM
boundary sign-off + residency (D12) — now broader than financial data, since ADR-0004/ADR-0011 send every
Fail auditor remark (and its severity assessment) to OpenAI at submit, and
ADR-0012/ADR-0014 sends evidence-photo bytes to OpenAI for any photo the auditor picks a recipe for**; (5) whether
`org_id` grows into real multi-tenancy;
(6) data residency (India / DPDP Act); (7) outlet report-token expiry policy.

Build order and per-package acceptance live in `docs/EXECUTION.md`, which also records the eleven
design-vs-docs reconciliations (R1–R11) settled during planning.
