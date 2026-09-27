import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getAuditForReview, listOperationalFiles, type ReviewAuditDetail } from '@/lib/queries/review';
import { getAuditItemFiles, getAuditItems, getAuditMetricDefs, getAuditMetricValues } from '@/lib/queries/audits';
import { metricSections } from '@/lib/calc';
import { createSignedUrl } from '@/lib/storage';
import { buildFinancialReportDraft } from '@/lib/report/financialDraft';
import { ReviewItemRow, type ReviewItem } from './ReviewItemRow';
import { OperationalFilesPanel } from './OperationalFilesPanel';
import { GenerateReportButton } from './GenerateReportButton';
import { PublishButton } from './PublishButton';
import { FinancialSummaryPanel } from './FinancialSummaryPanel';

// Headless-Chromium PDF rendering (publishAudit -> renderReportPdf) can outrun Vercel's
// default Server Action timeout; this raises the ceiling for the whole page's actions.
export const maxDuration = 60;

const RESTAURANT_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy-700)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireRole('super_admin');

  const audit = await getAuditForReview(admin.orgId, id);
  if (!audit) notFound();
  // Publish freezes the audit — nothing left to review or correct once it's published,
  // so the canonical view moves to the report itself.
  if (audit.status === 'published') redirect(`/admin/review/${id}/report`);

  const [defs, values, items, itemFiles, opFiles] = await Promise.all([
    getAuditMetricDefs(id),
    getAuditMetricValues(id),
    getAuditItems(id),
    getAuditItemFiles(id),
    listOperationalFiles(id),
  ]);

  const sections = defs.length > 0 ? metricSections(defs, values) : [];

  const reviewItems: ReviewItem[] = await Promise.all(
    items.map(async (it) => {
      const files = itemFiles.filter((f) => f.auditItemId === it.id);
      const photos = await Promise.all(
        files.map(async (f) => ({
          id: f.id,
          name: f.name,
          meta: f.meta,
          isImage: f.kind === 'image',
          url: await createSignedUrl(f.storagePath).catch(() => ''),
          evidenceType: f.evidenceType,
          extractionStatus: f.extractionStatus,
          extractedTable: f.extractedTable,
        })),
      );
      return {
        id: it.id,
        code: it.catCode,
        label: it.label,
        status: it.status,
        remark: it.remark,
        naReason: it.naReason,
        photos,
        finding:
          it.severity && it.impact !== null && it.correctiveAction !== null && it.sla !== null && it.ownership !== null && it.resolutionStatus
            ? {
                refId: it.refId ?? it.code,
                category: it.category ?? '',
                severity: it.severity,
                impact: it.impact,
                correctiveAction: it.correctiveAction,
                sla: it.sla,
                ownership: it.ownership,
                resolutionStatus: it.resolutionStatus,
              }
            : null,
      };
    }),
  );

  const financialDraft = audit.reportGeneratedAt
    ? buildFinancialReportDraft(
        defs,
        values,
        opFiles.map((f) => ({ type: f.type, period: f.period, parsed: f.parseStatus === 'parsed', coverageSummary: f.coverageSummary })),
      )
    : null;

  return (
    <div>
      <Link
        href={`/admin/restaurants/${audit.outletId}`}
        style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14, display: 'inline-block' }}
      >
        &lsaquo; Back to {audit.outletName}
      </Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 14,
          borderBottom: '1px solid var(--divider)',
          paddingBottom: 'var(--space-9)',
          marginBottom: 'var(--space-9)',
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            {RESTAURANT_ICON}
            <span>{audit.outletName}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Auditor: {audit.auditorName} · Period {audit.periodEnd}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AiStatePill state={audit.aiState} />
          <GenerateReportButton auditId={id} generated={!!audit.reportGeneratedAt} />
          {audit.reportGeneratedAt && <PublishButton auditId={id} />}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '12px 14px',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-card)',
          background: 'var(--surface-alt-2)',
          marginBottom: 'var(--space-9)',
          fontSize: '12.5px',
          color: 'var(--ink-3)',
          lineHeight: 1.5,
        }}
      >
        <span>Review the submission exactly as captured, correct anything that needs it, and attach operational files before generating the report.</span>
      </div>

      <div style={{ border: '1px solid var(--border-card)', borderRadius: 'var(--radius-panel)', overflow: 'hidden', marginBottom: 'var(--space-9)' }}>
        <div
          style={{
            padding: '10px 13px',
            background: 'var(--navy-700)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>MTD Metrics</div>
        </div>
        {sections.length === 0 ? (
          <div style={{ padding: 14, fontSize: 13, color: 'var(--placeholder)' }}>Needs data — no metrics were captured on this audit.</div>
        ) : (
          sections.map((sec) => (
            <div key={sec.key}>
              <div
                style={{
                  padding: '7px 13px',
                  background: 'var(--surface-alt-1)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--muted-2)',
                }}
              >
                {sec.title}
              </div>
              {sec.rows.map((r) => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 13px', borderBottom: '1px solid var(--surface-alt-1)' }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '12.5px', fontWeight: r.kind === 'derived' ? 700 : 500 }}>{r.label}</div>
                  <div style={{ width: 112, textAlign: 'right', fontSize: '12.5px', fontWeight: r.kind === 'derived' ? 700 : 500 }}>
                    {r.kind === 'derived' ? r.display : displayInputValue(values[r.metricKey])}
                  </div>
                  <div style={{ width: 84, textAlign: 'right', fontSize: 11, color: 'var(--muted-2)' }}>
                    {r.sub} {r.subLabel}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <OperationalFilesPanel auditId={id} files={opFiles} />

      {financialDraft && <FinancialSummaryPanel draft={financialDraft} />}

      {reviewItems.map((it) => (
        <ReviewItemRow key={it.id} item={it} auditId={id} />
      ))}
    </div>
  );
}

function displayInputValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// ADR-0011 — a `failed` AI job means Fail items are missing severity until "Generate
// report" runs classifyFinding as a fallback; a reviewer opening the queue should see why.
function AiStatePill({ state }: { state: ReviewAuditDetail['aiState'] }) {
  if (state === 'polishing') {
    return (
      <span style={{ fontSize: 11, color: 'var(--hint)', padding: '5px 9px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-alt-1)' }}>
        AI reviewing remarks…
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--status-warn-fg)',
          padding: '5px 9px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--surface-alt-1)',
        }}
      >
        AI scoring failed — findings await Generate report
      </span>
    );
  }
  return null;
}
