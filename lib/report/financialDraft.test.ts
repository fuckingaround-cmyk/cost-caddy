import { describe, expect, it } from 'vitest';
import { buildFinancialReportDraft } from './financialDraft';
import { figure } from './figure';
import type { MetricDef, MetricValues } from '@/lib/calc/types';

// Same seed as lib/calc/metrics.test.ts (Super Admin Flow.dc.html's DEFAULT_METRICS /
// MTD_FULL / MTD_PARTIAL / MTD_EMPTY) — C2's done-when requires testing against the
// design file's seed figures, and F7's cascade already established these as the
// canonical worked example.
const DEFAULT_METRICS: MetricDef[] = [
  { id: 'm_pax', label: 'No of Pax', section: 'covers' },
  { id: 'm_food', label: 'Food Sales', section: 'sales', revGroup: 'kitchen' },
  { id: 'm_liquor', label: 'Liquor', section: 'sales', revGroup: 'bar' },
  { id: 'm_bev', label: 'Beverage Sales', section: 'sales', revGroup: 'bar' },
  { id: 'm_dfood', label: 'Food Discount', section: 'discount' },
  { id: 'm_dliq', label: 'Liquor Discount', section: 'discount' },
  { id: 'm_dbev', label: 'Beverage Discount', section: 'discount' },
  { id: 'm_sc', label: 'Service Charge', section: 'tax', kind: 'charge' },
  { id: 'm_sgst', label: 'SGST', section: 'tax' },
  { id: 'm_cgst', label: 'CGST', section: 'tax' },
  { id: 'm_vat', label: 'VAT', section: 'tax' },
  { id: 'm_cbev', label: 'Beverage', section: 'cost', group: 'bar', den: 'm_bev' },
  { id: 'm_cliq', label: 'Liquor', section: 'cost', group: 'bar', den: 'm_liquor' },
  { id: 'm_cper', label: 'Perishables and Provision', section: 'cost', group: 'bar', den: 'm_liquor' },
  { id: 'm_ckit', label: 'Food Kitchen', section: 'cost', group: 'kitchen', den: 'm_food' },
  { id: 'm_cstaff', label: 'Staff Food', section: 'cost', group: 'kitchen', den: 'm_food' },
  { id: 'm_cnc', label: 'Non Commercial Cost', section: 'cost', group: 'nc', den: 'net' },
];

const MTD_FULL: MetricValues = {
  m_pax: '222',
  m_food: '165151',
  m_liquor: '55642',
  m_bev: '27182',
  m_dfood: '6400',
  m_dliq: '2100',
  m_dbev: '900',
  m_sc: '20848',
  m_sgst: '5006',
  m_cgst: '5006',
  m_vat: '5564',
  m_cbev: '7308',
  m_cliq: '15790',
  m_cper: '10000',
  m_ckit: '51296',
  m_cstaff: '14000',
  m_cnc: '17500',
};

const MTD_PARTIAL: MetricValues = { m_pax: '184', m_food: '138420', m_liquor: '44210' };

function ok(f: { status: string; value?: number }): number {
  expect(f.status).toBe('ok');
  return f.value as number;
}

describe('buildFinancialReportDraft — MTD_FULL', () => {
  const draft = buildFinancialReportDraft(DEFAULT_METRICS, MTD_FULL, []);
  const rows = (id: string) => draft.revenueMatrix.rows.find((r) => r.key === id)!;

  it('carries F7 totals through as KPIs', () => {
    expect(ok(draft.kpis.covers)).toBe(222);
    expect(ok(draft.kpis.netSale)).toBe(247975);
    expect(ok(draft.kpis.barSale)).toBe(82824);
    expect(ok(draft.kpis.kitchenSale)).toBe(165151);
    expect(ok(draft.kpis.totalDiscounts)).toBe(9400);
    expect(ok(draft.kpis.totalTaxes)).toBe(15576);
    expect(ok(draft.kpis.totalCharges)).toBe(20848);
    expect(ok(draft.kpis.grossSale)).toBe(274999);
  });

  it('allocates taxes/service charge/discount pro-rata on each group\'s share of sales', () => {
    const kitchen = draft.revenueMatrix.rows.find((r) => r.key === 'm_food')!;
    const bar = {
      sales: figure(ok(rows('m_liquor').sales) + ok(rows('m_bev').sales)),
      discount: figure(ok(rows('m_liquor').discount) + ok(rows('m_bev').discount)),
      taxes: figure(ok(rows('m_liquor').taxes) + ok(rows('m_bev').taxes)),
      serviceCharge: figure(ok(rows('m_liquor').serviceCharge) + ok(rows('m_bev').serviceCharge)),
      grossSale: figure(ok(rows('m_liquor').grossSale) + ok(rows('m_bev').grossSale)),
    };

    expect(ok(kitchen.sales)).toBe(165151);
    expect(ok(bar.sales)).toBe(82824);
    expect(ok(kitchen.discount)).toBeCloseTo(6260.39, 1);
    expect(ok(bar.discount)).toBeCloseTo(3139.61, 1);
    expect(ok(kitchen.taxes)).toBeCloseTo(10373.59, 1);
    expect(ok(bar.taxes)).toBeCloseTo(5202.41, 1);
    expect(ok(kitchen.serviceCharge)).toBeCloseTo(13884.74, 1);
    expect(ok(bar.serviceCharge)).toBeCloseTo(6963.26, 1);
  });

  it('sums the two group rows\' gross sale back to the audit-wide total', () => {
    const kitchen = draft.revenueMatrix.rows.find((r) => r.key === 'm_food')!;
    const bar = {
      sales: figure(ok(rows('m_liquor').sales) + ok(rows('m_bev').sales)),
      discount: figure(ok(rows('m_liquor').discount) + ok(rows('m_bev').discount)),
      taxes: figure(ok(rows('m_liquor').taxes) + ok(rows('m_bev').taxes)),
      serviceCharge: figure(ok(rows('m_liquor').serviceCharge) + ok(rows('m_bev').serviceCharge)),
      grossSale: figure(ok(rows('m_liquor').grossSale) + ok(rows('m_bev').grossSale)),
    };
    expect(ok(kitchen.grossSale) + ok(bar.grossSale)).toBeCloseTo(274999, 1);
    expect(ok(draft.revenueMatrix.total.grossSale)).toBe(274999);
  });

  it('has one matrix row per sales metric, labelled as the template names it', () => {
    const rows = draft.revenueMatrix.rows;
    expect(rows.map((r) => r.label)).toEqual(['Food Sales', 'Liquor', 'Beverage Sales']);
    expect(rows.map((r) => r.key)).toEqual(['m_food', 'm_liquor', 'm_bev']);
    expect(ok(rows[1].sales)).toBe(55642);
    const sum = (f: (r: (typeof rows)[number]) => { status: string; value?: number }) => rows.reduce((t, r) => t + (f(r).value ?? 0), 0);
    expect(sum((r) => r.sales as never)).toBe(247975);
    expect(sum((r) => r.grossSale as never)).toBeCloseTo(274999, 1);
  });

  it('derives cost percentages against the matching revenue line', () => {
    expect(ok(draft.costing.barCostPct)).toBeCloseTo((33098 / 82824) * 100, 5);
    expect(ok(draft.costing.kitchenCostPct)).toBeCloseTo((65296 / 165151) * 100, 5);
    expect(ok(draft.costing.fnbCostPct)).toBeCloseTo((98394 / 247975) * 100, 5);
    expect(ok(draft.costing.netFnbCostPct)).toBeCloseTo((80894 / 247975) * 100, 5);
  });
});

