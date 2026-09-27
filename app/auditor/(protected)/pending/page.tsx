import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { AuditorShell } from '@/components/ui/AuditorShell';
import { ListRow } from '@/components/ui/ListRow';
import { listAuditorAudits, type AuditorAuditRow } from '@/lib/queries/audits';

const RESTAURANT_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--navy-700)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

// B1 — pending list (screen key `pending`). Sorted by audit-period end ascending; the
// period is the recurring conduct window agreed with the auditor, not a deadline, so
// nothing here is ever marked overdue (ADR-0008). Recently submitted sits below.
export default async function AuditorPendingPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already redirects; narrows the type below

  const audits = await listAuditorAudits(user.orgId, user.id);
  const pending = audits
    .filter((a) => a.status === 'assigned' || a.status === 'in-progress')
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const submittedHistory = audits
    .filter((a) => a.status === 'submitted' || a.status === 'published')
    .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))
    .slice(0, 5);

  return (
    <AuditorShell>
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-ui-title)', fontSize: 'var(--text-panel-title)', fontWeight: 600 }}>
          Pending Audits
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2, marginBottom: 22 }}>{user.name}</div>

        {pending.length === 0 ? (
          <div style={{ color: 'var(--placeholder)', fontSize: 13, padding: '20px 0' }}>
            Nothing assigned to you right now.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--divider)' }}>
            {pending.map((a) => (
              <PendingRow key={a.id} audit={a} />
            ))}
          </div>
        )}

        {submittedHistory.length > 0 && (
          <>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: 30,
                marginBottom: 10,
              }}
            >
              Recently Submitted
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--divider)' }}>
              {submittedHistory.map((a) => (
                <HistoryRow key={a.id} audit={a} />
              ))}
            </div>
          </>
        )}
      </div>
    </AuditorShell>
  );
}

function PendingRow({ audit }: { audit: AuditorAuditRow }) {
  const chip = audit.status === 'in-progress' ? IN_PROGRESS_CHIP : ASSIGNED_CHIP;
  return (
    <Link href={`/auditor/checklist/${audit.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <ListRow
        icon={RESTAURANT_ICON}
        title={audit.outletName}
        meta={
          <>
            Period {audit.periodEnd} · {audit.itemsDone} of {audit.itemsTotal} items
          </>
        }
        status={<Chip {...chip} />}
      />
    </Link>
  );
}

function HistoryRow({ audit }: { audit: AuditorAuditRow }) {
  const chip = audit.status === 'published' ? PUBLISHED_CHIP : SUBMITTED_CHIP;
  return (
    <Link href={`/auditor/report/${audit.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <ListRow
        icon={RESTAURANT_ICON}
        title={audit.outletName}
        meta={
          <>
            Period {audit.periodEnd}
            <AiStatus state={audit.aiState} />
          </>
        }
        status={<Chip {...chip} />}
      />
    </Link>
  );
}

// ADR-0011 (was B6's PolishStatus) — the one status indicator this package adds outside
// the submit flow itself (reviewQueue gets its own copy of this once C1 exists). Now
// covers remark polish + severity scoring, not prose alone.
function AiStatus({ state }: { state: AuditorAuditRow['aiState'] }) {
  if (state === 'polishing') {
    return <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 3 }}>Reviewing remarks…</div>;
  }
  if (state === 'failed') {
    return <div style={{ fontSize: 11, color: 'var(--status-warn-fg)', marginTop: 3 }}>Remarks kept as typed — AI review failed</div>;
  }
  return null;
}

const ASSIGNED_CHIP = { bg: 'var(--surface)', color: 'var(--ink-3)', border: 'var(--border)', label: 'ASSIGNED' };
const IN_PROGRESS_CHIP = { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'IN PROGRESS' };
const SUBMITTED_CHIP = { bg: 'var(--navy-chip)', color: 'var(--navy-700)', border: 'var(--navy-border)', label: 'SUBMITTED' };
const PUBLISHED_CHIP = { bg: 'var(--navy-700)', color: 'var(--surface)', border: 'var(--navy-700)', label: 'PUBLISHED' };

function Chip({ bg, color, border, label }: { bg: string; color: string; border: string; label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '5px 9px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {label}
    </div>
  );
}
