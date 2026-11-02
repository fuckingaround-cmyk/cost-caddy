# Product

> **Intent, not implementation.** This file changes rarely. Treat any edit as a signal to check with
> the owner first (see maintenance rule 7).

## What we're building
**F&B Controller** — a cloud SaaS platform that digitises F&B cost-controller operations for one audit
firm. It is delivered as an **Auditor Portal** (internal, mobile-first + laptop) for setup, capture,
review and publishing, over one governed database. Publishing produces a version-stamped **PDF**, which
the admin delivers to the outlet directly — there is no outlet-facing portal for now. An outlet's
month-to-date rollup across its audits (MTD) can likewise be locked into its own version-stamped PDF once
the month's audits are in. A **white-labelled
Client Portal** (read-only, branded per client, token access) is designed (`Super Admin Flow.dc.html`)
and may be built later, but is out of current scope; see `EXECUTION.md` R12.

The firm serves **multiple restaurant brands and outlets under one account**. It ships in two stages:
**Stage A** — the audit portal (configure → assign → capture → review → AI-assisted, versioned report);
**Stage B** — a financial analytics & insight engine (upload client Excel → costing, COGS variance,
reconciliation, POS analysis → dashboards with AI-narrated insight).

## Who it's for
- **Super Admin** (laptop) — the firm's operator. Creates brands/outlets, auditor logins and templates,
  assigns audits, reviews submissions, and publishes reports.
- **Auditor** (phone primarily, sometimes laptop) — signs in, opens the assigned audit, types the
  metrics, marks every checklist point with a remark and photos, submits once.
- **Outlet** (reader only) — receives the published PDF report directly from the admin. **No login, no
  portal, in this build.**

## Why
Restaurant-group controls audits are otherwise run on spreadsheets and ad-hoc documents: capture is
inconsistent, findings aren't traceable, and the deliverable isn't repeatable. F&B Controller makes
capture structured and complete, keeps the submission immutable once captured, and turns it into a
consistent, versioned, print-ready report — and, in Stage B, turns uploaded financial data into
costing and variance insight the firm can bill on.

## What it is deliberately *not*
- **Not a scheduler.** Due dates are recorded; chasing happens offline. No reminders or notifications.
- **Not an outlet portal, for now.** No Client Portal, no accounts, no report token — outlets get the
  PDF directly from the admin. A read-only, token-accessed Client Portal is designed but deferred.
- **Not an outlet-facing task app.** Corrective actions are tracked *within* the system, shown read-only.
- **Not a live integration.** All financial data enters by upload — no live POS/accounting/inventory sync.

## The core promises
- An audit **cannot be submitted with anything missing**, and validation names what's missing.
- Once submitted, an audit is **read-only for the auditor, permanently** — corrections happen admin-side.
- Published reports are **versioned**; a correction is a new version, delivered as a version-stamped PDF.
- The auditor **is never signed out mid-audit and nothing typed is lost** — the session persists and the
  in-progress audit is saved server-side, so it reopens on any device.
- Auditor passwords are **set/reset by the admin and shown once** — never stored in recoverable form.
- A restaurant's month-to-date rollup across its audits can be **locked into its own versioned PDF** once
  ready, same durability guarantee as a per-audit report.
