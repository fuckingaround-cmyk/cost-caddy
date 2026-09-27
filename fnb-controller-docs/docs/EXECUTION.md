# Execution

The build sequence. `ROADMAP.md` owns *phases and dates*; `TASKS.md` owns *what is live right now*; this
file owns **order and acceptance** — which work package unblocks which, what each delivers, which design
file specifies it, and the literal clause that closes it.

**Scope: the design files only.** A package exists here only because a `.dc.html` shows it. Anything the
other docs describe but no design file draws is listed under "Not yet designed" at the end and is out of
the build until a design exists. The one deliberate exception is **B6**, which is a product decision
(ADR-0004) with no design reference; it says so in its own entry.

**Rule of work: never start a package without opening its design file.** The markup is inline-styled, so
the values are exact — copy them. The logic class at the bottom holds the seed data, the state machine and
the calculations; read those out rather than re-deriving them. See `CLAUDE.md` → "Design source files".

Package ids are stable and are the tag used in `TASKS.md`: `F*` foundations · `A*` Super Admin ·
`B*` Auditor · `C*` review and report export.

---

## Reconciliations

Reading the design files' logic classes against the docs surfaced conflicts. These are settled; they are
recorded here so they are not rediscovered mid-build.

| # | Conflict | Settled as |
|---|---|---|
| R1 | **Two incompatible metric models.** The auditor files use `DEFAULT_METRIC_CATS` (category objects, `rows:[[id,label,unit]]`, one naive `total: Σrows`); `Super Admin Flow.dc.html` uses flat `DEFAULT_METRICS` with `section`/`revGroup`/`kind`/`group`/`den` and the full derived cascade | **Super Admin is canonical.** The auditor file's metric code is stale — do not port it. See **ADR-0003** |
| R2 | **Two checklist seeds.** Auditor files seed a flat 8+6 set; Super Admin seeds the 6-department, 38-point `DEPTS` (SEC/KIT/STR/OPS/POS/OTH) | Super Admin is canonical |
| R3 | **`na` is not wired in the auditor UI** — only `onPass`/`onFail`/`onObservation` exist there; `NA_REASONS` and `setNaReason` live only in the Super Admin file | Build the N/A path **from the spec**, not by copying. The one place the design-only rule cannot apply |
| R4 | **`in-progress` is never entered** by any transition in the mock — it exists only in seed data | Implement as "first save of any metric or item" (B4) |
| R5 | **`doPublish()` and `shareLink()` mutate identically** — publishing and sharing are conflated | Separate them. Only publish stamps a version (C5) |
| R6 | **Identity by name string.** Audits reference restaurant and auditor by name; auditor identity is hardcoded `AUDITOR_NAME = 'Riya Sharma'`. The `dashboard` screen key has no markup | Normalise to FK ids (F3). `dashboard` is a dead key — route to `restaurantDetail` |
| R7 | **Severity scale.** Seed data carries `Critical`; DESIGN Part A, the report's severity select and its ribbon know only High/Medium/Low | **High / Medium / Low.** `Critical` is dropped. See DESIGN Part B **UX-006** |
| R8 | **Compliance denominator.** The design's `scoreLabel` counts only `pass+fail`; the invariant excludes N/A only | `pass / (pass + fail)` — **N/A excluded only**. See **UX-007** (originally `pass + fail + observation`; `observation` removed, see **UX-024**) |
| R9 | **Report §3 Findings Register.** The spec (RP-1) defines one; `Audit report v4.dc.html` has no such section — §2's matrix already carries Ref ID, severity, impact and corrective action | **Not built.** Design wins on layout. See **UX-008** |
| R10 | **Remark requirement.** `HANDOVER.md` says every point; the spec allows a bare Pass | Required on **fail / N-A** only; N/A still needs its reason. See **UX-009** (originally also on `observation`; that status removed, see **UX-024**) |
| R11 | **AI remark polish.** The mock polishes admin-side inside `generateReport()`, keeping `rawRemark` so the reviewer can revert | Polish runs **on submit** and the polished text **replaces** the raw remark. Reverses the old "remarks are quoted, not rewritten" invariant. See **ADR-0004** / **UX-010** |
| R12 | **Report export & delivery.** `Audit report v4.dc.html` draws an "Export Data (XLSX)" button alongside Print/PDF, and `Super Admin Flow.dc.html` draws a restaurant/outlet reader tree for a token-based Client Portal | **PDF only, no Client Portal, for now.** The published deliverable is a version-stamped PDF via Playwright; XLSX export and the outlet-facing portal are cut from current scope. Design wins on the report's own layout, but not on which export formats or delivery surfaces ship. See **C5** |

