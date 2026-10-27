import { describe, expect, it } from 'vitest';
import { discountTotalsSentence, withDiscountTotals } from './discountSummary';

const cols = ['Bill No', 'Discount Reason', 'Discount Amt', 'Percentage'];

describe('discountTotalsSentence', () => {
  it('counts and sums only bills above the threshold', () => {
    const t = { columns: cols, rows: [['1', 'x', '1,200', '47'], ['2', 'x', '800.50', '67%'], ['3', 'x', '50', '5']] };
    expect(discountTotalsSentence([t])).toBe('In total, 2 bills carried discounts above the 10% threshold, amounting to ₹2,001.');
  });
  it('counts every row when there is no percentage column', () => {
    const t = { columns: ['Bill No', 'Disc Amt'], rows: [['1', '100']] };
    expect(discountTotalsSentence([t])).toBe('In total, 1 bill carried a discount, amounting to ₹100.');
  });
  it('is empty without a discount-amount column or any qualifying bill', () => {
    expect(discountTotalsSentence([{ columns: ['Bill No', 'Amount'], rows: [['1', '100']] }])).toBe('');
    expect(discountTotalsSentence([{ columns: cols, rows: [['1', 'x', '10', '5']] }])).toBe('');
  });
  it('only touches discount registers', () => {
    const t = { columns: cols, rows: [['1', 'x', '100', '50']] };
    expect(withDiscountTotals('AI text.', 'item_cancellation', [t])).toBe('AI text.');
    expect(withDiscountTotals('AI text.', 'discount_register', [t])).toContain('AI text. In total, 1 bill');
  });
});
