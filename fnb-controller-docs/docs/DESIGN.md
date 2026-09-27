# Design

Two parts. **Part A** is the single source of truth for design tokens — reference these, never inline a
raw value; if something genuinely new is needed, add it here first. **Part B** is an append-only UX
decision log (ADR-style, `UX-NNN`): a flow changing later is a *new* entry that can supersede an older
one, never a silent overwrite.

Tokens below are captured as-given from `DESIGN-SYSTEM.md` (extracted from the shipped design files) —
that file remains the authoritative extraction; this consolidates the working set. **Two surfaces with
deliberately different type treatments — do not merge them.**

> **The `.dc.html` design files are the authoritative UI reference.** This file is the distilled token
> layer, but for anything a token doesn't fully pin down — exact spacing on a specific screen, a
> component variant, a layout, an interaction — **open the matching design file and copy the exact
> inline-style values; do not invent.** Map: Super Admin → `Super Admin Flow.dc.html`; Auditor →
> `Auditor Flow - Mobile.dc.html` (primary) + `Auditor Flow - Laptop.dc.html`; report →
> `Audit report v4.dc.html`; overall flow/screens → `Product Spec - Flow, Screens & Stories.dc.html`.
> If you introduce anything genuinely new, add it to Part A here first (maintenance rule 8). See
> `CLAUDE.md` → "Design source files" for the full table and precedence.

---

# Part A — Design system

## Colour

**Brand / navy**
| Token | Hex | Use |
|---|---|---|
| `--navy-900` | `#16202e` | Strongest ink; report body text |
| `--navy-700` | `#1e3a5f` | **Brand primary** — primary buttons, active nav, report header, progress fill, icon strokes, eyebrows |
| `--navy-500` | `#2f5d8a` | Links / secondary accents |
| `--navy-050` | `#eef2f7` | Navy tint fill (icon chips, active nav bg) |
| `--navy-025` | `#f0f4f9` | Lightest tint (role badges) |
| `--navy-chip` | `#eef2f9` | Department chip fill (added during F2 — distinct from `--navy-025`, confirmed against the chip markup in all three flow files) |
| `--navy-border` | `#b9c8dd` | Border on navy chips |
| `--navy-border-soft` | `#dbe4f0` / `#d6e2ee` / `#a8c4de` | Progressive card/table borders |

**Neutrals — App UI**
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#fafafa` | Page background |
| `--surface` | `#ffffff` | Cards, panels, sticky header |
| `--surface-alt` | `#f7f9fb` / `#fafbfc` | Card header bands |
| `--surface-calculated` | `#f6f8fa` | Calculated field fill (added during F2 — distinct from `--surface-alt`, confirmed against `Auditor Flow - Mobile/Laptop.dc.html` line ~125) |
| `--ink` / `--ink-2` / `--ink-3` | `#111` / `#333` / `#555` | Headings / body / secondary |
| `--muted` / `--muted-2` | `#888` / `#999` | Labels, meta / lowest-priority meta |
| `--placeholder` | `#bbb` | Input placeholders |
| `--hint` | `#8a93a0` | Grouped-panel header hint text (added during F2 — `Super Admin Flow.dc.html` grouped-panel headers) |
| `--divider` | `#eee` | List-row dividers (the workhorse) |
| `--border` / `--border-strong` | `#ddd` / `#e6e6e6` | Input borders / header rules |
| `--border-card` | `#e4e7ea` | Grouped-card outlines |
| `--border-dashed` | `#d9dee4` | Read-only / calculated field borders |

**Neutrals — Report**
| Token | Hex | Use |
|---|---|---|
| `--r-bg` | `#f5f7f8` | Paper (white in print) |
| `--r-ink` / `--r-ink-2` | `#16202e` / `#4a5464` | Body / secondary |
| `--r-muted` | `#6b7686` | Labels, uppercase eyebrows |
| `--r-border` / `--r-border-2` | `#e4e8ee` / `#c9d0d8` | Table rules / emphasised rules |
| `--r-surface-alt` | `#f8fafc` / `#fafbfc` | Zebra rows, sub-panels |

**Status & severity**
| Meaning | Fg | Bg | Border |
|---|---|---|---|
| Fail / High / Overdue | `#9f1d17` (report) · `#b91c1c` (app) | `#fdeceb` | `#f0c9c6` |
| Warn (parse/polish notices only — not a checklist status, UX-024) | `#8a6a09` | amber tint | — |
| Pass / Compliant | `#1f6f62`, dot `#4a9c8c` | `#0d3b34` (deep) | — |
| Financial / discount callout | `#8c4a2f` | — | — |
| Neutral / N-A / assigned | `#6b7480` / `#9aa4b2` | `#f0f0f0` | `#dcdfe4` |