---

## Foundations — F1…F7

Infrastructure, so the design-only scope rule doesn't apply here. Kept lean.

### F1 — Repo and toolchain
```
Delivers:  git init; Next.js (App Router) + strict TypeScript; lint; CI
Design:    n/a — infrastructure
Depends:   —
Traces to: ROADMAP "Foundations"; ADR-0001
Done when: a clean checkout builds, lints and runs; and the Run/build/test block in
           CLAUDE.md holds the real commands instead of the "not yet scaffolded" note
```

### F2 — Token layer and primitives
```
Delivers:  DESIGN.md Part A as CSS variables, plus the 12 core components (sticky header,
           role badge, primary button, text input, calculated field, grouped panel,
           department chip, list row, progress bar, overdue marker, report table/KPI
           strip, icons)
Design:    DESIGN-SYSTEM.md + every .dc.html (values are exact — copy, never invent)
Depends:   F1
Traces to: DESIGN.md Part A; convention "never inline a hex/size/spacing that isn't a token"
Done when: App UI and Report exist as two separate token surfaces that share no type
           scale, and no component file contains a raw hex, px size or spacing value
```

### F3 — Schema and migration 1
```
Delivers:  Drizzle schema + first migration. org_id on every table; brand → outlet
           hierarchy; FK ids replacing the design's restaurant/auditor name strings (R6)
Design:    Super Admin Flow.dc.html — the seed data is the closest thing to a schema
Depends:   F1
Traces to: ARCHITECTURE §5; invariant "org_id on every table from migration 1"
Done when: every table carries org_id from the first migration, every audit references
           its outlet and auditor by id, and no name string is a foreign key
```

### F4 — Own-auth and RBAC
```
Delivers:  users, sessions; argon2 hashes; signed-cookie sessions; RBAC for
           super_admin / auditor / outlet; admin "end all sessions"
Design:    Super Admin Flow.dc.html (login gate, slEmail/slPwd/slError/slRemember)
Depends:   F3
Traces to: ARCHITECTURE §4; ADR-0001
Done when: a password is set by the admin, shown once, and stored only as an argon2 hash;
           sessions survive a restart; and ending all sessions signs that auditor out
           everywhere on their next request
```

### F5 — Storage
```
Delivers:  Supabase Storage bucket + signed URLs for photos, PDFs and uploads
Design:    n/a — infrastructure
Depends:   F3
Traces to: ARCHITECTURE §2
Done when: a photo uploads and is readable only through a signed URL that expires
```

### F6 — Deploy pipeline
```
Delivers:  Cloudflare/Vercel deploy; environment config; Supabase connection
Design:    n/a — infrastructure
Depends:   F1
Traces to: ROADMAP "Foundations"
Done when: main deploys automatically and the deployed app reaches Postgres and Storage
```

### F7 — The shared calculation core
```
Delivers:  a pure, tested computeMetrics(defs, values) module and the single ₹ formatter
Design:    Super Admin Flow.dc.html → computeMetrics / metricSections (~lines 1908–1986)
Depends:   F3
Traces to: ARCHITECTURE §7; invariant "calculated is never typed"; R1
Done when: it reproduces the design file's seed figures exactly, nulls propagate (an
           all-empty group renders "—", never 0), and no other module computes a total
```

Derived cascade, ported verbatim:

```
covers         = Σ section==='covers'
netSale        = Σ section==='sales'
barSale        = Σ sales where revGroup==='bar'
kitchenSale    = Σ sales where revGroup!=='bar'
totalDiscounts = Σ section==='discount'
totalTaxes     = Σ tax where kind!=='charge'
totalCharges   = Σ tax where kind==='charge'
grossSale      = netSale + totalCharges + totalTaxes − totalDiscounts
barCost        = Σ cost where group==='bar'
kitchenCost    = Σ cost where group==='kitchen'
ncCost         = Σ cost where group==='nc'
fnbCost        = barCost + kitchenCost
netFnbCost     = fnbCost − ncCost
APC            = value / covers            (sub-line on sales rows, Net Sales, Gross Sale)
cost %         = value / den × 100         (den: 'net'|'bar'|'kitchen'|<metricId>)
```

**F7 is the load-bearing sequencing decision.** The same engine drives the auditor's live totals (B2) and
the report's financial sections (C2). Extracting it once prevents two divergent implementations of the
same arithmetic — which is exactly how R1 came about.

---

## Super Admin — A1…A5

Design file: `Super Admin Flow.dc.html` throughout.

