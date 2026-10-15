import { describe, expect, it } from 'vitest';
import { tableFromKeyedRows } from './normaliseTable';

describe('tableFromKeyedRows', () => {
  it('keeps the photo\'s own columns, whatever they are', () => {
    const { table, anomalies } = tableFromKeyedRows(['Bill No', 'KOT NO', 'Amount'], [{ 'Bill No': '3962', 'KOT NO': '71', Amount: '1,450' }]);
    expect(table).toEqual({ columns: ['Bill No', 'KOT NO', 'Amount'], rows: [['3962', '71', '1,450']] });
    expect(anomalies).toBe(0);
  });
  it('a dropped cell is a blank in its own place — later cells never shift', () => {
    const { table, anomalies } = tableFromKeyedRows(['Waiter', 'Cancelled By', 'Remark'], [{ 'Cancelled By': 'SHEKHAR', Remark: 'Time limit exceeded' }]);
    expect(table.rows).toEqual([['', 'SHEKHAR', 'Time limit exceeded']]);
    expect(anomalies).toBe(1);
  });
  it('keeps a legitimately blank cell without flagging it', () => {
    const { table, anomalies } = tableFromKeyedRows(['Bill No', 'KOT NO'], [{ 'Bill No': '', 'KOT NO': '7' }]);
    expect(table.rows).toEqual([['', '7']]);
    expect(anomalies).toBe(0);
  });
  it('flags unknown keys and ignores their values', () => {
    const { table, anomalies } = tableFromKeyedRows(['a'], [{ a: '1', b: '2' }]);
    expect(table.rows).toEqual([['1']]);
    expect(anomalies).toBe(1);
  });
  it('collapses stray spacing in headers and still matches the row keys', () => {
    const { table, anomalies } = tableFromKeyedRows(['TABLE  NO.', 'Q T Y'], [{ 'TABLE  NO.': 'L-6', 'Q T Y': '2' }]);
    expect(table).toEqual({ columns: ['TABLE NO.', 'Q T Y'], rows: [['L-6', '2']] });
    expect(anomalies).toBe(0);
  });
  it('turns null/numbers into text and handles an empty table', () => {
    expect(tableFromKeyedRows(['a', 'b'], [{ a: null, b: 5 }]).table.rows).toEqual([['', '5']]);
    expect(tableFromKeyedRows([], [])).toEqual({ table: { columns: [], rows: [] }, anomalies: 0 });
  });
});
