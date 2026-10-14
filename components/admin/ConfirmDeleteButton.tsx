'use client';

import { useState, useTransition } from 'react';

// A6: two-step inline delete — "Delete" turns into the consequence text + Confirm / Cancel.
// `onConfirm` may return { error } (e.g. a blocked restaurant delete), shown in place.
export function ConfirmDeleteButton({
  label = 'Delete',
  message,
  onConfirm,
}: {
  label?: string;
  message: string;
  onConfirm: () => Promise<{ error?: string } | void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const base: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: '8px 12px',
    borderRadius: 'var(--radius-control)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  if (!confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {error && <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)', maxWidth: 260 }}>{error}</div>}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          style={{ ...base, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--status-fail-fg-app)' }}
        >
          {label}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)', fontWeight: 600, textAlign: 'right', maxWidth: 260 }}>{message}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await onConfirm();
              if (res?.error) {
                setError(res.error);
                setConfirming(false);
              }
            })
          }
          style={{ ...base, border: '1px solid var(--status-fail-fg-app)', background: 'var(--status-fail-fg-app)', color: 'var(--surface)' }}
        >
          {pending ? 'Deleting…' : 'Confirm delete'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          style={{ ...base, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink-3)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
