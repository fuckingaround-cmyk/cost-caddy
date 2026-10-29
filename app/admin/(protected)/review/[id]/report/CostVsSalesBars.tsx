import type { CostingBreakdown } from '@/lib/report/costingBreakdown';
import { pct } from '@/lib/report/reportFormat';
import { flattenRows } from './DirectCostTable';

// Section 1B's cost-as-%-of-sales panel: same flattened rows as DirectCostTable, but
// each item's pct (already "cost / that item's own matching revenue denominator" —
// lib/report/costingBreakdown.ts) drawn as a horizontal bar instead of a value.
export function CostVsSalesBars({ breakdown }: { breakdown: CostingBreakdown }) {
  const rows = flattenRows(breakdown);

  return (
    <div style={{ border: '1px solid var(--r-border)', borderRadius: 10, padding: 20, background: '#fff', boxShadow: 'var(--shadow-card)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 13.5, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Cost vs. Sales by Category
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((item) => {
          const filled = item.pct.status === 'ok' ? Math.min(Math.max(item.pct.value, 0), 100) / 10 : 0;
          return (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--r-ink)' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-report-mono)', fontSize: 12, fontWeight: 600, color: 'var(--r-ink)' }}>{pct(item.pct)}</span>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: 10 }, (_, i) => Math.min(Math.max(filled - i, 0), 1)).map((segmentFill, i) => (
                  <div key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: 'var(--r-surface-alt-1)', overflow: 'hidden' }}>
                    <div style={{ width: `${segmentFill * 100}%`, height: '100%', background: 'var(--navy-700)' }} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ margin: '16px 0 0', fontSize: 11, color: 'var(--r-muted)' }}>Cost shown as a share of that category&rsquo;s own sales</p>
    </div>
  );
}
