import type { MtdWeeklyEntry } from '@/lib/report/mtdViewModel';
import { formatPeriodRange } from '@/lib/dates';
import { moneyShort } from '@/lib/report/reportFormat';
import { figure } from '@/lib/report/figure';

// One bar per contributing audit's OWN period — whatever cadence the admin actually
// used (weekly, bi-weekly, uneven), never a fixed 7-day assumption — so the trend line
// always matches the real audits behind the MTD total (lib/report/mtdViewModel.ts's
// `weekly` array, computed from each audit's own unmerged draft/costing).
export function WeeklyTrendChart({ title, entries, color, pick }: {
  title: string;
  entries: MtdWeeklyEntry[];
  color: string;
  pick: (e: MtdWeeklyEntry) => number | null;
}) {
  const values = entries.map(pick);
  const max = Math.max(1, ...values.map((v) => v ?? 0));

  return (
    <div style={{ border: '1px solid var(--r-border)', borderRadius: 10, padding: 20, background: '#fff', boxShadow: 'var(--shadow-card)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 13.5, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160 }}>
        {entries.map((e, i) => {
          const v = values[i];
          const barHeight = v != null ? Math.max(4, (v / max) * 128) : 2;
          return (
            <div key={e.auditId} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-report-mono)', fontWeight: 600, color: 'var(--r-ink)' }}>
                {v != null ? moneyShort(figure(v)) : '—'}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 44,
                  height: barHeight,
                  background: v != null ? color : 'var(--status-neutral-border)',
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {entries.map((e) => (
          <div key={e.auditId} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--r-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.label}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--r-muted)' }}>{formatPeriodRange(e.periodStart, e.periodEnd)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
