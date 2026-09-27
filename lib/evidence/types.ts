// Kept import-free of db/schema so client components (the checklist's evidence-type
// picker) can pull the vocabulary without dragging the Postgres driver into the browser
// bundle — same reasoning as lib/operational/types.ts's OPERATIONAL_FILE_TYPES.
export const EVIDENCE_PHOTO_TYPES = [
  'discount_register',
  'voids_cancellations',
  'non_chargeable',
  'bill_modification',
  'other',
] as const;

export type EvidencePhotoType = (typeof EVIDENCE_PHOTO_TYPES)[number];

export const EVIDENCE_PHOTO_TYPE_LABELS: Record<EvidencePhotoType, string> = {
  discount_register: 'Discount Register',
  voids_cancellations: 'Voids & Cancellations',
  non_chargeable: 'Non-Chargeable Report',
  bill_modification: 'Bill Modification Log',
  other: 'Other register',
};
