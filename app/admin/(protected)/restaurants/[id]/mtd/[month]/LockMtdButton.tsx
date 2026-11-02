'use client';

import { useState, useTransition } from 'react';
import { lockMtdReport } from '@/lib/actions/mtdPublish';

// ADR-0021 — the MTD analog of PublishButton, but non-redirecting: there's no separate
// destination page for a locked MTD snapshot, just this live page gaining one more
// entry in its "Locked versions" list on success.
export function LockMtdButton({ outletId, month }: { outletId: string; month: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await lockMtdReport(outletId, month);
      if (res.error) setError(res.error);
      else setConfirming(false);
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        data-noprint=""
        onClick={() => setConfirming(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          border: 'none',
          borderRadius: 4,
          background: 'var(--brand-hover)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Lock &amp; Publish MTD
      </button>
    );
  }

  return (
    <div data-noprint="" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--brand-border-soft)' }}>Lock this month&apos;s current totals into a versioned PDF?</span>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        style={{
          padding: '6px 14px',
          border: 'none',
          borderRadius: 4,
          background: 'var(--brand-hover)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {pending ? 'Locking…' : 'Confirm lock'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        style={{ border: 'none', background: 'none', color: 'var(--brand-border-soft)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
      >
        Cancel
      </button>
      {error && <span style={{ color: '#ffb4b0', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
