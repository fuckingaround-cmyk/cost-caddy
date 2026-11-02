import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { orgs, outlets } from './org';
import { audits } from './audits';

// Report (ARCHITECTURE §5). One row per PUBLISHED version — publish is a separate
// action from sharing (R5) and only publish stamps a new version; earlier versions
// remain, since with no audit trail versioning is the only history (C5). PDF via
// Playwright is the only export format shipped — no XLSX for now (EXECUTION.md R12).
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id),
    version: integer('version').notNull(),
    token: text('token').notNull().unique(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
    pdfPath: text('pdf_path'),
    note: text('note'),
  },
  (table) => [uniqueIndex('reports_audit_version_unique').on(table.auditId, table.version)],
);

// MtdReport (ARCHITECTURE §5, ADR-0021). The persisted analog of Report, but keyed on
// (outletId, month) instead of auditId, since an MTD rollup isn't one audit — one row
// per LOCKED version of an outlet's MTD consolidated report for a given month. The live
// /mtd/[month] page is unaffected by locking (ADR-0006's live-recompute behaviour is
// unchanged); this table only adds a retrievable, versioned snapshot on top of it.
// contributingAuditIds freezes which audits a given version actually summed, so a later
// lock (v2, once more audits publish that month) doesn't need to re-derive what v1 meant.
export const mtdReports = pgTable(
  'mtd_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    month: text('month').notNull(), // 'YYYY-MM', same key as periodMonthKey
    version: integer('version').notNull(),
    token: text('token').notNull().unique(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
    pdfPath: text('pdf_path'),
    note: text('note'),
    contributingAuditIds: jsonb('contributing_audit_ids').$type<string[]>().notNull(),
  },
  (table) => [uniqueIndex('mtd_reports_outlet_month_version_unique').on(table.outletId, table.month, table.version)],
);
