import type { MetricDef, MetricValues } from '@/lib/calc/types';
import { computeMetrics, parseMetricValue } from '@/lib/calc/metrics';
import { figure, percentFigure, NEEDS_DATA, type ReportFigure } from './figure';
import type { FinancialReportDraft } from './financialDraft';

// C4 — shapes F7's cost rows into Report v4 §1B's exact layout (Audit report v4.dc.html
// lines ~313-403): per-line-item cost + % of the matching revenue line, grouped under
// "A. Bar & Cellar" / "B. Kitchen & Production" headers, then Total F&B Cost, the
// non-commercial adjustment, and Total Net F&B Cost. Built on F7's computeMetrics —
// no new arithmetic beyond wrapping each figure so "needs data" never reads as ₹0.
//
// % denominators are resolved against the report's own net-sales concept (sales minus
// discount, from financialDraft's revenueMatrix) rather than F7's `netSale`/`barSale`/
// `kitchenSale` fields, which — despite the name — are pre-discount totals. A row's
// `den` ('net' | 'bar' | 'kitchen' | another sales metric's id) resolves the same way
// F7's metricDen does, just against net rather than gross figures.

export interface CostLineItem {
  label: string;
  value: ReportFigure;
  pct: ReportFigure;
}

export interface CostGroupBreakdown {
  title: string;
  items: CostLineItem[];
  total: ReportFigure;
  totalPct: ReportFigure;
}

export interface CostingBreakdown {
  bar: CostGroupBreakdown | null;
  kitchen: CostGroupBreakdown | null;
  fnbTotal: ReportFigure;
  fnbTotalPct: ReportFigure;
  nonCommercial: CostLineItem[];
  netFnbTotal: ReportFigure;
  netFnbTotalPct: ReportFigure;
}

// Null-propagating sum, mirroring F7's own `sum`: a row with no sales entered
// contributes nothing (not "needs data" for the whole group) unless every row is empty.
function sumFigures(figs: ReportFigure[]): ReportFigure {
  let total: number | null = null;
  for (const f of figs) {
    if (f.status === 'ok') total = (total ?? 0) + f.value;
  }
  return figure(total);
}

export function buildCostingBreakdown(defs: MetricDef[], values: MetricValues | null | undefined, draft: FinancialReportDraft): CostingBreakdown {
  const vals = values ?? {};
  const c = computeMetrics(defs, vals);
  const costRows = defs.filter((d) => d.section === 'cost');

  const netSalesById = new Map(draft.revenueMatrix.rows.map((r) => [r.key, r.netSales]));
  const barNetSales = sumFigures(draft.revenueMatrix.rows.filter((r) => r.revGroup === 'bar').map((r) => r.netSales));
  const kitchenNetSales = sumFigures(draft.revenueMatrix.rows.filter((r) => r.revGroup === 'kitchen').map((r) => r.netSales));
  const overallNetSales = draft.revenueMatrix.total.netSales;

  const resolveDen = (den: string | null | undefined): ReportFigure => {
    if (!den) return NEEDS_DATA;
    if (den === 'net') return overallNetSales;
    if (den === 'bar') return barNetSales;
    if (den === 'kitchen') return kitchenNetSales;
    return netSalesById.get(den) ?? NEEDS_DATA;
  };

  const lineItem = (d: MetricDef): CostLineItem => ({
    label: d.label,
    value: figure(parseMetricValue(vals[d.id])),
    pct: percentFigure(figure(parseMetricValue(vals[d.id])), resolveDen(d.den)),
  });

  const barRows = costRows.filter((d) => d.group === 'bar');
  const kitchenRows = costRows.filter((d) => d.group === 'kitchen');
  const ncRows = costRows.filter((d) => d.group === 'nc');

  const barCost = figure(c.barCost);
  const kitchenCost = figure(c.kitchenCost);
  const fnbCost = figure(c.fnbCost);
  const netFnbCost = figure(c.netFnbCost);

  return {
    bar: barRows.length
      ? { title: 'Bar & Cellar Cost Breakdown', items: barRows.map(lineItem), total: barCost, totalPct: percentFigure(barCost, barNetSales) }
      : null,
    kitchen: kitchenRows.length
      ? { title: 'Kitchen & Production Cost Breakdown', items: kitchenRows.map(lineItem), total: kitchenCost, totalPct: percentFigure(kitchenCost, kitchenNetSales) }
      : null,
    fnbTotal: fnbCost,
    fnbTotalPct: percentFigure(fnbCost, overallNetSales),
    nonCommercial: ncRows.map(lineItem),
    netFnbTotal: netFnbCost,
    netFnbTotalPct: percentFigure(netFnbCost, overallNetSales),
  };
}

// Section 1's Cost Composition donut — every bar + kitchen line item (Beverage, Liquor,
// Food, Staff Food, …, as the template defines them) plus the non-commercial adjustment,
// each its own slice, rather than collapsed to the three group totals.
export interface CostCompositionSlice {
  label: string;
  value: ReportFigure;
}

export function buildCostCompositionSlices(breakdown: CostingBreakdown): CostCompositionSlice[] {
  return [
    ...(breakdown.bar?.items ?? []),
    ...(breakdown.kitchen?.items ?? []),
    ...breakdown.nonCommercial.map((item) => ({ ...item, label: `${item.label} (Non-commercial)` })),
  ].map((item) => ({ label: item.label, value: item.value }));
}
