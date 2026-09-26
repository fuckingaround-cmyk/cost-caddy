# Bugs

One entry per bug, sequential `BUG-XXX` (never reused). **Guard is mandatory once fixed** — no fix is
complete without a named test/check that locks it. If a bug regresses, append to its History and update
Status — never open a duplicate. Cross-reference the ADR when the root cause traces to a documented
decision. Use the exact shape below.

<!-- Entry template — copy for each new bug:

## BUG-XXX — <short title>
Status: <open|fixed|regressed once (see history)> · Area: <component/module>

Repro:      <steps to reproduce>
Root cause: <why it actually happened>
Fix:        <what was changed (commit ref if known)>
Guard:      <the test/check that now locks the fix — must stay green>
Related:    <other BUG-IDs, ADR-IDs, or files this connects to>

History:
- YYYY-MM-DD  opened
- YYYY-MM-DD  fixed <commit> + test added
-->

---

## BUG-000 — Example: calculated metric row accepted typed input (template)
Status: fixed · Area: auditor/metrics-step

Repro:      On the Metrics step, focus a row marked `calculated` and type a number; the typed value
            persisted and was submitted instead of the derived total.
Root cause: The row renderer keyed editability off the field being numeric, not off `metric.kind`, so
            calculated rows fell through to the editable input branch. Violated the "calculated is never
            typed" invariant.
Fix:        Render calculated rows through the read-only calculated-field component; totals recompute
            live from inputs only. (commit <ref>)
Guard:      Unit test — a `kind:'calculated'` row renders read-only and ignores keystrokes; e2e — typing
            in a calculated cell leaves the derived total unchanged through submit.
Related:    ADR-0002 (server-save), ARCHITECTURE §8 invariants, docs/DESIGN.md "Calculated field"

History:
- 2026-09-11  opened (placeholder example to calibrate the entry shape)
- 2026-09-11  fixed + guard added

## BUG-001 — Shared secondary Button rendered with no visible border
Status: fixed · Area: components/ui (Button, admin-wide)

Repro:      Any `<Button variant="secondary">` (Cancel, Manage, Suspend, Reactivate, Force sign-out,
            the department/checklist ✕ actions) rendered as plain gray text with no border/background,
            instead of the outlined button the design specifies — visible on every Super Admin screen.
Root cause: `Button.module.css`'s `.secondary` class only set `background: transparent; color: var(--muted);
            padding: 13px 0;` and never overrode the base `.button` rule's `border: none`, so the variant
            had no border in any state.
Fix:        `.secondary` now sets `background: var(--surface); color: var(--ink-3); padding: 11px 18px;
            border: 1px solid var(--border);`, matching the design's outlined-button pattern used for
            Cancel/Manage/Suspend/Force sign-out throughout `Super Admin Flow.dc.html`.
Guard:      Manual — every secondary button across Restaurants/Auditors/Templates shows a visible
            `1px solid` border and `11px 18px` padding (no automated UI test harness yet; Phase 4 adds
            e2e per `docs/ROADMAP.md`).
Related:    docs/DESIGN.md Part A ("Secondary = text-only" note superseded), components/ui/Button.module.css

History:
- 2026-09-11  opened (found via user screenshot comparison against the design file)
- 2026-09-11  fixed + guard added

---

## BUG-002 — Auditor creation form had no password field
Status: fixed · Area: admin/auditors (A3)

Repro:      Opening "+ Add Auditor" showed name/email/phone/outlet fields only — no way to see or set
            the account's temporary password before creating it; the password was generated blind,
            server-side, and only surfaced after submit.
Root cause: EXECUTION.md's A3 divergence note ("shown once, no reveal-anytime") was meant to remove only
            the design's *persistent* Show/Hide toggle on an already-created, already-hashed password.
            The build over-applied that rule and deleted the design's separate, pre-submit "Temporary
            password + Generate" field (`Super Admin Flow.dc.html` `naAudPwd`/`genNaAudPwd`), which is
            unrelated to the reveal-anytime rule.
Fix:        Added the editable password input + word-list "Generate" button
            (`app/admin/(protected)/auditors/AuditorsClient.tsx`), auto-populated on open; `createAuditor`
            (`lib/auth/accounts.ts`) now accepts an optional caller-supplied password and falls back to a
            random one only if left blank. The post-creation one-time reveal panel is unchanged.
Guard:      Manual — "+ Add Auditor" shows a non-empty, editable, regeneratable password field before
            submit; submitting with the field cleared is refused ("Set or generate a temporary password").
Related:    docs/EXECUTION.md A3 deliberate divergence note, lib/actions/auditors.ts, lib/auth/accounts.ts

History:
- 2026-09-11  opened (debugger-agent diagnostic pass, confirmed against design file)
- 2026-09-11  fixed + guard added

---

## BUG-003 — "+ New X" toggle buttons were replaced by the form panel instead of staying put
Status: fixed · Area: admin/restaurants, admin/auditors (A2, A3, A5)

Repro:      Clicking "+ New Restaurant", "+ New Audit", or "+ Add Auditor" made the button itself vanish,
            replaced in-place by the input panel — with no button left to close it (Cancel/Done served as
            a workaround); on the Auditors screen the button additionally changed its own label to "Close".
Root cause: In the design (`Super Admin Flow.dc.html:399-404`, `:463`, `:571`), the toggle button lives in
            the screen's header row and stays rendered regardless of panel state — only a separate block
            below is conditionally shown. Our components collapsed both into one mutually-exclusive
            branch (`if (!open) return <Button/>; return <form/>`), so opening the panel always removed
            the button.
Fix:        Split each screen's header (title + persistent toggle button) from its collapsible panel:
            `NewRestaurantForm.tsx` now renders the header row unconditionally and the panel separately;
            the restaurant-detail tabs/`+ New Audit` button were consolidated into
            `AuditsHeader.tsx` for the same reason; `AuditorsClient.tsx`'s header now keeps the button
            static ("+ Add Auditor", never "Close"). A successful create also just closes the panel
            silently now (matching `toggleNewRestaurant`/`toggleNewAudit` in the design), rather than the
            interim "flash + stay open" behavior from the first pass at this bug.
Guard:      Manual — on each of Restaurants/Auditors/the restaurant detail Audits tab, the toggle button
            remains visible and unchanged both before and after opening the panel, and after a successful
            create the panel closes and the button is still there to reopen it.
Related:    app/admin/(protected)/restaurants/NewRestaurantForm.tsx,
            app/admin/(protected)/restaurants/[id]/AuditsHeader.tsx,
            app/admin/(protected)/auditors/AuditorsClient.tsx

History:
- 2026-09-11  opened (first pass: forms weren't closing/confirming after a successful submit)
- 2026-09-11  fixed (added close-on-success + a flash message) — incomplete, see below
- 2026-09-12  regressed/deepened: user screenshot comparison showed the actual root cause was the button
              being replaced by the panel, not just a missing success state; re-fixed by splitting header
              from panel and dropping the flash/Cancel/"Close"-label additions the design doesn't have

---

## BUG-004 — Restaurant form's second field was labeled "City" instead of "Location"
Status: fixed · Area: admin/restaurants (A2)

Repro:      The "+ New Restaurant" panel's second input was labeled "City"; the design labels it
            "Location" (placeholder "e.g. Bandra, Mumbai").
Root cause: Mislabeled during initial build; never checked against the literal design markup for this
            one field.
Fix:        Relabeled to "Location" in `NewRestaurantForm.tsx` (the underlying form field name/column
            stays `city` — this was a display-label-only mismatch).
Guard:      Manual — the "+ New Restaurant" panel's second field reads "Location".
Related:    Super Admin Flow.dc.html:411, app/admin/(protected)/restaurants/NewRestaurantForm.tsx

History:
- 2026-09-12  opened (found via user screenshot comparison)
- 2026-09-12  fixed + guard added

---

## BUG-005 — Sidebar nav never highlighted the active page
Status: fixed · Area: admin/layout

Repro:      Navigating between Restaurants/Auditors/Templates left every nav item looking identical —
            no visual indication of which screen was currently open.
Root cause: `AdminLayout` is a server component with no access to the current pathname; the nav items'
            `borderLeft` was scaffolded as always `transparent` and the active-state conditional
            (design: `bg:#f0f4f9`, `borderColor:#1e3a5f`, `weight:700` when `superScreen===n.key`) was
            never wired in.
