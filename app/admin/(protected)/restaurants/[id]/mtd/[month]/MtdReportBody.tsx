import type { MtdViewModel } from '@/lib/report/mtdViewModel';
import { count, moneyShort } from '@/lib/report/reportFormat';
import { KpiStrip } from '@/app/admin/(protected)/review/[id]/report/KpiStrip';
import { RevenueMatrix } from '@/app/admin/(protected)/review/[id]/report/RevenueMatrix';
import { CompositionDonut } from '@/app/admin/(protected)/review/[id]/report/CompositionDonut';
import { CostingTable, SectionHeading } from '@/app/admin/(protected)/review/[id]/report/CostingTable';

// The MTD equivalent of ReportBody (lib/report/reportViewModel.ts's per-audit report) —
// same financial sections (they share buildFinancialReportDraft/buildCostingBreakdown),
// but no single audit/template/date to head the page with, and no compliance checklist
// to show (a checklist result belongs to one audit, not a sum of several) — instead a
// list of the contributing per-audit reports this month rolled up into (DESIGN.md UX-021).
export function MtdReportBody({
  vm,
  restaurantName,
  monthLabel,
}: {
  vm: MtdViewModel;
  restaurantName: string;
  monthLabel: string;
}) {
  const { draft, costing, salesSlices, costSlices, contributors } = vm;
  const showCharts = true;

  return (
    <>
      <div data-avoid="" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.02, color: 'var(--navy-700)' }}>{restaurantName}</h1>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--r-muted)', fontWeight: 600, marginTop: 8 }}>
            {monthLabel} · MTD Consolidated Report
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
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
            LIVE · recomputed each view
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--r-ink)', marginTop: 2 }}>
            {contributors.length} report{contributors.length === 1 ? '' : 's'} this month
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
            <CompositionDonut
              title="Sales Composition"
              totalLabel={moneyShort({ status: 'ok', value: salesSlices.reduce((sum, s) => sum + s.value, 0) })}
              slices={salesSlices}
            />
            <CompositionDonut
              title="Cost Composition"
              totalLabel={moneyShort({ status: 'ok', value: costSlices.reduce((sum, s) => sum + s.value, 0) })}
              slices={costSlices}
            />
          </div>
        )}
      </section>

      <CostingTable breakdown={costing} />

      <section data-avoid="" style={{ marginBottom: 40 }}>
        <SectionHeading label="Contributing audits" />
        <div style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          {contributors.map((c) => (
            <div
              key={c.auditId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                padding: '12px 16px',
                borderBottom: '1px solid var(--r-border-2)',
                fontSize: 12.5,
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: 'var(--r-muted)', marginLeft: 8 }}>{c.templateName}</span>
              </div>
              <div style={{ color: 'var(--r-muted)', fontFamily: 'var(--font-report-mono)' }}>
                v{c.version} · published {c.publishedAt.toISOString().slice(0, 10)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
