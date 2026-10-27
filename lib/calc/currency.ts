// Ported from Super Admin Flow.dc.html's fmtINR (~line 1902) — Indian digit grouping
// (₹2,47,975.00), always to 2 decimal places. The single ₹ formatter for the App UI:
// metric entry fields, table cells, anywhere a full-precision figure is shown
// (CLAUDE.md "never inline... currency Indian short-scale via one formatter").
export function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const neg = n < 0;
  const abs = Math.abs(n);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let rest = intPart.slice(0, -3);
  let last3 = intPart.slice(-3);
  if (rest) last3 = ',' + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-₹' : '₹') + rest + last3 + '.' + decPart;
}

// Compact Indian short-scale (₹4.80L / ₹1.20Cr) for the Report's KPI figures (DESIGN.md
// Part A, C4) — large aggregates read better abbreviated than fully expanded.
export function formatINRShort(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const neg = n < 0;
  const abs = Math.abs(n);

  if (abs >= 1_00_00_000) return (neg ? '-₹' : '₹') + (abs / 1_00_00_000).toFixed(2) + 'Cr';
  if (abs >= 1_00_000) return (neg ? '-₹' : '₹') + (abs / 1_00_000).toFixed(2) + 'L';
  return formatINR(n);
}
