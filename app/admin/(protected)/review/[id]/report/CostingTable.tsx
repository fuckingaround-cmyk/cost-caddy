export function SectionHeading({ label, right }: { label: string; right?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand)' }}>{label}</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--r-border)' }} />
      </div>
      {right && <span style={{ fontSize: 11, fontFamily: 'var(--font-report-mono)', color: 'var(--r-muted)', whiteSpace: 'nowrap' }}>{right}</span>}
    </div>
  );
}
