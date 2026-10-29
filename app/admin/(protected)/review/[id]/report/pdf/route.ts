import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { createSignedUrl } from '@/lib/storage';
import { loadReportViewModel } from '@/lib/report/reportViewModel';
import { renderReportPdf } from '@/lib/report/renderReportPdf';

// Serves the actual Playwright-rendered PDF (renderReportPdf.tsx) — the real deliverable
// the admin downloads/shares (EXECUTION.md R12), never the live interactive /report page
// or window.print(). Published: redirects to a short-lived signed URL for the version
// publishAudit already stored. Not yet published: renders the SAME Playwright pass
// on demand from the current draft data and streams it back — nothing is stored or
// versioned, so this never touches the one-way publish/freeze invariant.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireRole('super_admin');

  const [latest] = await db
    .select({ pdfPath: reports.pdfPath, version: reports.version })
    .from(reports)
    .where(and(eq(reports.auditId, id), eq(reports.orgId, admin.orgId)))
    .orderBy(desc(reports.version))
    .limit(1);

  if (latest?.pdfPath) {
    const url = await createSignedUrl(latest.pdfPath, 300);
    return NextResponse.redirect(url);
  }

  const vm = await loadReportViewModel(admin.orgId, id);
  if (!vm || !vm.audit.reportGeneratedAt) {
    return NextResponse.json({ error: 'Generate the report before downloading a PDF.' }, { status: 404 });
  }

  const pdf = await renderReportPdf(vm, undefined);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="report-draft.pdf"',
    },
  });
}
