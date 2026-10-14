import type { EvidencePhotoType } from '@/lib/evidence/types';

// B7/ADR-0012 — one fixed recipe per evidence type: the column set the extraction must
// return (in this order) and a prompt fragment naming what the photo typically looks
// like. Recipe-based, not freeform, so the same register type reads with consistent
// headers across audits/outlets (confirmed necessary — checkpoint codes map many-to-many
// to photo types, e.g. POS-01 alone implies both void and discount photos).
export const EVIDENCE_RECIPES: Record<EvidencePhotoType, { columns: string[]; hint: string }> = {
  discount_register: {
    columns: ['Date', 'Bill No', 'Discount Reason', 'Bill Amt', 'Discount Amt', 'Percentage', 'Table', 'Remark'],
    hint: 'a discount register: a dated log of billed amounts, the discount reason, discount amount/percentage, the table it was billed to, and any remark column',
  },
  voids_cancellations: {
    columns: ['Date', 'Bill No', 'Reason', 'Amount', 'Table'],
    hint: 'a voids log: a dated log of voided bills with a reason and amount',
  },
  non_chargeable: {
    columns: ['Date', 'Bill No', 'Item', 'Amount', 'Reason'],
    hint: 'a non-chargeable (NC) or complimentary report: a dated log of items given away without being billed, and why',
  },
  bill_modification: {
    columns: ['Date & Time', 'Bill No', 'Old Amount', 'New Amount', 'Mode', 'User', 'Action', 'Reason', 'Remark'],
    hint: 'a bill modification log: a dated log of bills edited after being raised, showing the old and new amount, the order mode, the user who made the edit, and what action was taken',
  },
  item_cancellation: {
    columns: ['Date', 'Item', 'Table', 'Bill No', 'Order Time', 'Cancel Time', 'Time Diff', 'Qty', 'Amount', 'Reason', 'Waiter', 'Cancelled By', 'Authorised Sign', 'Remark'],
    hint: 'an item cancellation log: a dated log of individual cancelled items, with the table, bill number, order/cancel time, quantity, amount, reason, the waiter, who cancelled it, and who authorised it',
  },
  other: {
    columns: ['Date', 'Description', 'Amount'],
    hint: 'a tabular financial register whose exact purpose is not one of the other fixed types',
  },
};

export function evidenceExtractionPrompt(type: EvidencePhotoType): string {
  const recipe = EVIDENCE_RECIPES[type];
  return `
You are transcribing a photographed tabular financial record — ${recipe.hint} — exactly as printed or
handwritten. Return every cell's value verbatim, under exactly these column headers, in this order:
${recipe.columns.map((c) => `"${c}"`).join(', ')}.

Work strictly row by row, top to bottom, and transcribe every row — do not skip, merge, reorder or
repeat rows, and never copy a value from one row into another. Source headers may be abbreviated or
misspelled (e.g. "Discount Reson", "Time Diff", "Cancelled By"); match each to the listed column of the
same meaning. A listed column with no counterpart in the photo gets empty strings.

Never sum, average, round, reformat a date, recompute a percentage, or infer a value that isn't legible.
An illegible or blank cell must be an empty string, never a guess. If a column shown above has no matching
data in the photo, still include it with empty strings for every row. If the photo has no row/column
structure at all (not actually a table), return zero rows.

Respond with a single JSON object of the exact shape:
{"columns": ${JSON.stringify(recipe.columns)}, "rows": [["...", "..."], ...]}
Each row array must have exactly ${recipe.columns.length} entries, positionally aligned to "columns".
`.trim();
}
