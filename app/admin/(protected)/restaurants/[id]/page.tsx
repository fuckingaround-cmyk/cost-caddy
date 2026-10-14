import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getRestaurant } from '@/lib/queries/restaurants';
import { activeAudits, auditHistory, listOutletAudits, submittedAudits } from '@/lib/queries/audits';
import { listTemplates } from '@/lib/queries/templates';
import { listActiveAuditors } from '@/lib/queries/auditors';
import { listOutletReports, periodMonthKey } from '@/lib/queries/reports';
import { AuditsHeader } from './AuditsHeader';
import { AuditActions } from './AuditActions';
import { RestaurantHeader } from './RestaurantHeader';

export default async function RestaurantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const { id } = await params;
  const { tab, month } = await searchParams;
  const admin = await requireRole('super_admin');

  const restaurant = await getRestaurant(admin.orgId, id);
  if (!restaurant) notFound();

  const isReports = tab === 'reports';
  const [audits, templates, auditors, reports] = await Promise.all([
    listOutletAudits(admin.orgId, id),
    listTemplates(admin.orgId),
    listActiveAuditors(admin.orgId),
    listOutletReports(admin.orgId, id),
  ]);
  const active = activeAudits(audits);
  const submitted = submittedAudits(audits);
  const history = auditHistory(audits);

  const reportMonths = monthOptions(reports.map((r) => r.periodStart));
  const selectedMonth = reportMonths.find((m) => m.key === month)?.key ?? reportMonths[0]?.key;
  const monthReports = reports.filter((r) => periodMonthKey(r.periodStart) === selectedMonth);

  return (
    <div>
      <Link
        href="/admin/restaurants"
        style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 'var(--space-7)', display: 'inline-block' }}
      >
        &lsaquo; All restaurants
      </Link>
      <RestaurantHeader outletId={id} name={restaurant.name} city={restaurant.city} auditCount={audits.length} />

      <AuditsHeader
        outletId={id}
        isReports={isReports}
        activeCount={active.length}
        publishedCount={history.length}
        templates={templates}
        auditors={auditors}
      />

      {!isReports ? (
        <div>
          <AuditGroup title="Active audits" empty="No active audits — create one to assign it to an auditor.">
            {active.map((a) => (
              <div key={a.id} style={{ border: '1px solid var(--divider)', borderRadius: 'var(--radius-card)', padding: '15px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name || a.templateName}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      Auditor {a.auditorName} · Period {a.periodEnd}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <StatusChip status={a.status} />
                    <AuditActions auditId={a.id} status={a.status} auditorId={a.auditorId} auditors={auditors} />
                  </div>
                </div>
              </div>
            ))}
          </AuditGroup>

          <AuditGroup title="Submitted — awaiting review" empty="Nothing submitted yet.">
            {submitted.map((a) => (
              <div
                key={a.id}
                style={{
                  border: '1px solid var(--divider)',
                  borderRadius: 'var(--radius-card)',
                  padding: '15px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name || a.templateName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    Auditor {a.auditorName} · Period {a.periodEnd}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <AuditActions auditId={a.id} status={a.status} auditorId={a.auditorId} auditors={auditors} />
                <Link
                  href={`/admin/review/${a.id}`}
                  style={{
                    padding: '9px 14px',
                    border: '1px solid var(--navy-700)',
                    background: 'var(--navy-700)',
                    color: '#fff',
                    borderRadius: 'var(--radius-control)',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Review
                </Link>
                </div>
              </div>
            ))}
          </AuditGroup>

          <AuditGroup title="History" empty="No published audits yet.">
            {history.map((a) => (
              <div
                key={a.id}
                style={{
                  border: '1px solid var(--divider)',
                  borderRadius: 'var(--radius-card)',
                  padding: '15px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name || a.templateName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    Auditor {a.auditorName} · Period {a.periodEnd}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusChip status={a.status} />
                  <Link
                    href={`/admin/review/${a.id}/report`}
                    style={{ fontSize: 12, textDecoration: 'underline', color: 'var(--navy-700)' }}
                  >
                    View report
                  </Link>
                  <AuditActions auditId={a.id} status={a.status} auditorId={a.auditorId} auditors={auditors} />
                </div>
              </div>
            ))}
          </AuditGroup>
        </div>
      ) : (
        <div>
          {reports.length === 0 ? (
            <div style={{ color: 'var(--placeholder)', fontSize: 13 }}>No reports published yet.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
                {reportMonths.map((m) => {
                  const isSelected = m.key === selectedMonth;
                  return (
                    <Link
                      key={m.key}
                      href={`/admin/restaurants/${id}?tab=reports&month=${m.key}`}
                      style={{
                        padding: '9px 15px',
                        borderRadius: 'var(--radius-control)',
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                        background: isSelected ? 'var(--navy-700)' : 'var(--surface)',
                        color: isSelected ? '#fff' : 'var(--ink-3)',
                        border: `1px solid ${isSelected ? 'var(--navy-700)' : 'var(--border)'}`,
                      }}
                    >
                      {m.label}
                    </Link>
                  );
                })}
              </div>

              {selectedMonth && (
                <div
                  style={{
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-card)',
                    padding: '20px 22px',
                    marginBottom: 16,
                    background: 'var(--surface-alt-2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted-2)', fontFamily: 'var(--font-ui-mono)' }}>
                      {monthReports.length} report{monthReports.length === 1 ? '' : 's'} contributing
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>
                      {reportMonths.find((m) => m.key === selectedMonth)?.label} — MTD consolidated report
                    </div>
                  </div>
                  <Link
                    href={`/admin/restaurants/${id}/mtd/${selectedMonth}`}
                    style={{
                      padding: '11px 18px',
                      background: 'var(--navy-700)',
                      color: '#fff',
                      borderRadius: 'var(--radius-control)',
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View MTD report
                  </Link>
                </div>
              )}

              <div style={{ border: '1px solid var(--divider)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
              {monthReports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                    padding: '16px 18px',
                    borderBottom: '1px solid var(--divider)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name || r.templateName}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--navy-chip)',
                        color: 'var(--navy-700)',
                      }}
                    >
                      v{r.version}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>
                      {formatPeriodRange(r.periodStart, r.periodEnd)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted-2)', fontFamily: 'var(--font-ui-mono)' }}>
                      Published {r.publishedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <Link
                    href={`/admin/review/${r.auditId}/report`}
                    style={{
                      padding: '9px 14px',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-control)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--navy-700)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View report
                  </Link>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Groups reports by the month the underlying audit actually covers, not by publish
// date — an audit for 1–31 Aug files under August even if published in September. No
// fixed month list: just whichever months this outlet has published reports for.
function monthOptions(periodStarts: string[]): { key: string; label: string }[] {
  const seen = new Set(periodStarts.map(periodMonthKey));
  return [...seen]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({
      key,
      label: new Date(`${key}-15T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }));
}

// 'Jul 1–15, 2026' for a range, or a single formatted date when the audit covers one day.
function formatPeriodRange(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  if (periodStart === periodEnd) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = sameMonth
    ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel}–${endLabel}`;
}

function AuditGroup({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted-2)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: '18px 0 10px 0',
        }}
      >
        {title}
      </div>
      {items.length === 0 && (
        <div style={{ color: 'var(--placeholder)', fontSize: 13, padding: '6px 0 30px 0' }}>{empty}</div>
      )}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)', marginBottom: 30 }}>{items}</div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    assigned: { bg: 'var(--surface)', color: 'var(--ink-3)', border: 'var(--border)', label: 'ASSIGNED' },
    'in-progress': { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'IN PROGRESS' },
    submitted: { bg: 'var(--navy-chip)', color: 'var(--navy-700)', border: 'var(--navy-border)', label: 'SUBMITTED' },
    published: { bg: 'var(--navy-700)', color: 'var(--surface)', border: 'var(--navy-700)', label: 'PUBLISHED' },
  };
  const chip = map[status] ?? map.assigned;
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '5px 9px',
        borderRadius: 'var(--radius-pill)',
        background: chip.bg,
        color: chip.color,
        border: `1px solid ${chip.border}`,
      }}
    >
      {chip.label}
    </div>
  );
}
