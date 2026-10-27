import type { TemplateMetricInput } from '@/lib/queries/templates';

// Ported verbatim from Super Admin Flow.dc.html's METRIC_CATS (A4, Part 1 — Metrics).
// Each category pre-wires the fixed section/revGroup/kind/costGroup fields; the auditor
// only ever types a label, a unit, and (for cost rows) picks a denominator.
export type MetricCatKey = 'covers' | 'sales' | 'discounts' | 'barCost' | 'kitchenCost' | 'ncCost';

export interface MetricCat {
  key: MetricCatKey;
  title: string;
  hint: string;
  fields: Pick<TemplateMetricInput, 'section' | 'revGroup' | 'kind' | 'costGroup'>;
  match: (m: TemplateMetricInput) => boolean;
  derived: { label: string; badge: string }[];
  after: { label: string; badge: string }[];
  hasDen?: boolean;
  defaultDen?: string;
}

export const METRIC_CATS: MetricCat[] = [
  {
    key: 'covers',
    title: 'Volume',
    hint: 'Guest counts entered by the auditor',
    fields: { section: 'covers' },
    match: (m) => m.section === 'covers',
    derived: [{ label: 'Total No Of Pax', badge: 'Calculated' }],
    after: [],
  },
  {
    key: 'sales',
    title: 'Sales',
    hint: 'Revenue split captured at the outlet',
    fields: { section: 'sales', revGroup: 'kitchen' },
    match: (m) => m.section === 'sales',
    derived: [{ label: 'Net Sales at Restaurant', badge: 'Reconciled sub-total' }],
    after: [],
  },
  {
    key: 'discounts',
    title: 'Discounts',
    hint: 'Discounts deducted from gross sale',
    fields: { section: 'discount' },
    match: (m) => m.section === 'discount',
    derived: [{ label: 'Total Discounts', badge: 'Sum of all discounts' }],
    after: [],
  },
  {
    key: 'barCost',
    title: 'Bar Cost',
    hint: 'Costed against bar revenue',
    fields: { section: 'cost', costGroup: 'bar' },
    match: (m) => m.section === 'cost' && m.costGroup === 'bar',
    derived: [{ label: 'Total Bar Cost', badge: 'Subtotal' }],
    after: [],
    hasDen: true,
    defaultDen: 'bar',
  },
  {
    key: 'kitchenCost',
    title: 'Kitchen Cost',
    hint: 'Costed against food revenue',
    fields: { section: 'cost', costGroup: 'kitchen' },
    match: (m) => m.section === 'cost' && m.costGroup === 'kitchen',
    derived: [{ label: 'Total Kitchen Cost', badge: 'Subtotal' }],
    after: [{ label: 'Total F&B Cost', badge: 'Bar + kitchen' }],
    hasDen: true,
    defaultDen: 'kitchen',
  },
  {
    key: 'ncCost',
    title: 'Costing — Other',
    hint: 'Non-commercial cost, costed against net sales',
    fields: { section: 'cost', costGroup: 'nc' },
    match: (m) => m.section === 'cost' && m.costGroup === 'nc',
    derived: [],
    after: [{ label: 'Total Net F&B Cost', badge: 'Grand total cost' }],
    hasDen: true,
    defaultDen: 'net',
  },
];

// Builds a metric's save payload from its category defaults, except two fields a row can
// override the category default for:
// - `revGroup` on a 'sales' row (BUG-021) — every sales-category metric silently saved as
//   revGroup:'kitchen' (no builder UI ever emitted 'bar'), so Bar Sale (and the report's
//   Bar revenue-matrix row) was always null/"Needs data" — every sales metric, Beverage
//   and Liquor included, was summed into kitchenSale instead.
// - `den` on a cost row (its % denominator) also wins over the category default — before
//   this, every Bar Cost row was forced to 'bar', so Liquor Cost was divided by liquor +
//   beverage sale instead of liquor sale alone.
export function toMetricInput(
  m: {
    key: string;
    label: string;
    unit: TemplateMetricInput['unit'];
    catKey: MetricCatKey;
    revGroup: 'kitchen' | 'bar';
    den?: string;
  },
): TemplateMetricInput {
  const cat = METRIC_CATS.find((c) => c.key === m.catKey)!;
  return {
    metricKey: m.key,
    label: m.label,
    section: cat.fields.section,
    revGroup: cat.key === 'sales' ? m.revGroup : (cat.fields.revGroup ?? null),
    kind: cat.fields.kind ?? null,
    costGroup: cat.fields.costGroup ?? null,
    den: cat.hasDen ? (m.den || cat.defaultDen || null) : null,
    unit: m.unit,
  };
}

export const UNIT_OPTIONS: { value: NonNullable<TemplateMetricInput['unit']>; label: string }[] = [
  { value: 'currency', label: 'Currency (₹ / $)' },
  { value: 'number', label: 'Number' },
  { value: 'count', label: 'Count / Pax' },
  { value: 'percent', label: 'Percentage (%)' },
];