Fix:        Extracted the nav into a client component (`NavLinks.tsx`) using `usePathname()` to compare
            against each link's href and apply the design's active-state background/border/weight.
Guard:      Manual — the nav item matching the current route shows the navy-tinted background and
            left border; the other two do not.
Related:    app/admin/(protected)/layout.tsx, app/admin/(protected)/NavLinks.tsx

History:
- 2026-09-11  opened (debugger-agent diagnostic pass)
- 2026-09-11  fixed + guard added

---

## BUG-006 — Restaurant detail tabs missing their count badges
Status: fixed · Area: admin/restaurants (A2)

Repro:      The Audits/Reports tab labels on a restaurant's detail page rendered as plain text; the
            design shows an inline pill next to each ("N Active", "N this month"/published count).
Root cause: The badges were simply never built — `page.tsx` already computed the active-audit count
            locally but nothing rendered it next to the tab label.
Fix:        Added a `TabBadge` pill to both tabs (Audits: live active-audit count; Reports: published
            count, since report generation itself isn't built yet — see C-series).
Guard:      Manual — both tabs show a count pill; creating a new active audit increments the Audits
            badge on next load.
Related:    app/admin/(protected)/restaurants/[id]/AuditsHeader.tsx

History:
- 2026-09-11  opened (debugger-agent diagnostic pass)
- 2026-09-11  fixed + guard added

---

## BUG-007 — Template Builder missing icons throughout (categories, delete, add, save)
Status: fixed · Area: admin/templates (A4)

Repro:      The Template Builder's metric-category cards had no icon at all; every delete action used a
            plain "✕" character instead of the design's trash icon; "+ Add Metric"/"+ Add Checklist
            Point"/"+ Add Department" used a bare "+" character with no icon or flex layout; "Save
            Template" had no checkmark icon.
Root cause: `MetricCat` (lib/templates/metricCats.ts) never carried an icon reference, and the JSX for
            every add/delete/save action was written with plain text instead of copying the design's
            inline SVGs — a straightforward fidelity gap, not a logic bug.
Fix:        Added `app/admin/(protected)/templates/icons.tsx` with the 7 category icons plus
            trash/plus/circle-plus/checkmark icons, copied verbatim (exact `d` paths) from
            `Super Admin Flow.dc.html` lines 739-844, and wired them into every corresponding element in
            `TemplateBuilder.tsx`.
Guard:      Manual — each of the 7 metric categories shows its distinct icon; every delete control shows
            the trash icon; every add control shows a plus icon; Save Template shows a checkmark.
Related:    Super Admin Flow.dc.html:739-844, app/admin/(protected)/templates/icons.tsx,
            app/admin/(protected)/templates/TemplateBuilder.tsx

History:
- 2026-09-11  opened (debugger-agent diagnostic pass on the template creation flow)
- 2026-09-11  fixed + guard added

---

## BUG-008 — Calculated/total rows missing the "Auto-sum · no input" annotation
Status: fixed · Area: admin/templates (A4)

Repro:      Derived rows (e.g. "Total No Of Pax", "Total Bar Cost", "Total Gross Sale") showed only the
            label and a badge, with no visual cue that the row is non-editable — they could read as an
            incomplete/broken metric row rather than an intentional read-only total.
Root cause: The third column the design uses for this cue (`width:170px`, italic, "Auto-sum · no input")
            was dropped when the derived/after rows were built.
Fix:        Added the third column to both the in-card derived rows and the "after" total rows (e.g.
            Total Gross Sale, Total F&B Cost, Total Net F&B Cost) in `TemplateBuilder.tsx`.
Guard:      Manual — every calculated/derived/total row shows "Auto-sum · no input" in its right-hand
            column.
Related:    Super Admin Flow.dc.html:774-778,784-788, app/admin/(protected)/templates/TemplateBuilder.tsx

History:
- 2026-09-11  opened (debugger-agent diagnostic pass on the template creation flow)
- 2026-09-11  fixed + guard added

---

## BUG-009 — Cost-metric denominator picker was UI we invented, not in the design, and could dangle
Status: fixed · Area: admin/templates (A4)

Repro:      Every Bar/Kitchen/Costing-Other metric row showed a row of denominator pills ("All net
            sales"/"All bar sales"/per sales-metric) that does not exist anywhere in the rendered design
            (confirmed via user screenshot comparison against the actual design tool). Separately: deleting
            a sales metric that another metric's pill pointed at left that reference dangling, silently
            saving a `den` value matching nothing.
Root cause: The design's JS defines `denChoices`/`denPills` (`Super Admin Flow.dc.html:2237-2247`) but
            never consumes them from any markup — dead code in the source, same pattern as the outlet-chips
            and suspend/reactivate controls found earlier in that file. The build treated this dead
            computation as a spec to implement, adding an editable per-metric override that doesn't exist
            in the product and that introduced its own dangling-reference risk.
Fix:        Removed the denominator-picker UI and the per-metric `den` override entirely. Cost metrics now
            always save with their category's fixed denominator (Bar Cost → bar sales, Kitchen Cost →
            food sales, Costing — Other → net sales) — which also eliminates the dangling-reference case,
            since there is no longer an override to dangle.
Guard:      Manual — no denominator pills render under any cost-category metric row; a template saved
            with Bar/Kitchen/Costing-Other metrics loads back with the correct fixed denominator on each
            (verified via `lib/queries/templates.ts` round-trip). `lib/templates/builderCode.test.ts`
            continues to guard the unrelated reference-code renumbering in the same file.
Related:    Super Admin Flow.dc.html:2237-2247, app/admin/(protected)/templates/TemplateBuilder.tsx,
            lib/actions/templates.ts

History:
- 2026-09-11  opened (debugger-agent diagnostic pass found the dangling-reference risk)
- 2026-09-11  fixed (added dangling-reference cleanup on metric removal) — incomplete, see below
- 2026-09-12  regressed/deepened: user screenshot comparison showed the picker itself was never part of
              the design; re-fixed by removing the feature outright rather than patching its edge case

---

## BUG-010 — Template save failure gave no visible feedback
Status: fixed · Area: admin/templates (A4)

Repro:      If `saveTemplate` threw for any reason other than the success-path redirect (e.g. an expired
            session rejected by `requireRole`), the "Save Template" button silently reverted from
            "Saving…" to its normal state with no explanation — the admin would not know the save failed.
Root cause: `onSave` awaited `saveTemplate(...)` inside `startTransition` with no `try/catch`, so any
            thrown error was swallowed by the transition with no error state surfaced to the UI.
Fix:        Wrapped the call in try/catch; `unstable_rethrow` lets the intentional `NEXT_REDIRECT` (the
            success path) continue through untouched, while any other error sets a visible `saveError`
            message next to the Save button.
Guard:      Manual — forcing `saveTemplate` to throw (e.g. simulating a session expiry) shows "Could not
            save the template — try again." instead of silently reverting; a normal save still redirects
            to `/admin/templates` as before.
Related:    app/admin/(protected)/templates/TemplateBuilder.tsx, lib/actions/templates.ts

History:
- 2026-09-11  opened (debugger-agent diagnostic pass on the template creation flow)
- 2026-09-11  fixed + guard added

---

## BUG-011 — Shared Button component's size/padding didn't match the design on almost every screen
Status: fixed · Area: components/ui (Button, admin-wide)

Repro:      Every action button admin-wide (Create, +New Restaurant, +Add Auditor, Manage, Generate,
            Save Template) looked slightly too big/square compared to the design, even after BUG-001
            fixed the missing border — confirmed via a close side-by-side screenshot comparison of the
            Restaurants screen against the design tool.
Root cause: `Button.module.css`'s base `.button` rule used `padding: 13px` (equal on all sides) and
            `font-size: 14px` for every variant. Checking every button's literal style in
            `Super Admin Flow.dc.html` showed this only matches the full-width login "Sign in"/"Log In"
            button (`:54`, `:355`) — every other action button in the file uses `font-size: 13px` with
            asymmetric padding that varies by context (`11px 18px` for Create/+Add Auditor/Create audit
            link, `10px 16px` for +New Restaurant/+New Template, `9px 14px`/`font-size:12px` for the
            row-level Manage action, `10px 14px`/`font-size:12px` for the small Generate buttons).
Fix:        Changed the shared base to `padding: 11px 18px; font-size: 13px` (the majority pattern) and
            added explicit per-context overrides where the design differs: the login page's Sign In
            button (`padding:13px; font-size:14px`, the one real outlier), "+ New Restaurant"
            (`10px 16px`), the auditor row's Manage/Close button and both password Generate buttons
            (`9-10px 14px; font-size:12px`).
Guard:      Manual — button font-size/padding on Restaurants, Auditors (including the expanded row) and
            the Login page match the literal values quoted above from `Super Admin Flow.dc.html`.
Related:    BUG-001 (same component, border), components/ui/Button.module.css,
            app/admin/login/LoginForm.tsx, app/admin/(protected)/restaurants/NewRestaurantForm.tsx,
            app/admin/(protected)/auditors/AuditorsClient.tsx

History:
- 2026-09-12  opened (found via close screenshot comparison after BUG-001/BUG-003 were already fixed)
- 2026-09-12  fixed + guard added

---

## BUG-012 — TextInput's `style` prop sized the `<input>`, not its field wrapper, breaking row layouts
Status: fixed · Area: components/ui (TextInput, admin-wide)

Repro:      The audit-creation form's four fields (Audit name/template/due-date/auditor) didn't match
            the design's proportions or wrap point — confirmed via screenshot comparison. Same root
            cause was present (unnoticed) in the Restaurant creation form and the Auditor creation form.
Root cause: Every call site passes `style={{ flex, minWidth }}` to `<TextInput>` intending to size the
            whole labeled field as one flex item in a row. But `TextInput.tsx` spread `style` (via
            `...props`) onto the inner `<input>` element, not the outer `<div className={styles.field}>`
            wrapper that is the actual flex child in the parent row. The wrapper had no explicit sizing,
            so it fell back to content-based auto sizing — silently breaking every attempt to size a
            field via `style`, with no error since the prop still "worked", just on the wrong element.
Fix:        `TextInput` now applies `style` to the wrapper `<div>` instead of the `<input>` — matching
            what every existing caller already assumed. Gave the audit form's four fields their exact
            design proportions (`flex:1.4/1.4/1.3/1`, `minWidth:220/220/240/150`) and made `SelectField`
            (`AuditsHeader.tsx`) accept per-field `flex`/`minWidth` instead of one hardcoded value shared
            by both selects.
Guard:      Manual — the audit-creation form's fields size proportionally (name/template wider than
            due-date/auditor) and wrap as a whole row, matching `Super Admin Flow.dc.html:474-494`; the
            restaurant and auditor creation forms retain their previously-intended proportions now that
            `style` actually reaches the wrapper.
