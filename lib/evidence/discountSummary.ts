import { formatINR } from '@/lib/calc/currency';
import type { ExtractedTableShape } from './normaliseTable';

// Mirrors the 10% in EVIDENCE_FINDINGS_POLICY_CONTEXT — the model only quotes it, this counts with it.
export const DISCOUNT_THRESHOLD_PCT = 10;

const AMOUNT_HEADER = /disc\w*\.?\s*(amt|amount|value)/i;
const PERCENT_HEADER = /%|perc|pct/i;

function num(cell: string): number | null {
  const n = Number(cell.replace(/[₹,%\s]/g, ''));
  return cell.trim() !== '' && Number.isFinite(n) ? n : null;
}

// "LLM never computes": the bill count and total discount in the discount findings are summed here
// from the stored table cells, never by the model. Returns '' when the register has no usable
// discount-amount column or no bill above the threshold, so the AI text stands alone.
export function discountTotalsSentence(tables: ExtractedTableShape[]): string {
  let bills = 0;
  let total = 0;
  for (const t of tables) {
    const amtCol = t.columns.findIndex((c) => AMOUNT_HEADER.test(c));
    if (amtCol < 0) continue;
    const pctCol = t.columns.findIndex((c) => PERCENT_HEADER.test(c));
    for (const row of t.rows) {
      const amt = num(row[amtCol] ?? '');
      if (amt === null) continue;
      if (pctCol >= 0) {
        const pct = num(row[pctCol] ?? '');
        if (pct === null || pct <= DISCOUNT_THRESHOLD_PCT) continue;
      }
      bills++;
      total += amt;
    }
  }
  if (bills === 0) return '';
  const scope = tables.some((t) => t.columns.some((c) => PERCENT_HEADER.test(c))) ? ` above the ${DISCOUNT_THRESHOLD_PCT}% threshold` : '';
  return `In total, ${bills} ${bills === 1 ? 'bill carried a discount' : 'bills carried discounts'}${scope}, amounting to ${formatINR(total)}.`;
}

export function withDiscountTotals(findings: string, reportType: string, tables: ExtractedTableShape[]): string {
  if (reportType !== 'discount_register') return findings;
  const sentence = discountTotalsSentence(tables);
  return sentence ? `${findings.trim()} ${sentence}`.trim() : findings;
}
