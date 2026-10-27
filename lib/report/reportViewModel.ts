import { getAuditForReview, getEvidenceFindings, listOperationalFiles, type ReviewAuditDetail } from '@/lib/queries/review';
import { posFindingsKey } from '@/lib/evidence/types';
import { getAuditItemFiles, getAuditItems, getAuditMetricDefs, getAuditMetricValues } from '@/lib/queries/audits';
import { createSignedUrl, REPORT_EVIDENCE_URL_TTL_SECONDS } from '@/lib/storage';
import { buildFinancialReportDraft, type FinancialReportDraft } from './financialDraft';
import { buildCostingBreakdown, type CostingBreakdown } from './costingBreakdown';
import { figureValue } from './figure';
import type { DonutSlice } from '@/app/admin/(protected)/review/[id]/report/CompositionDonut';
import type { ComplianceItem, Department } from '@/app/admin/(protected)/review/[id]/report/ComplianceSection';

export interface PosReportTable {
  id: string;
  photoName: string;
  photoUrl: string;
  columns: string[];
  rows: string[][];
}

// ADR-0015 — one POS report item (Discount / Item Cancellation / Bill Modification /
// Complimentary), rendered in its own report section, separate from the compliance matrix.
export interface PosReport {
  id: string;
  label: string;
  status: 'pending' | 'pass' | 'fail' | 'na';
  naReason: string | null;
  findings: string;
  correctiveMeasures: string;
  tables: PosReportTable[];
}

export interface ReportViewModel {
  audit: ReviewAuditDetail;
  draft: FinancialReportDraft;
  costing: CostingBreakdown;
  departments: Department[];
  posReports: PosReport[];
  salesSlices: DonutSlice[];
  costSlices: DonutSlice[];
}

// Shared between the interactive review-screen report page and C5's Playwright PDF
// render, so the two can never drift into showing different figures for the same
// audit. Does real I/O (unlike C2/C3's pure modules) — this is the assembly layer.
export async function loadReportViewModel(orgId: string, auditId: string): Promise<ReportViewModel | null> {
  const audit = await getAuditForReview(orgId, auditId);
  if (!audit) return null;

  const [defs, values, items, itemFiles, opFiles, evidenceFindings] = await Promise.all([
    getAuditMetricDefs(auditId),
    getAuditMetricValues(auditId),
    getAuditItems(auditId),
    getAuditItemFiles(auditId),
    listOperationalFiles(auditId),
    getEvidenceFindings(auditId),
  ]);
  const findingsByType = new Map(evidenceFindings.map((f) => [`${f.evidenceType}|${f.reportLabel}`, f]));

  const draft = buildFinancialReportDraft(
    defs,
    values,
    opFiles.map((f) => ({ type: f.type, period: f.period, parsed: f.parseStatus === 'parsed', coverageSummary: f.coverageSummary })),
  );
  const costing = buildCostingBreakdown(defs, values);

  const itemPhotos = await Promise.all(
    items.map(async (it) => {
      const files = itemFiles.filter((f) => f.auditItemId === it.id);
      const photos = await Promise.all(
        files.map(async (f) => ({
          id: f.id,
          name: f.name,
          isImage: f.kind === 'image',
          url: await createSignedUrl(f.storagePath, REPORT_EVIDENCE_URL_TTL_SECONDS).catch(() => ''),
        })),
      );
      return [it.id, photos] as const;
    }),
  );
  const photosByItemId = new Map(itemPhotos);

  const departments: Department[] = [];
  // Only failed checkpoints reach the report — Pass and N/A rows are dropped, so a
  // department with no failures doesn't appear at all.
  for (const it of items.filter((i) => i.section === 'checklist' && i.status === 'fail')) {
    let dept = departments.find((d) => d.cat === it.cat);
    if (!dept) {
      dept = { cat: it.cat, catCode: it.catCode, items: [] };
      departments.push(dept);
    }
    const complianceItem: ComplianceItem = {
      id: it.id,
      refId: it.refId ?? it.code,
      label: it.label,
      // The auditor's raw wording never reaches the report — only the AI-polished rewrite.
      observation: it.polished ? it.remark : '',
      status: it.status,
      category: it.category,
      severity: it.severity,
      impact: it.impact,
      correctiveAction: it.correctiveAction,
      sla: it.sla,
      photos: photosByItemId.get(it.id) ?? [],
    };
    dept.items.push(complianceItem);
  }

  // ADR-0015 — POS report items become their own section (not compliance-matrix rows).
  const posReports: PosReport[] = [];
  for (const it of items.filter((i) => i.section === 'pos_report')) {
    const written = it.reportType ? findingsByType.get(`${it.reportType}|${posFindingsKey(it.reportType, it.label)}`) : undefined;
    const tables: PosReportTable[] = [];
    for (const f of itemFiles.filter((x) => x.auditItemId === it.id && x.extractionStatus === 'extracted' && x.extractedTable)) {
      tables.push({
        id: f.id,
        photoName: f.name,
        photoUrl: await createSignedUrl(f.storagePath, REPORT_EVIDENCE_URL_TTL_SECONDS).catch(() => ''),
        columns: f.extractedTable!.columns,
        rows: f.extractedTable!.rows,
      });
    }
    posReports.push({
      id: it.id,
      label: it.label,
      status: it.status,
      naReason: it.naReason,
      findings: written?.findings ?? '',
      correctiveMeasures: written?.correctiveMeasures ?? '',
      tables,
    });
  }

  const SALES_COLORS = ['var(--status-pass-bg-deep)', 'var(--status-pass-fg)', 'var(--report-chart-teal-1)', 'var(--report-chart-teal-2)', 'var(--report-chart-teal-3)'];
  const salesSlices: DonutSlice[] = draft.revenueMatrix.rows.map((r, i) => ({
    label: r.label,
    value: figureValue(r.netSales) ?? 0,
    color: SALES_COLORS[i % SALES_COLORS.length],
  }));

  const barCost = figureValue(costing.bar?.total ?? { status: 'needs-data' });
  const kitchenCost = figureValue(costing.kitchen?.total ?? { status: 'needs-data' });
  const ncCost = figureValue(costing.nonCommercial[0]?.value ?? { status: 'needs-data' });
  const costSlices: DonutSlice[] = [
    { label: 'Bar & Cellar cost', value: barCost ?? 0, color: 'var(--report-chart-rust-1)' },
    { label: 'Kitchen & Production cost', value: kitchenCost ?? 0, color: 'var(--report-chart-rust-2)' },
    { label: 'Non-commercial cost', value: ncCost ?? 0, color: 'var(--report-chart-rust-4)' },
  ];

  return { audit, draft, costing, departments, posReports, salesSlices, costSlices };
}
