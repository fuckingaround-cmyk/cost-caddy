export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

// Ported from Audit report v4.dc.html's composition donuts (~line 198-301): a ring of
// stroke-dasharray segments on a rotated SVG circle, r=70/stroke-width=28, with the
// total in the center. The mock hardcodes each segment's dasharray/offset for its one
// illustrative example; here they're computed from the real slice values so the chart
// stays correct as the underlying figures change.
export function CompositionDonut({ title, totalLabel, slices }: { title: string; totalLabel: string; slices: DonutSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const r = 70;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const length = total > 0 ? (s.value / total) * circumference : 0;
      const seg = { ...s, length, offset: -offset };
      offset += length;
      return seg;
    });

  return (
    <div style={{ border: '1px solid var(--r-border)', borderRadius: 10, padding: 20, background: '#fff', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--navy-700)' }}>{title}</h3>
        <span style={{ fontFamily: 'var(--font-report-mono)', fontSize: 12, color: 'var(--r-ink-2)' }}>{totalLabel}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', flex: 'none', width: 170, height: 170 }}>
          <svg viewBox="0 0 180 180" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            {total <= 0 ? (
              <circle cx={90} cy={90} r={r} fill="transparent" stroke="var(--status-neutral-border)" strokeWidth={28} />
            ) : (
              segments.map((s) => (
                <circle
                  key={s.label}
                  cx={90}
                  cy={90}
                  r={r}
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth={28}
                  strokeDasharray={`${s.length} ${circumference}`}
                  strokeDashoffset={s.offset}
                />
              ))
            )}
            <circle cx={90} cy={90} r={56} fill="#ffffff" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: 'var(--r-muted)' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-report-mono)', fontSize: 14, fontWeight: 700, color: 'var(--navy-700)' }}>{totalLabel}</span>
          </div>
        </div>
        <div style={{ width: '100%', maxWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {total <= 0 ? (
            <div style={{ fontSize: 12, color: 'var(--r-muted)' }}>Needs data</div>
          ) : (
            slices.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: 'none' }} />
                <span style={{ flex: 1, color: 'var(--r-ink)', fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--font-report-mono)', fontWeight: 600, width: 44, textAlign: 'right', color: 'var(--r-ink)' }}>
                  {total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
