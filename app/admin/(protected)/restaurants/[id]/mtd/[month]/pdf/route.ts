import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getRestaurant } from '@/lib/queries/restaurants';
import { listLockedMtdVersions, listOutletReports, periodMonthKey } from '@/lib/queries/reports';
import { buildMtdViewModel } from '@/lib/report/mtdViewModel';
import { computeMtdContiguity } from '@/lib/report/mtdContiguity';
import { renderMtdReportPdf } from '@/lib/report/renderMtdReportPdf';
import { createSignedUrl } from '@/lib/storage';

// ADR-0021 — the MTD analog of the per-audit report's pdf/route.ts. Locked: redirects to
// a short-lived signed URL for the latest locked version. Not yet locked: renders the
// SAME Playwright pass on demand from the current contiguous rollup and streams it back
// — nothing is stored or versioned, same as the per-audit route's draft-PDF fallback.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; month: string }> }) {
  const { id, month } = await params;
  const admin = await requireRole('super_admin');

  const [latest] = await listLockedMtdVersions(admin.orgId, id, month);
  if (latest?.pdfPath) {
    const url = await createSignedUrl(latest.pdfPath, 300);
    return NextResponse.redirect(url);
  }

  const restaurant = await getRestaurant(admin.orgId, id);
  if (!restaurant) notFound();

  const reports = await listOutletReports(admin.orgId, id);
  const monthReports = reports.filter((r) => periodMonthKey(r.periodStart) === month);
  if (monthReports.length === 0) {
    return NextResponse.json({ error: 'No reports for this month.' }, { status: 404 });
  }

  const { included, excluded, gap } = computeMtdContiguity(monthReports);
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

  const monthLabel = new Date(`${month}-15T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const pdf = await renderMtdReportPdf(vm, restaurant.name, monthLabel, excluded, gap);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="mtd-report-draft.pdf"',
    },
  });
}
