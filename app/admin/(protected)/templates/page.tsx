import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listTemplates } from '@/lib/queries/templates';
import { TemplateActions } from './TemplateActions';

// A4 — Templates library.
export default async function TemplatesPage() {
  const admin = await requireRole('super_admin');
  const templates = await listTemplates(admin.orgId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-11)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui-title)', fontSize: 'var(--text-screen-title)', fontWeight: 600 }}>
            Checklist Templates
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Reusable across restaurants</div>
        </div>
        <Link
          href="/admin/templates/new"
          style={{
            padding: '10px 16px',
            border: '1px solid var(--ink)',
            borderRadius: 'var(--radius-control)',
            background: 'var(--surface)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--ink)',
          }}
        >
          + New Template
        </Link>
      </div>

      {templates.length === 0 && (
        <div style={{ color: 'var(--placeholder)', fontSize: 13 }}>No templates yet — create one to assign audits.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
        {templates.map((t) => (
          <div
            key={t.id}
            style={{
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-panel)',
              background: 'var(--surface)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link href={`/admin/templates/${t.id}`} style={{ minWidth: 0, textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy-900)' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--hint)', marginTop: 3 }}>
                  Reusable across restaurants · <span style={{ fontWeight: 600, color: 'var(--navy-700)' }}>Edit template &rsaquo;</span>
                </div>
              </Link>
              <TemplateActions templateId={t.id} auditCount={t.auditCount} />
            </div>
            <div style={{ padding: '11px 18px', borderTop: '1px solid var(--surface-alt-1)', background: 'var(--surface-alt-1)', display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <Stat label="Metrics" value={t.metricCount} />
              <Stat label="Departments" value={t.departmentCount} />
              <Stat label="Checkpoints" value={t.checkpointCount} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--status-neutral-fg-2)' }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginTop: 2 }}>{value}</div>
    </div>
  );
}
