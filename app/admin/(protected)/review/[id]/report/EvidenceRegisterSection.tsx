import { SectionHeading } from './CostingTable';
import type { EvidenceRegisterGroup } from '@/lib/report/reportViewModel';

// B7/ADR-0012 — a new report section, not a row nested under the compliance matrix: no
// existing table in this report's design (Sales & Revenue Matrix, Cost Analysis) nests
// under another row either, they're each their own full-width section. Reuses
// DESIGN.md's existing "Report table / KPI strip" token verbatim (12px cells, #e4e8ee
// rules, 10.5px/600 uppercase header) — no new style invented. Print: data-avoid only on
// the small header band, never on the variable-height table body, so it can break across
// pages with the native <thead> repeat (same convention UX-022 already established for
// the compliance matrix).
export function EvidenceRegisterSection({ groups }: { groups: EvidenceRegisterGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <SectionHeading label="Section 3 · Evidence Registers" right={`${groups.reduce((n, g) => n + g.tables.length, 0)} extracted`} />
      {groups.map((group) => (
        <div key={group.evidenceType} style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff', marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
          <div data-avoid="" style={{ background: 'var(--navy-050)', borderBottom: '1px solid var(--r-border)', padding: '12px 16px' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.label}</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--r-muted)' }}>Transcribed verbatim from the auditor&rsquo;s evidence photo — figures are not recomputed.</p>
          </div>
          {group.tables.map((t, i) => (
            <div key={t.id} style={{ borderTop: i > 0 ? '1px solid var(--r-border)' : 'none' }}>
              <div style={{ padding: '10px 16px 0', fontSize: 11, color: 'var(--r-muted)' }}>
                {t.department} · {t.checkpointLabel}
                {t.photoUrl && (
                  <>
                    {' · '}
                    <a href={t.photoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--r-muted)' }}>
                      view original
                    </a>
                  </>
                )}
              </div>
              <div style={{ overflowX: 'auto', padding: '8px 0 12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--r-border-2)', fontSize: 10.5, fontWeight: 600, color: 'var(--r-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t.columns.map((c) => (
                        <th key={c} style={{ padding: '8px 12px' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--r-border)', background: ri % 2 === 1 ? 'var(--r-surface-alt-2)' : '#fff' }}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            style={{
                              padding: '8px 12px',
                              color: 'var(--r-ink-2)',
                              fontFamily: /^[\d.,₹%\s-]*$/.test(cell) && cell.trim() !== '' ? 'var(--font-report-mono)' : undefined,
                              textAlign: /^[\d.,₹%\s-]*$/.test(cell) && cell.trim() !== '' ? 'right' : 'left',
                            }}
                          >
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
