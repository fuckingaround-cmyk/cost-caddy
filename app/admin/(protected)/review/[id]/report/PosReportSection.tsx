import { SectionHeading } from './CostingTable';
import type { PosReport } from '@/lib/report/reportViewModel';

// ADR-0015 — the POS Report is its own report section (not rows of the compliance matrix):
// one card per report (Discount, Item Cancellation, Bill Modification, Complimentary) in
// template order — heading, Findings and Observations, Corrective Measures, then the table(s)
// transcribed from the auditor's photo(s). Reuses the "Report table / KPI strip" token
// (12px cells, #e4e8ee rules, 10.5px/600 uppercase header). Print: data-avoid only on the
// small header band so the table can break across pages with the native <thead> repeat
// (UX-022 convention).
export function PosReportSection({ reports }: { reports: PosReport[] }) {
  if (reports.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <SectionHeading label="Section 3 · POS Reports" right={`${reports.length} report${reports.length === 1 ? '' : 's'}`} />
      {reports.map((r) => (
        <div key={r.id} style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff', marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
          <div data-avoid="" style={{ background: 'var(--navy-050)', borderBottom: '1px solid var(--r-border)', padding: '12px 16px' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label} Report</h3>
          </div>

          {r.status === 'na' ? (
            <SubSection label="Not applicable" text={r.naReason ?? ''} tone="neutral" last />
          ) : (
            <>
              <SubSection label="Findings and Observations" text={r.findings} tone="findings" />
              <SubSection label="Corrective Measures" text={r.correctiveMeasures} tone="corrective" />
              {r.tables.map((t) => (
                <div key={t.id} style={{ borderBottom: '1px solid var(--r-border)' }}>
                  {t.photoUrl && (
                    <div style={{ padding: '10px 16px 0', fontSize: 11, color: 'var(--r-muted)' }}>
                      <a href={t.photoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--r-muted)' }}>
                        view original
                      </a>
                    </div>
                  )}
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
      ))}
    </section>
  );
}

// Tinted callouts: light red for Findings and Observations (the problem), light green for
// Corrective Measures (the fix).
const TONES = {
  findings: { bg: 'var(--report-pos-findings-bg)', fg: 'var(--report-pos-findings-fg)' },
  corrective: { bg: 'var(--report-pos-corrective-bg)', fg: 'var(--report-pos-corrective-fg)' },
  neutral: { bg: 'transparent', fg: 'var(--r-muted)' },
} as const;

function SubSection({ label, text, tone, last }: { label: string; text: string; tone: keyof typeof TONES; last?: boolean }) {
  const t = TONES[tone];
  return (
    <div data-avoid="" style={{ padding: '12px 16px', borderBottom: last ? 'none' : '1px solid var(--r-border)', background: t.bg, borderLeft: `4px solid ${t.fg}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: t.fg, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--r-ink)', lineHeight: 1.6, fontStyle: text ? 'normal' : 'italic' }}>{text || 'Not yet recorded.'}</p>
    </div>
  );
}
