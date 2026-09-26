# Changelog

Human-facing, reverse-chronological, grouped by date/phase. What shipped, not why (the why lives in ADRs
and DESIGN Part B). One dated line per shipped thing.

## Foundations — 2026

### 2026-09-26
- Fixed: publishing an audit failed on the deployed Vercel app with a
  `playwright-core`/`browsers.json` module error — full Playwright can't run in a
  serverless function. PDF generation now uses `playwright-core` + `@sparticuz/chromium`
  in production, with local dev unaffected (ADR-0010, BUG-027).

### 2026-09-22
- Removed "Observation" as a checklist item status — the auditor and admin review screens
  now offer Pass/Fail/N-A only; existing `observation` items were folded into `fail`
  (ADR-0007, UX-024).
- Removed the "copy audit link" share-URL row and button from a restaurant's active-audit
  rows, and reworded the New Audit panel ("Create audit link" → "Create audit", helper text
  no longer mentions a shareable URL) — auditors reach an assigned audit by logging into the
  portal directly, not via link (UX-023).
- Renamed `audits.dueStart`/`dueDate` to `periodStart`/`periodEnd` and removed the
  "OVERDUE" marker from the auditor portal — the audit date range is the recurring
  conduct window agreed with the auditor, not a submission deadline (ADR-0008, BUG-025).
- Evidence photo thumbnails in the published PDF are now clickable, opening the full
  photo — previously baked in as rasterized pixels only, with no way to reach the
  full-size image from the PDF (ADR-0009, UX-025, BUG-026).

### 2026-09-16
- Evidence photos now render as real thumbnails, clickable to full size, in both the
  Report screen's Section 2 compliance table and the exported PDF (previously "N photos"
  plain text with no way to view them) — un-stubs `showEvidence` (UX-017).

### 2026-09-13 (BUG-022)
- Fixed: a restaurant's Audits tab only ever showed active audits — submitted and
  published ones were invisible — and its Reports tab was a hardcoded placeholder that
  never showed real published reports. The Audits tab now groups Active / Submitted —
  awaiting review / History; the Reports tab lists actual published reports. Removed the
  sidebar's "Review Queue" nav item and the standalone `/admin/review` listing page —
  neither had a basis in the design's nav; reviewing a submitted audit is now reached
  from its restaurant's Submitted group. The Reports tab also now groups reports by the
  month each audit's own period covers (not when it was published) — a 1–31 Aug audit
  files under August even if reviewed in September. Added a live MTD consolidated
  report per outlet/month: recomputed on every view from whichever audits are published
  that month, no separate "generate" step. See `docs/BUGS.md` BUG-022, `docs/DESIGN.md`
  UX-020/UX-021, ADR-0006.

### 2026-09-13 (BUG-021)
- Fixed: Template Builder's Sales category had no way to mark a row as bar revenue
  (every row silently saved as `revGroup:'kitchen'`), so Bar Sale always read "Needs
  data" on the report. Sales rows now offer a Kitchen revenue / Bar revenue choice.
  Data-corrected "Tempalte 1" and its one in-flight audit directly at user request. See
  `docs/BUGS.md` BUG-021.

### 2026-09-12 (BUG-020)
- Fixed: Template Builder's Taxes category had no way to mark a row as a service charge
  (every row silently saved as `kind:'tax'`), so Service Charge always read "Needs data"
  on the report and was double-counted into Total Taxes instead. Taxes rows now offer a
  Statutory tax / Service charge choice; existing templates need their Service Charge
  row re-flagged and re-saved (done directly for "Tempalte 1" and its in-flight audit).
  See `docs/BUGS.md` BUG-020.

