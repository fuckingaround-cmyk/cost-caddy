'use client';

import { useTransition } from 'react';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { deleteTemplate, duplicateTemplate } from '@/lib/actions/templates';

// A6: Duplicate + Delete on a template card. The delete message says which outcome
// applies — archived when audits were created from it, removed otherwise (ADR-0016).
export function TemplateActions({ templateId, auditCount }: { templateId: string; auditCount: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => duplicateTemplate(templateId))}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: '8px 12px',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--navy-700)',
          cursor: 'pointer',
        }}
      >
        {pending ? 'Duplicating…' : 'Duplicate'}
      </button>
      <ConfirmDeleteButton
        message={
          auditCount > 0
            ? `Used by ${auditCount} audit${auditCount === 1 ? '' : 's'} — it will be archived; those audits are unaffected.`
            : 'Delete this template permanently?'
        }
        onConfirm={() => deleteTemplate(templateId)}
      />
    </div>
  );
}
