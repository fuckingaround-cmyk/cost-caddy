'use client';

import { useState, useTransition } from 'react';
import { updateEvidenceTable, retryEvidenceExtraction } from '@/lib/actions/review';
import { EVIDENCE_PHOTO_TYPE_LABELS } from '@/lib/evidence/types';
import type { ReviewPhoto } from './ReviewItemRow';

const STATUS_LABEL: Record<NonNullable<ReviewPhoto['extractionStatus']>, string> = {
  pending: 'Extracting…',
  extracted: 'Extracted',
  failed: 'Extraction failed',
};

// B7/ADR-0012 — every extracted cell is reviewer-editable, the same trust model
// updateFinding() already gives severity: no separate confirm step. A photo whose
// extraction failed (or is still pending) shows the status and a retry instead of a
// table.
export function EvidenceTablePanel({ auditId, photo }: { auditId: string; photo: ReviewPhoto }) {
  const table = photo.extractedTable;
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<string[][]>(table?.rows ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = table?.columns ?? [];
  const typeLabel = photo.evidenceType ? EVIDENCE_PHOTO_TYPE_LABELS[photo.evidenceType] : '';

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateEvidenceTable(photo.id, auditId, { columns, rows });
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save the table.');
      }
    });
  };

  const cancel = () => {
    setRows(table?.rows ?? []);
    setError(null);
    setEditing(false);
  };

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

  const setCell = (r: number, c: number, value: string) => {
    setRows((prev) => prev.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row)));
  };

  const addRow = () => setRows((prev) => [...prev, columns.map(() => '')]);
  const removeRow = (r: number) => setRows((prev) => prev.filter((_, ri) => ri !== r));

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

      {photo.extractionStatus === null && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Queued for extraction…</div>}

      {photo.extractionStatus === 'pending' && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Gemini is reading this photo…</div>}

      {photo.extractionStatus === 'failed' && (
        <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)' }}>
          Could not extract a table from this photo.{' '}
          <button type="button" disabled={pending} onClick={retry} style={{ border: 'none', background: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
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
                  {columns.map((c) => (
                    <th key={c} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid var(--divider)', color: 'var(--muted-2)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {c}
                    </th>
                  ))}
                  {editing && <th style={{ width: 24 }} />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) =>
                      editing ? (
                        <td key={ci} style={{ padding: '2px 4px' }}>
                          <input
                            value={cell}
                            onChange={(e) => setCell(ri, ci, e.target.value)}
                            style={{ width: '100%', padding: '5px 6px', border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 12 }}
                          />
                        </td>
                      ) : (
                        <td key={ci} style={{ padding: '5px 6px', borderBottom: '1px solid var(--divider)', color: 'var(--ink-2)' }}>
                          {cell || '—'}
                        </td>
                      ),
                    )}
                    {editing && (
                      <td>
                        <button type="button" onClick={() => removeRow(ri)} style={{ border: 'none', background: 'none', color: 'var(--placeholder)', cursor: 'pointer' }}>
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <div style={{ color: 'var(--status-fail-fg-app)', fontSize: 12, marginTop: 8 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--divider)' }}>
            {photo.url && (
              <a href={photo.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--muted)' }}>
                View original photo
              </a>
            )}
            {!editing ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" disabled={pending} onClick={retry} style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', padding: 0, cursor: 'pointer' }}>
                  Retry
                </button>
                <button type="button" onClick={() => setEditing(true)} style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', padding: 0, cursor: 'pointer' }}>
                  Edit table
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={addRow} style={{ padding: '6px 10px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius-control)', fontSize: 12, cursor: 'pointer' }}>
                  + Row
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={save}
                  style={{ padding: '6px 12px', border: '1px solid var(--navy-700)', background: 'var(--navy-700)', color: '#fff', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {pending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" disabled={pending} onClick={cancel} style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
