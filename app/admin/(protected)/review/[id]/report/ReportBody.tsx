import type { ReportViewModel } from '@/lib/report/reportViewModel';
import { count, moneyShort } from '@/lib/report/reportFormat';
import { KpiStrip } from './KpiStrip';
import { RevenueMatrix } from './RevenueMatrix';
import { CompositionDonut } from './CompositionDonut';
import { CostingTable, SectionHeading } from './CostingTable';
import { ComplianceSection } from './ComplianceSection';
import { EvidenceRegisterSection } from './EvidenceRegisterSection';

export interface PublishBadge {
  version: number;
  publishedAt: string; // already formatted, e.g. "21 Jul 2026"
}

// The report content itself, shared between the interactive review-screen page (C4)
// and C5's Playwright PDF render, so the two can never drift into showing different
// figures for the same audit — see lib/report/reportViewModel.ts.
export function ReportBody({
  vm,
  publish,
  interactive = true,
}: {
  vm: ReportViewModel;
  publish?: PublishBadge;
  // false for renderReportPdf.tsx's react-dom/server static render, which can't invoke
  // ComplianceSection's 'use client' EvidenceThumb outside Next's own RSC pipeline.
  interactive?: boolean;
}) {
  const { audit, draft, costing, departments, evidenceRegisters, salesSlices, costSlices } = vm;

  // Ported from the design as real flags, not omitted — no story yet asks an admin to
  // hide either, so both default on (DESIGN.md UX-016).
  const showCharts = true;
  const showSummaryRibbon = true;

  return (
    <>
      <div data-avoid="" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.02, color: 'var(--navy-700)' }}>{audit.outletName}</h1>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--r-muted)', fontWeight: 600, marginTop: 8 }}>
            Audit Report · {audit.templateName}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {publish ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--navy-050)',
                border: '1px solid var(--navy-border)',
                color: 'var(--navy-700)',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'var(--font-report-mono)',
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              v{publish.version} · {publish.publishedAt}
            </div>
          ) : (
            <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--r-muted)', fontWeight: 600 }}>Draft — not yet published</div>
          )}
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--r-ink)', marginTop: 2 }}>Audit Date: {audit.periodEnd}</div>
          <div style={{ fontSize: 11.5, fontFamily: 'var(--font-report-mono)', color: 'var(--r-muted)', marginTop: 4 }}>
            Generated {audit.reportGeneratedAt?.toISOString().slice(0, 10)}
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--r-border-2)', margin: '8px 0 24px' }} />

      <section style={{ marginBottom: 40 }}>
        <SectionHeading label="Section 1 · Key Financial & Unit Economic Metrics" right={`Audited ${count(draft.kpis.covers)} covers`} />
        <div data-avoid="">
          <KpiStrip kpis={draft.kpis} />
        </div>
        <RevenueMatrix draft={draft} />
        {showCharts && (
          <div data-avoid="" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <CompositionDonut title="Sales Composition" totalLabel={moneyShort(draft.kpis.grossSale)} slices={salesSlices} />
            <CompositionDonut
              title="Cost Composition"
              totalLabel={moneyShort({ status: 'ok', value: costSlices.reduce((sum, s) => sum + s.value, 0) })}
              slices={costSlices}
            />
          </div>
        )}
      </section>

      <CostingTable breakdown={costing} />
      <ComplianceSection departments={departments} showSummaryRibbon={showSummaryRibbon} interactive={interactive} />
      <EvidenceRegisterSection groups={evidenceRegisters} />
    </>
  );
}
