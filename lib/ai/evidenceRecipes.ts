import type { EvidencePhotoType } from '@/lib/evidence/types';

// ADR-0020 (supersedes ADR-0012's fixed recipes) — a recipe is a HINT, not a schema. It tells
// the model what kind of register it is looking at and which columns are typical, so the
// findings read well. The extracted table's columns are whatever the photo actually prints:
// extra, missing, renamed or reordered columns all come through as-is.
export const EVIDENCE_RECIPES: Record<EvidencePhotoType, { typicalColumns: string[]; hint: string }> = {
  discount_register: {
    typicalColumns: ['Date', 'Bill No', 'Discount Reason', 'Bill Amt', 'Discount Amt', 'Percentage', 'Table', 'Remark'],
    hint: 'a discount register: a dated log of billed amounts, the discount reason, discount amount/percentage, the table it was billed to, and any remark column',
  },
  voids_cancellations: {
    typicalColumns: ['Date', 'Bill No', 'Reason', 'Amount', 'Table'],
    hint: 'a voids log: a dated log of voided bills with a reason and amount',
  },
  non_chargeable: {
    typicalColumns: ['Date', 'Bill No', 'Item', 'Amount', 'Reason'],
    hint: 'a non-chargeable (NC) or complimentary report: a dated log of items given away without being billed, and why',
  },
  bill_modification: {
    typicalColumns: ['Date & Time', 'Bill No', 'Old Amount', 'New Amount', 'Mode', 'User', 'Action', 'Reason', 'Remark'],
    hint: 'a bill modification log: a dated log of bills edited after being raised, showing the old and new amount, the order mode, the user who made the edit, and what action was taken',
  },
  item_cancellation: {
    typicalColumns: ['Date', 'Item', 'Table', 'Bill No', 'Order Time', 'Cancel Time', 'Time Diff', 'Qty', 'Amount', 'Reason', 'Waiter', 'Cancelled By', 'Authorised Sign', 'Remark'],
    hint: 'an item cancellation log: a dated log of individual cancelled items, with the table, bill number, order/cancel time, quantity, amount, reason, the waiter, who cancelled it, and who authorised it',
  },
  other: {
    typicalColumns: ['Date', 'Description', 'Amount'],
    hint: 'a tabular financial register whose exact purpose is not one of the other fixed types',
  },
};

// Transcription rules for one register photo of this type — embedded in the single
// extract-and-write-findings call (lib/ai/analyseRegisterEvidence.ts, ADR-0018).
export function evidenceTranscriptionRules(type: EvidencePhotoType): string {
  const recipe = EVIDENCE_RECIPES[type];
  return `
Each photo is ${recipe.hint}. Typical columns for this kind of register are:
${recipe.typicalColumns.map((c) => `"${c}"`).join(', ')}.
That list is only a hint for what you are looking at. The photo's own header row is the schema.

Transcribe the table exactly as it appears. Take the column headers verbatim from the photo, left to
right, one entry per printed column — include columns that are not in the typical list (e.g. "KOT NO"),
keep the photo's own order and spelling, and do not add, drop, merge, rename or reorder columns. If the
photo has no header row, use short descriptive headers for the columns you can see.

Work strictly row by row, top to bottom, and transcribe every row — do not skip, merge, reorder or
repeat rows, and never copy a value from one row into another. Every row array must have exactly one
entry per header, in the same left-to-right positions. A blank, empty or illegible cell is an empty
string "" that still occupies its position — never shift the cells after it to the left, and never
fill a blank with a value from a neighbouring cell or a guess.

Never sum, average, round, reformat a date, recompute a percentage, or infer a value that isn't legible.
If the photo has no row/column structure at all (not actually a table), return zero rows for it.
`.trim();
}