Related:    components/ui/TextInput.tsx, app/admin/(protected)/restaurants/[id]/AuditsHeader.tsx,
            app/admin/(protected)/restaurants/NewRestaurantForm.tsx,
            app/admin/(protected)/auditors/AuditorsClient.tsx

History:
- 2026-09-12  opened (found via screenshot comparison of the audit-creation form)
- 2026-09-12  fixed + guard added

---

## BUG-013 — Template Builder: missing "Part 1 · Metrics" header, and a double dashed-border/background on calculated rows
Status: fixed · Area: app/admin/(protected)/templates (TemplateBuilder)

Repro:      Screenshot comparison of the Template Builder screen against `Super Admin Flow.dc.html`
            (`sBuilder`) showed two things: (1) the metrics section has no "Part 1 · Metrics" eyebrow +
            summary line above it, unlike the design (`:731-734`); (2) the "Total No Of Pax" /
            "Net Sales at Restaurant" calculated rows render with a visibly heavier border than the
            design's single `1px dashed` box.
Root cause: (1) `TemplateBuilder.tsx` never rendered the "Part 1 · Metrics" header block at all — only
            "Part 2 · Department-wise checklist" existed. (2) The calculated-row label was wrapped in the
            shared `CalculatedField` component, whose `.value` class (`CalculatedField.module.css`) draws
            its own `padding`, `1px dashed var(--border-dashed)` border, and `var(--surface-calculated)`
            background — but the surrounding row `<div>` in `TemplateBuilder.tsx` *already* draws that
            same border/background/padding per the design (`:774`). The two nested boxes stacked,
            producing a doubled border. The design's derived-row label (`:775`) is a plain `flex:1` div
            with no border of its own.
Fix:        Added the "Part 1 · Metrics" eyebrow + `{count} metrics entered by the auditor · totals
            calculated` summary line above the metric categories, matching `:731-734`. Replaced the
            `<CalculatedField>` wrapper on the derived-row label with a plain div (`flex:1, font-weight
            700, color: var(--navy-900)`), matching `:775` — the outer row keeps the single dashed
            border/background. `CalculatedField` itself is unchanged and still correct where it's used
            standalone (auditor Checklist screen).
Guard:      Manual — Template Builder shows "Part 1 · Metrics" with a live count above Volume/Sales/etc.,
            and "Total No Of Pax"/"Net Sales at Restaurant" render with exactly one dashed border, no
            visible doubling, matching `Super Admin Flow.dc.html:731-734,773-778`.
Related:    app/admin/(protected)/templates/TemplateBuilder.tsx, components/ui/CalculatedField.tsx,
            app/auditor/(protected)/checklist/[id]/ChecklistScreen.tsx

History:
- 2026-09-12  opened (found via screenshot comparison of the Template Builder screen)
- 2026-09-12  fixed + guard added

---

## BUG-014 — Templates list always showed 0 metrics/departments/checkpoints, even when the template had content
Status: fixed · Area: lib/queries/templates.ts (listTemplates)

Repro:      The Checklist Templates list (`/admin/templates`) showed METRICS/DEPARTMENTS/CHECKPOINTS as
            0/0/0 for every template, even "Testing 1" — which the Template Builder itself showed had
            17 metrics, 2 departments and 4 checkpoints. Confirmed by querying `template_metrics` /
            `template_departments` / `template_checklist_points` directly: the rows genuinely exist.
