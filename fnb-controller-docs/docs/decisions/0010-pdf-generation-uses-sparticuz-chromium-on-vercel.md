# 0010 — PDF generation uses `playwright-core` + `@sparticuz/chromium` on Vercel, not full Playwright

Status: accepted · Date: 2026-09-26

## Context
C5's publish pipeline (`lib/report/renderReportPdf.tsx`) renders the report to static HTML and prints it
to a PDF via headless Chromium, launched through the full `playwright` package inside a Server Action.
This worked in local dev but failed on the deployed Vercel app (BUG-027):
`Cannot find module '.../playwright-core/lib/coreBundle.js'` — `browsers.json` and the downloaded browser
binary that full `playwright` needs at runtime aren't traceable/bundleable into a Vercel serverless
function, and even a bundled desktop Chromium build wouldn't have matching system libraries in that
Lambda-based runtime. Full Playwright is designed for CI/dedicated-server use, not serverless functions —
this is a platform-compatibility problem, not a code defect in how Chromium was being driven.

## Options considered
1. **`playwright-core` + `@sparticuz/chromium`.** Drop the browser-bundling package in favor of one that
   ships a Lambda/Vercel-compatible headless Chromium build (`@sparticuz/chromium`), resolved at runtime via
   its own `executablePath()`. Keep full `playwright` as a **devDependency only**, for a real local browser
   binary in dev. Small code change (launch-path branch on `process.env.VERCEL`/`AWS_LAMBDA_FUNCTION_NAME`),
   no new infrastructure, no change to the render pipeline (HTML string → `page.pdf()`) itself.
2. **Move PDF generation off the serverless function entirely** — a dedicated always-on Node service, a
   background worker (Stage B already plans Graphile Worker/pg-boss), or a third-party HTML-to-PDF API.
   Sidesteps the Lambda constraint completely but adds a new deployable service/queue well before Stage B's
   worker infrastructure otherwise lands, for a Stage A feature (publish) that needs to work now.
3. **Switch rendering engine away from Chromium** (e.g. a pure-JS PDF renderer, `react-pdf`, or a
   Puppeteer-with-`chrome-aws-lambda`-style shim). Would require re-deriving the print layout (page breaks,
   `data-avoid`/`data-break` rules already tuned against real Chromium print output in BUG-023) in a
   different rendering model — largest rebuild cost for no clear benefit over option 1.

## Decision
Go with **option 1**. `package.json`: `playwright-core` + `@sparticuz/chromium` as production dependencies,
`playwright` demoted to `devDependencies` (local browser binaries only — must never become a prod
dependency again, or BUG-027 recurs). `renderReportPdf.tsx` picks the launch path by environment; the
render pipeline (HTML generation, `page.pdf()` call, print CSS) is unchanged. `next.config.ts` marks both
packages `serverExternalPackages` so Next's file tracer doesn't try to bundle/tree-shake their
dynamically-resolved binaries. The review page (`app/admin/(protected)/review/[id]/page.tsx`) sets
`maxDuration = 60` so Vercel's default Server Action timeout doesn't cut off a slow Chromium render.

## Consequences
- Publish works identically in local dev (real Playwright-installed Chromium) and on Vercel
  (`@sparticuz/chromium`'s Lambda-compatible build), with one small env-branched launch function as the
  only divergence.
- Full `playwright` staying a devDependency is now a load-bearing constraint, not incidental — any future
  change that reintroduces it as a production dependency reopens BUG-027.
- If Stage B's background-worker infrastructure (Graphile Worker/pg-boss) lands and publish moves off the
  request/Server-Action path, this can be revisited — a long-running worker process has no Lambda binary
  constraint and could go back to full Playwright if that's ever preferable. Not needed for Stage A.
- `@sparticuz/chromium` cold-starts add some latency to the first publish after a deploy/idle period; not
  measured against a hard SLA since publish is an infrequent, admin-initiated action, not a hot path.