**Report §2 Risk Severity chip** (added during C4 — `Audit report v4.dc.html`'s own `sevColor()`, a
distinct palette from the status table above):
| Severity | Fg | Bg |
|---|---|---|
| High | `#c2410c` | `#fff7ed` |
| Medium | `#a16207` | `#fefce8` |
| Low / Passed | `#666666` | `#f5f5f5` |

**Report §1 composition donuts** (added during C4 — `Audit report v4.dc.html`'s own chart palette):
sales composition teals `#0d3b34` · `#1f6f62` · `#4a9c8c` (the same hexes as `--status-pass-bg-deep` /
`-fg` / `-dot`, reused rather than duplicated) · `#8fc5b8` · `#cfe3dd`; cost composition rust tones
`#7a2e14` · `#b8541f` · `#d98b4a` · `#f0c9a0`.

Audit lifecycle pills: `assigned` (neutral) → `in-progress` (navy) → `submitted` (navy-solid) →
`published` (green) · `deferred`. Checklist item statuses: `pass` · `fail` · `na` (UX-024 — `observation`
removed); `fail` also carries `severity` (High/Medium/Low), `impact`, `correctiveAction`.

## Typography
**App UI** — body/UI `Inter` (400–700); page & screen titles `Newsreader` serif (500/600, titles &
wordmark only, never body); data/IDs `ui-monospace`. **Report** — all text `Inter Tight` (400–800); **all
numbers/currency/KPIs `IBM Plex Mono` with `font-variant-numeric: tabular-nums` (non-negotiable)**; icons
`Material Symbols Outlined`. Do not substitute Inter on the report or mix icon systems on one surface.

Scale (px): wordmark 21/600 · login title 28/600 · screen title 22/600 (Newsreader) · panel 18/600 ·
row title 14–15/600 · card header 13–13.5/700 · body 13/400 · meta 12/400 `--muted` · small meta 11.5 ·
eyebrow 10–11/700 uppercase `.06–.12em` · chip/pill 10/700 `.06em` · report KPI 18–21/700 mono.
Line height 1.4 tight / 1.55–1.6 prose; `text-wrap: pretty` on prose.

## Geometry
Radii `3` (tags) · `6` (inputs/buttons) · `8` (cards) · `10` (panels) · `12` (large) · `20`/`9999` (pills).
Borders always `1px solid`; read-only/calculated `1px dashed #d9dee4`. Spacing rhythm
`2·4·6·8·10·12·14·16·18·22·24·28`; card padding 12–16; page padding 24 desktop / 16 mobile; sticky header
`14px 28px`. Shadows almost none — depth from borders (only the report header carries one). Lists are
flat rows on `#fafafa`, separated by `1px solid #eee` — no card-per-row.

**Auditor shell breakpoint (B1):** one component tree, CSS-media-query driven (not a JS device flag) at
`640px`. Below it (mobile, primary): outer pad `28px 16px`, card max-width `390px`, radius `20px`, min-height
`700px`, header stacks column/stretch. At/above it (laptop, the widened variant): outer pad `36px`, max-width
`760px`, radius `10px`, min-height `600px`, header row/center. Values copied verbatim from both
`Auditor Flow - Mobile.dc.html` / `- Laptop.dc.html`'s `isMobile` ternaries.

## Core components
- **Sticky header** — white, `1px solid #e6e6e6` bottom, `sticky; z-index:20`; Newsreader wordmark left, role badge right.
- **Role badge** — pill, `#f0f4f9` bg / `#b9c8dd` border / `#1e3a5f` text, 11/700 uppercase `.08em`.
- **Primary button** — `#1e3a5f`, white text, no border, radius 6, padding 13, 14/600. Secondary = text-only `#888`. Submit disabled until nothing missing.
- **Text input** — `padding 11px 12px`, `1px solid #ddd`, radius 6, 14px; focus border `#111`; numeric inputs `width:150px; text-align:right`; label above at 12/`#888`.
- **Calculated field** — same box, `1px dashed #d9dee4`, `bg #f6f8fa`, weight 700, right-aligned. Never editable.
- **Metric section (B2)** — header band `#eef2f9` bg / `#dbe4f0` border, radius 6, title 11/700 uppercase
  `.08em` navy, note 11/`--hint-2` (`#6b7a90`); each row: label flex-1 (wraps, `min-width:0`), a
  flex-shrink:0 value block right-aligned — a 100px input or calculated-field display, with its sub
  figure (APC / cost %, or nothing) stacked directly beneath at 11px `--hint`. Adapted from `Super Admin
  Flow.dc.html`'s MTD Metrics tab (originally a 134px value + a separate 94px sub column — that fixed
  three-column shape overflowed the auditor shell's ~340px mobile card width; BUG-016) — same section
  layout still drives both the auditor's capture (B2) and the reviewer's as-captured view (C1).
- **Grouped panel** — `1px solid #e4e7ea`, radius 10; header band `#f7f9fb` with 13/700 title, 12px hint, right-aligned progress string (`"4 of 12"`).
- **Department chip** — 24×24, radius 6, `#eef2f9` bg / `#dbe4f0` border, `#1e3a5f` 11/700, centred.
- **List row** — `padding 16px 4px`, `border-bottom 1px solid #eee`, pointer; 15/600 title + 15px stroked SVG icon (`#1e3a5f`, `stroke-width 1.8`); 13px `#888` meta; right-aligned status pill.
- **Progress bar** — 5px tall, track `#eee`, fill `#1e3a5f`, radius 3.
- **Overdue marker** — removed (ADR-0008): the audit date range is a conduct period, not a deadline, so
  nothing in the auditor portal computes or shows an overdue state.
- **Report table / KPI strip** — full-width `#e4e8ee` rules, 12px cells; header 10.5/600 uppercase `#6b7686`; figures right-aligned mono; category colour dot 8px. KPI strip: big mono number over 10.5 uppercase label, cells divided by `border-right`.
- **Icons** — App UI: inline stroked SVG `#1e3a5f`, `stroke-width 1.8`, 14–16px, `fill:none`. Report: Material Symbols Outlined.

## Print
Report + spec are print-first (`doc-page.js`, letter, `0.6in` margin). `[data-noprint]` hidden;
`[data-avoid]` = `page-break-inside:avoid` (every card/table/diagram); `[data-break]` =
`page-break-before:always`; `print-color-adjust:exact`; background white in print.

## Voice
Sentence case except eyebrows/pills. Plain-noun labels ("Due", "Covers", "Total Discount") — no invented
vocabulary. Hints are one short lowercase-feeling sentence. Currency Indian short-scale `₹4.80L`; dates
`Due 14 Jul`. Never use emoji.

---

# Part B — UX / product design decisions

Append-only. Each entry: the decision, the "why", and what it trades off. Supersede, don't overwrite.

### UX-001 — Auditor app is one responsive tree, mobile-primary
**Decision:** build a single component tree for the auditor app; mobile is the primary target, laptop is
the widened variant. Mobile uses two tabs (`metrics` / `checklist`) + a bottom-anchored submit; laptop
stacks both steps with a right-aligned progress block. **Why:** auditors work on a phone in the outlet;
designing mobile-first and widening avoids a desktop layout awkwardly squeezed onto a phone. Same screen
keys, data and rules across both — differences are layout only. **Trade-off:** the laptop view is
constrained by mobile's information architecture rather than exploiting desktop space freely.

### UX-002 — "Save the session": server-persisted drafts + explicit Save, no offline
**Decision:** the session stays signed in across restarts/dead zones (admin can end all sessions), and the
in-progress audit is saved **server-side** via an explicit Save button — no autosave, no offline engine.
**Why:** with the server as the single source of truth, the same in-progress audit reopens on any device
(mobile→laptop handoff is free), and Save only writes small structured data so it stays fast (photos
upload one-by-one on capture). **Trade-off:** assumes connectivity while auditing — the one assumption to
confirm with the client; if offline is genuinely needed, the submit model changes (would supersede this).

### UX-003 — Submit is one confirmed, irreversible action, with named validation
**Decision:** Submit is disabled until nothing is missing; when blocked it **names what's missing** (a
count and the items), not just refuses; submitting asks for confirmation, then makes the audit read-only
for the auditor permanently. **Why:** completeness is the product's core promise, and an immutable
capture is what the review/report pipeline can trust. **Trade-off:** no unsubmit — every correction is an
admin-side action, which is deliberate.

