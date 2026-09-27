# CLAUDE.md

## What this is
**F&B Controller** is a cloud SaaS audit platform for one F&B controls firm, delivered as two interfaces
over one RBAC-governed Postgres database: an internal, mobile-first **Auditor Portal** (setup, capture,
publishing) and a white-labelled, read-only **Client Portal** (outlets receive reports). A super admin
sets up brands/outlets, auditor logins and templates and assigns audits; an auditor captures metrics +
a department checklist on a phone and submits once (immutable); the admin reviews as-captured, generates
an AI-assisted report, and publishes it as a versioned PDF. Outlets have no login — a report token is the
access. Stage A is the audit portal (Phases 1–2); Stage B is a financial analytics/AI engine (Phase 3).

## Stack
Next.js (App Router) + **TypeScript end-to-end** · PostgreSQL on **Supabase** · **Drizzle** ORM/migrations
· **own-auth** (argon2 hashes, signed-cookie sessions; Lucia or Auth.js Credentials — not Supabase Auth)
· **Supabase Storage** (photos, PDFs, uploads) · **Playwright** for PDF, **exceljs** for XLSX ·
hosting on **Cloudflare/Vercel**. PWA is an installable shell only (Serwist/`next-pwa`), **no offline
data layer**. **DeepSeek** (`deepseek-chat`, plain `fetch` — no SDK), lands early with **B6** (submit-time
remark polish + severity scoring, ADR-0011, superseding ADR-0004's Anthropic-only prose polish) rather
than waiting for Stage B. Stage B's LLM provider for analytics narration is not yet decided (ADR-0011).
Stage B adds SheetJS, Arquero, Graphile Worker/pg-boss, Recharts.
Rationale in `docs/ARCHITECTURE.md` §2 and `docs/decisions/0001-typescript-end-to-end.md`.

## Directory map
```
CLAUDE.md                        ← you are here (the map)
F&B Controller audit platform/   ← the .dc.html design sources (the UI spec) + DESIGN-SYSTEM, HANDOVER
fnb-controller-docs/
  CHANGELOG.md                   ← what shipped, dated, plain language
  docs/
    PRODUCT.md                   ← what we're building & why (intent — flag before editing)
    ROADMAP.md                   ← the four phases + current focus
    EXECUTION.md                 ← the build sequence: work packages, deps, "done when"
    ARCHITECTURE.md              ← current system design & all tech decisions (living)
    DESIGN.md                    ← Part A design tokens · Part B UX decision log
    TASKS.md                     ← current working set only
    BUGS.md                      ← one entry per bug, fixed shape, mandatory Guard
    decisions/                   ← ADRs, one per significant decision + index
    archive/                     ← monthly rollups of done tasks / resolved bugs
```
Every `docs/…` path below is relative to `fnb-controller-docs/`.
## Design source files — the authoritative UI reference
**The `.dc.html` design files ARE the UI spec. Refer to them for every UI, frontend, layout, component,
interaction, screen-flow and data-shape decision — do not design a screen without opening its file.**
Read the source, not just the rendered page: markup is inline-styled so **the values are exact — copy
them, never invent**; the logic class at the bottom holds the seed data (the closest thing to a schema),
the state machine, and the live calculations. Read those out rather than re-deriving them.

| Surface | Design file | Refer to it for |
|---|---|---|
| Whole product model & flows | `Product Spec - Flow, Screens & Stories.dc.html` | Roles, the full journey, four flow diagrams, screen inventory, user stories (the "Done when…" clauses are literal acceptance tests) |
| Super Admin | `Super Admin Flow.dc.html` | ~46 states: restaurants, auditors, templates, Template Builder, review queue, review, reports. Most of the data model is visible here |
| Auditor — mobile | `Auditor Flow - Mobile.dc.html` | **Primary auditor layout** — tabs + bottom-anchored submit |
| Auditor — laptop | `Auditor Flow - Laptop.dc.html` | The widened variant — stacked steps + right-aligned progress. Same keys/data/rules as mobile |
| Report v4 | `Audit report v4.dc.html` | The print-ready deliverable and its own type system. Build last |
| Tokens (extracted) | `DESIGN-SYSTEM.md` → `docs/DESIGN.md` Part A | The token/primitive layer distilled from the files above |

**Precedence:** the Architecture & Execution **Plan supersedes the handover** where they differ; among
the rest, **the design files win on layout/visuals**, the **spec wins on behaviour**, and
`DESIGN-SYSTEM.md` / `docs/DESIGN.md` Part A own the tokens. Read `support.js` and the
`<sc-if>`/`<sc-for>`/`{{ }}` markup for intent only — never ship them; rebuild in the real stack, but
the inline style values are exact.

## Run / build / test
```
npm run dev      # Next.js dev server (Turbopack)
npm run build    # production build + typecheck
npm run start    # serve the production build
npm run lint     # eslint (design sources under F&B Controller audit platform/ and
                 # fnb-controller-docs/ are excluded — see eslint.config.mjs)
```
No `test`, Drizzle `migrate`, or Playwright e2e script yet — those land with F3 (schema) and Phase 4
(e2e) respectively. Don't invent commands that don't exist yet.

## Architecture-shaping invariants (guard these)
- **Template snapshot on assign** — an audit copies its template at creation; later edits never touch it.
- **Submit is one-way** — `assigned → in-progress → submitted`; confirmed once, then immutable for the auditor.
- **Publish freezes; correction versions** — a correction is a new version with a note; with no audit trail, versioning is the only history.
- **Calculated is never typed** — derivable figures are read-only everywhere; totals recompute live.
- **N/A is neither fail nor blank** — needs a reason, excluded from compliance %, listed separately.
- **Remarks are AI-polished on submit, and the polish is the record** — the rewrite happens once, at submit, and replaces the raw text (no verbatim copy is kept, so nothing can be reverted); the model rewrites prose only and never touches a number. **Severity/category/impact/corrective-action/SLA/ownership are now also AI-assigned at submit** (DeepSeek, using a defined rubric), replacing the deterministic classifier as the primary source — the classifier still runs, but only as a fallback for whatever the AI job didn't reach. The reviewer can still override every finding field, severity included, exactly as before. See ADR-0004 / ADR-0011 / UX-010.

## Coding conventions
- **Build every screen from its `.dc.html`** (see "Design source files") — open the file, copy exact
  inline style values, read the state machine and calculations from its logic class. This is the source
  of truth for all UI/frontend/layout work; don't invent values or reinvent flows.
- **Screen keys are the router** — reuse the design files' keys (`login`, `pending`, `checklist`,
  `restaurants`, `builder`, `reviewQueue`, `review`, `reports`, …) as route names. See ARCHITECTURE §6.