describe('buildFinancialReportDraft — no data reaches the report as needs-data, never zero', () => {
  it('an all-empty audit needs data everywhere, not ₹0', () => {
    const draft = buildFinancialReportDraft(DEFAULT_METRICS, {}, []);
    expect(draft.kpis.covers.status).toBe('needs-data');
    expect(draft.kpis.grossSale.status).toBe('needs-data');
    expect(draft.costing.fnbCostPct.status).toBe('needs-data');
    for (const row of draft.revenueMatrix.rows) {
      expect(row.sales.status).toBe('needs-data');
      expect(row.grossSale.status).toBe('needs-data');
    }
  });

  it('a partially-filled audit needs data only where its inputs are missing', () => {
    const draft = buildFinancialReportDraft(DEFAULT_METRICS, MTD_PARTIAL, []);
    expect(ok(draft.kpis.covers)).toBe(184);
    expect(ok(draft.kpis.netSale)).toBe(182630);
    // No discount/tax/charge entered at all — F7's totals are null, so the per-group
    // allocation that depends on them can't be resolved either.
    expect(draft.kpis.totalDiscounts.status).toBe('needs-data');
    const kitchen = draft.revenueMatrix.rows.find((r) => r.key === 'm_food')!;
    expect(kitchen.discount.status).toBe('needs-data');
    expect(kitchen.taxes.status).toBe('needs-data');
    expect(kitchen.netSales.status).toBe('needs-data');
    // Cost rows weren't entered either.
    expect(draft.costing.barCost.status).toBe('needs-data');
    expect(draft.costing.fnbCostPct.status).toBe('needs-data');
  });
});

describe('buildFinancialReportDraft — revenue groups absent from the template', () => {
  it('omits a group entirely when the template has no sales rows for it', () => {
    const kitchenOnly: MetricDef[] = [
      { id: 'm_pax', label: 'Pax', section: 'covers' },
      { id: 'm_food', label: 'Food Sales', section: 'sales', revGroup: 'kitchen' },
    ];
    const draft = buildFinancialReportDraft(kitchenOnly, { m_pax: '10', m_food: '5000' }, []);
    expect(draft.revenueMatrix.rows).toHaveLength(1);
    expect(draft.revenueMatrix.rows[0].key).toBe('m_food');
  });

  it('treats a template with no discount metrics at all as zero discount, not missing', () => {
    const noDiscountDefs: MetricDef[] = [
      { id: 'm_pax', label: 'Pax', section: 'covers' },
      { id: 'm_food', label: 'Food Sales', section: 'sales', revGroup: 'kitchen' },
    ];
    const draft = buildFinancialReportDraft(noDiscountDefs, { m_pax: '10', m_food: '5000' }, []);
    const kitchen = draft.revenueMatrix.rows[0];
    expect(ok(kitchen.discount)).toBe(0);
    expect(ok(kitchen.netSales)).toBe(5000);
  });
});

describe('buildFinancialReportDraft — operational files', () => {
  it('passes the attached file summaries through untouched', () => {
    const files = [{ type: 'Discounts', period: 'Jul 2026', parsed: true, coverageSummary: '"Bills" · 12 rows' }];
    const draft = buildFinancialReportDraft(DEFAULT_METRICS, {}, files);
    expect(draft.operationalFiles).toEqual(files);
  });
});
