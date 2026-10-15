'use client';

import { useState, useTransition } from 'react';
import { retryEvidenceExtraction } from '@/lib/actions/review';
import { EVIDENCE_PHOTO_TYPE_LABELS } from '@/lib/evidence/types';
import type { ReviewPhoto } from './ReviewItemRow';

const STATUS_LABEL: Record<NonNullable<ReviewPhoto['extractionStatus']>, string> = {
  pending: 'Extracting…',
  extracted: 'Extracted',
  failed: 'Extraction failed',
};

// The table transcribed from a POS report photo (ADR-0012/ADR-0015). Read-only on purpose:
// cells are a verbatim transcription and are not editable — the admin can only see the
// status, open the original photo, and Retry a failed/misread extraction.
export function EvidenceTablePanel({ auditId, photo }: { auditId: string; photo: ReviewPhoto }) {
  const table = photo.extractedTable;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = table?.columns ?? [];
  const typeLabel = photo.evidenceType ? EVIDENCE_PHOTO_TYPE_LABELS[photo.evidenceType] : '';

  const retry = () => {
    setError(null);
    startTransition(async () => {
      try {
        await retryEvidenceExtraction(photo.id, auditId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not retry extraction.');
      }
    });
  };

  const linkStyle = { border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', padding: 0, cursor: 'pointer' } as const;

  return (
    <div style={{ marginTop: 10, border: '1px solid var(--border-card)', borderRadius: 'var(--radius-panel)', padding: '12px 14px', background: 'var(--surface-alt-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {typeLabel} · {photo.name}
        </div>
        {photo.extractionStatus && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '4px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-alt-1)', color: 'var(--muted-2)' }}>
            {STATUS_LABEL[photo.extractionStatus].toUpperCase()}
          </div>
        )}
      </div>

      {photo.extractionStatus === null && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Waiting for the backend read after submit…</div>}
      {photo.extractionStatus === 'pending' && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Reading this photo…</div>}

      {photo.extractionStatus === 'failed' && (
        <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)' }}>
          Could not extract a table from this photo.{' '}
          <button type="button" disabled={pending} onClick={retry} style={{ ...linkStyle, color: 'inherit' }}>
            Retry
          </button>
        </div>
      )}

      {photo.extractionStatus === 'extracted' && table && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {columns.map((c, ci) => (
                    <th key={ci} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid var(--divider)', color: 'var(--muted-2)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {columns.map((_, ci) => (
                      <td key={ci} style={{ padding: '5px 6px', borderBottom: '1px solid var(--divider)', color: 'var(--ink-2)' }}>
                        {row[ci] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <div style={{ color: 'var(--status-fail-fg-app)', fontSize: 12, marginTop: 8 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--divider)' }}>
            {photo.url ? (
              <a href={photo.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--muted)' }}>
                View original photo
              </a>
            ) : (
              <span />
            )}
            <button type="button" disabled={pending} onClick={retry} style={linkStyle}>
              {pending ? 'Retrying…' : 'Retry extraction'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
