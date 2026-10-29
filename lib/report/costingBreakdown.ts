import type { MetricDef, MetricValues } from '@/lib/calc/types';
import { computeMetrics, metricDen, parseMetricValue } from '@/lib/calc/metrics';
import { figure, percentFigure, type ReportFigure } from './figure';

// C4 — shapes F7's cost rows into Report v4 §1B's exact layout (Audit report v4.dc.html
// lines ~313-403): per-line-item cost + % of the matching revenue line, grouped under
// "A. Bar & Cellar" / "B. Kitchen & Production" headers, then Total F&B Cost, the
// non-commercial adjustment, and Total Net F&B Cost. Built on F7's computeMetrics —
// no new arithmetic beyond wrapping each figure so "needs data" never reads as ₹0.

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

export function buildCostingBreakdown(defs: MetricDef[], values: MetricValues | null | undefined): CostingBreakdown {
  const vals = values ?? {};
  const c = computeMetrics(defs, vals);
  const costRows = defs.filter((d) => d.section === 'cost');

  const lineItem = (d: MetricDef): CostLineItem => ({
    label: d.label,
    value: figure(parseMetricValue(vals[d.id])),
    pct: percentFigure(figure(parseMetricValue(vals[d.id])), figure(metricDen(c, d.den))),
  });

  const barRows = costRows.filter((d) => d.group === 'bar');
  const kitchenRows = costRows.filter((d) => d.group === 'kitchen');
  const ncRows = costRows.filter((d) => d.group === 'nc');

  const barCost = figure(c.barCost);
  const kitchenCost = figure(c.kitchenCost);
  const netSale = figure(c.netSale);
  const barSale = figure(c.barSale);
  const kitchenSale = figure(c.kitchenSale);
  const fnbCost = figure(c.fnbCost);
  const netFnbCost = figure(c.netFnbCost);

  return {
    bar: barRows.length
      ? { title: 'Bar & Cellar Cost Breakdown', items: barRows.map(lineItem), total: barCost, totalPct: percentFigure(barCost, barSale) }
      : null,
    kitchen: kitchenRows.length
      ? { title: 'Kitchen & Production Cost Breakdown', items: kitchenRows.map(lineItem), total: kitchenCost, totalPct: percentFigure(kitchenCost, kitchenSale) }
      : null,
    fnbTotal: fnbCost,
    fnbTotalPct: percentFigure(fnbCost, netSale),
    nonCommercial: ncRows.map(lineItem),
    netFnbTotal: netFnbCost,
    netFnbTotalPct: percentFigure(netFnbCost, netSale),
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
