import { describe, expect, it } from 'vitest';
import { toMetricInput } from './metricCats';

// Guard for BUG-021: a 'sales' category metric must save with the row's own revGroup
// selection (kitchen vs bar), not a category-wide default — otherwise no sales metric
// can ever be tagged bar, and Bar Sale / the report's Bar revenue-matrix row is always
// "Needs data".
describe('toMetricInput', () => {
  it('saves a sales-category row marked "bar" with revGroup bar', () => {
    const input = toMetricInput({ key: 'm_liquor', label: 'Liquor Sales', unit: 'currency', catKey: 'sales', revGroup: 'bar' });
    expect(input.revGroup).toBe('bar');
    expect(input.section).toBe('sales');
  });

  it('saves a sales-category row marked "kitchen" with revGroup kitchen', () => {
    const input = toMetricInput({ key: 'm_food', label: 'Food Sales', unit: 'currency', catKey: 'sales', revGroup: 'kitchen' });
    expect(input.revGroup).toBe('kitchen');
  });

  it('non-sales categories ignore the row revGroup and use the category default', () => {
    const input = toMetricInput({ key: 'm_disc', label: 'Food Discount', unit: 'currency', catKey: 'discounts', revGroup: 'bar' });
    expect(input.kind).toBeNull();
    expect(input.revGroup).toBeNull();
  });

  it('keeps a bar-cost row\'s chosen denominator instead of forcing the category default', () => {
    const base = { key: 'm_cliq', label: 'Liquor Cost', unit: 'currency' as const, catKey: 'barCost' as const, revGroup: 'kitchen' as const };
    expect(toMetricInput({ ...base, den: 'm_liquor' }).den).toBe('m_liquor');
    expect(toMetricInput(base).den).toBe('bar');
  });
});
