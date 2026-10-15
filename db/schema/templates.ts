import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import {
  evidencePhotoTypeEnum,
  metricCostGroupEnum,
  metricKindEnum,
  metricRevGroupEnum,
  metricSectionEnum,
  metricUnitEnum,
} from './_enums';
import { orgs } from './org';

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id),
  name: text('name').notNull(),
  // Set instead of deleting when audits still reference the template (ADR-0016) — hidden
  // from lists and pickers, but existing audits keep resolving their template name.
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MetricDef (ARCHITECTURE §5). `den` stays free text: it holds 'net' | 'bar' | 'kitchen'
// or another metric's metricKey, and metricKey is only unique within its own template.
export const templateMetrics = pgTable(
  'template_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id),
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
  (table) => [uniqueIndex('template_metrics_template_key_unique').on(table.templateId, table.metricKey)],
);

// Department (ARCHITECTURE §5). `code` is the reference-code prefix ('KIT') that
// renumbers on every builder change (A4).
export const templateDepartments = pgTable(
  'template_departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id),
    cat: text('cat').notNull(),
    code: text('code').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('template_departments_template_code_unique').on(table.templateId, table.code)],
);

// POS Report section of a template (ADR-0015) — one row per report type the admin added
// (Discount, Item Cancellation, Bill Modification, Complimentary, or any custom-named report stored as 'other').
export const templatePosReports = pgTable(
  'template_pos_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id),
    reportType: evidencePhotoTypeEnum('report_type').notNull(),
    // Display name; for the four presets it's the preset's label, for 'other' the admin's own.
    label: text('label').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('template_pos_reports_template_type_unique').on(table.templateId, table.reportType, table.label)],
);

// ChecklistPoint (ARCHITECTURE §5). `code` is the full reference code ('KIT-03').
export const templateChecklistPoints = pgTable(
  'template_checklist_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => templateDepartments.id),
    label: text('label').notNull(),
    guidance: text('guidance'),
    freeform: boolean('freeform').notNull().default(false),
    code: text('code').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('template_checklist_points_template_code_unique').on(table.templateId, table.code)],
);
