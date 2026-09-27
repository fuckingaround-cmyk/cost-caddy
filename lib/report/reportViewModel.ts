import { getAuditForReview, listOperationalFiles, type ReviewAuditDetail } from '@/lib/queries/review';
import { getAuditItemFiles, getAuditItems, getAuditMetricDefs, getAuditMetricValues } from '@/lib/queries/audits';
import { createSignedUrl, REPORT_EVIDENCE_URL_TTL_SECONDS } from '@/lib/storage';
import { buildFinancialReportDraft, type FinancialReportDraft } from './financialDraft';
import { buildCostingBreakdown, type CostingBreakdown } from './costingBreakdown';
import { figureValue } from './figure';
import type { DonutSlice } from '@/app/admin/(protected)/review/[id]/report/CompositionDonut';
import type { ComplianceItem, Department } from '@/app/admin/(protected)/review/[id]/report/ComplianceSection';
import { EVIDENCE_PHOTO_TYPE_LABELS, type EvidencePhotoType } from '@/lib/evidence/types';

export interface EvidenceRegisterTable {
  id: string;
  checkpointLabel: string;
  department: string;
  photoName: string;
  photoUrl: string;
  columns: string[];
  rows: string[][];
}

export interface EvidenceRegisterGroup {
  evidenceType: EvidencePhotoType;
  label: string;
  tables: EvidenceRegisterTable[];
}

export interface ReportViewModel {
  audit: ReviewAuditDetail;
  draft: FinancialReportDraft;
  costing: CostingBreakdown;
  departments: Department[];
  evidenceRegisters: EvidenceRegisterGroup[];
  salesSlices: DonutSlice[];
  costSlices: DonutSlice[];
}

// Shared between the interactive review-screen report page and C5's Playwright PDF
// render, so the two can never drift into showing different figures for the same
// audit. Does real I/O (unlike C2/C3's pure modules) — this is the assembly layer.
export async function loadReportViewModel(orgId: string, auditId: string): Promise<ReportViewModel | null> {
  const audit = await getAuditForReview(orgId, auditId);
  if (!audit) return null;

  const [defs, values, items, itemFiles, opFiles] = await Promise.all([
    getAuditMetricDefs(auditId),
    getAuditMetricValues(auditId),
    getAuditItems(auditId),
    getAuditItemFiles(auditId),
    listOperationalFiles(auditId),
  ]);

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
  for (const it of items) {
    let dept = departments.find((d) => d.cat === it.cat);
    if (!dept) {
      dept = { cat: it.cat, catCode: it.catCode, items: [] };
      departments.push(dept);
    }
    const complianceItem: ComplianceItem = {
      id: it.id,
      refId: it.refId ?? it.code,
      label: it.label,
      observation: it.status === 'na' ? (it.naReason ?? '') : it.remark,
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

  // B7/ADR-0012 — grouped by evidence type across the whole audit (not per checklist
  // row) into its own report section (EvidenceRegisterSection), separate from the
  // compliance matrix's Evidence column, which keeps showing plain thumbnails unchanged.
  const evidenceRegisters: EvidenceRegisterGroup[] = [];
  for (const it of items) {
    const files = itemFiles.filter((f) => f.auditItemId === it.id && f.extractionStatus === 'extracted' && f.extractedTable);
    for (const f of files) {
      const evidenceType = f.evidenceType as EvidencePhotoType;
      let group = evidenceRegisters.find((g) => g.evidenceType === evidenceType);
      if (!group) {
        group = { evidenceType, label: EVIDENCE_PHOTO_TYPE_LABELS[evidenceType], tables: [] };
        evidenceRegisters.push(group);
      }
      group.tables.push({
        id: f.id,
        checkpointLabel: it.label,
        department: it.cat,
        photoName: f.name,
        photoUrl: await createSignedUrl(f.storagePath, REPORT_EVIDENCE_URL_TTL_SECONDS).catch(() => ''),
        columns: f.extractedTable!.columns,
        rows: f.extractedTable!.rows,
      });
    }
  }

  const kitchenNet = figureValue(draft.revenueMatrix.rows.find((r) => r.key === 'kitchen')?.netSales ?? { status: 'needs-data' });
  const barNet = figureValue(draft.revenueMatrix.rows.find((r) => r.key === 'bar')?.netSales ?? { status: 'needs-data' });
  const taxes = figureValue(draft.kpis.totalTaxes);
  const charges = figureValue(draft.kpis.totalCharges);
  const salesSlices: DonutSlice[] = [
    { label: 'Kitchen', value: kitchenNet ?? 0, color: 'var(--status-pass-bg-deep)' },
    { label: 'Bar', value: barNet ?? 0, color: 'var(--status-pass-fg)' },
    { label: 'Service charge', value: charges ?? 0, color: 'var(--report-chart-teal-4)' },
    { label: 'Statutory taxes', value: taxes ?? 0, color: 'var(--report-chart-teal-5)' },
  ];

  const barCost = figureValue(costing.bar?.total ?? { status: 'needs-data' });
  const kitchenCost = figureValue(costing.kitchen?.total ?? { status: 'needs-data' });
  const ncCost = figureValue(costing.nonCommercial[0]?.value ?? { status: 'needs-data' });
  const costSlices: DonutSlice[] = [
    { label: 'Bar & Cellar cost', value: barCost ?? 0, color: 'var(--report-chart-rust-1)' },
    { label: 'Kitchen & Production cost', value: kitchenCost ?? 0, color: 'var(--report-chart-rust-2)' },
    { label: 'Non-commercial cost', value: ncCost ?? 0, color: 'var(--report-chart-rust-4)' },
  ];

  return { audit, draft, costing, departments, evidenceRegisters, salesSlices, costSlices };
}
