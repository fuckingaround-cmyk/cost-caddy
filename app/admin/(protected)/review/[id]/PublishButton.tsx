'use client';

import { useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { publishAudit } from '@/lib/actions/publish';

// C5 — a separate action from any share/copy-link affordance (R5). Publishing renders
// the version-stamped PDF via Playwright and freezes the audit; the button navigates to
// the published report on success (publishAudit redirects server-side).
export function PublishButton({ auditId }: { auditId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        await publishAudit(auditId); // throws its own redirect() on success
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : 'Could not publish this report.');
        setConfirming(false);
      }
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{
          padding: '9px 14px',
          border: '1px solid var(--brand)',
          background: '#fff',
          color: 'var(--brand)',
          borderRadius: 'var(--radius-control)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Publish
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Publish freezes this audit — no more corrections.</span>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        style={{
          padding: '9px 14px',
          border: '1px solid var(--brand)',
          background: 'var(--brand)',
          color: '#fff',
          borderRadius: 'var(--radius-control)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {pending ? 'Publishing…' : 'Confirm publish'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
      >
        Cancel
      </button>
      {error && <span style={{ color: 'var(--status-fail-fg-app)', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
