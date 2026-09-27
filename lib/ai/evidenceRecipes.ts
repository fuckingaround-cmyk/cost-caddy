import type { EvidencePhotoType } from '@/lib/evidence/types';

// B7/ADR-0012 — one fixed recipe per evidence type: the column set the extraction must
// return (in this order) and a prompt fragment naming what the photo typically looks
// like. Recipe-based, not freeform, so the same register type reads with consistent
// headers across audits/outlets (confirmed necessary — checkpoint codes map many-to-many
// to photo types, e.g. POS-01 alone implies both void and discount photos).
export const EVIDENCE_RECIPES: Record<EvidencePhotoType, { columns: string[]; hint: string }> = {
  discount_register: {
    columns: ['Date', 'Bill No', 'Discount Reason', 'Bill Amt', 'Discount Amt', 'Percentage', 'Table'],
    hint: 'a discount register: a dated log of billed amounts, the discount reason, discount amount/percentage, and the table it was billed to',
  },
  voids_cancellations: {
    columns: ['Date', 'Bill No', 'Reason', 'Amount', 'Table'],
    hint: 'a voids/cancellations log: a dated log of voided or cancelled bills with a reason and amount',
  },
  non_chargeable: {
    columns: ['Date', 'Bill No', 'Item', 'Amount', 'Reason'],
    hint: 'a non-chargeable (NC) report: a dated log of items given away without being billed, and why',
  },
  bill_modification: {
    columns: ['Date', 'Bill No', 'Original Amount', 'Modified Amount', 'Reason'],
    hint: 'a bill modification log: a dated log of bills that were edited after being raised, with the before/after amount and reason',
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

Never sum, average, round, reformat a date, recompute a percentage, or infer a value that isn't legible.
An illegible or blank cell must be an empty string, never a guess. If a column shown above has no matching
data in the photo, still include it with empty strings for every row. If the photo has no row/column
structure at all (not actually a table), return zero rows.

Respond with a single JSON object of the exact shape:
{"columns": ${JSON.stringify(recipe.columns)}, "rows": [["...", "..."], ...]}
Each row array must have exactly ${recipe.columns.length} entries, positionally aligned to "columns".
`.trim();
}
