import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { audits, mtdReports, reports, templates } from '@/db/schema';

export type OutletReportRow = {
  id: string;
  auditId: string;
  name: string | null;
  version: number;
  publishedAt: Date;
  templateName: string;
  // The audit's own covered period (periodStart, falling back to periodEnd for audits
  // created before periodStart existed) — reports group by this, not by publish date, so
  // an audit for 1–31 Aug files under August even if reviewed/published in September.
  periodStart: string;
  periodEnd: string;
};

// A2 Reports tab — every published version for this outlet, newest first. Reports are
// versioned rows (C5, publishAudit), never mutated or deleted, so history is just this list.
export async function listOutletReports(orgId: string, outletId: string): Promise<OutletReportRow[]> {
  const rows = await db
    .select({
      id: reports.id,
      auditId: reports.auditId,
      name: audits.name,
      version: reports.version,
      publishedAt: reports.publishedAt,
      templateName: templates.name,
      periodStart: audits.periodStart,
      periodEnd: audits.periodEnd,
    })
    .from(reports)
    .innerJoin(audits, eq(audits.id, reports.auditId))
    .innerJoin(templates, eq(templates.id, audits.templateId))
    .where(and(eq(reports.orgId, orgId), eq(audits.outletId, outletId)))
    .orderBy(desc(reports.publishedAt));

  return rows.map((r) => ({
    id: r.id,
    auditId: r.auditId,
    name: r.name,
    version: r.version,
    publishedAt: r.publishedAt,
    templateName: r.templateName,
    periodStart: r.periodStart ?? r.periodEnd,
    periodEnd: r.periodEnd,
  }));
}

// `periodStart` is a plain 'YYYY-MM-DD' date string (the audit's covered-period start) —
// slicing avoids a Date's local-timezone shift. Shared by the Reports tab's month tabs
// and the MTD report route so both bucket reports into the same month the same way.
export function periodMonthKey(periodStart: string): string {
  return periodStart.slice(0, 7);
}

export type MtdLockedVersionRow = {
  version: number;
  publishedAt: Date;
  pdfPath: string | null;
};

// ADR-0021 — every locked MTD snapshot for this outlet+month, newest first. mtdReports
// rows are never mutated or deleted (same invariant as `reports`), so history is just
// this list; the caller signs pdfPath into a short-lived URL per row.
export async function listLockedMtdVersions(orgId: string, outletId: string, month: string): Promise<MtdLockedVersionRow[]> {
  return db
    .select({ version: mtdReports.version, publishedAt: mtdReports.publishedAt, pdfPath: mtdReports.pdfPath })
    .from(mtdReports)
    .where(and(eq(mtdReports.orgId, orgId), eq(mtdReports.outletId, outletId), eq(mtdReports.month, month)))
    .orderBy(desc(mtdReports.version));
}
