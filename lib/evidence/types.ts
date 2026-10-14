// Kept import-free of db/schema so client components (the checklist's evidence-type
// picker) can pull the vocabulary without dragging the Postgres driver into the browser
// bundle — same reasoning as lib/operational/types.ts's OPERATIONAL_FILE_TYPES.
export const EVIDENCE_PHOTO_TYPES = [
  'discount_register',
  'voids_cancellations',
  'non_chargeable',
  'bill_modification',
  'item_cancellation',
  'other',
] as const;

export type EvidencePhotoType = (typeof EVIDENCE_PHOTO_TYPES)[number];

// The four report types an admin can add to a template's "POS Report" section (ADR-0015).
// Complimentary reuses the non_chargeable recipe (same register, two names).
export const POS_REPORT_TYPES = ['discount_register', 'item_cancellation', 'bill_modification', 'non_chargeable'] as const;
export type PosReportType = (typeof POS_REPORT_TYPES)[number];

export const POS_REPORT_LABELS: Record<PosReportType, string> = {
  discount_register: 'Discount',
  item_cancellation: 'Item Cancellation',
  bill_modification: 'Bill Modification',
  non_chargeable: 'Complimentary',
};

export function isPosReportType(value: string): value is PosReportType {
  return (POS_REPORT_TYPES as readonly string[]).includes(value);
}

export const EVIDENCE_PHOTO_TYPE_LABELS: Record<EvidencePhotoType, string> = {
  discount_register: 'Discount Register',
  voids_cancellations: 'Voids & Cancellations',
  non_chargeable: 'Non-Chargeable / Complimentary Report',
  bill_modification: 'Bill Modification Log',
  item_cancellation: 'Item Cancellation Log',
  other: 'Other register',
};
