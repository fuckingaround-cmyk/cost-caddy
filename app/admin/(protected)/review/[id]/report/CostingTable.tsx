import type { CostingBreakdown, CostGroupBreakdown } from '@/lib/report/costingBreakdown';
import { money, pct } from '@/lib/report/reportFormat';

// Report v4 §1B (Audit report v4.dc.html ~line 306-405): per-line-item cost + % of
// sales, grouped A. Bar & Cellar / B. Kitchen & Production, then Total F&B Cost, the
// non-commercial adjustment, and Total Net F&B Cost.
export function CostingTable({ breakdown }: { breakdown: CostingBreakdown }) {
  return (
    <section data-gap="" style={{ marginBottom: 40 }}>
      <SectionHeading label="Section 1B · Costing & Cost as % of Sales" />
      <div style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ background: 'var(--navy-050)', borderBottom: '1px solid var(--r-border)', padding: '12px 16px' }}>
          <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cost Analysis &amp; F&amp;B Cost Breakdown
          </h3>
        </div>
        <div>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--r-border-2)', fontSize: 11, color: 'var(--r-ink)', background: '#fff' }}>
                <th style={{ width: '55%', padding: '10px 12px 10px 16px', fontWeight: 600 }}>Cost Category / Line Item</th>
                <th style={{ width: '25%', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Direct Cost</th>
                <th style={{ width: '20%', padding: '10px 16px 10px 12px', textAlign: 'right', fontWeight: 600 }}>%age (Sales Share)</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.bar && <GroupRows letter="A" breakdown={breakdown.bar} totalLabel="TOTAL BAR COST" />}
              {breakdown.kitchen && <GroupRows letter="B" breakdown={breakdown.kitchen} totalLabel="TOTAL KITCHEN COST" />}
              <tr style={{ background: 'var(--navy-050)', borderTop: '2px solid var(--r-border-2)', borderBottom: '1px solid var(--r-border)', fontWeight: 700 }}>
                <td style={{ padding: '12px 12px 12px 16px', fontSize: 12.5, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total F&amp;B Cost</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 13, color: 'var(--navy-700)' }}>{money(breakdown.fnbTotal)}</td>
                <td style={{ padding: '12px 16px 12px 12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 13, color: 'var(--navy-700)' }}>{pct(breakdown.fnbTotalPct)}</td>
              </tr>
              {breakdown.nonCommercial.map((item) => (
                <tr key={item.label} style={{ borderBottom: '1px solid var(--r-border)' }}>
                  <td style={{ padding: '10px 12px 10px 24px', color: 'var(--r-muted)', fontStyle: 'italic', fontSize: 11.5 }}>– {item.label} (Adjustment)</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 11.5, color: 'var(--r-muted)' }}>{money(item.value)}</td>
                  <td style={{ padding: '10px 16px 10px 12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 11.5, color: 'var(--r-muted)' }}>{pct(item.pct)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--navy-700)', background: 'var(--navy-700)', color: '#fff', fontWeight: 700 }}>
                <td style={{ padding: '14px 12px 14px 16px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Net F&amp;B Cost</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 14 }}>{money(breakdown.netFnbTotal)}</td>
                <td style={{ padding: '14px 16px 14px 12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 14, color: 'var(--navy-border-soft-3)' }}>{pct(breakdown.netFnbTotalPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function GroupRows({ letter, breakdown, totalLabel }: { letter: string; breakdown: CostGroupBreakdown; totalLabel: string }) {
  return (
    <>
      <tr style={{ background: 'var(--r-surface-alt-1)', borderBottom: '1px solid var(--r-border)' }}>
        <td colSpan={3} style={{ padding: '6px 12px 6px 16px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--r-muted)' }}>
          {letter}. {breakdown.title}
        </td>
      </tr>
      {breakdown.items.map((item) => (
        <tr key={item.label} style={{ borderBottom: '1px solid var(--r-border)' }}>
          <td style={{ padding: '10px 12px 10px 24px', fontWeight: 500, color: 'var(--r-ink)' }}>{item.label.toUpperCase()}</td>
          <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontWeight: 500, color: 'var(--r-ink)' }}>{money(item.value)}</td>
          <td style={{ padding: '10px 16px 10px 12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontWeight: 500, color: 'var(--r-ink)' }}>{pct(item.pct)}</td>
        </tr>
      ))}
      <tr style={{ background: 'var(--r-surface-alt-1)', fontWeight: 700, borderTop: '1px solid var(--r-border-2)', borderBottom: '1px solid var(--r-border)' }}>
        <td style={{ padding: '12px 12px 12px 16px', fontSize: 12.5, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{totalLabel}</td>
        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 13, color: 'var(--navy-700)' }}>{money(breakdown.total)}</td>
        <td style={{ padding: '12px 16px 12px 12px', textAlign: 'right', fontFamily: 'var(--font-report-mono)', fontSize: 13, color: 'var(--navy-700)' }}>{pct(breakdown.totalPct)}</td>
      </tr>
    </>
  );
}

export function SectionHeading({ label, right }: { label: string; right?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--navy-700)' }}>{label}</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--r-border)' }} />
      </div>
      {right && <span style={{ fontSize: 11, fontFamily: 'var(--font-report-mono)', color: 'var(--r-muted)', whiteSpace: 'nowrap' }}>{right}</span>}
    </div>
  );
}