Root cause: `listTemplates`'s three correlated-subquery counts each compared
            `${templateMetrics.templateId}` (etc.) against a bare `${templates.id}` interpolated into the
            raw `sql` template. Drizzle rendered `templates.id` unqualified as `"id"` rather than
            `"templates"."id"` — and every one of the three child tables (`template_metrics`,
            `template_departments`, `template_checklist_points`) has its own primary key column also
            named `"id"`. Inside each correlated subquery, Postgres resolved the unqualified `"id"` to
            that subquery's own inner table's `id` column (the nearest scope), not the outer `templates`
            row — so every count query effectively ran `where template_id = id` (an unrelated PK), which
            never matches, silently returning 0 for every template regardless of content.
Fix:        Explicitly qualified the outer reference as `${sql.raw('"templates"."id"')}` in all three
            subqueries, forcing the comparison against the correct outer-table column. Verified against
            the live dev DB: "Testing 1" now reports 17/2/4, "Testing 2" reports 2/1/0, matching the rows
            actually in the tables.
Guard:      Manual — after adding metrics/departments/checkpoints to a template in the Builder and
            saving, the Templates list card immediately reflects the real counts, not 0/0/0. Watch for
            the same unqualified-column trap in any future correlated subquery written with Drizzle's
            `sql` tag against a table that shares a column name with the outer table (virtually every
            table, via `id`) — qualify both sides explicitly rather than trusting Drizzle to infer it.
Related:    lib/queries/templates.ts, db/schema (template_metrics/template_departments/
            template_checklist_points all use a generic `id` PK)

History:
- 2026-09-12  opened (found via screenshot comparison of the Templates list against real Builder content)
- 2026-09-12  fixed + guard added

## BUG-015 — Submit gate accepted fail/observation/N-A points with no remark
Status: fixed · Area: auditor/checklist (B5 submit gate)

Repro:      Mark a checklist point Fail (or Observation, or N-A) and leave its remark blank, then answer
            every other point and fill every MTD figure — Submit still enabled and completed. A bare N-A
            with no reason selected also submitted.
Root cause: `submitDisabled`/`submitAudit`'s completeness check was ported verbatim from the Super Admin
            file's own `submitDisabled` (~line 2127), which only tests `status !== 'pending'` — the mock
            itself never enforces the remark/reason requirement anywhere in its submit path. EXECUTION.md
            B3's own done-when ("fail, observation and N-A require a remark... N/A requires a reason from
            the fixed five") was correctly built into the *entry* UI (B3) but never carried into B5's gate,
            so a point could be marked non-pass, left blank, and still count as "answered".
Fix:        `isItemAnswered` (`ChecklistScreen.tsx`, mirrored server-side in `submitAudit`) now requires a
            non-empty remark on fail/observation/na, and a set `naReason` on na, before counting a point as
            done. The submit-gate jump-to-first-incomplete now targets the first point failing this check,
            not just the first `pending` one.
Guard:      Unit-level via the same logic path both sides share; manual — marking a point Fail with an
            empty remark keeps Submit in "Complete 1 more checklist item" state; filling the remark (and,
            for N-A, picking a reason) is what flips it to answered.
Related:    UX-009, EXECUTION.md R10, app/auditor/(protected)/checklist/[id]/ChecklistScreen.tsx,
            lib/actions/checklist.ts

History:
- 2026-09-12  opened (found while wiring B6, which assumes every non-pass point already has a remark to
              polish)
- 2026-09-12  fixed + guard added

## BUG-016 — Metrics step overflows horizontally on mobile
Status: fixed · Area: auditor/checklist (B2 Metrics step)

Repro:      Open the Metrics step at a 375px mobile viewport (verified via Playwright screenshot of a
            live QA account) — the section header row, tab labels, and every metric row overflow past
            the right edge of the auditor shell's mobile card, leaving a horizontal scrollbar. B1's
            pending list and B3's checklist tab render correctly at the same width; only B2 is affected.
Root cause: Each metric row's three-column layout (flexible label + a fixed 134px value column + a
            separate fixed 94px "sub" column for the APC/cost-% figure) was carried over from the Super
            Admin file's admin-only review-screen markup, a desktop-only context with much more
            available width. The auditor mobile shell's card caps out around 340px of usable content
            width after outer/inner padding — 134+94+20px of gaps alone (248px) left almost nothing for
            the label, and long labels ("Perishables and Provision") pushed the row past the viewport.
Fix:        Dropped the separate 94px sub column. The sub figure (APC / cost %) now renders directly
            under the value column (input or calculated field), right-aligned, in the same flex-shrink:0
            block; the value column itself narrowed from 134px to 100px. Label keeps `flex:1;
            minWidth:0` so it wraps instead of forcing overflow.
Guard:      Playwright screenshot at 375×800 (chromium, `--viewport-size=375,700` or the `playwright`
            npm package) of `/auditor/checklist/[id]` — no row extends past the card's right edge, no
            horizontal scrollbar.
Related:    app/auditor/(protected)/checklist/[id]/ChecklistScreen.tsx, DESIGN.md Part A "Metric section
            (B2)" entry (widths there need updating to match)

History:
- 2026-09-12  opened (found via a scripted mobile-viewport walkthrough after being asked whether
              responsive design works)
- 2026-09-12  fixed + guard added

## BUG-017 — "Create audit link" Auditor dropdown empty for any outlet with no explicit auditor-outlet link
Status: fixed · Area: admin/restaurants (Create audit link panel)

Repro:      On a restaurant's Audits tab, open "+ New Audit" — the Auditor `<select>` shows only the
            disabled "Select…" placeholder, with no auditors listed, even though active auditors exist
            in the org. Reported via screenshot from Restaurant 1 (0 audits, 0 auditors linked to it).
