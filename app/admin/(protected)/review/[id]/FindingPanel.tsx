'use client';

import { useState, useTransition } from 'react';
import { updateFinding } from '@/lib/actions/review';

export type Severity = 'High' | 'Medium' | 'Low';
export type ResolutionStatus = 'Pending' | 'Resolved';

export interface Finding {
  refId: string;
  category: string;
  severity: Severity;
  impact: string;
  correctiveAction: string;
  sla: string;
  ownership: string;
  resolutionStatus: ResolutionStatus;
}

const SEVERITY_CHIP: Record<Severity, { bg: string; color: string }> = {
  High: { bg: '#fff7ed', color: '#c2410c' },
  Medium: { bg: '#fefce8', color: '#a16207' },
  Low: { bg: 'var(--status-neutral-bg)', color: 'var(--status-neutral-fg-1)' },
};

// C3 — every generated field is editable by the reviewer (EXECUTION.md done-when).
// The classifier's output (lib/report/classify.ts) is only the deterministic floor;
// this panel is where a reviewer overrides it before publish.
export function FindingPanel({ itemId, auditId, finding }: { itemId: string; auditId: string; finding: Finding }) {
  const [editing, setEditing] = useState(false);
  const [severity, setSeverity] = useState(finding.severity);
  const [impact, setImpact] = useState(finding.impact);
  const [correctiveAction, setCorrectiveAction] = useState(finding.correctiveAction);
  const [sla, setSla] = useState(finding.sla);
  const [ownership, setOwnership] = useState(finding.ownership);
  const [resolutionStatus, setResolutionStatus] = useState(finding.resolutionStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chip = SEVERITY_CHIP[finding.severity];

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateFinding(itemId, auditId, { severity, impact, correctiveAction, sla, ownership, resolutionStatus });
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save the finding.');
      }
    });
  };

  const cancel = () => {
    setSeverity(finding.severity);
    setImpact(finding.impact);
    setCorrectiveAction(finding.correctiveAction);
    setSla(finding.sla);
    setOwnership(finding.ownership);
    setResolutionStatus(finding.resolutionStatus);
    setError(null);
    setEditing(false);
  };

  return (
    <div style={{ marginTop: 10, border: '1px solid var(--border-card)', borderRadius: 'var(--radius-panel)', padding: '12px 14px', background: 'var(--surface-alt-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {finding.refId} · {finding.category}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '4px 8px', borderRadius: 'var(--radius-pill)', background: chip.bg, color: chip.color }}>
          {finding.severity.toUpperCase()} SEVERITY
        </div>
      </div>

      {!editing ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
            <FindingField label="Operational Impact" value={finding.impact} />
            <FindingField label="Corrective Action" value={finding.correctiveAction} />
            <FindingField label="SLA Timeline" value={finding.sla} />
            <FindingField label="Assigned Ownership" value={finding.ownership} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 10,
              paddingTop: 9,
              borderTop: '1px solid var(--divider)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>Status: {finding.resolutionStatus}</div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', padding: 0, cursor: 'pointer' }}
            >
              Edit finding
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['High', 'Medium', 'Low'] as Severity[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                style={{
                  padding: '8px 14px',
                  border: severity === s ? '1px solid var(--brand)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  background: severity === s ? 'var(--brand-tint)' : 'var(--surface)',
                  fontSize: 13,
                  fontWeight: severity === s ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <LabeledInput label="Operational Impact" value={impact} onChange={setImpact} multiline />
          <LabeledInput label="Corrective Action" value={correctiveAction} onChange={setCorrectiveAction} multiline />
          <LabeledInput label="SLA Timeline" value={sla} onChange={setSla} />
          <LabeledInput label="Assigned Ownership" value={ownership} onChange={setOwnership} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value as ResolutionStatus)}
              style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13 }}
            >
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {error && <div style={{ color: 'var(--status-fail-fg-app)', fontSize: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              style={{ padding: '8px 16px', border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {pending ? 'Saving…' : 'Save finding'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancel}
              style={{ padding: '8px 16px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FindingField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--muted-2)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--ink-2)' }}>{value}</div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ padding: 9, border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13, fontFamily: 'var(--font-ui-body)' }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13 }}
        />
      )}
    </div>
  );
}
