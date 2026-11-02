'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { generateReport } from '@/lib/actions/review';

// C3 — "Generate report": ported from Super Admin Flow.dc.html's generateReport/
// regenerateReport (~line 1611). Idempotent server-side (generateReport only fills
// items with no severity yet), so Regenerate is the same action, not a separate one.
export function GenerateReportButton({ auditId, generated }: { auditId: string; generated: boolean }) {
  const [pending, startTransition] = useTransition();

  const run = () => startTransition(() => generateReport(auditId));

  if (!generated) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={run}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '11px 18px',
          border: '1px solid var(--brand)',
          background: 'var(--brand)',
          color: '#fff',
          borderRadius: 'var(--radius-control)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {pending ? 'Generating…' : 'Generate report'}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          padding: '6px 10px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--brand-tint)',
          color: 'var(--brand)',
          border: '1px solid var(--brand-border)',
        }}
      >
        REPORT GENERATED
      </div>
      <Link
        href={`/admin/review/${auditId}/report`}
        style={{
          padding: '9px 14px',
          border: '1px solid var(--brand)',
          background: 'var(--brand)',
          color: '#fff',
          borderRadius: 'var(--radius-control)',
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        View report
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        style={{
          padding: '9px 14px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--ink-3)',
          borderRadius: 'var(--radius-control)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {pending ? 'Regenerating…' : 'Regenerate'}
      </button>
    </div>
  );
}
