'use client';

import { useState, useTransition } from 'react';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { Button } from '@/components/ui/Button';
import { deleteAudit, reassignAudit } from '@/lib/actions/audits';

// A6: per-audit controls. "Change auditor" only while the audit is still with the auditor
// (assigned / in-progress); delete is available at every status, with the consequence
// spelled out — published audits lose their report versions and PDFs.
export function AuditActions({
  auditId,
  status,
  auditorId,
  auditors,
}: {
  auditId: string;
  status: string;
  auditorId: string;
  auditors: { id: string; name: string }[];
}) {
  const canReassign = status === 'assigned' || status === 'in-progress';
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(auditorId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const deleteMessage =
    status === 'published'
      ? 'Permanently removes this audit, all report versions and their PDFs. The restaurant’s MTD report will change.'
      : status === 'submitted'
        ? 'Permanently removes this submitted audit and its photos.'
        : 'Permanently removes this audit and any draft the auditor saved.';

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {canReassign && !editing && (
        <Button variant="secondary" onClick={() => setEditing(true)} style={{ padding: '8px 12px', fontSize: 12 }}>
          Change auditor
        </Button>
      )}
      {canReassign && editing && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13, background: 'var(--surface)' }}
          >
            {!auditors.some((a) => a.id === auditorId) && <option value={auditorId}>Current auditor (inactive)</option>}
            {auditors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <Button
            disabled={pending || selected === auditorId}
            onClick={() =>
              startTransition(async () => {
                const res = await reassignAudit(auditId, selected);
                if (res.error) setError(res.error);
                else setEditing(false);
              })
            }
            style={{ padding: '8px 12px', fontSize: 12 }}
          >
            {pending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setEditing(false);
              setSelected(auditorId);
              setError(null);
            }}
            style={{ padding: '8px 12px', fontSize: 12 }}
          >
            Cancel
          </Button>
          {error && <span style={{ fontSize: 12, color: 'var(--status-fail-fg-app)', fontWeight: 600 }}>{error}</span>}
        </div>
      )}
      <ConfirmDeleteButton message={deleteMessage} onConfirm={() => deleteAudit(auditId)} />
    </div>
  );
}