Root cause: `RestaurantDetailPage` populated the dropdown from `listActiveAuditorsForOutlet`, which
            inner-joins `auditorOutlets` and only returns auditors explicitly linked to *this* outlet.
            Super Admin Flow.dc.html:2411 (`activeAuditorNames = s.auditors.filter(active)`) shows the
            design lists ALL active auditors org-wide in this selector, unfiltered by outlet — outlet
            links are a separate concept (which outlets an auditor's login can access), not a
            restriction on who an admin can assign here. Any outlet with no `auditorOutlets` row got an
            empty, effectively broken dropdown.
Fix:        Added `listActiveAuditors(orgId)` (all active `role:'auditor'` users in the org, ordered by
            name) and pointed the restaurant detail page at it instead of the outlet-scoped query.
            Removed the now-unused `listActiveAuditorsForOutlet`.
Guard:      Manual check (no DB-integration test harness yet) — an outlet with zero `auditorOutlets`
            rows still lists every active auditor in the "Create audit link" dropdown. Revisit once F3's
            successor adds integration tests: assert `listActiveAuditors` ignores `auditorOutlets`
            entirely.
Related:    lib/queries/auditors.ts, app/admin/(protected)/restaurants/[id]/page.tsx

History:
- 2026-09-12  opened (reported via screenshot: dropdown showed only "Select…")
- 2026-09-12  fixed — query no longer scoped to outlet-linked auditors

## BUG-018 — "New Audit" insert failed: `column "report_generated_at" of relation "audits" does not exist`
Status: open · Area: db/migrations (dev environment drift)

Repro:      On a restaurant's Audits tab, submit "+ New Audit" with a valid outlet/auditor/template —
            request 500s. Next's error overlay only shows the wrapped Drizzle message ("Failed query:
            insert into audits ... returning id") with no visible cause.
Root cause: `db/schema/audits.ts` was edited to add `reportGeneratedAt`, `publishedAt`, `version`,
            `polishState` (and the corresponding `db/migrations/0001`-`0004_*.sql` files were generated),
            but the migrations were never applied to the dev database — confirmed by running the exact
            insert directly: Postgres returned `PostgresError 42703: column "report_generated_at" of
            relation "audits" does not exist`. The live `audits` table is still shaped like migration
            `0000`. Not a code bug in `createAudit` — the query and params are correct for the current
            schema; the DB just hasn't caught up to it. Next's overlay hides the real cause because
            postgres-js/Drizzle puts the driver error on `error.cause`, which the overlay doesn't surface.
Fix:        Run `npm run db:migrate` to apply the four pending migrations to the dev database. No
            application code changes needed.
Guard:      Manual — after migrating, `\d audits` (or a Drizzle query) shows `report_generated_at`,
            `published_at`, `version`, `polish_state` columns present, and "+ New Audit" submits
            successfully. Longer-term: consider a startup/dev-server check (or CI step) that fails fast
            when `drizzle-kit` reports pending migrations, so schema drift surfaces before a 500 does.
Related:    db/schema/audits.ts, db/migrations/0001_tranquil_kulan_gath.sql through
            0004_youthful_jubilee.sql, lib/actions/audits.ts

History:
- 2026-09-12  opened (found via user-reported runtime error overlay; root cause confirmed by running the
              insert directly against the dev DB, which surfaced the underlying PostgresError)

## BUG-019 — Audit link hardcoded to unregistered domain `audit.fnbcontroller.com`
Status: fixed · Area: app/admin/(protected)/restaurants/[id] (auditUrl)

Repro:      On a restaurant's Audits tab, "Create audit link" / the audit URL shown for an active audit
            always rendered as `https://audit.fnbcontroller.com/a/<token>`. That subdomain has no DNS
            record, so the link is unreachable in every environment, including local dev.
Root cause: `auditUrl.ts` returned a string-literal `https://audit.fnbcontroller.com` base with no way to
            override it per environment — the domain isn't provisioned yet, so any environment hits the
            same dead host. Checked the rest of the codebase (`grep` for `fnbcontroller.com` and
            `localhost:3000` across `app/`, `lib/`, `scripts/`) — the only other hardcoded-domain hits are
            unrelated placeholder emails (`LoginForm.tsx`, `AuditorLoginForm.tsx`, `seed-admin.ts`), not
            links, so this was the sole hardcoded audit link.
Fix:        `auditUrl()` now builds from `process.env.NEXT_PUBLIC_APP_URL`, falling back to
            `http://localhost:3000` when unset, so the link works locally today and only needs
            `NEXT_PUBLIC_APP_URL=https://audit.fnbcontroller.com` set in production once that domain is
            live — no code change at cutover.
Guard:      Manual — with `NEXT_PUBLIC_APP_URL` unset, the rendered link starts with
            `http://localhost:3000/a/`; setting the env var to another origin changes the rendered link
            to match, with no other code touched.
Related:    app/admin/(protected)/restaurants/[id]/auditUrl.ts, .env.example (add
            `NEXT_PUBLIC_APP_URL=http://localhost:3000`). Note: the `/a/[token]` route this link points to
            does not exist yet in `app/` — visiting the corrected localhost link will still 404 until that
            route ships (tracked separately, not part of this fix).

History:
- 2026-09-12  opened (user reported DNS_PROBE_FINISHED_NXDOMAIN on the copied audit link)
- 2026-09-12  fixed — auditUrl() reads NEXT_PUBLIC_APP_URL with a localhost fallback

## BUG-020 — Service Charge always "Needs data" on the report, silently folded into Total Taxes
Status: fixed · Area: app/admin/(protected)/templates/TemplateBuilder, lib/calc/metrics, lib/report/financialDraft

Repro:      Build a template's Taxes category with Service Charge + statutory tax rows (SGST/CGST/VAT),
            capture an audit, generate the report: Section 1's Bar Sale/Service Charge cells (and the
            Kitchen row's Service Charge/Gross Sale/APC) show "Needs data" even though the auditor entered
            a Service Charge value — and Total Taxes is inflated by exactly that amount.
Root cause: `computeMetrics` (lib/calc/metrics.ts) buckets `section:'tax'` rows into totalCharges only
            when `kind==='charge'`, everything else into totalTaxes. But Template Builder's "Add Metric to
            Taxes" always saved every row with the category's fixed default, `kind:'tax'` — there was no
            way to mark a row as a service charge, so a captured Service Charge value was summed into
            totalTaxes instead of totalCharges, leaving totalCharges permanently null for every template
            built through the UI (the only correctly-tagged example was a hand-authored test fixture).
            `buildFinancialReportDraft`'s per-revenue-group Service Charge/Gross Sale/APC then compound
            that null via `multiplyFigures`/`addFigures`, which needed-data-propagate correctly once the
            input itself was wrong.
Fix:        Added a per-row Statutory tax / Service charge choice to Taxes-category rows in
            TemplateBuilder, and extracted the metric→save-payload mapping into a pure
            `toMetricInput()` (lib/templates/metricCats.ts) so a taxes-category row's own `kind`
            selection is saved, not the category default. Directly corrected the existing "Tempalte 1"
            template's Service Charge row to `kind:'charge'` (db, `template_metrics`), and the one
            in-flight audit already assigned from it (submitted, not yet published) — per the
            template-snapshot invariant that audit had its own frozen copy of the row and needed a
            separate correction, safe here only because it isn't published yet.
Guard:      lib/templates/metricCats.test.ts — a 'taxes' row marked "charge" saves with kind:'charge', one
            marked "tax" saves with kind:'tax', and a non-taxes category ignores the row's kind and uses
            the category default.
Related:    lib/calc/metrics.ts (totalCharges/totalTaxes split), lib/report/financialDraft.ts (revenue
            matrix), Super Admin Flow.dc.html (the design source itself has the same builder gap — its
            `addBuilderMetric`/`METRIC_CATS` also hardcode `kind:'tax'`; only its seed data's Service
            Charge row is hand-tagged `charge`), BUG-021 (same root pattern, Sales category/revGroup)

History:
- 2026-09-12  opened (user reported "Needs data" for Service Charge/Bar Sale on a report despite the
  source metrics having values)
- 2026-09-12  fixed — per-row kind selector in Template Builder's Taxes category + toMetricInput() guard
- 2026-09-13  data-corrected "Tempalte 1" and its one in-flight audit directly (kind:'charge' on Service
  Charge), at user request

## BUG-021 — Bar Sale always "Needs data" — every sales metric silently saved as Kitchen revenue
Status: fixed · Area: app/admin/(protected)/templates/TemplateBuilder, lib/calc/metrics

Repro:      Build a template's Sales category with Food/Beverage/Liquor rows, capture an audit: the
            report's Bar Sale KPI (and the revenue matrix's Bar row) always shows "Needs data", and
            Kitchen Sale silently includes every sales metric — Beverage and Liquor included.
Root cause: Same pattern as BUG-020, one category over: `computeMetrics` (lib/calc/metrics.ts) buckets
            `section:'sales'` rows into barSale only when `revGroup==='bar'`; TemplateBuilder's "Add
            Metric to Sales" always saved every row with the category's fixed default, `revGroup:'kitchen'`
            — there was no way to mark a row as bar revenue, so barSale was permanently null for every
            template built through the UI. The design source has the identical gap (its
            `addBuilderMetric`/`METRIC_CATS` also hardcode `revGroup:'kitchen'` for sales; only its seed
            data hand-tags Liquor/Beverage as `bar`).
