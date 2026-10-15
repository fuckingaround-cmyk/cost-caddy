'use client';

import { useState, useTransition } from 'react';
import { regenerateRegisterFindings, updateEvidenceFindings } from '@/lib/actions/review';
import type { EvidencePhotoType } from '@/lib/evidence/types';

// ADR-0015 — the Findings and Observations / Corrective Measures for one POS report,
// generated at submit by OpenAI from the auditor's remark + the extracted table and shown
// here pre-filled. The admin can edit and Save, or Regenerate (re-runs the same job,
// overwriting the text). Empty until the submit-time job lands (or if it failed).
export function EvidenceFindingsPanel({
  auditId,
  itemId,
  evidenceType,
  reportLabel,
  label,
  findings: initialFindings,
  correctiveMeasures: initialCorrectiveMeasures,
}: {
  auditId: string;
  itemId: string;
  evidenceType: EvidencePhotoType;
  reportLabel: string;
  label: string;
  findings: string;
  correctiveMeasures: string;
}) {
  const [findings, setFindings] = useState(initialFindings);
  const [correctiveMeasures, setCorrectiveMeasures] = useState(initialCorrectiveMeasures);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();
  const [polishing, startPolishTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateEvidenceFindings(auditId, evidenceType, reportLabel, { findings, correctiveMeasures });
        setSavedAt(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save.');
      }
    });
  };

  const polish = () => {
    setError(null);
    startPolishTransition(async () => {
      try {
        const result = await regenerateRegisterFindings(auditId, itemId);
        setFindings(result.findings);
        setCorrectiveMeasures(result.correctiveMeasures);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not regenerate.');
      }
    });
  };

  return (
    <div style={{ border: '1px solid var(--border-card)', borderRadius: 'var(--radius-panel)', overflow: 'hidden', marginBottom: 'var(--space-9)' }}>
      <div style={{ padding: '10px 13px', background: 'var(--navy-700)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label} — Findings &amp; Corrective Measures
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <LabeledTextarea label="Findings and Observations" value={findings} onChange={setFindings} />
        <LabeledTextarea label="Corrective Measures" value={correctiveMeasures} onChange={setCorrectiveMeasures} />

        {error && <div style={{ color: 'var(--status-fail-fg-app)', fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            disabled={polishing}
            onClick={polish}
            style={{ padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {polishing ? 'Regenerating…' : 'Regenerate'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={save}
            style={{ padding: '8px 16px', border: '1px solid var(--navy-700)', background: 'var(--navy-700)', color: '#fff', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          {!error && savedAt && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Saved {savedAt.toLocaleTimeString()}</div>}
        </div>
      </div>
    </div>
  );
}

function LabeledTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Generated at submit — or write your own…"
        style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13, resize: 'vertical', width: '100%', fontFamily: 'var(--font-ui-body)' }}
      />
    </div>
  );
}
