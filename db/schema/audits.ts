import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  aiStateEnum,
  auditStatusEnum,
  evidenceExtractionStatusEnum,
  evidencePhotoTypeEnum,
  fileKindEnum,
  itemStatusEnum,
  metricCostGroupEnum,
  metricKindEnum,
  metricRevGroupEnum,
  metricSectionEnum,
  metricUnitEnum,
  opFileParseStatusEnum,
  operationalFileTypeEnum,
  resolutionStatusEnum,
  severityEnum,
} from './_enums';
import { orgs, outlets } from './org';
import { templates } from './templates';
import { users } from './users';

export const audits = pgTable('audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id),
  token: text('token').notNull().unique(),
  outletId: uuid('outlet_id')
    .notNull()
    .references(() => outlets.id),
  auditorId: uuid('auditor_id')
    .notNull()
    .references(() => users.id),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id),
  name: text('name'),
  // The recurring audit-conduct window agreed with the auditor (e.g. "Week 4 of July"),
  // not a submission deadline — nothing in the auditor portal treats periodEnd as a due
  // date to chase (ADR-0008). periodStart is nullable for audits with only a single date.
  periodStart: date('period_start'),
  periodEnd: date('period_end').notNull(),
  status: auditStatusEnum('status').notNull().default('assigned'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  // Set by C3's "Generate report" (idempotent — regenerate only fills items that have
  // no severity yet, never overwriting a reviewer's edit). Distinct from publishedAt —
  // generating drafts findings, publishing freezes and versions them (R5).
  reportGeneratedAt: timestamp('report_generated_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  version: integer('version').notNull().default(0),
  // ADR-0011: covers the whole submit-time AI job (remark polish + severity scoring),
  // not just prose polish — the column keeps its original DB name across the rename.
  aiState: aiStateEnum('polish_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// FROZEN copy of templateMetrics, taken at assign (A5) — later template edits never
// touch it. Invariant: "Template snapshot on assign".
export const auditMetricDefs = pgTable(
  'audit_metric_defs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id),
    metricKey: text('metric_key').notNull(),
    label: text('label').notNull(),
    section: metricSectionEnum('section').notNull(),
    revGroup: metricRevGroupEnum('rev_group'),
    kind: metricKindEnum('kind'),
    costGroup: metricCostGroupEnum('cost_group'),
    den: text('den'),
    unit: metricUnitEnum('unit'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('audit_metric_defs_audit_key_unique').on(table.auditId, table.metricKey)],
);

// Calculated figures are never typed (invariant) — only the raw entered metrics are
// stored here; computeMetrics (F7) derives totals at read time.
export const auditMetricValues = pgTable(
  'audit_metric_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id),
    metricKey: text('metric_key').notNull(),
    value: numeric('value'),
  },
  (table) => [uniqueIndex('audit_metric_values_audit_key_unique').on(table.auditId, table.metricKey)],
);

// AuditItem (ARCHITECTURE §5). code/cat/catCode/label/guidance/freeform are copied
// from the template snapshot at assign time, same as auditMetricDefs.
export const auditItems = pgTable(
  'audit_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id),
    code: text('code').notNull(),
    cat: text('cat').notNull(),
    catCode: text('cat_code').notNull(),
    label: text('label').notNull(),
    guidance: text('guidance'),
    freeform: boolean('freeform').notNull().default(false),
    status: itemStatusEnum('status').notNull().default('pending'),
    remark: text('remark').notNull().default(''),
    naReason: text('na_reason'),
    // Set by DeepSeek at submit (ADR-0011; fail only) — classifyFinding (C3) is now
    // only a fallback for whatever the AI job didn't reach. Still reviewer-editable.
    severity: severityEnum('severity'),
    impact: text('impact'),
    correctiveAction: text('corrective_action'),
    sla: text('sla'),
    ownership: text('ownership'),
    resolutionStatus: resolutionStatusEnum('resolution_status'),
    // Set by report generation (C3), or by the submit-time AI job (ADR-0011).
    refId: text('ref_id'),
    category: text('category'),
    // Raw structured DeepSeek output for this item (ADR-0011) — a superset of the
    // discrete columns above, kept so a future report-layout change can read more of
    // what the model already said without re-running scoring or touching this schema.
    aiAssessment: jsonb('ai_assessment'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('audit_items_audit_code_unique').on(table.auditId, table.code)],
);

// Operational file attach (C1) — per-audit imports (bill edits, discounts, stock
// statements, …) reviewed alongside the captured checklist. C2's financial engine
// will read these; C1 only attaches/replaces and records whether each one parsed.
export const auditOperationalFiles = pgTable('audit_operational_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id),
  auditId: uuid('audit_id')
    .notNull()
    .references(() => audits.id),
  type: operationalFileTypeEnum('type').notNull(),
  period: text('period').notNull(),
  name: text('name').notNull(),
  format: text('format').notNull(),
  storagePath: text('storage_path').notNull(),
  parseStatus: opFileParseStatusEnum('parse_status').notNull(),
  // What it covers, in the reviewer's own words if parsing failed, or a short
  // machine-derived summary (sheet name, row count) when it parsed.
  coverageSummary: text('coverage_summary'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditItemFiles = pgTable('audit_item_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id),
  auditItemId: uuid('audit_item_id')
    .notNull()
    .references(() => auditItems.id),
  kind: fileKindEnum('kind').notNull(),
  name: text('name').notNull(),
  // Supabase Storage path behind a signed URL (F5) — never a public URL.
  storagePath: text('storage_path').notNull(),
  meta: text('meta'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  // Evidence-photo table extraction (B7, ADR-0012). evidenceType is picked by the
  // auditor (null = not a register photo, or kind='file' — v1 is images only); once set
  // it queues a Gemini vision extraction. extractionStatus is null until that first
  // attempt. extractedTable is { columns: string[], rows: string[][] } (rows positional
  // to columns, not keyed) — a verbatim transcription, reviewer-editable, shown in the
  // report immediately once extracted (same trust model as AI-assigned severity,
  // ADR-0011). Retries overwrite; no extraction history is kept.
  evidenceType: evidencePhotoTypeEnum('evidence_type'),
  extractionStatus: evidenceExtractionStatusEnum('extraction_status'),
  extractedTable: jsonb('extracted_table').$type<{ columns: string[]; rows: string[][] }>(),
  extractionModel: text('extraction_model'),
  extractedAt: timestamp('extracted_at', { withTimezone: true }),
});
