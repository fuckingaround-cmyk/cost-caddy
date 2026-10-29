import { SectionHeading } from './CostingTable';
import type { PosReport } from '@/lib/report/reportViewModel';
import { formatINR, formatINRShort } from '@/lib/calc/currency';

// ADR-0015 — the POS Report is its own report section (not rows of the compliance matrix):
// one card per report (Discount, Item Cancellation, Bill Modification, Complimentary) in
// template order — header band with severity chip, side-by-side Findings / Corrective
// Action callouts, then the Source Transactions table(s) transcribed from the auditor's
// photo(s). Reuses the "Report table / KPI strip" token (12px cells, #e4e8ee rules,
// 10.5px/600 uppercase header). Print: data-avoid only on the small header band so the
// table can break across pages with the native <thead> repeat (UX-022 convention).

const SEVERITY_CHIP: Record<'High' | 'Medium' | 'Low', { bg: string; fg: string }> = {
  High: { bg: 'var(--report-sev-high-bg)', fg: 'var(--report-sev-high-fg)' },
  Medium: { bg: 'var(--report-sev-medium-bg)', fg: 'var(--report-sev-medium-fg)' },
  Low: { bg: 'var(--report-sev-low-bg)', fg: 'var(--report-sev-low-fg)' },
};

// The one deterministic figure this section computes itself ("LLM never computes"): which
// rows in a report's own transcribed table carry a flagged amount, and their total — found
// by column header, never guessed from the narrative. Covers the four POS report types'
// likely column names (discount/cancelled/voided/complimentary/waived/modified amount).
const FLAGGED_AMOUNT_HEADER = /(disc|cancel|void|comp|waiv|modif)\w*\.?\s*(amt|amount|value)/i;
const PCT_HEADER = /%|pct|percent/i;

function flaggedTotals(tables: PosReport['tables']): { bills: number; total: number; avgPct: number | null } {
  let bills = 0;
  let total = 0;
  let pctSum = 0;
  let pctCount = 0;
  for (const t of tables) {
    const amtCol = t.columns.findIndex((c) => FLAGGED_AMOUNT_HEADER.test(c));
    const pctCol = t.columns.findIndex((c) => PCT_HEADER.test(c));
    if (amtCol < 0) continue;
    for (const row of t.rows) {
      const amt = Number((row[amtCol] ?? '').replace(/[₹,%\s]/g, ''));
      if (!Number.isFinite(amt) || amt <= 0) continue;
      bills++;
      total += amt;
      if (pctCol >= 0) {
        const p = Number((row[pctCol] ?? '').replace(/[₹,%\s]/g, ''));
        if (Number.isFinite(p)) {
          pctSum += p;
          pctCount++;
        }
      }
    }
  }
  return { bills, total, avgPct: pctCount > 0 ? pctSum / pctCount : null };
}

export function PosReportSection({ reports }: { reports: PosReport[] }) {
  if (reports.length === 0) return null;

  const grandTotal = reports.reduce((sum, r) => sum + flaggedTotals(r.tables).total, 0);

  return (
    <section style={{ marginBottom: 32 }}>
      <SectionHeading
        label="Section 3 · POS Exception Reports"
        right={`${reports.length} report${reports.length === 1 ? '' : 's'}${grandTotal > 0 ? ` · ${formatINRShort(grandTotal)} flagged` : ''}`}
      />
      <p style={{ margin: '-8px 0 14px', fontSize: 11.5, color: 'var(--r-muted)' }}>
        Findings surfaced directly from the POS audit trail. Each card summarizes the exception and corrective action — raw transaction rows are available on demand.
      </p>
      {reports.map((r) => {
        const chip = r.severity ? SEVERITY_CHIP[r.severity] : null;
        const totals = r.status === 'na' ? null : flaggedTotals(r.tables);
        const correctiveLines = r.correctiveMeasures.split('\n').map((l) => l.trim()).filter(Boolean);

        return (
          <div key={r.id} style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff', marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
            <div
              data-avoid=""
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'var(--navy-050)',
                borderBottom: '1px solid var(--r-border)',
                padding: '12px 16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--navy-700)' }}>{r.label} Report</h3>
              {chip && (
                <span
                  style={{
                    fontFamily: 'var(--font-report-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    background: chip.bg,
                    color: chip.fg,
                  }}
                >
                  {r.severity}
                </span>
              )}
            </div>

            {r.status === 'na' ? (
              <div data-avoid="" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--r-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Not applicable</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--r-ink)', lineHeight: 1.6, fontStyle: r.naReason ? 'normal' : 'italic' }}>{r.naReason || 'Not yet recorded.'}</p>
              </div>
            ) : (
              <>
                <div data-avoid="" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16 }}>
                  <div style={{ background: 'var(--report-pos-findings-bg)', borderLeft: '4px solid var(--report-pos-findings-fg)', borderRadius: 6, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--report-pos-findings-fg)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Findings</div>
                    {totals && totals.bills > 0 && (
                      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-report-mono)', color: 'var(--r-ink)' }}>
                        {formatINR(totals.total)} · {totals.bills} {totals.bills === 1 ? 'bill' : 'bills'}
                        {totals.avgPct !== null ? ` · ${totals.avgPct.toFixed(0)}% avg` : ''}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--r-ink)', lineHeight: 1.6, fontStyle: r.findings ? 'normal' : 'italic' }}>{r.findings || 'Not yet recorded.'}</p>
                  </div>
                  <div style={{ background: 'var(--report-pos-corrective-bg)', borderLeft: '4px solid var(--report-pos-corrective-fg)', borderRadius: 6, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--report-pos-corrective-fg)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Corrective Action</div>
                    {correctiveLines.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--r-ink)', lineHeight: 1.6 }}>
                        {correctiveLines.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--r-ink)', lineHeight: 1.6, fontStyle: 'italic' }}>Not yet recorded.</p>
                    )}
                  </div>
                </div>

                {r.tables.map((t) => (
                  <div key={t.id} style={{ borderTop: '1px solid var(--r-border)' }}>
                    <div data-avoid="" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '10px 16px 0' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--r-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Source Transactions ({t.rows.length})
                      </span>
                      {t.photoUrl && (
                        <a href={t.photoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--r-muted)' }}>
                          view original
                        </a>
                      )}
                    </div>
                    <div data-scroll-x="" style={{ overflowX: 'auto', padding: '8px 0 12px' }}>
                      <table data-pos-table="" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--r-border-2)', fontSize: 10.5, fontWeight: 600, color: 'var(--r-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t.columns.map((c, ci) => (
                              <th key={ci} style={{ padding: '8px 12px' }}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid var(--r-border)', background: ri % 2 === 1 ? 'var(--r-surface-alt-2)' : '#fff' }}>
                              {t.columns.map((_, ci) => {
                                const cell = row[ci] ?? '';
                                const numeric = /^[\d.,₹%\s-]*$/.test(cell) && cell.trim() !== '';
                                return (
                                  <td
                                    key={ci}
                                    style={{ padding: '8px 12px', color: 'var(--r-ink-2)', fontFamily: numeric ? 'var(--font-report-mono)' : undefined, textAlign: numeric ? 'right' : 'left' }}
                                  >
                                    {cell || '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
