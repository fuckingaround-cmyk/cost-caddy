import { getAuditMetricDefs, getAuditMetricValues } from '@/lib/queries/audits';
import { listOperationalFiles } from '@/lib/queries/review';
import { parseMetricValue, type MetricDef, type MetricValues } from '@/lib/calc';
import { buildFinancialReportDraft, type FinancialReportDraft } from './financialDraft';
import { buildCostingBreakdown, buildCostCompositionSlices, type CostingBreakdown } from './costingBreakdown';
import { figureValue } from './figure';
import type { DonutSlice } from '@/app/admin/(protected)/review/[id]/report/CompositionDonut';

export interface MtdContributor {
  auditId: string;
  name: string;
  templateName: string;
  version: number;
  publishedAt: Date;
}

export interface MtdViewModel {
  draft: FinancialReportDraft;
  costing: CostingBreakdown;
  salesSlices: DonutSlice[];
  costSlices: DonutSlice[];
  contributors: MtdContributor[];
}

// MTD is recomputed live on every view — no stored/versioned row of its own (DESIGN.md
// UX-021). It combines every audit published within the month, keyed by `metricKey`
// (getAuditMetricDefs already maps a def's `id` to `metricKey`, never the row's own uuid
// — see that function's own note), so two audits that reuse the same metric add
// together, and a metric unique to one audit still contributes on its own. Reruns
// computeMetrics (via buildFinancialReportDraft/buildCostingBreakdown) on the summed raw
// values rather than summing each audit's own totals, so derived figures (grossSale,
// pro-rata tax/service-charge splits, %s) stay correct instead of double-deriving.
export async function buildMtdViewModel(contributors: MtdContributor[]): Promise<MtdViewModel> {
  const mergedDefs = new Map<string, MetricDef>();
  const mergedValues: MetricValues = {};
  const opFiles: Awaited<ReturnType<typeof listOperationalFiles>> = [];

  for (const c of contributors) {
    const [defs, values, files] = await Promise.all([
      getAuditMetricDefs(c.auditId),
      getAuditMetricValues(c.auditId),
      listOperationalFiles(c.auditId),
    ]);
    for (const d of defs) {
      if (!mergedDefs.has(d.id)) mergedDefs.set(d.id, d);
      const n = parseMetricValue(values[d.id]);
      if (n === null) continue;
      const cur = parseMetricValue(mergedValues[d.id]);
      mergedValues[d.id] = (cur ?? 0) + n;
    }
    opFiles.push(...files);
  }

  const defs = [...mergedDefs.values()];
  const draft = buildFinancialReportDraft(
    defs,
    mergedValues,
    opFiles.map((f) => ({ type: f.type, period: f.period, parsed: f.parseStatus === 'parsed', coverageSummary: f.coverageSummary })),
  );
  const costing = buildCostingBreakdown(defs, mergedValues);

  const SALES_COLORS = ['var(--status-pass-bg-deep)', 'var(--status-pass-fg)', 'var(--report-chart-teal-1)', 'var(--report-chart-teal-2)', 'var(--report-chart-teal-3)'];
  const salesSlices: DonutSlice[] = draft.revenueMatrix.rows.map((r, i) => ({
    label: r.label,
    value: figureValue(r.netSales) ?? 0,
    color: SALES_COLORS[i % SALES_COLORS.length],
  }));

  const COST_COLORS = ['var(--report-chart-rust-1)', 'var(--report-chart-rust-2)', 'var(--report-chart-rust-3)', 'var(--report-chart-rust-4)', 'var(--report-chart-teal-1)', 'var(--report-chart-teal-2)'];
  const costSlices: DonutSlice[] = buildCostCompositionSlices(costing).map((s, i) => ({
    label: s.label,
    value: figureValue(s.value) ?? 0,
    color: COST_COLORS[i % COST_COLORS.length],
  }));

  return { draft, costing, salesSlices, costSlices, contributors };
}