### A1 — Login
```
Screens:   (auth gate — superAuthed, not a superScreen)
Depends:   F2, F4
Done when: valid credentials land on `restaurants`, and an empty field is refused with the
           one message "Enter your email and password" — one validation message at a time
```

### A2 — Restaurants
```
Screens:   restaurants, restaurantDetail (tabs rdTab: 'audits' | 'reports')
Depends:   A1
Story:     S-1
Done when: a name and city added inline appear in the list immediately and an empty name
           is refused; each row shows its active / in-review / published counts; the
           Audits tab groups active, submitted and history; the Reports tab selects a
           month over REPORT_MONTHS
```

### A3 — Auditors
```
Screens:   auditors
Depends:   A1
Story:     S-2, S-3, S-4
Done when: name, email, phone, outlets and a password create an account and a duplicate
           email is refused with one clear message; the generated password is shown ONCE
           at set/reset and stored only as an argon2 hash — there is no reveal-anytime;
           outlet access, suspend, reactivate, force sign-out and remove all work from the
           expanded row; and removing an auditor leaves their submitted audits intact
```

> **Deliberate divergence.** The design draws a masked password row with Show and Copy (story S-3).
> `ARCHITECTURE.md` §4 reverses this to shown-once with client sign-off. Behaviour wins over the drawing
> here; build the row without the reveal control.

### A4 — Templates and the Template Builder
```
Screens:   templates, builder
Depends:   A3, F7
Story:     S-5, S-6, S-8
Done when: a category can be added, metrics added to it, each metric's type set, a row
           marked calculated, rows reordered and deleted — all in place; departments can
           be added, renamed and deleted with points carrying question + guidance; and
           reference codes renumber themselves on every change (builderCatCode → 'KIT-03')
```

Metric types in the builder: Currency (₹/$), Number, Count/Pax, Percentage (%), Calculated/Auto-sum.
Departments seed as the canonical six (R2): SEC Security · KIT Kitchen · STR Purchase & Store ·
OPS Operations · POS POS Controls · OTH Other Observations — each ending in a `freeform` point.

### A5 — Audit creation and assignment
```
Screens:   assign, plus the New-audit panel on restaurantDetail
Depends:   A4
Story:     S-7
Done when: picking a template and an auditor creates the audit and it appears directly in that
           auditor's list (no share link — access is via auditor login, UX-023); the audit holds
           its OWN COPY of the template (metricDefs cloned, items materialised) so later template
           edits never touch it
```

---

## Auditor — B1…B6

Design files: `Auditor Flow - Mobile.dc.html` (primary) and `- Laptop.dc.html`. The two are **byte-identical
apart from `device:'mobile'` vs `'laptop'`** — confirming UX-001: one component tree, layout-only
difference, identical behaviour and data.

### B1 — Shell, login, pending list
```
Screens:   login, pending
Depends:   A5
Story:     A-1, A-2
Done when: each card shows restaurant, template and progress ("4 of 12"), sorted by audit
           period ascending; recently submitted sits below; there is a clear empty state; a
           wrong password keeps the email and shows one message; and the signed-in auditor
           is resolved from the session, never a hardcoded name (R6). No overdue/past-due
           marker — the date range is the audit-conduct period, not a deadline (ADR-0008)
```

### B2 — Metrics step
```
Screens:   checklist → auditorTab 'metrics' (mobile) / step 1 (laptop)
Depends:   B1, F7
Story:     A-3, A-4
Done when: a numeric keypad appears and letters are refused without a dialog; each field
           shows its unit; and calculated rows are read-only, dashed-bordered on #f6f8fa,
           badged, and recompute live as the inputs they depend on are typed
```

### B3 — Checklist step
```
Screens:   checklist → auditorTab 'checklist' (mobile) / step 2 (laptop)
Depends:   B1
Story:     A-5, A-6, A-7, A-8
Done when: departments collapse and expand with "n of m answered" per header in template
           order; a row expands in place with Pass/Fail/N-A as one exclusive choice at
           44px, and the collapsed row then shows the status and the start of the remark;
           a remark of any length plus several removable photos can be attached to a
           point; fail and N/A require a remark while a bare Pass is allowed; N/A requires
           a reason from the fixed five; and N/A points are excluded from the compliance
           percentage and listed separately (originally a four-way Pass/Fail/Observation/
           N-A choice — `observation` was removed, see `DESIGN.md` Part B **UX-024**)
```

N/A reasons (fixed list): Not applicable at this outlet · Record / register not maintained · Document not
available during audit · Area or asset not accessible · Responsible staff unavailable.

