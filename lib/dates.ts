// Plain 'YYYY-MM-DD' date-string helpers, shared by the Reports tab, the overlap-block
// validation (lib/actions/audits.ts) and the MTD contiguity check (lib/report/
// mtdContiguity.ts). All arithmetic goes through Date.UTC rather than the local Date
// constructor, so a server running in any timezone computes the same day boundaries.

export function addDaysISO(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export function maxISO(a: string, b: string): string {
  return a > b ? a : b;
}

// 'Jul 1–15, 2026' for a range, or a single formatted date when the audit covers one day.
export function formatPeriodRange(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  if (periodStart === periodEnd) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = sameMonth
    ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel}–${endLabel}`;
}
