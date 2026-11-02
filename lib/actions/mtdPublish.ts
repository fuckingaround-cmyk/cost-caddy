'use server';

import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { mtdReports } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { getRestaurant } from '@/lib/queries/restaurants';
import { listOutletReports, periodMonthKey } from '@/lib/queries/reports';
import { computeMtdContiguity } from '@/lib/report/mtdContiguity';
import { buildMtdViewModel } from '@/lib/report/mtdViewModel';
import { renderMtdReportPdf } from '@/lib/report/renderMtdReportPdf';
import { mtdReportFilePath, uploadFile } from '@/lib/storage';

function generateToken(): string {
  return randomBytes(9).toString('base64url');
}

export type MtdPublishResult = { error?: string };

// ADR-0021 — the MTD analog of publishAudit. Locks the CURRENT contiguous rollup
// (computeMtdContiguity — same stop-at-first-gap rule the live page uses) for this
// outlet+month into a new versioned, persisted PDF. Does not change the live
// /mtd/[month] page's behaviour (ADR-0006's live recompute is unchanged) — this only
// adds a retrievable snapshot. No "unlock"/correction-reopen flow, same as per-audit
// reports don't have one today: locking again later (e.g. once more audits publish that
// month) simply stamps a new version, same as a from-scratch publish would.
export async function lockMtdReport(outletId: string, month: string): Promise<MtdPublishResult> {
  const admin = await requireRole('super_admin');

  const restaurant = await getRestaurant(admin.orgId, outletId);
  if (!restaurant) return { error: 'Not found' };

  const reports = await listOutletReports(admin.orgId, outletId);
  const monthReports = reports.filter((r) => periodMonthKey(r.periodStart) === month);
  const { included, excluded, gap } = computeMtdContiguity(monthReports);
  if (included.length === 0) return { error: 'No contiguous audits to lock for this month.' };

  const vm = await buildMtdViewModel(
    included.map((r) => ({
      auditId: r.auditId,
      name: r.name ?? r.templateName,
      templateName: r.templateName,
      version: r.version,
      publishedAt: r.publishedAt,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
    })),
  );

  const [latest] = await db
    .select({ version: mtdReports.version })
    .from(mtdReports)
    .where(and(eq(mtdReports.orgId, admin.orgId), eq(mtdReports.outletId, outletId), eq(mtdReports.month, month)))
    .orderBy(desc(mtdReports.version))
    .limit(1);
  const version = (latest?.version ?? 0) + 1;

  const monthLabel = new Date(`${month}-15T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const pdf = await renderMtdReportPdf(vm, restaurant.name, monthLabel, excluded, gap);
  const pdfPath = mtdReportFilePath(admin.orgId, outletId, month, version, 'report.pdf');
  await uploadFile(pdfPath, pdf, 'application/pdf');

  await db.insert(mtdReports).values({
    orgId: admin.orgId,
    outletId,
    month,
    version,
    token: generateToken(),
    pdfPath,
    contributingAuditIds: included.map((r) => r.auditId),
  });

  revalidatePath(`/admin/restaurants/${outletId}?tab=reports&month=${month}`);
  revalidatePath(`/admin/restaurants/${outletId}/mtd/${month}`);
  return {};
}
