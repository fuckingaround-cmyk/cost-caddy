import { SectionHeading } from './CostingTable';
import { EvidenceThumb } from './EvidenceLightbox';
import { EvidenceThumbStatic } from './EvidenceThumbStatic';

export type ReportSeverity = 'High' | 'Medium' | 'Low' | null;

export interface EvidencePhoto {
  id: string;
  name: string;
  isImage: boolean;
  url: string;
}

export interface ComplianceItem {
  id: string;
  refId: string;
  label: string;
  observation: string; // remark, or the N/A reason
  status: 'pending' | 'pass' | 'fail' | 'na';
  category: string | null;
  severity: ReportSeverity;
  impact: string | null;
  correctiveAction: string | null;
  sla: string | null;
  photos: EvidencePhoto[];
}

export interface Department {
  cat: string;
  catCode: string;
  items: ComplianceItem[];
}

const DEPT_ICON: Record<string, string> = {
  SEC: 'security',
  KIT: 'kitchen',
  STR: 'storefront',
  OPS: 'table_restaurant',
  POS: 'point_of_sale',
  OTH: 'fact_check',
};

const MAX_VISIBLE_THUMBS = 4;

const SEVERITY_CHIP: Record<'High' | 'Medium' | 'Low', { bg: string; fg: string }> = {
  High: { bg: 'var(--report-sev-high-bg)', fg: 'var(--report-sev-high-fg)' },
  Medium: { bg: 'var(--report-sev-medium-bg)', fg: 'var(--report-sev-medium-fg)' },
  Low: { bg: 'var(--report-sev-low-bg)', fg: 'var(--report-sev-low-fg)' },
};

// Report v4 §2 (Audit report v4.dc.html ~line 407-780): one card per department, a
// summary ribbon of checkpoint counts by severity, and the 7-column compliance table —
// Ref ID / Checkpoint & Observation / Operational Impact / Risk Severity / Immediate
// Corrective Action / SLA / Evidence. No §3 Findings Register (R9) — this table already
// carries those columns.
export function ComplianceSection({
  departments,
  showSummaryRibbon = true,
  interactive = true,
}: {
  departments: Department[];
  showSummaryRibbon?: boolean;
  // false for renderReportPdf.tsx's react-dom/server static render — see EvidenceThumbStatic.
  interactive?: boolean;
}) {
  const allItems = departments.flatMap((d) => d.items);
  const cTotal = allItems.length;
  const cHigh = allItems.filter((i) => i.severity === 'High').length;
  const cMedium = allItems.filter((i) => i.severity === 'Medium').length;
  const cLow = allItems.filter((i) => i.severity === 'Low').length;
  const cPassed = allItems.filter((i) => i.status === 'pass').length;

  return (
    <section data-gap="" style={{ marginBottom: 32 }}>
      <SectionHeading label="Section 2 · Department Checklists & Compliance Matrix" right={`${departments.length} departments · ${cTotal} checkpoints`} />

      {showSummaryRibbon && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            border: '1px solid var(--r-border)',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#fff',
            marginBottom: 24,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <RibbonCell value={cTotal} label="Checkpoints" color="var(--r-ink)" />
          <RibbonCell value={cHigh} label="High" color="var(--report-sev-high-fg)" />
          <RibbonCell value={cMedium} label="Medium" color="var(--report-sev-medium-fg)" />
          <RibbonCell value={cLow} label="Low" color="var(--r-ink-2)" />
          <RibbonCell value={cPassed} label="Passed" color="var(--navy-700)" last />
        </div>
      )}

      {departments.map((dept, i) => (
        <DepartmentCard key={dept.cat} index={i + 1} dept={dept} interactive={interactive} />
      ))}
    </section>
  );
}