Compliance (R8): `pass / (pass + fail)` — N/A excluded from the denominator only (UX-024).

**Build N/A from the spec (R3)** — the auditor design file does not implement it.

### B4 — Save, drafts, photos
```
Screens:   —
Depends:   B2, B3, F5
Story:     A-9
Done when: an explicit Save writes a server-side draft and the same in-progress audit
           reopens on any device; the first save of any metric or item flips the audit
           assigned → in-progress (R4); photos upload one at a time on capture, compressed
           and EXIF-normalised client-side first; and Back never asks to discard anything
```

There is no autosave and no offline layer (ADR-0002). Save writes only small structured data — the photos
are already uploaded — so it stays fast.

### B5 — Submit gate and immutability
```
Screens:   report (post-submit, read-only)
Depends:   B4
Story:     A-10, A-11
Done when: Submit is disabled until every checklist item is answered AND every metricDef
           has a numeric value, with the label naming what is missing ("Complete 3 more
           checklist items" / "Enter the remaining 2 MTD figures"); tapping it jumps to the
           first point needing attention; confirmation names the outlet and the counts; and
           the audit is then read-only for the auditor permanently, with no unsubmit
```

Use the Super Admin file's `submitDisabled` logic — it checks metrics *and* checklist. The auditor file's
version checks only the checklist and is incomplete.

### B6 — AI remark polish + severity scoring on submit
```
Screens:   — (a status indicator on pending and on review)
Design:    NONE — this package has no design reference. It is a product decision recorded
           in ADR-0004 (prose polish) and ADR-0011 (severity scoring, provider change to
           DeepSeek); the mock polishes and classifies admin-side inside generateReport()
           instead
Depends:   B5
Traces to: ADR-0004; ADR-0011; DESIGN Part B UX-010 (supersedes UX-004)
Done when: submitting queues a single DeepSeek job that (a) rewrites every non-pass remark
           into report prose and stores it in place of the raw remark, and (b) for every
           Fail item, assigns category/severity/impact/correctiveAction/sla/ownership
           against the scoring rubric (lib/ai/severityRubric.ts); the audit carries an AI
           state (polishing / ready / failed) surfaced on the auditor's pending list and
           the admin review screen; a failed or timed-out job NEVER blocks or reverses the
           submit — the audit is submitted regardless, remarks pass through verbatim, and
           Fail items are picked up by C3's fallback classifier at "Generate report"; the
           model rewrites prose only and never invents a number — severity classification
           is the one stated exception (ADR-0011); and the reviewer can still override
           every finding field, severity included, exactly as C3 already allowed
```

> **This reverses a previously stated invariant.** Remarks were "quoted, not rewritten". They are now
> rewritten, and the verbatim field text is not retained — so there is nothing to revert to if a polish
> distorts meaning, and with no audit trail the original wording is unrecoverable. Accepted deliberately;
> the reasoning and consequences are in **ADR-0004** and **ADR-0011**.

---

## Review and report export — C1…C5

### C1 — Review queue and review
```
Screens:   reviewQueue, review (reportNotReady)
Design:    Super Admin Flow.dc.html
Depends:   B6
Story:     S-9, S-10
Done when: statuses, remarks and photos appear exactly as submitted and photos open full
           size; a status or remark can be corrected admin-side; an operational file can
           be attached and replaced, each showing what it covers and whether it read
           successfully; and a section with no data is marked "needs data" rather than
           left blank or zero
```

Operational report types seen in seed: Bill Edit & Modification · Non-chargeable · Item Purchase Statement
· Stock Statement · Item Cancellation · Discounts. `flagged: true` means low scan quality, needs manual
review.

### C2 — Financial engine
```
Delivers:  a pure (auditSnapshot, operationalImports) → reportDraft module on top of F7
Design:    Audit report v4.dc.html §1 / §1B — the output shape
Depends:   C1, F7
Traces to: ARCHITECTURE §7
Done when: it is a pure function with no I/O, unit-tested against the design file's seed
           figures, and "no data" reaches the report as "needs data" and never as zero
```

Report-surface formulas: sales − discount = net sales; + taxes + service charge = gross; taxes and service
charge allocated pro-rata on net sales; APC on covers.

### C3 — Findings generation (fallback since ADR-0011)
```
Screens:   review (reportReady)
Design:    Super Admin Flow.dc.html → generateReport / CATEGORY_RULES
Depends:   C2
Story:     S-11
Done when: every Fail becomes a finding with reference ID, category, severity, impact,
           corrective action, SLA and ownership; the financial sections fill from the
           metrics; every generated field is editable by the reviewer; and Pass/N-A items
           carry no severity, impact or action (originally "every Fail and Observation" —
           `observation` removed, see `DESIGN.md` Part B **UX-024**)
```