- **One auditor component tree, two breakpoints** — mobile is primary; laptop is the widened variant
  (tabs + bottom submit → stacked steps + right progress). Layout differs, behaviour is identical.
- **`org_id` on every table from migration 1**, with the brand → outlet hierarchy.
- **Auth:** admin sets/resets passwords, shown **once**, argon2-hashed — no reveal-anytime. Sessions are
  signed-cookie and admin-revocable ("end all sessions"). Drafts persist **server-side**; explicit Save,
  no autosave, no offline.
- **Design tokens come from `docs/DESIGN.md` Part A** — never inline a hex/size/spacing that isn't a
  token. Two separate surfaces (App UI vs Report); don't merge their type systems. Report numbers use
  IBM Plex Mono + `tabular-nums`.
- Sentence case except eyebrows/pills; plain-noun labels; currency Indian short-scale (`₹4.80L`) via one formatter.
- **LLM never computes** — it narrates numbers computed deterministically; every AI-stated figure must trace to a computed value.

## Project Docs
- **`docs/PRODUCT.md`** — before questioning *what*/*for whom*. Intent; rarely changes.
- **`docs/ROADMAP.md`** — to check whether something is in scope for the current phase.
- **`docs/EXECUTION.md`** — before starting any build work: the ordered work packages (`F*`/`A*`/`B*`/`C*`), what each delivers, its design file and screen keys, its dependencies, its "done when", and the recorded design-vs-docs reconciliations (R1–R11).
- **`docs/ARCHITECTURE.md`** — before touching system design, data flow, auth/session, or the report pipeline.
- **`docs/DESIGN.md`** — before adding any colour/spacing/type/component (Part A) or changing a flow (Part B).
- **`docs/TASKS.md`** — the current working set.
- **`docs/BUGS.md`** — before/after any bug fix; the canonical bug record.
- **`docs/decisions/`** — the *why* behind an architectural choice; add a new ADR for new ones.
- **`CHANGELOG.md`** — what has actually shipped.

## Keeping docs current
Standing rules — apply without being asked:
1. **After any bug fix**, update `docs/BUGS.md` in the exact entry shape. Never skip **Root cause** or **Guard**.
2. **After any bug regresses**, append to that BUG-XXX's History and update Status — never open a duplicate.
3. **After any architecturally significant decision**, add an ADR in `docs/decisions/` and update the index. If unsure it rises to ADR level, ask first.
4. **After any change to current-phase scope**, update `docs/ROADMAP.md` status and scope.
5. **When architecture actually changes**, edit `docs/ARCHITECTURE.md` in place — remove what's no longer true rather than appending.
6. **Keep `docs/TASKS.md` to the current working set.** At month start, or past ~40 lines, move done tasks to `docs/archive/YYYY-MM-tasks.md`.
7. **Never edit `docs/PRODUCT.md` without flagging it first.**
8. **Before any new colour, font size, spacing value or component pattern**, check `docs/DESIGN.md` Part A and reuse it; if genuinely new, add it to Part A first.
9. **After any UX/flow or layout decision (or change)**, add/update a `docs/DESIGN.md` Part B entry with the reasoning.
10. **Update `CHANGELOG.md`** when something ships — one dated line.
11. If unsure whether something is a BUG vs ADR vs TASK vs DESIGN entry, **ask** rather than guess.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
