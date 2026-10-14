import { describe, expect, it } from 'vitest';
import { EVIDENCE_PHOTO_TYPES, isPosReportType, POS_REPORT_LABELS, POS_REPORT_TYPES } from './types';

describe('POS report types', () => {
  it('offers exactly the four dropdown reports, each with a label', () => {
    expect(POS_REPORT_TYPES).toHaveLength(4);
    expect(POS_REPORT_TYPES.map((t) => POS_REPORT_LABELS[t]).sort()).toEqual(
      ['Bill Modification', 'Complimentary', 'Discount', 'Item Cancellation'],
    );
  });

  it('every POS report type is a real evidence recipe type', () => {
    for (const t of POS_REPORT_TYPES) expect(EVIDENCE_PHOTO_TYPES).toContain(t);
  });

  it('rejects non-POS values (used to re-validate the template save)', () => {
    expect(isPosReportType('discount_register')).toBe(true);
    expect(isPosReportType('voids_cancellations')).toBe(false);
    expect(isPosReportType('nonsense')).toBe(false);
  });
});
