import { formatINR } from '@/lib/calc/currency';
import type { ExtractedTableShape } from './normaliseTable';

const AMOUNT_HEADER = /disc\w*\.?\s*(amt|amount|value)/i;

function num(cell: string): number | null {
  const n = Number(cell.replace(/[₹,%\s]/g, ''));
  return cell.trim() !== '' && Number.isFinite(n) ? n : null;
}

// "LLM never computes": the bill count and total discount in the discount findings are summed here
// from the stored table cells, never by the model. No fixed percentage threshold is applied —
// this restaurant's real policy figure isn't known, and the auditor's remark (passed to the model
// separately) is the source for any threshold the findings cite. Returns '' when the register has
// no usable discount-amount column or no discounted bills at all, so the AI text stands alone.
export function discountTotalsSentence(tables: ExtractedTableShape[]): string {
  let bills = 0;
  let total = 0;
  for (const t of tables) {
    const amtCol = t.columns.findIndex((c) => AMOUNT_HEADER.test(c));
    if (amtCol < 0) continue;
    for (const row of t.rows) {
      const amt = num(row[amtCol] ?? '');
      if (amt === null || amt <= 0) continue;
      bills++;
      total += amt;
    }
  }
  if (bills === 0) return '';
  return `In total, ${bills} ${bills === 1 ? 'bill carried a discount' : 'bills carried discounts'}, amounting to ${formatINR(total)}.`;
}

export function withDiscountTotals(findings: string, reportType: string, tables: ExtractedTableShape[]): string {
  if (reportType !== 'discount_register') return findings;
  const sentence = discountTotalsSentence(tables);
  return sentence ? `${findings.trim()} ${sentence}`.trim() : findings;
}
