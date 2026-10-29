import type { CostingBreakdown, CostLineItem } from '@/lib/report/costingBreakdown';
import { money } from '@/lib/report/reportFormat';

// Section 1B's flat cost-by-category table: bar + kitchen + non-commercial line items
// in one list (no A/B grouping), ending in the net F&B cost total — paired with
// CostVsSalesBars, which renders the same rows' % share instead of their value.
function flattenRows(breakdown: CostingBreakdown): CostLineItem[] {
  return [...(breakdown.bar?.items ?? []), ...(breakdown.kitchen?.items ?? []), ...breakdown.nonCommercial];
}

export { flattenRows };

export function DirectCostTable({ breakdown }: { breakdown: CostingBreakdown }) {
  const rows = flattenRows(breakdown);

  return (
    <div style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ background: 'var(--navy-050)', borderBottom: '1px solid var(--r-border)', padding: '12px 16px' }}>
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Direct Cost by Category
        </h3>
      </div>
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
        <tbody>
          {rows.map((item) => (
            <tr key={item.label} style={{ borderBottom: '1px solid var(--r-border)' }}>
              <td style={{ padding: '10px 12px 10px 16px', fontWeight: 500, color: 'var(--r-ink)' }}>{item.label}</td>
              <td style={{ padding: '10px 16px 10px 12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontWeight: 500, color: 'var(--r-ink)' }}>
                {money(item.value)}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid var(--navy-700)', background: 'var(--navy-050)', fontWeight: 700 }}>
            <td style={{ padding: '12px 12px 12px 16px', fontSize: 12.5, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</td>
            <td style={{ padding: '12px 16px 12px 12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 13, color: 'var(--navy-700)' }}>
              {money(breakdown.netFnbTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
