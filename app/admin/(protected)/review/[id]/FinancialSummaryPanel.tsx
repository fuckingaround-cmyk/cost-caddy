import type { FinancialReportDraft } from '@/lib/report/financialDraft';
import { count, money, pct } from '@/lib/report/reportFormat';

// C3 preview — renders C2's buildFinancialReportDraft as a plain reviewer-facing
// summary on the review screen itself. The fully styled, print-first Report v4 render
// (KPI strip, composition charts, department compliance matrix) lives at C4's
// /admin/review/[id]/report route.

export function FinancialSummaryPanel({ draft }: { draft: FinancialReportDraft }) {
  const kpiRows: { label: string; value: string }[] = [
    { label: 'Covers', value: count(draft.kpis.covers) },
    { label: 'Net Sale', value: money(draft.kpis.netSale) },
    { label: 'Kitchen Sale', value: money(draft.kpis.kitchenSale) },
    { label: 'Bar Sale', value: money(draft.kpis.barSale) },
    { label: 'Total Discounts', value: money(draft.kpis.totalDiscounts) },
    { label: 'Total Taxes', value: money(draft.kpis.totalTaxes) },
    { label: 'Total Charges', value: money(draft.kpis.totalCharges) },
    { label: 'Gross Sale', value: money(draft.kpis.grossSale) },
    { label: 'APC (Gross)', value: money(draft.kpis.apcGross) },
  ];

  const matrixRows = [...draft.revenueMatrix.rows, draft.revenueMatrix.total].map((row, i, all) => ({ row, depth: 0, isTotal: i === all.length - 1 }));

  const costRows: { label: string; value: string }[] = [
    { label: 'Bar Cost', value: `${money(draft.costing.barCost)} (${pct(draft.costing.barCostPct)})` },
    { label: 'Kitchen Cost', value: `${money(draft.costing.kitchenCost)} (${pct(draft.costing.kitchenCostPct)})` },
    { label: 'Non-Commercial Cost', value: money(draft.costing.ncCost) },
    { label: 'Total F&B Cost', value: `${money(draft.costing.fnbCost)} (${pct(draft.costing.fnbCostPct)})` },
    { label: 'Net F&B Cost', value: `${money(draft.costing.netFnbCost)} (${pct(draft.costing.netFnbCostPct)})` },
  ];

  return (
    <div style={{ border: '1px solid var(--border-card)', borderRadius: 'var(--radius-panel)', overflow: 'hidden', marginBottom: 'var(--space-9)' }}>
      <div style={{ padding: '10px 13px', background: 'var(--navy-700)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Financial Summary
      </div>

      <div style={{ padding: '7px 13px', background: 'var(--surface-alt-1)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
        Key Financial Metrics
      </div>
      {kpiRows.map((row) => (
        <Row key={row.label} label={row.label} value={row.value} />
      ))}

      <div style={{ padding: '7px 13px', background: 'var(--surface-alt-1)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
        Sales &amp; Revenue Matrix — sales − discount = net sales; + taxes + service charge = gross
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt-2)', color: 'var(--muted)', fontSize: 11 }}>
              <th style={{ textAlign: 'left', padding: '8px 13px' }}>Group</th>
              <th style={{ textAlign: 'right', padding: '8px 13px' }}>Sales</th>
              <th style={{ textAlign: 'right', padding: '8px 13px' }}>Discount</th>
              <th style={{ textAlign: 'right', padding: '8px 13px' }}>Net Sales</th>
              <th style={{ textAlign: 'right', padding: '8px 13px' }}>Taxes</th>
              <th style={{ textAlign: 'right', padding: '8px 13px' }}>Service Charge</th>
              <th style={{ textAlign: 'right', padding: '8px 13px' }}>Gross Sale</th>
              <th style={{ textAlign: 'right', padding: '8px 13px' }}>APC</th>
            </tr>
          </thead>
          <tbody>
            {matrixRows.map(({ row: r, depth, isTotal }) => (
              <tr key={`${depth}-${r.label}`} style={{ borderTop: '1px solid var(--divider)', fontWeight: isTotal ? 700 : 400, color: depth ? 'var(--muted)' : undefined }}>
                <td style={{ padding: depth ? '8px 13px 8px 26px' : '8px 13px' }}>{r.label}</td>
                <td style={{ textAlign: 'right', padding: '8px 13px' }}>{money(r.sales)}</td>
                <td style={{ textAlign: 'right', padding: '8px 13px' }}>{money(r.discount)}</td>
                <td style={{ textAlign: 'right', padding: '8px 13px' }}>{money(r.netSales)}</td>
                <td style={{ textAlign: 'right', padding: '8px 13px' }}>{money(r.taxes)}</td>
                <td style={{ textAlign: 'right', padding: '8px 13px' }}>{money(r.serviceCharge)}</td>
                <td style={{ textAlign: 'right', padding: '8px 13px' }}>{money(r.grossSale)}</td>
                <td style={{ textAlign: 'right', padding: '8px 13px' }}>{money(r.apc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '7px 13px', background: 'var(--surface-alt-1)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
        Costing &amp; Cost as % of Sales
      </div>
      {costRows.map((row) => (
        <Row key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 13px', borderBottom: '1px solid var(--surface-alt-1)' }}>
      <div style={{ flex: 1, fontSize: 12.5 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
