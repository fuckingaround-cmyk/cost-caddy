import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { auditItemFiles, auditItems, auditMetricDefs, auditMetricValues, audits, outlets, templates, users } from '@/db/schema';
import type { MetricDef, MetricValues } from '@/lib/calc';

export type AuditRow = {
  id: string;
  token: string;
  name: string | null;
  status: (typeof audits.status.enumValues)[number];
  periodEnd: string;
  templateName: string;
  auditorName: string;
};

export async function listOutletAudits(orgId: string, outletId: string): Promise<AuditRow[]> {
  const rows = await db
    .select({
      id: audits.id,
      token: audits.token,
      name: audits.name,
      status: audits.status,
      periodEnd: audits.periodEnd,
      templateName: templates.name,
      auditorName: users.name,
    })
    .from(audits)
    .innerJoin(templates, eq(templates.id, audits.templateId))
    .innerJoin(users, eq(users.id, audits.auditorId))
    .where(and(eq(audits.orgId, orgId), eq(audits.outletId, outletId)))
    .orderBy(audits.createdAt);

  return rows;
}

export function activeAudits(rows: AuditRow[]): AuditRow[] {
  return rows.filter((r) => r.status === 'assigned' || r.status === 'in-progress');
}

export function submittedAudits(rows: AuditRow[]): AuditRow[] {
  return rows.filter((r) => r.status === 'submitted');
}

export function auditHistory(rows: AuditRow[]): AuditRow[] {
  return rows.filter((r) => r.status === 'published');
}

export type AuditorAuditRow = {
  id: string;
  token: string;
  name: string | null;
  status: (typeof audits.status.enumValues)[number];
  periodEnd: string;
  submittedAt: Date | null;
  aiState: (typeof audits.aiState.enumValues)[number] | null;
  outletName: string;
  templateName: string;
  itemsDone: number;
  itemsTotal: number;
};

// B1 pending list — every audit assigned to this auditor across all their outlets.
export async function listAuditorAudits(orgId: string, auditorId: string): Promise<AuditorAuditRow[]> {
  const rows = await db
    .select({
      id: audits.id,
      token: audits.token,
      name: audits.name,
      status: audits.status,
      periodEnd: audits.periodEnd,
      submittedAt: audits.submittedAt,
      aiState: audits.aiState,
      outletName: outlets.name,
      templateName: templates.name,
    })
    .from(audits)
    .innerJoin(outlets, eq(outlets.id, audits.outletId))
    .innerJoin(templates, eq(templates.id, audits.templateId))
    .where(and(eq(audits.orgId, orgId), eq(audits.auditorId, auditorId)))
    .orderBy(audits.periodEnd);

  const auditIds = rows.map((r) => r.id);
  const items = auditIds.length
    ? await db
        .select({ auditId: auditItems.auditId, status: auditItems.status })
        .from(auditItems)
        .where(inArray(auditItems.auditId, auditIds))
    : [];

  const progress = new Map<string, { done: number; total: number }>();
  for (const it of items) {
    const p = progress.get(it.auditId) ?? { done: 0, total: 0 };
    p.total += 1;
    if (it.status !== 'pending') p.done += 1;
    progress.set(it.auditId, p);
  }

  return rows.map((r) => ({
    ...r,
    itemsDone: progress.get(r.id)?.done ?? 0,
    itemsTotal: progress.get(r.id)?.total ?? 0,
  }));
}

export type AuditDetail = {
  id: string;
  status: (typeof audits.status.enumValues)[number];
  periodEnd: string;
  outletName: string;
  templateName: string;
};

// Loads one audit scoped to its assigned auditor — returns null for a wrong org, a
// wrong auditor, or a missing id, so callers can 404 rather than leak another
// auditor's audit by guessing an id.
export async function getAuditForAuditor(orgId: string, auditorId: string, auditId: string): Promise<AuditDetail | null> {
  const [row] = await db
    .select({
      id: audits.id,
      status: audits.status,
      periodEnd: audits.periodEnd,
      outletName: outlets.name,
      templateName: templates.name,
    })
    .from(audits)
    .innerJoin(outlets, eq(outlets.id, audits.outletId))
    .innerJoin(templates, eq(templates.id, audits.templateId))
    .where(and(eq(audits.id, auditId), eq(audits.orgId, orgId), eq(audits.auditorId, auditorId)))
    .limit(1);

  return row ?? null;
}