### UX-004 — Reviewer sees the submission exactly as captured
> **Partly superseded by UX-010.** Remarks are no longer verbatim — they are AI-polished on submit, and
> since ADR-0011 the finding (severity/category/impact/corrective-action/SLA/ownership) is also AI-assigned
> at submit, not only after "Generate report." The rest of this entry (the submission is shown as captured
> and never edited in place; the reviewer can still override every finding field) still holds.

**Decision:** the review screen shows the submission as captured and is never edited in place; the
reviewer can override severity/impact/corrective-action and generate/regenerate findings, but the
auditor's remarks reach the report **unedited** by the reviewer. **Why:** preserves the integrity of the
field record and keeps a clean line between what was observed (auditor) and what was judged (reviewer,
now AI-assisted). **Trade-off:** reviewer judgements live only in the report version, since there is no
separate audit trail.

### UX-005 — Report delivered as a version-stamped PDF, admin-delivered (no Client Portal for now)
**Decision:** the published report is a self-contained, prominently version-stamped PDF
(`v1 · 21 Jul 2026`), delivered directly by the admin; corrections publish as a new version. **Why:** a
downloaded file can't be recalled, so visible version clarity replaces a revocable-link model.
**Trade-off:** old PDFs remain in the wild — version stamping, not revocation, is what prevents confusion.
**Scope cut (R12, EXECUTION.md):** the design also draws XLSX export and a white-labelled, token-accessed
Client Portal for outlet reading; both are out of current scope. PDF is the only export format and there
is no outlet-facing portal or report token for now — revisit if the Client Portal comes back into scope.

