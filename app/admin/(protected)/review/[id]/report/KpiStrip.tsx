import type { FinancialDraftKpis } from '@/lib/report/financialDraft';
import { divideFigures, type ReportFigure } from '@/lib/report/figure';
import { count, moneyShort } from '@/lib/report/reportFormat';

// Report v4 §1's KPI strip (Audit report v4.dc.html ~line 78-150): a card per figure,
// big mono number over an uppercase label, with a APC sub-figure on sales cards.
export function KpiStrip({ kpis }: { kpis: FinancialDraftKpis }) {
  const apc = (f: ReportFigure) => moneyShort(divideFigures(f, kpis.covers));

  const cards = [
    { label: 'Total Pax (Covers)', value: count(kpis.covers), sub: null },
    { label: 'Gross Sale', value: moneyShort(kpis.grossSale), sub: apc(kpis.grossSale), highlight: true },
    { label: 'Total Discount', value: moneyShort(kpis.totalDiscounts), sub: apc(kpis.totalDiscounts), financial: true },
    { label: 'Net Sale (Ex-Tax)', value: moneyShort(kpis.netSale), sub: apc(kpis.netSale), highlight: true, last: true },
  ];

  return (
    <div
      data-gap=""
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        border: '1px solid var(--r-border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
        marginBottom: 24,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          data-kpi-card=""
          style={{
            flex: '1 1 160px',
            minWidth: 160,
            padding: 16,
            borderRight: c.last ? 'none' : '1px solid var(--r-border)',
            borderTop: '1px solid var(--r-border)',
            marginTop: -1,
            background: c.last ? 'var(--r-surface-alt-1)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.last ? 'var(--navy-700)' : 'var(--r-muted)', fontWeight: c.last ? 700 : 600 }}>
            {c.label}
          </div>
          <div
            data-kpi-value=""
            style={{
              fontSize: 21,
              fontWeight: 700,
              fontFamily: 'var(--font-report-mono)',
              color: c.financial ? 'var(--status-financial-fg)' : c.highlight || c.last ? 'var(--navy-700)' : 'var(--r-ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {c.value}
          </div>
          {c.sub && (
            <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--r-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--r-muted)' }}>APC</span>
              <span style={{ fontFamily: 'var(--font-report-mono)', fontSize: 12.5, fontWeight: 700, color: c.last ? 'var(--navy-700)' : 'var(--r-ink)' }}>{c.sub}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
