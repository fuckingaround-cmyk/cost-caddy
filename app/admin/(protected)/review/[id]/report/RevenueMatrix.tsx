import type { FinancialReportDraft } from '@/lib/report/financialDraft';
import { money } from '@/lib/report/reportFormat';

// Report v4 §1's Sales & Per-Customer Revenue Matrix (Audit report v4.dc.html
// ~line 152-196). One row per sales metric, named as the template names it (Kitchen,
// Liquor, Beverage…) — n rows, no fixed Kitchen/Bar grouping.
export function RevenueMatrix({ draft }: { draft: FinancialReportDraft }) {
  const rows = [...draft.revenueMatrix.rows, draft.revenueMatrix.total].map((row, i, all) => ({ row, depth: 0, isTotal: i === all.length - 1 }));

  return (
    <div data-avoid="" data-gap="" style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
      <div style={{ background: 'var(--navy-050)', borderBottom: '1px solid var(--r-border)', padding: '12px 16px' }}>
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Sales &amp; Per-Customer Revenue Matrix
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--r-ink-2)' }}>
          Sales − discount = net sales; + taxes + service charge = gross sale. Taxes and service charge allocated pro-rata on net sales; APC on covers.
        </p>
      </div>
      <div>
        <table data-matrix="" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--r-border-2)', fontSize: 11, fontWeight: 600, color: 'var(--r-ink)', background: '#fff' }}>
              <th style={{ width: '16%', padding: '10px 12px 10px 16px', fontWeight: 600 }}>Category</th>
              <th style={{ width: '12%', padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Sales Before Taxes</th>
              <th style={{ width: '12%', padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Discount</th>
              <th style={{ width: '12%', padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Net Sales</th>
              <th style={{ width: '12%', padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Taxes</th>
              <th style={{ width: '12%', padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Service Charge</th>
              <th style={{ width: '12%', padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Gross Sale</th>
              <th style={{ width: '12%', padding: '10px 16px 10px 12px', textAlign: 'right', fontWeight: 600, background: 'var(--r-surface-alt-1)' }}>APC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row: r, depth, isTotal }, i) => {
              return (
                <tr
                  key={`${depth}-${r.label}`}
                  style={{
                    borderBottom: isTotal ? undefined : '1px solid var(--r-border)',
                    borderTop: isTotal ? '2px solid var(--navy-700)' : undefined,
                    background: isTotal ? 'var(--navy-050)' : i % 2 === 1 ? 'var(--r-surface-alt-2)' : 'transparent',
                    fontWeight: isTotal ? 700 : 400,
                  }}
                >
                  <td style={{ padding: isTotal ? '14px 12px 14px 16px' : depth ? '8px 12px 8px 32px' : '12px 12px 12px 16px', fontWeight: depth ? 400 : 600, color: depth ? 'var(--r-ink-2)' : 'var(--r-ink)', textTransform: isTotal ? 'uppercase' : 'none', letterSpacing: isTotal ? '0.05em' : 'normal' }}>
                    {r.label}
                  </td>
                  {([r.sales, r.discount, r.netSales, r.taxes, r.serviceCharge, r.grossSale] as const).map((f, j) => (
                    <td key={j} style={{ padding: isTotal ? '14px 12px' : depth ? '8px 12px' : '12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: isTotal ? 13 : 12, color: j === 5 ? 'var(--navy-700)' : depth ? 'var(--r-ink-2)' : 'var(--r-ink)' }}>
                      {money(f)}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: isTotal ? '14px 16px 14px 12px' : depth ? '8px 16px 8px 12px' : '12px 16px 12px 12px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-report-mono)',
                      fontWeight: 700,
                      color: 'var(--navy-700)',
                      background: isTotal ? 'var(--r-border-2)' : 'var(--r-surface-alt-1)',
                      fontSize: isTotal ? 14 : 12.5,
                    }}
                  >
                    {money(r.apc)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