### UX-006 — Severity is High / Medium / Low
**Decision:** three severity levels only. The `Critical` value that appears in the Super Admin file's seed
data is dropped. **Why:** DESIGN Part A defines colours for three, and the report's severity `<select>` and
its summary ribbon are both built for three (+ Passed) — the seed outran the design system rather than
extending it. **Trade-off:** nothing can be escalated above High; a genuinely urgent finding is carried by
the SLA field ("Immediate (24 Hours)") instead of by a fourth severity. Recorded as R7 in `EXECUTION.md`.

### UX-007 — Compliance % excludes N/A only
**Decision:** the department and report compliance figure is `pass / (pass + fail)`. N/A is excluded from
the denominator. **Why:** the stated invariant is that *N/A* is neither fail nor blank. The design file's
`scoreLabel` excludes it too. **Superseded in part by UX-024** — the checklist no longer has a separate
`observation` status, so the original three-term denominator (`pass + fail + observation`) no longer
applies; every non-pass, non-N/A point is now `fail`. Recorded as R8 in `EXECUTION.md`.

### UX-008 — No separate findings register in the report
**Decision:** the report ends at §2. The spec's "§3 · Findings Register" (RP-1) is not built. **Why:** §2's
compliance matrix already carries Ref ID, checkpoint and observation, operational impact, risk severity,
corrective action and SLA — a register would print every finding twice, and design wins on layout per the
stated precedence rule. **Trade-off:** there is no flat, cross-department view of findings in the PDF; a
reader wanting only the failures scans the department cards. Recorded as R9 in `EXECUTION.md`.

### UX-009 — A remark is required on non-pass points only
**Decision:** fail and N-A each require a remark; a bare Pass is allowed. N/A additionally requires a
reason from the fixed list of five. **Why:** on a 38-point checklist most points pass, and demanding a
typed sentence on each one makes the mobile-first capture slow enough that auditors work around it. The
evidentiary value is in explaining what went wrong. **Trade-off:** reverses `HANDOVER.md`'s "remark
required on every point"; a pass is recorded without supporting words. Recorded as R10. (Originally also
named `observation` — see UX-024.)

### UX-010 — AI polishes remarks and scores severity on submit *(supersedes UX-004 on the remarks point)*
**Decision:** submitting queues a job (now DeepSeek, ADR-0011; was Anthropic, ADR-0004) that rewrites every
non-pass remark into report prose — the polished text **replaces** the raw remark, no verbatim copy
retained — and, for every Fail item, also assigns severity/category/impact/corrective-action/SLA/ownership
against a defined scoring rubric (`lib/ai/severityRubric.ts`). The model rewrites prose only and never
touches a number that appears in the report; severity classification is a stated exception to that rule,
not a silent one (see ADR-0011). A failed or timed-out job never blocks the submit; the deterministic
classifier (`classify.ts`) then acts as the fallback for any Fail item the AI job didn't reach, at the next
"Generate report." **Why:** field shorthand typed on a phone is not a client deliverable, and scoring
severity at submit means the reviewer opens a submission whose findings are already there, not one that
needs a "Generate report" click first. **Trade-off — the significant one:** there is nothing to revert the
remark to if a polish distorts meaning, and the report is no longer a quotation of what was observed. The
reviewer can still override every finding field, severity included — that override remains the safety net
for a wrong AI judgment, same as it always was for the rule-based classifier. UX-004's other half — the
submission is shown as captured and never edited in place — still holds. Full reasoning in **ADR-0004** /
**ADR-0011**; recorded as R11 in `EXECUTION.md`.

