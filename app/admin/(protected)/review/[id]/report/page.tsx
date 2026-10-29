import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { loadReportViewModel } from '@/lib/report/reportViewModel';
import { formatReportDate } from '@/lib/report/reportFormat';
import { ReportBody } from './ReportBody';

export default async function ReportDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireRole('super_admin');

  const vm = await loadReportViewModel(admin.orgId, id);
  if (!vm) notFound();
  if (!vm.audit.reportGeneratedAt) redirect(`/admin/review/${id}`);

  const publish =
    vm.audit.status === 'published' && vm.audit.publishedAt
      ? { version: vm.audit.version, publishedAt: formatReportDate(vm.audit.publishedAt) }
      : undefined;

  return (
    <div style={{ fontFamily: 'var(--font-report-body)', color: 'var(--r-ink)', background: 'var(--r-bg)', minHeight: '100vh' }}>
      <header
        data-noprint=""
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--navy-700)',
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
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--navy-500)',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: 'var(--font-report-mono)',
              fontWeight: 500,
            }}
          >
            {publish ? `PUBLISHED v${publish.version}` : 'REPORT DRAFT'}
          </span>
          <span style={{ color: 'var(--navy-border-soft-2)' }}>
            {vm.audit.outletName}{vm.audit.outletCity ? ` · ${vm.audit.outletCity}` : ''}
          </span>
        </div>
        <a
          href={`/admin/review/${id}/report/pdf`}
          data-noprint=""
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--navy-700)',
            background: '#fff',
            padding: '8px 14px',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          Download PDF
        </a>
      </header>

      <main
        data-report-main=""
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
        <ReportBody vm={vm} publish={publish} />
      </main>
    </div>
  );
}
