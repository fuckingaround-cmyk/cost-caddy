import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { AuditorShell } from '@/components/ui/AuditorShell';
import {
  getAuditForAuditor,
  getAuditItemFiles,
  getAuditItems,
  getAuditMetricDefs,
  getAuditMetricValues,
} from '@/lib/queries/audits';
import { formatPeriodRange } from '@/lib/dates';
import { ChecklistScreen } from './ChecklistScreen';

const RESTAURANT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

// B2/B3 — the two steps of the `checklist` screen (ARCHITECTURE §6): MTD Metrics and
// the Departmental Checklist, one component tree tabbed on mobile / stacked on laptop.
export default async function AuditorChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null; // layout already redirects

  const audit = await getAuditForAuditor(user.orgId, user.id, id);
  if (!audit) notFound();
  // Submit is one-way (invariant) — once submitted/published, this screen is gone for
  // the auditor; the read-only `report` screen is the only thing left to see.
  if (audit.status === 'submitted' || audit.status === 'published') {
    redirect(`/auditor/report/${id}`);
  }

  const [defs, values, items, files] = await Promise.all([
    getAuditMetricDefs(id),
    getAuditMetricValues(id),
    getAuditItems(id),
    getAuditItemFiles(id),
  ]);

  return (
    <AuditorShell>
      <div>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--divider)' }}>
          <Link href="/auditor/pending" style={{ color: 'var(--muted)', fontSize: 13, display: 'inline-block', marginBottom: 8 }}>
            ‹ Back to pending
          </Link>
          <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
            {RESTAURANT_ICON}
            <span>{audit.outletName}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{formatPeriodRange(audit.periodStart, audit.periodEnd)}</div>
        </div>

        <ChecklistScreen
          auditId={id}
          outletName={audit.outletName}
          defs={defs}
          initialValues={values}
          initialItems={items}
          initialFiles={files}
        />
      </div>
    </AuditorShell>
  );
}