function RibbonCell({ value, label, color, last }: { value: number; label: string; color: string; last?: boolean }) {
  return (
    <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRight: last ? 'none' : '1px solid var(--r-border)' }}>
      <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-report-mono)', color }}>{value}</span>
      <span style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function DepartmentCard({ index, dept, interactive }: { index: number; dept: Department; interactive: boolean }) {
  return (
    <div style={{ border: '1px solid var(--r-border)', borderRadius: 10, overflow: 'hidden', background: '#fff', marginBottom: 24, boxShadow: 'var(--shadow-card)' }}>
      <div data-avoid="" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--navy-050)', borderBottom: '1px solid var(--r-border)' }}>
        <span style={{ fontFamily: 'var(--font-report-icons)', fontSize: 17, lineHeight: 1, color: 'var(--navy-700)' }}>{DEPT_ICON[dept.catCode] ?? 'checklist'}</span>
        <span style={{ fontFamily: 'var(--font-report-mono)', fontSize: 12, color: 'var(--r-muted)' }}>{index}.</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--navy-700)', flex: 1 }}>{dept.cat}</h3>
      </div>
      <div>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--r-border-2)', fontSize: 10.5, fontWeight: 600, color: 'var(--r-muted)', background: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={{ width: '6%', padding: '10px 12px 10px 16px', fontWeight: 600 }}>Ref ID</th>
              <th style={{ width: '22%', padding: '10px 12px', fontWeight: 600 }}>Checkpoint &amp; Observation</th>
              <th style={{ width: '18%', padding: '10px 12px', fontWeight: 600 }}>Operational Impact</th>
              <th style={{ width: '9%', padding: '10px', textAlign: 'center', fontWeight: 600 }}>Risk Severity</th>
              <th style={{ width: '22%', padding: '10px 12px', fontWeight: 600 }}>Immediate Corrective Action</th>
              <th style={{ width: '12%', padding: '10px', textAlign: 'center', fontWeight: 600 }}>SLA</th>
              <th style={{ width: '11%', padding: '10px 16px 10px 8px', textAlign: 'center', fontWeight: 600 }}>Evidence</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 12 }}>
            {dept.items.map((item, i) => (
              <ComplianceRow key={item.id} item={item} zebra={i % 2 === 1} interactive={interactive} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceRow({ item, zebra, interactive }: { item: ComplianceItem; zebra: boolean; interactive: boolean }) {
  const isFinding = item.status === 'fail';
  const chip = item.severity ? SEVERITY_CHIP[item.severity] : SEVERITY_CHIP.Low;

  return (
    <tr style={{ borderBottom: '1px solid var(--r-border)', background: zebra ? 'var(--r-surface-alt-2)' : '#fff' }}>
      <td style={{ padding: '12px 12px 12px 16px', verticalAlign: 'top', fontFamily: 'var(--font-report-mono)', fontSize: 11, color: 'var(--r-ink-2)', fontWeight: 600 }}>{item.refId}</td>
      <td style={{ padding: 12, verticalAlign: 'top', color: 'var(--r-ink)' }}>
        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 12.5, color: 'var(--r-ink)' }}>{item.label}</p>
        <p style={{ margin: 0, color: 'var(--r-ink-2)', fontSize: 11.5, lineHeight: 1.5 }}>{item.observation || '—'}</p>
      </td>
      <td style={{ padding: 12, verticalAlign: 'top', color: 'var(--r-ink-2)', fontSize: 11, lineHeight: 1.5 }}>
        {isFinding ? item.impact || '—' : item.status === 'na' ? '—' : 'No deviation observed.'}
      </td>
      <td style={{ padding: '12px 10px', verticalAlign: 'top', textAlign: 'center' }}>
        {isFinding && item.severity ? (
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-report-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 9px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              background: chip.bg,
              color: chip.fg,
            }}
          >
            {item.severity}
          </span>
        ) : item.status === 'pass' ? (
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-report-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 9px',
              borderRadius: 4,
              background: 'var(--report-sev-low-bg)',
              color: 'var(--navy-700)',
            }}
          >
            Passed
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--r-muted)' }}>N/A</span>
        )}
      </td>
      <td style={{ padding: 12, verticalAlign: 'top', color: isFinding ? 'var(--r-ink-2)' : 'var(--r-muted)', fontStyle: isFinding ? 'normal' : 'italic', fontSize: 11.5, lineHeight: 1.6 }}>
        {isFinding ? item.correctiveAction || '—' : item.status === 'na' ? '—' : 'Maintain current standard.'}
      </td>
      <td style={{ padding: '12px 10px', verticalAlign: 'top', textAlign: 'center', fontFamily: 'var(--font-report-mono)', fontWeight: isFinding ? 700 : 400, color: isFinding ? 'var(--report-sev-high-fg)' : 'var(--r-muted)', fontSize: 11 }}>
        {isFinding ? item.sla || '—' : '–'}
      </td>
      <td style={{ padding: '12px 16px 12px 8px', verticalAlign: 'top', textAlign: 'center', color: 'var(--r-muted)', fontFamily: 'var(--font-report-mono)', fontSize: 11 }}>
        {item.photos.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            {item.photos.slice(0, MAX_VISIBLE_THUMBS).map((photo) =>
              interactive ? <EvidenceThumb key={photo.id} photo={photo} /> : <EvidenceThumbStatic key={photo.id} photo={photo} />,
            )}
            {item.photos.length > MAX_VISIBLE_THUMBS && <span style={{ alignSelf: 'center', fontSize: 10 }}>+{item.photos.length - MAX_VISIBLE_THUMBS}</span>}
          </div>
        ) : (
          '–'
        )}
      </td>
    </tr>
  );
}
