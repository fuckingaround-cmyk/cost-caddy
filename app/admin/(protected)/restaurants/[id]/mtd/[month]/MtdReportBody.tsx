import type { MtdViewModel, MtdWeeklyEntry } from '@/lib/report/mtdViewModel';
import type { MtdCandidate, MtdGap } from '@/lib/report/mtdContiguity';
import { formatPeriodRange } from '@/lib/dates';
import { count, moneyShort } from '@/lib/report/reportFormat';
import { KpiStrip } from '@/app/admin/(protected)/review/[id]/report/KpiStrip';
import { RevenueMatrix } from '@/app/admin/(protected)/review/[id]/report/RevenueMatrix';
import { CompositionDonut } from '@/app/admin/(protected)/review/[id]/report/CompositionDonut';
import { DirectCostTable } from '@/app/admin/(protected)/review/[id]/report/DirectCostTable';
import { CostVsSalesBars } from '@/app/admin/(protected)/review/[id]/report/CostVsSalesBars';
import { SectionHeading } from '@/app/admin/(protected)/review/[id]/report/CostingTable';
import { WeeklyTrendChart } from './WeeklyTrendChart';

// The MTD equivalent of ReportBody (lib/report/reportViewModel.ts's per-audit report) —
// same financial sections (they share buildFinancialReportDraft/buildCostingBreakdown),
// but no single audit/template/date to head the page with, and no compliance checklist
// to show (a checklist result belongs to one audit, not a sum of several) — instead a
// list of the contributing per-audit reports this month rolled up into (DESIGN.md UX-021).
export function MtdReportBody({
  vm,
  restaurantName,
  monthLabel,
  excluded,
  gap,
}: {
  vm: MtdViewModel;
  restaurantName: string;
  monthLabel: string;
  excluded?: MtdCandidate[];
  gap?: MtdGap | null;
}) {
  const { draft, costing, salesSlices, costSlices, contributors, weekly } = vm;
  const showCharts = true;
  const cadenceLabel = weekly.length > 1 && isLikelyBiWeekly(weekly) ? 'Bi-Weekly' : 'Weekly';

  return (
    <>
      <div data-avoid="" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.02, color: 'var(--brand)' }}>{restaurantName}</h1>
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
              background: 'var(--brand-tint)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand)',
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

      {excluded && excluded.length > 0 && (
        <div
          data-avoid=""
          style={{
            background: 'var(--status-fail-bg)',
            border: '1px solid var(--status-fail-border)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 24,
            fontSize: 12.5,
            color: 'var(--status-fail-fg-report)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {excluded.length} later report{excluded.length === 1 ? '' : 's'} excluded — coverage gap
            {gap ? ` (${formatPeriodRange(gap.start, gap.end)})` : ''}
          </div>
          <div>
            This MTD total only includes the contiguous run of audits from the start of the month. The following
            {excluded.length === 1 ? ' audit is' : ' audits are'} published but excluded until the gap above is covered:{' '}
            {excluded
              .map((c) => `"${c.name || c.templateName}" (v${c.version}, ${formatPeriodRange(c.periodStart, c.periodEnd)})`)
              .join(', ')}
            .
          </div>
        </div>
      )}

      <section data-gap="" style={{ marginBottom: 20 }}>
        <SectionHeading label="Section 1 · Key Financial & Unit Economic Metrics" right={`Audited ${count(draft.kpis.covers)} covers`} />
        <div data-avoid="">
          <KpiStrip kpis={draft.kpis} />
        </div>
        {showCharts ? (
          <div data-avoid="" data-gap="" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.6fr) minmax(260px, 1fr)', gap: 12, marginBottom: 12 }}>
            <RevenueMatrix draft={draft} />
            <CompositionDonut
              title="Sales Composition"
              totalLabel={moneyShort({ status: 'ok', value: salesSlices.reduce((sum, s) => sum + s.value, 0) })}
              slices={salesSlices}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <RevenueMatrix draft={draft} />
          </div>
        )}
      </section>

      <section data-avoid="" data-gap="" style={{ marginBottom: 20 }}>
        <SectionHeading label="Section 1B · Costing & Cost as % of Sales" />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(260px, 1.05fr) minmax(260px, 1.05fr)', gap: 12, alignItems: 'start' }}>
          <CompositionDonut
            title="Cost Composition"
            totalLabel={moneyShort({ status: 'ok', value: costSlices.reduce((sum, s) => sum + s.value, 0) })}
            slices={costSlices}
          />
          <DirectCostTable breakdown={costing} />
          <CostVsSalesBars breakdown={costing} />
        </div>
      </section>

      {weekly.length > 1 && (
        <section data-avoid="" data-gap="" style={{ marginBottom: 40 }}>
          <SectionHeading label={`Section 1C · ${cadenceLabel} Trend — Sales & Cost by Period`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <WeeklyTrendChart title={`${cadenceLabel} Net Sales`} entries={weekly} color="var(--status-pass-fg)" pick={(e) => e.netSale} />
            <WeeklyTrendChart title={`${cadenceLabel} Net F&B Cost`} entries={weekly} color="var(--report-chart-rust-1)" pick={(e) => e.cost} />
          </div>
        </section>
      )}

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

// Audits here are whatever arbitrary date ranges the admin assigned — there's no stored
// cadence field (ADR-0021) — so the trend chart's title infers "Weekly" vs "Bi-Weekly"
// from the contributing audits' own average span, rather than assuming either.
function isLikelyBiWeekly(weekly: MtdWeeklyEntry[]): boolean {
  const spans = weekly.map((w) => {
    const start = new Date(`${w.periodStart}T00:00:00`).getTime();
    const end = new Date(`${w.periodEnd}T00:00:00`).getTime();
    return Math.round((end - start) / 86400000) + 1;
  });
  const avgDays = spans.reduce((sum, d) => sum + d, 0) / spans.length;
  return avgDays > 10;
}
