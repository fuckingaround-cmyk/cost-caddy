# 0016 — Destructive admin actions: block, archive or delete, per entity

Status: accepted · Date: 2026-09-28

## Context
The Super Admin could create restaurants, templates and audits but not remove or correct them. Every foreign
key in the schema is `ON DELETE no action` (nothing cascades), and stored files (photos, operational files,
report PDFs) live in Supabase Storage outside the database. "Publish freezes" (ARCHITECTURE §8) protects a
report from *edits*; it says nothing about the admin removing the whole audit.

## Decision
- **Restaurant** — delete **cascades**: one transaction removes all its audits (same child order and
  post-commit file cleanup as audit delete, shared in `lib/audits/removeAudits.ts`), its `auditor_outlets`
  rows, then the outlet. The confirm names the audit count. (Originally refused while audits existed;
  reversed by the product owner 2026-10-14.) Rename/relocate is a plain update.
- **Audit** — delete is allowed at **any status**, behind a two-step confirm that names the consequence
  (published: report versions, PDFs and the month's MTD change). One transaction removes children in FK order
  (item files → items → metric values/defs → evidence findings → operational files → reports → audit); stored
  files are deleted **after commit**, best-effort — an orphaned file is harmless, a dangling row is not.
- **Audit reassignment** — only while `assigned` or `in-progress` and to an active auditor; draft data lives on
  the audit so it moves with it. Submitted/published audits are never reassigned (submit is one-way).
- **Template** — **hard-deleted if no audit references it, otherwise archived** (`templates.archived_at`,
  migration 0012). Archived templates vanish from lists, pickers and the builder; audits keep resolving the
  template name and their own snapshot is untouched. Duplicate = an independent copy named "<name> (copy)".

## Consequences
- No soft-delete anywhere else; deletes are permanent and there is no undo (consistent with "no audit trail").
- Deleting a published audit removes the only history of its versions — accepted by the product owner.
- Deleting a restaurant also destroys its published reports — permanent, behind a confirm.