### 2026-09-12 (C5)
- Publish shipped: `publishAudit` stamps a version + date, freezes the audit (only
  `submitted` audits are ever correctable — publish flips it to `published` and every
  correction/finding-edit/generate action already refuses anything but `submitted`),
  and renders the same report the review screen shows to a real PDF via headless
  Chromium (Playwright), uploaded to Storage and recorded as a new `reports` row —
  earlier versions' rows are untouched. New `lib/report/reportViewModel.ts` shares one
  data-assembly path between the interactive report page and the PDF, and a new
  `ReportBody` component shares the actual markup, so the two literally cannot drift
  into showing different figures. `react-dom/server` is dynamically imported inside the
  server action only — Next refuses a static import of it anywhere in the server
  bundle graph. No "Share" action was built at all: R12 cut the Client Portal, so there
  is no public destination for a share link — R5's "publish separate from sharing" is
  satisfied by there being nothing to conflate it with. Dropped the unused `xlsxPath`
  column from `reports` (R12), migration `0004_youthful_jubilee`. Verified the full
  render → PDF pipeline end-to-end with a throwaway script against fake data (not
  committed) — produced a valid PDF.

### 2026-09-12 (C4)
- Report v4 render shipped at `/admin/review/[id]/report`, reached from the review
  screen's new "View report" link once a report is generated: §1 Key Financial & Unit
  Economic Metrics (KPI strip with per-pax sub-figures, the Kitchen/Bar revenue matrix,
  two SVG composition donuts computed from real figures — no hardcoded chart data), §1B
  Costing & Cost as % of Sales (`lib/report/costingBreakdown.ts`, 7 unit tests), and §2
  Department Checklists & Compliance Matrix (one card per department, severity ribbon,
  the 7-column table). No §3 findings register (R9). Print-first via the `[data-avoid]`/
  `[data-break]` rules already in `globals.css` from F2, plus a Print/PDF preview button
  (`window.print()` — the real Playwright-rendered, version-stamped PDF is C5). Added
  the report severity-chip and composition-chart colour tokens to `styles/tokens.css` /
  `DESIGN.md` Part A.

### 2026-09-12 (C3)
- Findings generation shipped: `lib/report/classify.ts` ports Super Admin Flow.dc.html's
  `CATEGORY_RULES`/`classify` verbatim (10 keyword rules over label+remark, Operational
  Control/Medium fallback; severity capped to High/Medium/Low per R7). A "Generate
  report" action on the review screen classifies every Fail/Observation into a finding
  (ref ID = the item's existing template code, category, severity, impact, corrective
  action, SLA, ownership, resolution status) — idempotent, so Regenerate never clobbers
  a reviewer's edit, and Pass/N-A items are never touched. Every generated field is
  editable via a new finding panel. Admin corrections (C1) now clear a stale finding
  when a status changes away from Fail/Observation, so "Pass carries no severity"
  holds even after a correction. New `audits.report_generated_at` column, migration
  `0003_same_princess_powerful`.

### 2026-09-12 (C2)
- Financial engine shipped as `lib/report/financialDraft.ts`: a pure, I/O-free
  `buildFinancialReportDraft(defs, values, operationalFiles)` built on top of F7's
  `computeMetrics`. Adds the one thing F7 doesn't give — the per-revenue-group (Kitchen/
  Bar) breakdown Report v4 §1's matrix needs, allocating taxes and service charge
  pro-rata on each group's share of sales, per the report's own formula note. Every
  figure is a `ReportFigure` (`{status:'ok', value}` or `{status:'needs-data'}`) so a
  missing input reaches the report as "needs data," never ₹0. 9 unit tests against the
  same Super Admin seed F7 was tested against. Added `vitest.config.ts` so lib/ tests
  can use the `@/` path alias like the rest of the app does.

### 2026-09-12 (C1)
- Review queue + review screen shipped: submitted audits list, the as-captured MTD Metrics/checklist
  view (statuses, remarks, photos opening full size via signed URLs), admin-side status/remark
  correction as an explicit action (UX-013), and per-audit operational file attach/replace with a real
  parse attempt (exceljs for Excel, a plain CSV read) recording whether each file was machine-readable
  (UX-012). New `audit_operational_files` table, migration `0002_cuddly_ben_grimm`.

### 2026-09-12 (bugfix — auditor dropdown)
- BUG-017 fixed: the "Create audit link" panel's Auditor dropdown came up empty (only the disabled
  "Select…" placeholder) for any restaurant with no auditor explicitly linked to it via
  `auditor_outlets`, even with active auditors in the org — reported via screenshot. The page was
  scoping the list to that one outlet's links; Super Admin Flow.dc.html shows the design lists every
  active auditor org-wide here, unfiltered by outlet. Replaced `listActiveAuditorsForOutlet` with
  `listActiveAuditors(orgId)`.

