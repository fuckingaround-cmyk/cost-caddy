import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuditorShell } from '@/components/ui/AuditorShell';
import { getAuditForAuditor, getAuditItemFiles, getAuditItems } from '@/lib/queries/audits';
import { formatPeriodRange } from '@/lib/dates';

const RESTAURANT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

const STATUS_CHIP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending: { bg: 'var(--surface)', color: 'var(--muted)', border: 'var(--border)', label: 'PENDING' },
  pass: { bg: '#eafaf6', color: 'var(--status-pass-fg)', border: '#bfe8dc', label: 'PASS' },
  fail: { bg: 'var(--status-fail-bg)', color: 'var(--status-fail-fg-app)', border: 'var(--status-fail-border)', label: 'FAIL' },
  na: { bg: 'var(--status-neutral-bg)', color: 'var(--status-neutral-fg-1)', border: 'var(--status-neutral-border)', label: 'N/A' },
};

const AUDIT_STATUS_CHIP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  submitted: { bg: 'var(--brand-tint)', color: 'var(--brand)', border: 'var(--brand-border)', label: 'SUBMITTED' },
  published: { bg: 'var(--brand)', color: 'var(--surface)', border: 'var(--brand)', label: 'PUBLISHED' },
  assigned: { bg: 'var(--surface)', color: 'var(--muted)', border: 'var(--border)', label: 'ASSIGNED' },
  'in-progress': { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'IN PROGRESS' },
};

// B5 — the post-submit `report` screen: read-only, permanently, for the auditor. No
// edit affordance exists here at all — Submit is one-way (invariant "submit is one-way").
export default async function AuditorReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const audit = await getAuditForAuditor(user.orgId, user.id, id);
  if (!audit) notFound();

  const [items, files] = await Promise.all([getAuditItems(id), getAuditItemFiles(id)]);
  const statusChip = AUDIT_STATUS_CHIP[audit.status] ?? AUDIT_STATUS_CHIP.assigned;

  return (
    <AuditorShell>
      <div style={{ padding: 24 }}>
        <Link href="/auditor/pending" style={{ color: 'var(--muted)', fontSize: 13, display: 'inline-block', marginBottom: 14 }}>
          ‹ Back to pending
        </Link>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            borderBottom: '1px solid var(--divider)',
            paddingBottom: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
              {RESTAURANT_ICON}
              <span>{audit.outletName}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{formatPeriodRange(audit.periodStart, audit.periodEnd)}</div>
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              padding: '5px 9px',
              borderRadius: 'var(--radius-pill)',
              background: statusChip.bg,
              color: statusChip.color,
              border: `1px solid ${statusChip.border}`,
            }}
          >
            {statusChip.label}
          </div>
        </div>

        {items.map((it) => {
          const chip = STATUS_CHIP[it.status] ?? STATUS_CHIP.pending;
          const itemFiles = files.filter((f) => f.auditItemId === it.id);
          return (
            <div key={it.id} style={{ borderBottom: '1px solid var(--divider)', padding: '14px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{it.label}</span>
                  {it.remark.trim() !== '' && CHECK_ICON}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '5px 9px',
                    borderRadius: 'var(--radius-pill)',
                    whiteSpace: 'nowrap',
                    background: chip.bg,
                    color: chip.color,
                    border: `1px solid ${chip.border}`,
                  }}
                >
                  {chip.label}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
                {it.status === 'na' && it.naReason ? it.naReason : it.remark || '—'}
              </div>
              {itemFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {itemFiles.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '5px 10px 5px 5px',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-card)',
                        background: 'var(--surface)',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{f.name}</div>
                      {f.meta && <div style={{ fontSize: 10, color: 'var(--muted-2)' }}>{f.meta}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AuditorShell>
  );
}
