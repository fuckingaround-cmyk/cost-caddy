import { describe, expect, it } from 'vitest';
import { toMetricInput } from './metricCats';

// Guard for BUG-020: a 'taxes' category metric must save with the row's own kind
// selection (service charge vs statutory tax), not a category-wide default — otherwise
// a Service Charge metric is summed into totalTaxes (lib/calc/metrics.ts) instead of
// totalCharges, and the report shows "Needs data" for service charge everywhere.
//
// Guard for BUG-021: a 'sales' category metric must save with the row's own revGroup
// selection (kitchen vs bar), not a category-wide default — otherwise no sales metric
// can ever be tagged bar, and Bar Sale / the report's Bar revenue-matrix row is always
// "Needs data".
describe('toMetricInput', () => {
  it('saves a taxes-category row marked "charge" with kind charge', () => {
    const input = toMetricInput({ key: 'm_sc', label: 'Service Charge', unit: 'currency', catKey: 'taxes', kind: 'charge', revGroup: 'kitchen' });
    expect(input.kind).toBe('charge');
    expect(input.section).toBe('tax');
  });

  it('saves a taxes-category row marked "tax" with kind tax', () => {
    const input = toMetricInput({ key: 'm_sgst', label: 'SGST', unit: 'currency', catKey: 'taxes', kind: 'tax', revGroup: 'kitchen' });
    expect(input.kind).toBe('tax');
  });

  it('saves a sales-category row marked "bar" with revGroup bar', () => {
    const input = toMetricInput({ key: 'm_liquor', label: 'Liquor Sales', unit: 'currency', catKey: 'sales', kind: 'tax', revGroup: 'bar' });
    expect(input.revGroup).toBe('bar');
    expect(input.section).toBe('sales');
  });

  it('saves a sales-category row marked "kitchen" with revGroup kitchen', () => {
    const input = toMetricInput({ key: 'm_food', label: 'Food Sales', unit: 'currency', catKey: 'sales', kind: 'tax', revGroup: 'kitchen' });
    expect(input.revGroup).toBe('kitchen');
  });

  it('non-taxes, non-sales categories ignore the row kind/revGroup and use the category default', () => {
    const input = toMetricInput({ key: 'm_disc', label: 'Food Discount', unit: 'currency', catKey: 'discounts', kind: 'charge', revGroup: 'bar' });
    expect(input.kind).toBeNull();
    expect(input.revGroup).toBeNull();
  });

  it('keeps a bar-cost row\'s chosen denominator instead of forcing the category default', () => {
    const base = { key: 'm_cliq', label: 'Liquor Cost', unit: 'currency' as const, catKey: 'barCost' as const, kind: 'tax' as const, revGroup: 'kitchen' as const };
    expect(toMetricInput({ ...base, den: 'm_liquor' }).den).toBe('m_liquor');
    expect(toMetricInput(base).den).toBe('bar');
  });
});