### UX-011 — Departments collapse and expand (B3)
**Decision:** each department in the checklist is its own collapsible section, one card open by default
(the first, in template order), a click on its header toggling the rest. **Why:** the product spec's
story A-5 requires this ("departments collapse and expand, each header shows how many points are
marked") even though `Auditor Flow - Mobile.dc.html` never wires a department-level toggle — only its
individual checklist points expand (`activeItemId`). Per the stated precedence rule the spec wins on
behaviour where the design is silent; the department header's existing visual container (icon badge +
name + progress string) needed no layout change to carry the added `onClick`. **Trade-off:** none — the
design's markup for the header is unchanged, only its interactivity is additive.

### UX-012 — Operational files attach per-audit, not to a firm-wide inbox (C1)
**Decision:** the review screen carries its own "Operational Files" panel — attach/replace scoped to the
audit under review — rather than the design's `sReports` screen, which is a single firm-wide upload list
matched to a restaurant/period only by free text. **Why:** EXECUTION.md's C1 done-when explicitly ties
attach/replace to the review flow, and C2's financial engine needs `(auditSnapshot, operationalImports)`
for one specific audit — a global pool with no audit foreign key can't answer "which files feed this
report." **Trade-off:** the firm-wide browse/insights view `sReports` draws (parsed preview table,
cross-file insights) is not built; nothing in C1's done-when calls for it, and it can still be added later
as a read-only index over the same `audit_operational_files` rows.

### UX-013 — Reviewer corrections are an explicit action, not inline editing
**Decision:** each checklist point on the review screen shows the submission exactly as captured (UX-004);
a "Correct status or remark" link reveals a separate form (status buttons, N/A reason, remark) with its own
Save/Cancel, rather than making the as-captured fields directly editable. **Why:** UX-004/ARCHITECTURE §7
require the submission to be shown as captured and "never edited in place" — an always-editable field would
blur that line and risk an accidental one-character change reading as a silent correction. **Trade-off:**
one extra click before a correction lands; accepted because reviewer corrections should be a deliberate,
visible action, not a slip of an inline input.