Fix:        Added a per-row Kitchen revenue / Bar revenue choice to Sales-category rows in TemplateBuilder,
            wired through the same `toMetricInput()` (lib/templates/metricCats.ts) added for BUG-020.
            Directly corrected "Tempalte 1"'s Beverage Sales and Liquour Sales rows to `revGroup:'bar'`
            (db, `template_metrics`), and its one in-flight audit's frozen snapshot (`audit_metric_defs`),
            same as BUG-020 — at user request, per their call that Food is kitchen revenue and
            Beverage+Liquor are bar revenue for this template.
Guard:      lib/templates/metricCats.test.ts — a 'sales' row marked "bar" saves with revGroup:'bar', one
            marked "kitchen" saves with revGroup:'kitchen', and a non-sales category ignores the row's
            revGroup and uses the category default.
Related:    BUG-020 (same root pattern), lib/calc/metrics.ts (barSale/kitchenSale split)

History:
- 2026-09-13  opened (found while investigating BUG-020 — Bar Sale was "Needs data" in the same report)
- 2026-09-13  fixed — per-row revGroup selector in Template Builder's Sales category + toMetricInput()
  guard extended; "Tempalte 1" and its in-flight audit data-corrected directly

## BUG-022 — Restaurant detail: submitted audits invisible in Audits tab, Reports tab hardcoded empty, and a "Review Queue" nav item with no design basis
Status: fixed · Area: app/admin/(protected)/restaurants/[id], app/admin/(protected)/review, lib/queries

Repro:      An auditor submits an audit. The super admin opens Restaurants → that restaurant: the Audits
            tab still shows only the (now-empty) active list — the submitted audit is nowhere on the
            page — and the Reports tab always renders "Report generation ships with the C-series
            packages — nothing to show yet.", even after a report has been published for that outlet.
            Separately, the sidebar has a top-level "Review Queue" link with no equivalent in
            `Super Admin Flow.dc.html`'s `superNav` (only Restaurants/Auditors/Templates).