// B2 — the audit's own metric-def snapshot (cloned onto it at assign, A5), mapped from
// the DB's `metricKey`/`costGroup` naming onto lib/calc's MetricDef shape (id/group).
// `den` and each metric's own id both resolve through `metricKey`, so callers must not
// swap in the row's uuid `id` here.
export async function getAuditMetricDefs(auditId: string): Promise<MetricDef[]> {
  const rows = await db
    .select()
    .from(auditMetricDefs)
    .where(eq(auditMetricDefs.auditId, auditId))
    .orderBy(auditMetricDefs.sortOrder);

  return rows.map((r) => ({
    id: r.metricKey,
    label: r.label,
    section: r.section,
    revGroup: r.revGroup,
    kind: r.kind,
    group: r.costGroup,
    den: r.den,
    unit: r.unit,
  }));
}

// Raw entered figures for an audit, keyed by metricKey — empty until B4 (explicit
// Save) persists a draft.
export async function getAuditMetricValues(auditId: string): Promise<MetricValues> {
  const rows = await db
    .select({ metricKey: auditMetricValues.metricKey, value: auditMetricValues.value })
    .from(auditMetricValues)
    .where(eq(auditMetricValues.auditId, auditId));

  const values: MetricValues = {};
  for (const r of rows) values[r.metricKey] = r.value;
  return values;
}

export type AuditItemRow = {
  id: string;
  code: string;
  cat: string;
  catCode: string;
  label: string;
  guidance: string | null;
  freeform: boolean;
  status: (typeof auditItems.status.enumValues)[number];
  remark: string;
  naReason: string | null;
  refId: string | null;
  category: string | null;
  severity: (typeof auditItems.severity.enumValues)[number] | null;
  impact: string | null;
  correctiveAction: string | null;
  sla: string | null;
  ownership: string | null;
  resolutionStatus: (typeof auditItems.resolutionStatus.enumValues)[number] | null;
};

// B3 — the department checklist, in template order (sortOrder was assigned at A5's
// template-snapshot clone, following the departments/points order from the builder).
export async function getAuditItems(auditId: string): Promise<AuditItemRow[]> {
  return db
    .select({
      id: auditItems.id,
      code: auditItems.code,
      cat: auditItems.cat,
      catCode: auditItems.catCode,
      label: auditItems.label,
      guidance: auditItems.guidance,
      freeform: auditItems.freeform,
      status: auditItems.status,
      remark: auditItems.remark,
      naReason: auditItems.naReason,
      refId: auditItems.refId,
      category: auditItems.category,
      severity: auditItems.severity,
      impact: auditItems.impact,
      correctiveAction: auditItems.correctiveAction,
      sla: auditItems.sla,
      ownership: auditItems.ownership,
      resolutionStatus: auditItems.resolutionStatus,
    })
    .from(auditItems)
    .where(eq(auditItems.auditId, auditId))
    .orderBy(auditItems.sortOrder);
}

export type AuditItemFileRow = {
  id: string;
  auditItemId: string;
  kind: (typeof auditItemFiles.kind.enumValues)[number];
  name: string;
  meta: string | null;
  storagePath: string;
  // B7/ADR-0012 — evidence-photo table extraction.
  evidenceType: (typeof auditItemFiles.evidenceType.enumValues)[number] | null;
  extractionStatus: (typeof auditItemFiles.extractionStatus.enumValues)[number] | null;
  extractedTable: { columns: string[]; rows: string[][] } | null;
};

// B4 — previously-uploaded photos, so an in-progress audit reopens with everything
// already attached (ADR-0002: "a photo taken on mobile is already visible on the laptop").
export async function getAuditItemFiles(auditId: string): Promise<AuditItemFileRow[]> {
  return db
    .select({
      id: auditItemFiles.id,
      auditItemId: auditItemFiles.auditItemId,
      kind: auditItemFiles.kind,
      name: auditItemFiles.name,
      meta: auditItemFiles.meta,
      storagePath: auditItemFiles.storagePath,
      evidenceType: auditItemFiles.evidenceType,
      extractionStatus: auditItemFiles.extractionStatus,
      extractedTable: auditItemFiles.extractedTable,
    })
    .from(auditItemFiles)
    .innerJoin(auditItems, eq(auditItems.id, auditItemFiles.auditItemId))
    .where(eq(auditItems.auditId, auditId))
    .orderBy(auditItemFiles.uploadedAt);
}
