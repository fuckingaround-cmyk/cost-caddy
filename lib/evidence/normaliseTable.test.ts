import { describe, expect, it } from 'vitest';
import { normaliseExtractedTable } from './normaliseTable';

describe('normaliseExtractedTable', () => {
  it('keeps the photo\'s own columns, whatever they are', () => {
    const t = normaliseExtractedTable({ columns: ['Bill No', 'KOT NO', 'Amount'], rows: [['3962', '71', '1,450']] });
    expect(t.columns).toEqual(['Bill No', 'KOT NO', 'Amount']);
    expect(t.rows).toEqual([['3962', '71', '1,450']]);
  });
  it('pads short rows so later cells never shift left', () => {
    expect(normaliseExtractedTable({ columns: ['a', 'b', 'c'], rows: [['1', '2']] }).rows).toEqual([['1', '2', '']]);
  });
  it('folds extra cells into the last cell instead of dropping them', () => {
    expect(normaliseExtractedTable({ columns: ['a', 'b'], rows: [['1', '2', '3']] }).rows).toEqual([['1', '2 3']]);
  });
  it('handles an empty table', () => {
    expect(normaliseExtractedTable({ columns: [], rows: [] })).toEqual({ columns: [], rows: [] });
  });
});