Since **ADR-0011**, B6's DeepSeek job already assigns most Fail items' findings at submit — `classifyFinding`
(`CATEGORY_RULES`, 10 keyword rules over `label + remark`, falling back to Operational Control / Medium) is
now the **fallback**, invoked here only for Fail items with no severity yet: ones the AI job didn't reach
(failed/timed out) or that were corrected into Fail after submit. Idempotent either way — Regenerate never
overwrites an AI-set or reviewer-edited finding. Categories: Temperature & Expiry · Food Safety Risk ·
Inventory Control · Hygiene Standards · Statutory Compliance · Revenue Control · Operational Control. SLA
vocabulary: Immediate (24 Hours) · Within 24 Hours · Within 48 Hours · Within 5 Business Days · Reviewed.

Severity is **High / Medium / Low** only (R7). Remarks arrive already polished from B6 — C3 does not
rewrite them again.

### C4 — Report v4 render
```
Screens:   reports, reportDoc
Design:    Audit report v4.dc.html — its own type system; build last
Depends:   C3, F2
Done when: §1 Key Financial & Unit Economic Metrics (KPI strip with per-pax sub-figures,
           the sales & per-customer revenue matrix, and the two composition charts behind
           showCharts), §1B Costing & Cost as % of Sales (Bar & Cellar → Kitchen &
           Production → F&B → Net F&B), and §2 Department Checklists & Compliance Matrix
           (severity ribbon behind showSummaryRibbon, one numbered card per department,
           columns Ref ID / Checkpoint & Observation / Operational Impact / Risk Severity /
           Immediate Corrective Action / SLA / Evidence) all render from real data and
           print correctly with data-avoid and data-break honoured
```

- **No §3 Findings Register** (R9) — §2's table already carries those columns.
- Evidence photos render as real clickable/embedded thumbnails, on the Report screen and in the PDF (UX-017).
- All numbers in IBM Plex Mono with `tabular-nums`; currency Indian short-scale via the F7 formatter.
- **Do not port the mock's edit model.** It is DOM-level `contenteditable` persisted to
  `localStorage['fnb.reportV4.edits.v2']`. Model edits as real fields on real records.

### C5 — Publish (PDF export)
```
Screens:   — (publish action on review; version stamp on reportDoc)
Depends:   C4
Story:     S-12
Done when: publishing stamps a version and date ("v1 · 21 Jul 2026"), freezes the report
           read-only, and renders a version-stamped PDF via Playwright — the only export
           format shipped; and publishing is a SEPARATE action from copying the share link
           (R5) — only publish increments the version
```

A correction is a new version; earlier versions remain. With no audit trail, versioning is the only
history.

**No XLSX, no Client Portal, for now (R12).** The design file draws an "Export Data (XLSX)" button next
to Print/PDF, and Super Admin draws a restaurant/outlet reader tree for token-based access — neither is
in scope. The admin downloads/shares the PDF directly; there is no outlet-facing portal, no report token,
and no per-client branding surface. See "Not yet designed" for the deferred outlet portal.

---

## Not yet designed

Named so they are not silently lost. **Out of the build until a design exists** — do not invent screens
for these.

- **Outlet reader / Client Portal (formerly C6).** A design exists (`Super Admin Flow.dc.html`'s
  restaurant/outlet reader tree) but it's cut from current scope by product decision (R12): for now the
  only deliverable is the admin-facing PDF export in C5. No outlet login, no report token, no per-client
  branding. Revisit this package if the Client Portal comes back into scope.
- **XLSX export.** The report design draws an "Export Data" / "Download full report (XLSX)" control;
  dropped for now (R12) — PDF via Playwright is the only export format.
- **Revision note on a v2 publish.** Story S-12 requires it; no field appears in any design file.
- **Per-client operational-file import adapters.** ARCHITECTURE §7 describes the interface; no screen
  draws the mapping.
- **Phase 3 — analytics and insight engine.** Gated on collecting real client Excel samples before any
  design work, which also decides the TS-vs-Python ingestion question (ADR-0001's escape hatch).
- **Phase 4 — hardening.** E2E against the "Done when…" clauses; LLM figure-tracing; print/PDF fidelity;
  the ADR-0002 `localStorage` cache and navigate-away guard; security review; `org_id` boundary check.

`ROADMAP.md` remains the owner of phases 3 and 4.