### UX-014 — Report financial matrix has two revenue groups, not three (C2)
**Decision:** the revenue matrix (Section 1's Sales & Per-Customer Revenue Matrix) breaks sales into
**Kitchen** and **Bar** — matching F7's own `MetricDef.revGroup: 'bar'|'kitchen'` — rather than the report
mock's static **Food / Bar / Liquor** three-way split. **Why:** the mock's numbers are hand-typed example
content, not driven by any data model in its logic class (unlike the Super Admin file, this design file
carries no seed data or computed cascade at all — EXECUTION.md's own note that it specifies "the output
shape," not a schema). F7 — the canonical, already-built metric model (ADR-0003) — only distinguishes two
revenue buckets; inventing a third to match the mock's illustrative labels would mean either a schema
change unrelated to any captured data, or fabricating a Bar/Liquor split with no underlying metric to
split it from. **Trade-off:** the report's Bar row reads "Bar" where the mock shows separate Bar and
Liquor rows; a template that wants that distinction can still get it by tagging the relevant sales metrics
accordingly — F7 already sums by `revGroup`, so no further engine change would be needed.

### UX-015 — A finding's Ref ID is the item's own template code (C3)
**Decision:** every finding's `refId` is the checklist item's existing code from the template snapshot
(`KIT-03`, `SEC-01`, …), never a generated fallback sequence. **Why:** the mock's `decorateItems` falls
back to `'EQ-'+String(idx+1).padStart(2,'0')` only when `it.refId` and `it.code` are both missing — but
in the real schema every `audit_item` always carries a `code`, cloned from the template at assign (A5,
"template snapshot on assign"). The fallback branch in the mock exists for its own seed data quirks, not
for a case that can occur here. **Trade-off:** none — this is strictly simpler than porting a code path
that can never run.

### UX-016 — Report v4's build departures from the mock (C4)
**Decision, bundled:** (1) the composition donuts use what our data actually has — Sales Composition is
Kitchen/Bar net sales + service charge + statutory taxes (4 slices, following UX-014's two-group model)
and Cost Composition is Bar/Kitchen/Non-commercial cost (3 slices, F7's own cost groups) — not the mock's
illustrative Food/Liquor/Beverage breakdowns. (2) `showCharts` and `showSummaryRibbon` exist as real
flags gating their sections but both default `true` with no admin control to flip them — no story asks
to hide either, and CLAUDE.md's own convention is not to build settings nobody asked for; an admin-facing
toggle can be added when one does. `showEvidence` was originally stubbed off per the design file itself —
see UX-017 for where that changed. (3) All six template departments (SEC/KIT/STR/OPS/POS/OTH) render
as their own card, not just the four the mock happens to illustrate (Security, Kitchen, Purchase & Stores,
Operations) — POS Controls and Other Observations get `point_of_sale` / `fact_check` Material Symbols,
picked to match the existing icon language since the mock never reaches those two. (4) The mock's header
"Export Data" button (never wired to anything, no `onClick`) and `editMode`'s inline `contenteditable`
editing are both dropped — CLAUDE.md already rules out porting the mock's edit model, and a
Playwright-rendered PDF (C5) makes an unwired export button moot. **Why bundled:** none of these are
independent architectural choices — each is "use the real data model / only build what a story asks for,"
already the governing principle behind UX-014 and the C4 done-when itself.

### UX-017 — Evidence photos un-stubbed: real thumbnails in both the Report screen and the PDF
> **Partly superseded by UX-025.** PDF thumbnails are no longer baked pixels only — they're wrapped
> in a real `<a href>` so they're clickable in the PDF, backed by a long-lived (not 1-hour) signed
> URL. The rest of this entry (real `auditItemFiles`-backed thumbnails, up to 4 + overflow, shared
> `ReportBody` markup) still holds.

**Decision:** the Section 2 Evidence column now carries the checkpoint's actual `auditItemFiles` rows
(resolved to signed URLs the same way the Review screen already does) instead of a bare `photoCount`,
and renders real clickable thumbnails — up to 4 per checkpoint with a `+N` overflow — via a new
`EvidenceThumb`/lightbox component scoped to the report (`--r-*` tokens, distinct from the Review
screen's own `PhotoLightbox`). Because `ReportBody` renders identically for the live web page and for
C5's Playwright PDF export, the same `<img>`-based thumbnail markup works in both: interactive with a
full-size modal on the web, and rasterized into the PDF's pixels by Playwright before `page.pdf()` runs
on the PDF path (the click handler is simply inert there — no branching needed). Photos are embedded as
baked pixels, not links, so the PDF stays viewable forever regardless of the 1-hour signed-URL TTL.
**Why:** the mock's own Evidence cell was a decorative "has evidence" placeholder with no real photo
behind it, and `showEvidence` was deliberately left stubbed off in the initial C4 build (UX-016) since
nothing yet needed to view captured photos from the Report screen — Review screen was reviewer entry
point. Once photo review from the report/PDF deliverable itself was requested, the underlying data
(`auditItemFiles`, `createSignedUrl`) already existed; only the report's own presentation was missing.
**Trade-off:** none — this reuses the existing storage/signed-URL machinery, adds no new data model.

### UX-017 — No "Share" action was built for the report (C5)
**Decision:** the review screen has a Publish button and nothing else — no "Share report" / copy-link
affordance alongside it. **Why:** R5 settled that publishing must be a separate action from sharing,
because the mock's `doPublish()` and `shareLink()` mutated identically; R12 then cut the Client Portal
entirely, so there is no outlet-facing surface, report token, or public URL for a share link to point at.
Building a "Share" button anyway would either silently reuse the internal `/admin/review/[id]/report`
admin route (misleading — that page requires a super-admin session, so "sharing" it would just fail for
anyone else) or fabricate a token system for a portal that doesn't exist. **Trade-off:** none currently —
R5's separation is satisfied vacuously (there's nothing to conflate publish with). Revisit this the
moment the Client Portal (deferred, `EXECUTION.md` "Not yet designed") comes back into scope: that's when
a real share link — and the reason to keep it separate from publish — starts to exist.

### UX-018 — Taxes-category metrics get an explicit Statutory tax / Service charge choice (BUG-020)
**Decision:** each row added under Template Builder's Taxes category shows a two-option radio (Statutory
tax / Service charge), defaulting to Statutory tax, instead of the whole category silently stamping every
row `kind:'tax'`. **Why:** `computeMetrics` (F7) only routes a `kind:'charge'` row into `totalCharges`;
with no way to set that from the builder, a Service Charge metric was always summed into `totalTaxes`
instead, so the report showed "Needs data" for Service Charge everywhere while inflating Total Taxes by
that amount (BUG-020). The design source itself has the same gap — even `Super Admin Flow.dc.html`'s
builder hardcodes `kind:'tax'` on every tax row; only its seed data hand-tags Service Charge — so this is
a deliberate departure from the mock's builder, not a port of it. **Trade-off:** one more control on an
already-dense category; kept to a plain radio pair rather than a general "kind" field since `tax`/`charge`
are the only two values the schema (and the calc engine) recognise for this section.

### UX-019 — Sales-category metrics get an explicit Kitchen / Bar revenue choice (BUG-021)
**Decision:** each row added under Template Builder's Sales category shows a two-option radio (Kitchen
revenue / Bar revenue), defaulting to Kitchen, instead of the whole category silently stamping every row
`revGroup:'kitchen'`. **Why:** the same pattern as UX-018 one category over — `computeMetrics` (F7) only
routes a `revGroup:'bar'` row into `barSale`; with no way to set that from the builder, Bar Sale was
always null/"Needs data" and every sales metric (Beverage and Liquor included) was silently summed into
Kitchen Sale instead (BUG-021). Same departure from the mock's builder as UX-018, for the same reason.
**Trade-off:** same as UX-018 — one more control per row, kept to the two values the schema recognises.

### UX-020 — Reports tab groups by the audit's covered period, not a fixed/fake month list (BUG-022)
**Decision:** the restaurant detail Reports tab derives its month tabs from the calendar month each
audit's own period (`periodStart`, falling back to `periodEnd`) falls in, newest first — not the design mock's
`REPORT_MONTHS`/`MONTH_REPORTS`. An audit covering 1–31 Aug files under August even if it wasn't reviewed
and published until September. **Why:** those constants in `Super Admin Flow.dc.html` (:1193-1212) are
entirely hand-authored seed data — three fixed months with invented report names/dates that don't trace
to any real audit — not a computed model to port. First pass grouped by `reports.publishedAt` instead;
the user then pointed out a report covering August should file under August regardless of when it was
actually published, so grouping was moved to the audit's own period. **Trade-off:** no way to assign an
audit to a month independent of its due-date range at creation — a month tab only appears once a report
covering that month has actually published.

### UX-021 — MTD consolidated report: live-recomputed, merged by `metricKey`, no checklist (ADR-0006)
**Decision:** the Reports tab's month view also shows a "View MTD report" card that opens a new aggregate
report combining every audit published that month for the outlet — recomputed fresh on every view, never
stored/versioned. Audits are merged by `metricKey` (summing raw values, then rerunning `computeMetrics`),
so Week 1 alone becomes Week 1 + Week 2 the moment Week 2 publishes, with no re-generate step. **Why:**
UX-020 deferred building real MTD aggregation; the user then asked for it directly, live-recompute over a
versioned "Generate MTD" action (ADR-0006 has the full trade-off). **Trade-off:** the MTD page shows no
compliance checklist — a sum of several audits (possibly different templates) has no one coherent
department/finding list, so `MtdReportBody` lists the contributing audits instead of `ComplianceSection`.
Also not downloadable as a fixed, dated artifact the way a per-audit report is (nothing to point a
`reports.version` at) — printing it captures only whatever is live at that moment.

### UX-022 — Department checklist cards may break across a page, not held together (BUG-023)
**Decision:** `Audit report v4.dc.html:439,510,624,714` marks every department card `data-avoid`
(`page-break-inside:avoid`) — the mock's intent is that a department's checklist table never splits across
a printed page. Our PDF only keeps that on the card's small header row now; the table body is left free to
break, relying on the browser's native repeated-`<thead>` behavior on a table page-break (already the
fallback the mock itself hits whenever a department is taller than one page, e.g. Purchase & Store's 9
checkpoints in real captured data). **Why:** with real audit data (5-9 checkpoints per department, longer
corrective-action prose than the mock's placeholder rows), keeping the whole-card avoid produced large
blank gaps — a department that didn't quite fit in the space left on a page was pushed to the next page in
its entirety, wasting most of the page it left behind (reported directly: "a lot of empty space"). Letting
rows flow and repeating the header at the break reads acceptably (confirmed via a real Playwright render)
and reclaims that space. **Trade-off:** a department can now visually split across two pages instead of
always starting fresh; Section 1's single-block avoid and Section 2's forced page-break-before
(`data-break`) are both left as the mock has them — those are page-level structural boundaries, not a
per-row packing question, and changing them wasn't needed to fix the reported waste.

### UX-023 — No "copy audit link" affordance on the restaurant detail screen (A5)
**Decision:** removed the share-URL row and "Copy link" button that showed under each active audit on
`restaurantDetail`, and the "create one to get a shareable link" empty-state copy that went with it; no
`/a/[token]` route was ever built to receive it. Also renamed the "New Audit" panel and its CTA — "Create
audit link" → "Create audit" (heading and button), and the "A shareable audit URL is generated on
create…" helper line → "The audit appears in the auditor's portal on create — no link to send, no login
setup needed." **Why:** the auditor reaches an assigned audit by logging into the Auditor Portal
(own-auth), where it appears directly in their `pending` list — there is no link-based entry point into
an audit, so both the copyable link and the "link" language throughout the create-audit panel implied a
flow the product doesn't have. **Trade-off:** the `audits.token` column and its query field
(`lib/queries/audits.ts`) are left in place unused — a schema change wasn't needed to fix the UI, and the
column is harmless if a future deep-link flow wants it.

### UX-024 — Checklist item status is Pass/Fail/N-A only *(reverses UX-007/UX-009's "observation")*
**Decision:** removed `observation` as a checklist-item status. The auditor's four-way button
(Pass/Fail/Observation/N-A) and the admin review screen's matching editor are now three-way
(Pass/Fail/N-A); the `item_status` Postgres enum drops the value (migration `0005`, existing
`observation` rows folded into `fail` since an observation already required a remark and counted as a
finding exactly like fail); `generateReport`/`updateFinding`/`correctAuditItem` in `lib/actions/review.ts`
and the report's `isFinding` check (`ComplianceSection.tsx`) now key on `fail` alone. **Why:** product
call — a third middle status between Pass and Fail added a decision auditors didn't need; Fail already
covers "this needs a remark, a finding, and counts against compliance." **Trade-off:** compliance %
(UX-007) collapses to `pass / (pass + fail)` — the same arithmetic, just with `observation` items now
inside `fail` rather than a separate bucket; nothing that already relied on "not pass, not N/A" needed to
change. The `--status-observation-fg` design token is renamed `--status-warn-fg` since its only remaining
uses (operational-file parse-status, "polish failed" notice) were never actually about this status — they
just borrowed its amber.

### UX-025 — PDF evidence thumbnails are real clickable links, on a long-lived signed URL (BUG-026, ADR-0009)
**Decision:** `EvidenceThumbStatic` (the PDF-only, non-interactive evidence thumbnail) is now wrapped in
a real `<a href={photo.url}>`, and `reportViewModel.ts` signs that URL with a 10-year TTL
(`REPORT_EVIDENCE_URL_TTL_SECONDS`) instead of the storage layer's normal 1-hour default. Chromium's
print-to-PDF (`renderReportPdf.tsx`) preserves the anchor as a clickable link annotation in the
published PDF, so clicking a thumbnail opens the full photo. **Why:** the PDF is a durable artifact
opened long after publish; UX-017's "rasterized pixels only" approach kept the thumbnail visible
forever but gave no way to reach the full-resolution photo or any non-image evidence file from the PDF
itself (BUG-026). **Trade-off:** the signed URL embedded in the PDF is a long-lived bearer credential —
anyone holding the PDF or a forwarded link can view that one photo for up to 10 years, with no
revocation short of deleting the file. Considered and rejected: a report-token-gated redirect route
(more correct/revocable, more build cost — the documented fallback if a real Client Portal ever needs
this) and a public bucket (reverses the "never public" storage invariant for no cost benefit). Scope:
new publishes only — already-published PDFs keep their original, now-expired links. See ADR-0009.

### UX-026 — Extracted evidence tables get their own report section, not a row nested under the compliance matrix (ADR-0012)
**Decision:** a Gemini-extracted evidence table (a discount register, voids log, etc.) renders in a new,
full-width **"Section 3 · Evidence Registers"** (`EvidenceRegisterSection.tsx`), appended after the
compliance matrix and grouped by evidence type across the whole audit — one card per type, one sub-table
per extracted photo inside it. It reuses the existing **"Report table / KPI strip"** token verbatim (12px
cells, `#e4e8ee` rules, 10.5px/600 uppercase `#6b7686` header, figures right-aligned mono) — no new token
added. The compliance matrix's Evidence column is unchanged: every photo, table-bearing or not, keeps
rendering as today's plain thumbnail there. **Why:** a 7+ column extracted table doesn't fit the matrix's
~70px Evidence cell, and no table in this report's own design (`Audit report v4.dc.html`) nests under
another row — the Sales & Revenue Matrix and the Cost Analysis breakdown are each their own full-width
section, so this follows that precedent rather than inventing a new "row expands below itself" pattern.
Print: per UX-022's established convention, `data-avoid` sits only on each card's small header band; the
table body is left free to break across pages with the native `<thead>` repeat. **Trade-off:** a photo's
data now effectively appears twice in different forms — the photo itself (thumbnail, matrix) and its
transcribed table (new section) — rather than one replacing the other in place; accepted since the two
serve different purposes (visual evidence vs. readable figures) and a reviewer may want to spot-check the
table against the original photo, which the table's caption links to directly.