Root cause: `restaurants/[id]/page.tsx` only ever rendered `activeAudits(audits)` — submitted and
            published rows were fetched (`listOutletAudits`) but never filtered into their own groups or
            rendered, and the Reports tab branch was a literal placeholder string left over from before
            C5 shipped, never wired to the `reports` table. Per `Product Spec - Flow, Screens & Stories
            .dc.html:171` ("Audits tab lists audits in three groups: active…, submitted and awaiting
            review…, and audit history") and EXECUTION.md's A2 "done when", the Audits tab should group
            active/submitted/history and the Reports tab should list published reports — neither was
            built. The standalone `/admin/review` listing page and its "Review Queue" nav entry were
            never part of the design's `superNav`; `sReviewQueue` exists as dead, unreachable state in
            the mock (nothing in the mock's click handlers ever navigates to it as an entry point), so
            wiring it into the app's top nav was a design deviation, not a documented one.
Fix:        `restaurants/[id]/page.tsx` now groups the outlet's audits into Active / Submitted — awaiting
            review (each row links to `/admin/review/[id]`) / History (each row links to
            `/admin/review/[id]/report`), via new `submittedAudits`/`auditHistory` helpers in
            `lib/queries/audits.ts`. The Reports tab now queries real published reports via new
            `lib/queries/reports.ts::listOutletReports` and lists them (template, version, published date,
            "View report" link) instead of the hardcoded placeholder. Removed the "Review Queue" nav item
            (`NavLinks.tsx`) and the now-unreachable `/admin/review` listing page + its
            `listReviewQueue` query; the review-a-submitted-audit screen (`/admin/review/[id]`) is
            unchanged and now reached from the restaurant's Submitted group, with its "back" link pointed
            at the restaurant detail page instead of the removed queue. `publishAudit` now revalidates
            the restaurant detail path instead of the removed `/admin/review` path.
Guard:      Manual — submit an audit, confirm it appears under the outlet's "Submitted — awaiting review"
            group with a working Review link; publish it, confirm it moves to History with a "View
            report" link and appears in the Reports tab; confirm no "Review Queue" nav item and no
            `/admin/review` route remain (no automated e2e harness yet, per ROADMAP Phase 4).
Related:    EXECUTION.md A2 ("done when" — Audits tab grouping, Reports tab), C1 (review), C5 (publish),
            Product Spec - Flow, Screens & Stories.dc.html:171, Super Admin Flow.dc.html (superNav,
            rdActive/rdSubmitted/rdHistory), DESIGN.md UX-020 (Reports tab month grouping)

History:
- 2026-09-13  opened (user reported no reports/submitted audits visible; flagged the sidebar "Review
  Queue" as absent from the design)
- 2026-09-13  fixed + guard added
- 2026-09-13  extended: after the fix, user pointed out the Reports tab still didn't match the design's
  month-grouped view (`Super Admin Flow.dc.html` REPORT_MONTHS/rdMonths). Investigated those constants —
  they're hand-authored fake seed data (three invented months/report names, no trace to real audits), not
  a computed model, and there's no `cadence`/month field on `audits` or MTD-rollup report type documented
  anywhere. Asked the user to choose between (a) grouping already-published reports by their real publish
  month, or (b) building a genuine new MTD-consolidated-report feature (new schema + aggregation logic).
  User chose (a). Added month tabs to the Reports tab, derived from `reports.publishedAt` (no fixed month
  list, no schema change) — see DESIGN.md UX-020.
- 2026-09-13  extended again: user pointed out the grouping key was still wrong — an audit covering
  1–31 Aug should file under August even if it's reviewed/published in September, so `publishedAt` was
  the wrong field. Switched grouping to the audit's own `dueStart` (falling back to `dueDate`) via a new
  shared `periodMonthKey` helper (`lib/queries/reports.ts`). The user also asked for the design's real MTD
  consolidated report (a live cumulative rollup — "Week 1 alone" → "Week 1 + Week 2" as more of the month
  publishes), which is a genuinely new feature, not a grouping fix — see ADR-0006 and DESIGN.md UX-021 for
  that decision and its build (`lib/report/mtdViewModel.ts`, new route
  `restaurants/[id]/mtd/[month]`). Verified the aggregation against the org's one real published audit —
  merged output matched that audit's own totals exactly.

## BUG-023 — Printed/exported audit report: admin chrome leaked in, tables clipped at the page edge, and page 1 was left mostly blank
Status: fixed · Area: app/admin/(protected)/layout, app/admin/(protected)/review/[id]/report, lib/report/renderReportPdf

Repro:      Printed the report at `/admin/review/[id]/report` (browser print / "PDF reports testing/F&B
            Controller.pdf"): the left "Super Admin" sidebar nav and top `AppHeader`/"SUPER ADMIN" badge
            rendered on every page; the Sales & Per-Customer Revenue Matrix, Costing table, and Department
            Checklists & Compliance Matrix tables were all cut off at the right edge of the page instead of
            fitting the page width; and page 1 showed only the report title block, with a large blank area
            below it before Section 1's content started on page 2.
Root cause: (1) `app/admin/(protected)/layout.tsx`'s sidebar `<div>` and `<AppHeader>` had no `data-noprint`
            marker, so they printed along with the nested `/report` page — only the page's own inline header
            was marked. (2) `RevenueMatrix.tsx`, `CostingTable.tsx`, and `ComplianceSection.tsx` wrapped
            their tables in `overflow-x:auto` containers with `width:100%` tables — browsers don't shrink a
            table below its content's intrinsic width just because of `width:100%`, so once column content
            exceeded the printable width the overflow was silently clipped rather than reflowed (confirmed by
            reproducing the exact clip against the real Playwright `page.pdf()` pipeline, not just the browser
            print path). (3) `lib/report/renderReportPdf.tsx`'s `buildHtmlDocument` only inlined
            `styles/tokens.css`, never `app/globals.css`'s `[data-noprint]`/`[data-avoid]`/`[data-break]` print
            rules, so those attributes already used in `ReportBody`/`ComplianceSection` did nothing during
            actual PDF generation. (4) `ReportBody.tsx` wrapped the entire Section 1 (KPI strip + Revenue
            Matrix + both composition donuts) in one `data-avoid` block — too tall to avoid breaking as a
            single unit, so whenever it didn't fit in the space left on page 1 after the title, the whole
            block moved to page 2, leaving page 1 mostly empty below the header.
Fix:        Marked the admin layout's sidebar and `AppHeader` `data-noprint`. Switched all three report
            tables to `table-layout:fixed` with explicit per-column width percentages so columns respect the
            page width and wrap instead of overflowing (verified against a real `page.pdf()` render: the
            8-column Revenue Matrix now fits on one Letter page with nothing clipped). Inlined the
            `data-noprint`/`data-avoid`/`data-break` print rules directly into `renderReportPdf.tsx`'s
            generated stylesheet. Split Section 1's single `data-avoid` block into smaller per-card
            `data-avoid` units (KPI strip, Revenue Matrix, the donut-chart row) so content flows starting on
            page 1 and only the piece that doesn't fit pushes to the next page. Follow-up (still cut off +
            too much blank space, see UX-022): the Compliance Matrix's SLA cell still had `whiteSpace:
            'nowrap'`, which under the new `table-layout:fixed` column widths meant long values ("Within 5
            Business Days") no longer wrapped and instead overflowed past the department card's
            `overflow:hidden` boundary, getting visibly clipped again — removed the `nowrap` and widened the
            SLA/Evidence columns slightly. Separately, each department card's whole-card `data-avoid`
            (matching the mock, `Audit report v4.dc.html:439` etc.) pushed any department that didn't quite
            fit the remaining page space entirely onto the next page, wasting most of the page it left —
            moved `data-avoid` down to just the department's small header row and let the table body break
            normally between pages (the browser already repeats `<thead>` at a table page-break, confirmed
            working for the one department long enough to span two pages).
Guard:      Manual — rendered a real `page.pdf()` against the report's markup structure and confirmed (a) no
            sidebar/header chrome present, (b) the Revenue Matrix's 8 columns all fit within the Letter page
            margins with no clipping, (c) Section 1 content begins filling page 1 immediately after the
            title instead of jumping to page 2, (d) the Compliance Matrix's SLA column wraps instead of
            overflowing, (e) department cards pack tightly against the page boundary instead of jumping
            whole to the next page when they'd almost fit. Browser-native print header/footer (date/time,
            URL, page count) is a per-browser Print dialog setting, not something CSS/JS can suppress — it
            only appears via `window.print()`/Cmd+P, not via the real "Publish" action's Playwright
            pipeline, which never navigates to a live URL.
Related:    app/admin/(protected)/layout.tsx, app/admin/(protected)/review/[id]/report/ReportBody.tsx,
            RevenueMatrix.tsx, CostingTable.tsx, ComplianceSection.tsx, lib/report/renderReportPdf.tsx,
            DESIGN.md UX-022

History:
- 2026-09-13  opened (user reported the tested PDF had no formatting, showed the admin sidebar, and had
  content cut off)
- 2026-09-13  fixed — data-noprint on admin chrome, table-layout:fixed on report tables, print CSS inlined
  into the Playwright HTML, and smaller data-avoid units in Section 1
- 2026-09-13  regressed/deepened: user reported page 1 still mostly blank after the first fix; traced to
  Section 1's single oversized data-avoid block and split it into per-card units
- 2026-09-13  regressed/deepened again: user reported the Compliance Matrix's SLA values were still cut off
  and pages still had a lot of empty space; fixed the SLA cell's stale `whiteSpace:nowrap` and relaxed
  department-card `data-avoid` to just the header row (DESIGN.md UX-022)

## BUG-024 — Publish failed: "Attempted to call EvidenceThumb() from the server but EvidenceThumb is on the client"
Status: fixed · Area: app/admin/(protected)/review/[id]/report, lib/report/renderReportPdf

Repro:      On a submitted audit's review screen, click "Confirm publish" — the action fails and the error
            overlay shows "Attempted to call EvidenceThumb() from the server but EvidenceThumb is on the
            client. It's not possible to invoke a client function from the server, it can only be rendered
            as a Component or passed to props of a Client Component." No report is generated.
Root cause: `renderReportPdf.tsx` dynamically imports `react-dom/server` and calls `renderToStaticMarkup`
            directly on the `ReportBody` tree — required because a Server Action module can't statically
            import `react-dom/server` (it owns RSC rendering itself), so this runs entirely outside Next's
            own RSC pipeline. `ComplianceSection` renders evidence photos via `EvidenceThumb`
            (`EvidenceLightbox.tsx`), a `'use client'` component providing the click-to-zoom modal. Outside
            Next's RSC renderer, the compiled client-reference stub Next substitutes for a `'use client'`
            export can't be invoked as a plain function — only Next's own RSC serialization step knows how
            to resolve it — so the static-markup render threw on every publish attempt. The live review
            page never hit this because it renders through Next's normal RSC pipeline, which handles client
            boundaries correctly.
Fix:        Added `EvidenceThumbStatic.tsx` — a plain (non-`'use client'`) presentational thumbnail with no
            hooks/interactivity, since `EvidenceLightbox.tsx`'s own comment already notes the modal is inert
            once rasterized for print. Threaded an `interactive` boolean (default `true`) from `ReportBody`
            down through `ComplianceSection` → `DepartmentCard` → `ComplianceRow`, which picks
            `EvidenceThumb` when `true` and `EvidenceThumbStatic` when `false`. `renderReportPdf.tsx` now
            passes `interactive={false}` to `ReportBody`, so the Playwright/static-markup path never touches
            the client component; the live review page keeps the interactive lightbox unchanged.
Guard:      Manual — "Confirm publish" on a submitted audit with evidence photos completes and produces a
            PDF instead of throwing; the live review/report screen still opens the zoom modal on a thumbnail
            click. `npx tsc --noEmit` passes. No automated PDF-generation test harness yet (Phase 4 adds
            e2e per ROADMAP.md) — watch for the same failure mode (a `'use client'` component reached from
            any `react-dom/server` static-markup call) in any future addition to the `ReportBody` tree.
Related:    app/admin/(protected)/review/[id]/report/EvidenceLightbox.tsx,
            app/admin/(protected)/review/[id]/report/EvidenceThumbStatic.tsx,
            app/admin/(protected)/review/[id]/report/ComplianceSection.tsx,
            app/admin/(protected)/review/[id]/report/ReportBody.tsx, lib/report/renderReportPdf.tsx

History:
- 2026-09-22  opened (user reported "Confirm publish" failing with the EvidenceThumb server/client error)
- 2026-09-22  fixed + guard added

## BUG-025 — Auditor portal shows "OVERDUE" on audits whose date range has simply passed
Status: fixed · Area: db/schema/audits, lib/queries/audits, lib/actions/audits, app/auditor/(protected)/pending, docs/decisions

Repro:      Admin creates an audit link with an "Audit due date range" whose end date is in the past (the
            normal case for a recurring weekly/monthly/daily audit cadence agreed with the auditor — the
            range describes which period to audit, not a deadline to submit by). The auditor's pending
            list marks that audit `● OVERDUE`, even though nothing is actually late.
Root cause: The range was modelled and named as a due date (`audits.dueStart`/`dueDate`) from the design
            mock's own labelling and its `overdue: a.dueDate < TODAY` mock logic, and
            `lib/queries/audits.ts::isOverdue` implemented that literally. But the range is actually the
            audit-conduct window the restaurant contracts the auditor for — the same field ADR-0006/
            UX-020 already treat as "the period the audit covers" for report grouping. Once the window's
            end date passed, every audit still `assigned`/`in-progress` was flagged overdue regardless of
            whether it was actually late.
Fix:        Renamed `audits.dueStart`/`dueDate` to `audits.periodStart`/`periodEnd` (migration
            `0006_amazing_frank_castle.sql`) across the schema, `createAudit`, `lib/queries/audits.ts`,
            `lib/queries/review.ts`, and `lib/queries/reports.ts`, and removed `isOverdue` and
            `OverdueMarker` entirely — there is no deadline concept on an audit to compute one from. Admin
            form label changed to "Audit date range"; auditor-portal "Due {date}" labels changed to
            "Period {date}". See ADR-0008.
Guard:      Manual — create an audit whose date range ends in the past; the auditor's pending list shows
            it as a normal assigned/in-progress row with no overdue marker, sorted by period end as
            before. `npx tsc --noEmit` and `npm run lint` pass (pre-existing unrelated lint error in
            `AuditsHeader.tsx:207` untouched). Watch for any future re-introduction of an "overdue"/"past
            due" check against `periodEnd` — it is a coverage period, not a deadline; a real deadline
            needs its own field and its own ADR.
Related:    db/schema/audits.ts, db/migrations/0006_amazing_frank_castle.sql, lib/queries/audits.ts,
            lib/queries/review.ts, lib/queries/reports.ts, lib/actions/audits.ts,
            app/admin/(protected)/restaurants/[id]/AuditsHeader.tsx,
            app/auditor/(protected)/pending/page.tsx, docs/decisions/0008-audit-date-range-is-a-period-not-a-deadline.md

## BUG-026 — Published PDF's evidence photo thumbnails aren't clickable
Status: fixed · Area: lib/storage, lib/report/reportViewModel, app/admin/(protected)/review/[id]/report

Repro:      Publish an audit, open the resulting PDF (e.g. in Preview.app or a browser), click a
            checkpoint's evidence photo thumbnail in the Evidence column — nothing happens.
Root cause: Two compounding issues. (1) `EvidenceThumbStatic` — the non-interactive thumbnail used only
            in the Playwright/PDF render path (`ComplianceSection.tsx` with `interactive={false}`) — was
            a plain `<div>` with an `<img>` inside, no `<a href>`, so there was nothing for Chromium's
            print-to-PDF to turn into a clickable link annotation (the interactive web version's
            click-to-zoom modal is inert once rasterized to print anyway, per UX-017). (2) Even with a
            link, `reportViewModel.ts` generated the photo's Supabase Storage signed URL with the storage
            layer's default 1-hour TTL (`lib/storage/index.ts`), baked into the PDF at publish time — a
            link would have 404'd within an hour, since a published PDF is meant to be opened much later.
Fix:        Added `REPORT_EVIDENCE_URL_TTL_SECONDS` (10 years) in `lib/storage/index.ts`, used only by
            `reportViewModel.ts`'s evidence-photo `createSignedUrl()` call (the general 1-hour default is
            unchanged everywhere else, e.g. the pre-publish review screen). Wrapped
            `EvidenceThumbStatic`'s thumbnail in `<a href={photo.url} target="_blank">` so Chromium's
            print-to-PDF preserves it as a real clickable link. See ADR-0009 for the options considered
            (a report-token redirect route; a public bucket) and why long-lived signed URLs was chosen.
            Scope: new publishes only — already-published PDFs are not retroactively fixed.
Guard:      Manual — publish a fresh test audit, open the PDF, click an evidence thumbnail, confirm the
            full photo opens in a new tab; re-check after the old 1-hour TTL would have elapsed to
            confirm the long TTL is actually in effect (not just working by coincidence within the hour).
            `npm run build` passes (typecheck).
Related:    ADR-0009, docs/DESIGN.md UX-017 (superseded in part), UX-025, lib/storage/index.ts,
            lib/report/reportViewModel.ts,
            app/admin/(protected)/review/[id]/report/EvidenceThumbStatic.tsx

History:
- 2026-09-22  opened
- 2026-09-22  fixed + guard added

History:
- 2026-09-22  opened (user reported the audit date range being treated as a due date, showing OVERDUE
  in the auditor portal when it shouldn't)
- 2026-09-22  fixed + guard added

<!-- Next real bug starts at BUG-027. -->

## BUG-027 — Publish failed on Vercel: `Cannot find module '.../playwright-core/browsers.json'`
Status: fixed · Area: lib/report/renderReportPdf, lib/actions/publish (C5 publish pipeline)

Repro:      "Confirm publish" on a submitted audit worked in local dev but failed on the deployed Vercel
            app with `Error: Failed to load external module playwright-9b51c99ca474dcf1: Error: Cannot
            find module '/var/task/node_modules/playwright-core/lib/coreBundle.js`.
Root cause: `renderReportPdf.tsx` called `chromium.launch()` from the full `playwright` package inside a
            Server Action, which becomes a Vercel serverless function. Full `playwright` needs its
            downloaded browser binary plus `browsers.json` on disk at runtime; Next's file tracer has no
            static way to see those (they're resolved dynamically, not via a traceable `require`), so
            neither is bundled into the deployed function — and even if bundled, a normal desktop Chromium
            build has no matching system libraries in Vercel's Lambda-based runtime. Full Playwright is
            built for CI/dedicated-server use, not serverless functions.
Fix:        Swapped the runtime dependency to `playwright-core` (no bundled browser) + `@sparticuz/chromium`
            (a Lambda-compatible headless Chromium build). Added `launchChromium()` in `renderReportPdf.tsx`,
            which uses `@sparticuz/chromium`'s `executablePath()`/`args` when `process.env.VERCEL` or
            `AWS_LAMBDA_FUNCTION_NAME` is set, and falls back to a locally-installed browser (via the
            `playwright` devDependency's `chromium.executablePath()`) otherwise. `next.config.ts` marks both
            packages `serverExternalPackages` so Next doesn't try to trace/bundle them. Added
            `maxDuration = 60` to the review page (`app/admin/(protected)/review/[id]/page.tsx`) so the
            `publishAudit` Server Action isn't cut off by Vercel's default function timeout while Chromium
            renders the PDF.
Guard:      `npm run build` passes (typecheck, `serverExternalPackages` accepted). Manual — publish an
            audit locally (uses the dev-installed Chromium) and on the deployed Vercel app (uses
            `@sparticuz/chromium`); both must produce a downloadable PDF with no `browsers.json`/module
            error. Watch for any future prod dependency on full `playwright` re-introducing this — it must
            stay a `devDependency` only.
Related:    ADR-0010, package.json, lib/report/renderReportPdf.tsx, next.config.ts,
            app/admin/(protected)/review/[id]/page.tsx, lib/actions/publish.ts

History:
- 2026-09-26  opened (user reported the error from a Vercel deploy log)
- 2026-09-26  fixed + guard added