### 2026-09-12 (bugfix — mobile)
- BUG-016 fixed: the Metrics step (B2) overflowed horizontally on real mobile widths — found by
  actually driving the app (Playwright, `--viewport-size=375,700`) against a seeded auditor account
  after being asked whether mobile responsive design works, rather than by inspection. Root cause was a
  fixed three-column row layout (label + 134px value + a separate 94px sub column) carried over from
  the Super Admin file's desktop-only review screen — the two fixed columns alone (248px) barely left
  room for a label inside the auditor shell's ~340px mobile card. Fix: the sub figure (APC / cost %) now
  stacks under the value column instead of occupying its own column, and the value column narrowed to
  100px. Verified via screenshot at both 375px (mobile) and 1024px (laptop) — no overflow at either.
  `DESIGN.md`'s "Metric section (B2)" entry corrected to match.

### 2026-09-12 (B6)
- B6 done: AI remark polish on submit (ADR-0004) — **the whole Auditor package (B1–B6) is now built.**
  `submitAudit` flips the audit to `submitted`, sets `polishState:'polishing'`, then queues
  `lib/ai/polishRemarks.ts` via Next's `after()` — runs post-response, survives the `redirect()`, and
  is never awaited by the request that triggered it (no Graphile Worker/pg-boss yet; that's Stage B
  infra Stage A doesn't have). The job asks `claude-opus-5` (`@anthropic-ai/sdk`, new dependency) to
  rewrite every non-pass remark into report prose via `client.messages.parse` + a Zod output schema,
  under a 30s timeout; on success the polished text *replaces* the raw remark (no `rawRemark` kept) and
  `polishState` becomes `ready`. Any failure — bad response, timeout, API error — is caught, never
  reaches the auditor, never touches the submit, and just sets `polishState:'failed'` with the raw
  remarks left verbatim. No automatic retry on `failed` yet (would need the Stage B worker); flagged as
  a known gap rather than built as a poller. The pending list's "Recently Submitted" rows now show
  "Polishing remarks…" / "Remarks kept as typed — polish failed" — B6's one UI surface until
  `reviewQueue` exists (C1). `ARCHITECTURE.md` §2 and `CLAUDE.md`'s stack line updated: the Anthropic
  SDK lands with B6, not Stage B.
- BUG-015 fixed alongside it: the B5 submit gate (ported from the Super Admin mock's own
  `submitDisabled`) never actually checked that fail/observation/N-A points carried a remark — only
  that their status wasn't `pending`. `lib/checklist/isItemAnswered.ts` is now the one place both
  `ChecklistScreen` (client gate + jump-to-incomplete) and `submitAudit` (server re-validation) test
  completeness, so the two can't drift again. Found while wiring B6, which assumes every non-pass point
  already has something worth polishing.

### 2026-09-12 (B5)
- B5 done: the submit gate and post-submit immutability. `submitLabel`/`complete` in `ChecklistScreen`
  are ported from the Super Admin file's `submitDisabled` (~line 2127) — checks metrics *and*
  checklist, unlike the auditor `.dc.html`'s own checklist-only version. The Submit button is never
  HTML-`disabled`: per spec story A-10 it stays tappable while incomplete and instead jumps to the
  first unanswered checklist point (checklist gaps take priority, matching the label's own
  precedence) or the first empty metric field, expanding its department and focusing/scrolling to it.
  When complete, tapping opens a confirmation naming the outlet and the counts (story A-11 — no
  design file draws this dialog, so it's built from the spec) before `lib/actions/checklist.ts` →
  `submitAudit` re-validates completeness against the DB itself (never trusting the client), flips
  the audit to `submitted`, and redirects to a new read-only `report` screen
  (`/auditor/report/[id]`). Submit is one-way: `saveAuditDraft`/`uploadItemPhoto`/`removeItemPhoto`
  all now reject once an audit is `submitted`/`published` (`assertEditable`), and the checklist page
  itself redirects to the report screen if revisited post-submit — no unsubmit, anywhere.

### 2026-09-12 (B4)
- B4 done: explicit Save (`lib/actions/checklist.ts` → `saveAuditDraft`), the first thing to actually
  persist what B2/B3 held only in client state. One server action upserts every entered metric value
  and updates every checklist item's status/remark/naReason in a transaction; the first save while an
  audit is still `assigned` flips it to `in-progress` (R4). Photos are separate and immediate —
  `uploadItemPhoto`/`removeItemPhoto` upload straight to Supabase Storage (F5) one file at a time as
  they're attached, not batched into Save, per ADR-0002 ("Save writes only small structured data —
  photos are already uploaded"). `lib/media/compressImage.ts` decodes each image through
  `createImageBitmap({imageOrientation:'from-image'})` and re-encodes via canvas before upload — bakes
  in EXIF orientation and drops the EXIF block entirely, satisfying "compressed and EXIF-normalised
  client-side first"; non-image attachments pass through unchanged. `getAuditItemFiles` (new query)
  means a reopened audit shows every previously-attached photo — the mobile→laptop handoff ADR-0002
  promises. No unsaved-changes guard yet (Back never asks to discard anything, but there's also no
  `localStorage` cache warning) — that belt-and-braces layer is explicitly Phase 4, not B4.

### 2026-09-12 (bugfix)
- BUG-013 fixed: Template Builder now shows the "Part 1 · Metrics" header, and calculated rows
  (Total No Of Pax, Net Sales at Restaurant) render one dashed border instead of a doubled one.
- BUG-014 fixed: the Templates list now shows real metric/department/checkpoint counts — an
  unqualified column reference in `listTemplates`'s correlated subqueries was matching each child
  table's own `id` instead of the parent template's, always returning 0.

### 2026-09-12 (B3)
- B3 done: the Departmental Checklist tab in `ChecklistStep.tsx`, filling the stub `ChecklistScreen`
  left for it. Departments collapse/expand (spec story A-5 — the auditor `.dc.html` itself never
  wires this, only individual points do) with an "n of m answered" header, in template order; each
  point expands to one exclusive Pass/Fail/Observation/N-A choice at 44px; N-A is built from the
  product spec rather than copied, since the design file never wires it at all (R3) — its reason
  picker (`lib/checklist/naReasons.ts`, the fixed list of five) only appears once N-A is selected.
  Remark required on fail/observation/na, optional on pass (UX-009) — enforced at Submit (B5), not
  here. Photos are local `File` references only (name/size, removable) — they don't reach Supabase
  Storage until B4 wires the real upload. Both steps (`ChecklistScreen`'s metrics tab and this one)
  now stay mounted simultaneously, toggled via the `hidden` attribute rather than conditional
  rendering, so switching tabs never drops what the auditor already typed.

### 2026-09-12 (B2)
- B2 done: the Metrics step at `/auditor/checklist/[id]` (`ChecklistScreen.tsx`, the `tabMetrics`
  branch — `tabChecklist` is a stub pending B3). `lib/calc` gained `metricSections`, a verbatim port
  of Super Admin Flow.dc.html's grouped-panel builder (covers/sales/discount/tax/cost, each with a
  derived total row and an APC or cost-% sub-figure) — the same function that will drive the
  reviewer's as-captured view in C1, so there's one section-shaping implementation, not two. Inputs
  are sanitized on keystroke (digits + one decimal point only, no reject-after-the-fact dialog);
  calculated rows render via the existing `CalculatedField` primitive (dashed border, `#f6f8fa`,
  read-only) and recompute on every keystroke through `computeMetrics`. `lib/queries/audits.ts` gained
  `getAuditForAuditor` (org+auditor-scoped lookup, 404s rather than leaking another auditor's audit),
  `getAuditMetricDefs` (maps the DB's `metricKey`/`costGroup` naming onto `lib/calc`'s `MetricDef`
  shape) and `getAuditMetricValues`. Two new tokens (`--hint-2`, the metric-section note grey) and a
  new DESIGN.md Part A entry for the metric-section component. No persistence yet — typed values live
  in client state only until B4 adds explicit Save.

### 2026-09-12
- B1 done: the auditor shell under `app/auditor/` — sign-in (`/auditor/login`, same
  one-message empty-field validation as A1, scoped to the `auditor` role) and the pending
  list (`/auditor/pending`), gated by `app/auditor/(protected)/layout.tsx`. One responsive
  component tree per UX-001: `AuditorShell` switches padding/max-width/radius/min-height at a
  new 640px breakpoint via CSS media query, not a JS device flag (values copied verbatim from
  both `.dc.html` files' `isMobile` ternaries — now tokenized in `styles/tokens.css` and
  documented in DESIGN.md Part A). `lib/queries/audits.ts` gained `listAuditorAudits` (every
  audit assigned to the signed-in auditor, across outlets, with a per-audit items-done/total
  count) and `isOverdue`; pending audits sort by due date ascending with the `OverdueMarker`
  primitive, recently-submitted/published audits list below. The signed-in auditor resolves
  from the session via `getCurrentUser` — never a hardcoded name (R6).

### 2026-09-11
- A1–A5 done: the full Super Admin surface under `app/admin/` — login (`/admin/login`, one
  message "Enter your email and password" for empty fields, resolves via `verifyCredentials`);
  restaurants list/detail with Audits/Reports tabs and live assigned/in-review/published counts
  (`/admin/restaurants`); auditors CRUD (`/admin/auditors`) reusing `lib/auth/accounts.ts`
  end-to-end — duplicate email refused, password shown once on create/reset (no reveal-anytime,
  overriding the design file's persistent toggle per EXECUTION.md's precedence), outlet-access
  chips, suspend/reactivate, force sign-out, and a soft "remove" (suspend + force sign-out, since
  `audits.auditor_id` is a non-nullable FK with no cascade — a hard delete was never safe); the
  Template Builder (`/admin/templates`, `/new`, `/[id]`) with the 7 fixed metric categories,
  per-row unit picker, cost-row denominator picker, department/checklist-point editing, and live
  reference-code renumbering (`lib/templates/builderCode.ts`, unit-tested); and audit
  creation/assignment as the New Audit panel on the restaurant detail page, which clones the
  template's metrics and checklist points onto `audit_metric_defs`/`audit_items` in one
  transaction — the "template snapshot on assign" invariant — and generates the share token via
  `crypto.randomBytes` (not the design mock's `Math.random`, since this token is a bearer
  credential). Schema note: `metric_unit` gained `number` and `percent` (migration 0001) — the
  design's 4 metric types (Currency/Number/Count-Pax/Percentage) needed more than the 2 F3
  originally shipped. `app/page.tsx`'s F2 smoke test is gone, replaced by a redirect into
  `/admin`.
- F7 done: the shared calculation core in `lib/calc/` — `computeMetrics(defs, values)` is a
  verbatim port of Super Admin Flow.dc.html's derived cascade (covers, net/bar/kitchen sale,
  discounts, taxes vs. charges, gross sale, bar/kitchen/nc cost, F&B/net-F&B cost);
  `formatINR` (Indian digit grouping, `₹2,47,975`) is the one full-precision ₹ formatter,
  `formatINRShort` (`₹4.80L` / `₹1.13Cr`) the compact one for report KPIs; both render
  null/undefined as `—`, never `₹0`. `npm run test` (Vitest, new) — 14 tests reproduce the
  design file's own MTD_FULL seed figures exactly (grossSale ₹2,74,999, netFnbCost ₹80,894,
  etc.), plus null-propagation cases (all-empty group → null; a partially-filled group sums
  only what's present, not treating missing rows as 0). computeMetrics is the only place a
  total is derived — B2, C2 and C4 all call into this rather than recomputing.
- F5 done: Supabase Storage in `lib/storage/` — one private bucket (`audit-files`, `public: false`)
  for photos, PDFs and uploads; `uploadFile`/`createSignedUrl`/`deleteFile` wrap the Storage API
  behind the `service_role` (`sb_secret_…`) key, server-only; `ensureBucketExists` is idempotent
  and runnable via `npm run storage:setup`; `auditItemFilePath`/`reportFilePath` give every object
  an org-scoped path. Verified against the live Supabase project: upload, a signed URL that reads
  the exact bytes back, an unsigned request to the same object refused (400), and the signed URL
  itself dead after delete.
- F4 done: own-auth in `lib/auth/` — argon2 password hashing (`password.ts`, admin-generated
  passwords, shown once, never stored plaintext); signed-cookie sessions (`session.ts`,
  `cookies.ts`) backed by the `sessions` table, cookie value is a random session id plus an
  HMAC-SHA256 signature (`AUTH_SECRET`) so a tampered cookie is rejected before any DB lookup;
  `getCurrentUser`/`requireRole` (`rbac.ts`) resolve the signed-in user from the session, never a
  hardcoded name; `createAuditor`/`resetPassword`/`forceSignOut`/`setAuditorStatus`
  (`accounts.ts`) back A3 — duplicate email refused, reset and force-sign-out are separate
  actions, suspend ends all sessions immediately. Verified: argon2 hash/verify round-trip,
  cookie sign/verify round-trip, tamper and malformed-cookie rejection, all against real crypto
  (no DB needed for these). No screens yet — A1/B1 build the login UI against this.
- F3 done: Drizzle schema + migration 1 (`db/schema/`, `db/migrations/0000_migration_1.sql`) — 16
  tables, `org_id` on every one but `orgs` itself; `brands` → `outlets` hierarchy; `audits` references
  `outlet_id`/`auditor_id`/`template_id` by FK uuid, replacing the design's name strings (R6);
  `audit_metric_defs`/`audit_items` are the frozen per-audit copy taken at assign (template snapshot
  invariant), kept separate from the editable `template_metrics`/`template_checklist_points` they were
  cloned from; `audit_metric_values` holds only raw entered figures — calculated totals stay
  unstored, computed live by F7. `postgres`/`drizzle-orm`/`drizzle-kit` added; `db:generate`/
  `db:migrate`/`db:push`/`db:studio` npm scripts.
- F2 done: `styles/tokens.css` ports DESIGN.md Part A to CSS custom properties (App UI unprefixed,
  Report `--r-`/`--font-report-*`, kept as two separate type systems); real fonts wired in
  `app/layout.tsx` (Inter + Newsreader via `next/font`, Inter Tight + IBM Plex Mono for the report
  surface, Material Symbols Outlined via stylesheet link); the 12 core components built in
  `components/ui/` and `components/report/` (sticky header, role badge, primary/secondary button,
  text input, calculated field, grouped panel, department chip, list row, progress bar, overdue
  marker, report table + KPI strip, App UI icon + report MaterialIcon). Two tokens genuinely new to
  Part A added and documented: `--surface-calculated` (`#f6f8fa`) and `--hint` (`#8a93a0`), plus
  `--navy-chip` (`#eef2f9`, distinct from `--navy-025`). Verified with a screenshot of all 12
  primitives rendered against real tokens — zero console errors.
- F1 done: repo initialised, Next.js (App Router) + strict TypeScript scaffolded at the project root,
  ESLint clean (design sources and docs excluded from lint), `CLAUDE.md` Run/build/test filled in with
  real `dev`/`build`/`start`/`lint` commands. CI deferred to F6 — no remote yet.
- Execution plan added: `docs/EXECUTION.md` sequences Stage A as work packages F1–F7, A1–A5, B1–B6,
  C1–C6, each with its design file, screen keys, dependencies and "done when" clause; `docs/TASKS.md`
  rewritten to mirror it.
- Eleven design-vs-docs conflicts reconciled (R1–R11) — ADR-0003 (the Super Admin metric model is
  canonical), ADR-0004 (AI polishes remarks on submit, replacing the raw text), and DESIGN Part B
  UX-006…UX-010. ADR-0004 reverses the "remarks are quoted, not rewritten" invariant; `CLAUDE.md` and
  `ARCHITECTURE.md` updated to match.
- Documentation framework initialised: `CLAUDE.md`, `docs/` (PRODUCT, ROADMAP, ARCHITECTURE, DESIGN,
  TASKS, BUGS, decisions + ADR-0001/0002), `CHANGELOG.md`, `docs/archive/`.
