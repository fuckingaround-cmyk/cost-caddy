import { formatINR, formatINRShort } from '@/lib/calc';
import type { ReportFigure } from './figure';

// A missing figure always reads "Needs data" on the report — never ₹0, never a blank
// cell (EXECUTION.md C2/C4 done-when). One shared set of formatters so every report
// component (KPI strip, matrix, costing table) renders the same way for the same case.
export const NEEDS_DATA_LABEL = 'Needs data';

// The report shows plain figures — no ₹ symbol anywhere (the app UI keeps it).
const stripRupee = (s: string) => s.replace('₹', '');

export function moneyShort(f: ReportFigure): string {
  return f.status === 'ok' ? stripRupee(formatINRShort(f.value)) : NEEDS_DATA_LABEL;
}

export function money(f: ReportFigure): string {
  return f.status === 'ok' ? stripRupee(formatINR(f.value)) : NEEDS_DATA_LABEL;
}

export function pct(f: ReportFigure): string {
  return f.status === 'ok' ? `${f.value.toFixed(2)}%` : NEEDS_DATA_LABEL;
}

export function count(f: ReportFigure): string {
  return f.status === 'ok' ? String(Math.round(f.value)) : NEEDS_DATA_LABEL;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "21 Jul 2026" — the version-stamp date format from Audit report v4.dc.html /
// EXECUTION.md C5 ("v1 · 21 Jul 2026").
export function formatReportDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
