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

describe('custom POS reports', () => {
  it('maps presets to their label and custom names to type other', async () => {
    const { posReportEntryFor, posFindingsKey } = await import('./types');
    expect(posReportEntryFor('discount_register', 'ignored')).toEqual({ reportType: 'discount_register', label: 'Discount' });
    expect(posReportEntryFor('other', '  Void report ')).toEqual({ reportType: 'other', label: 'Void report' });
    expect(posReportEntryFor('other', '   ')).toBeNull();
    expect(posReportEntryFor('voids_cancellations', 'x')).toBeNull();
    expect(posFindingsKey('other', 'Void report')).toBe('Void report');
    expect(posFindingsKey('discount_register', 'Discount')).toBe('');
  });
});
