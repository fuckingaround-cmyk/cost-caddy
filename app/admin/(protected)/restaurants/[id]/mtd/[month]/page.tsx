import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getRestaurant } from '@/lib/queries/restaurants';
import { listLockedMtdVersions, listOutletReports, periodMonthKey } from '@/lib/queries/reports';
import { buildMtdViewModel } from '@/lib/report/mtdViewModel';
import { computeMtdContiguity } from '@/lib/report/mtdContiguity';
import { createSignedUrl } from '@/lib/storage';
import { MtdReportBody } from './MtdReportBody';
import { LockMtdButton } from './LockMtdButton';
import { PrintButton } from '@/app/admin/(protected)/review/[id]/report/PrintButton';

export default async function MtdReportPage({ params }: { params: Promise<{ id: string; month: string }> }) {
  const { id, month } = await params;
  const admin = await requireRole('super_admin');

  const restaurant = await getRestaurant(admin.orgId, id);
  if (!restaurant) notFound();

  const reports = await listOutletReports(admin.orgId, id);
  const monthReports = reports.filter((r) => periodMonthKey(r.periodStart) === month);
  if (monthReports.length === 0) notFound();

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

  const lockedVersions = await listLockedMtdVersions(admin.orgId, id, month);
  const lockedVersionLinks = await Promise.all(
    lockedVersions.map(async (v) => ({
      version: v.version,
      publishedAt: v.publishedAt,
      url: v.pdfPath ? await createSignedUrl(v.pdfPath, 300) : null,
    })),
  );

  return (
    <div style={{ fontFamily: 'var(--font-report-body)', color: 'var(--r-ink)', background: 'var(--r-bg)', minHeight: '100vh' }}>
      <header
        data-noprint=""
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--brand)',
          color: '#fff',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-report-header)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
          <Link href={`/admin/restaurants/${id}?tab=reports&month=${month}`} style={{ color: '#fff', textDecoration: 'none' }}>
            &lsaquo; Back to reports
          </Link>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--brand-hover)',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: 'var(--font-report-mono)',
              fontWeight: 500,
            }}
          >
            MTD — LIVE
          </span>
          <span style={{ color: 'var(--brand-border-soft)' }}>
            {restaurant.name} · {monthLabel}
          </span>
        </div>
        <div data-noprint="" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LockMtdButton outletId={id} month={month} />
          <PrintButton />
        </div>
      </header>

      {lockedVersionLinks.length > 0 && (
        <div
          data-noprint=""
          style={{
            maxWidth: 1420,
            margin: '16px auto 0',
            padding: '0 28px',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--r-muted)',
          }}
        >
          <span style={{ fontWeight: 600 }}>Locked versions:</span>
          {lockedVersionLinks.map((v, i) => (
            <span key={v.version}>
              {v.url ? (
                <a href={v.url} style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
                  v{v.version} · locked {v.publishedAt.toISOString().slice(0, 10)}
                  {i === 0 ? ' (latest)' : ''}
                </a>
              ) : (
                <span>v{v.version}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1420,
          margin: '28px auto',
          padding: '36px 28px',
          background: '#fff',
          border: '1px solid var(--r-border)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-card)',
          boxSizing: 'border-box',
        }}
      >
        <MtdReportBody vm={vm} restaurantName={restaurant.name} monthLabel={monthLabel} excluded={excluded} gap={gap} />
      </main>
    </div>
  );
}
