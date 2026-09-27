import type { EvidencePhotoType } from './types';

// Kept import-free of the AI prompt library (lib/ai/evidenceRecipes.ts) so the
// checklist's evidence-type picker can compute a default client-side without shipping
// Gemini prompt text to the browser bundle.
//
// Best-effort default so the auditor isn't picking blind — the checkpoint alone cannot
// decide the type (POS-01 "Voids & Discounts" implies both a void log and a discount
// register), so this only pre-selects a starting point the auditor can change.
const CHECKPOINT_CODE_SUGGESTIONS: Record<string, EvidencePhotoType> = {
  'POS-01': 'voids_cancellations',
  'POS-03': 'non_chargeable',
  'POS-04': 'bill_modification',
  'POS-05': 'voids_cancellations',
  'POS-06': 'discount_register',
};

export function suggestedEvidenceType(checkpointCode: string): EvidencePhotoType | null {
  return CHECKPOINT_CODE_SUGGESTIONS[checkpointCode] ?? null;
}
