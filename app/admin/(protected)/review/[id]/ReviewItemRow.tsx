'use client';

import { useState, useTransition } from 'react';
import { correctAuditItem } from '@/lib/actions/review';
import { NA_REASONS } from '@/lib/checklist/naReasons';
import { PhotoLightbox } from './PhotoLightbox';
import { FindingPanel, type Finding } from './FindingPanel';
import { EvidenceTablePanel } from './EvidenceTablePanel';
import type { EvidencePhotoType } from '@/lib/evidence/types';

type ItemStatus = 'pending' | 'pass' | 'fail' | 'na';

const STATUS_CHIP: Record<ItemStatus, { bg: string; color: string; border: string; label: string }> = {
  pending: { bg: 'var(--surface)', color: 'var(--muted)', border: 'var(--border)', label: 'PENDING' },
  pass: { bg: '#eafaf6', color: 'var(--status-pass-fg)', border: '#bfe8dc', label: 'PASS' },
  fail: { bg: 'var(--status-fail-bg)', color: 'var(--status-fail-fg-app)', border: 'var(--status-fail-border)', label: 'FAIL' },
  na: { bg: 'var(--status-neutral-bg)', color: 'var(--status-neutral-fg-1)', border: 'var(--status-neutral-border)', label: 'N/A' },
};

const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--navy-700)" strokeWidth="3">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

export interface ReviewPhoto {
  id: string;
  name: string;
  meta: string | null;
  isImage: boolean;
  url: string;
  // B7/ADR-0012
  evidenceType: EvidencePhotoType | null;
  extractionStatus: 'pending' | 'extracted' | 'failed' | null;
  extractedTable: { columns: string[]; rows: string[][] } | null;
}

export interface ReviewItem {
  id: string;
  code: string;
  label: string;
  status: ItemStatus;
  remark: string;
  naReason: string | null;
  photos: ReviewPhoto[];
  finding: Finding | null;
}

// C1 — the submission is shown exactly as captured; "Correct" is an explicit,
// separate action layered on top (ARCHITECTURE §7: "shown as captured, never edited
// in place"), re-validated server-side by correctAuditItem the same way B3 was.
export function ReviewItemRow({ item, auditId }: { item: ReviewItem; auditId: string }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [remark, setRemark] = useState(item.remark);
  const [naReason, setNaReason] = useState(item.naReason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chip = STATUS_CHIP[item.status];

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await correctAuditItem(item.id, auditId, status, remark, status === 'na' ? naReason || null : null);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save the correction.');
      }
    });
  };

  const cancel = () => {
    setStatus(item.status);
    setRemark(item.remark);
    setNaReason(item.naReason ?? '');
    setError(null);
    setEditing(false);
  };

  return (
    <div style={{ borderBottom: '1px solid var(--divider)', padding: '16px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--muted-2)', flexShrink: 0 }}>{item.code}</span>
              <span>{item.label}</span>
              {item.remark.trim() !== '' && CHECK_ICON}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '5px 9px',
                borderRadius: 'var(--radius-pill)',
                whiteSpace: 'nowrap',
                background: chip.bg,
                color: chip.color,
                border: `1px solid ${chip.border}`,
              }}
            >
              {chip.label}
            </div>
          </div>
          {item.photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {item.photos.map((p) => (
                <PhotoLightbox key={p.id} name={p.name} meta={p.meta} url={p.url} isImage={p.isImage} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Auditor&rsquo;s remark</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {item.status === 'na' && item.naReason ? item.naReason : item.remark || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--placeholder)' }}>Submitted as captured in the field · read-only</div>
        </div>
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{ marginTop: 10, border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', padding: 0, cursor: 'pointer' }}
        >
          Correct status or remark
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-panel)',
            padding: 14,
            background: 'var(--surface-alt-1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['pass', 'fail', 'na'] as ItemStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                style={{
                  padding: '8px 14px',
                  border: status === s ? '1px solid var(--navy-700)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  background: status === s ? 'var(--navy-chip)' : 'var(--surface)',
                  fontSize: 13,
                  fontWeight: status === s ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {s === 'na' ? 'N/A' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {status === 'na' && (
            <select
              value={naReason}
              onChange={(e) => setNaReason(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13 }}
            >
              <option value="" disabled>
                Reason N/A applies…
              </option>
              {NA_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={2}
            placeholder="Remark…"
            style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13, width: '100%', fontFamily: 'var(--font-ui-body)' }}
          />

          {error && <div style={{ color: 'var(--status-fail-fg-app)', fontSize: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              style={{ padding: '8px 16px', border: '1px solid var(--navy-700)', background: 'var(--navy-700)', color: '#fff', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {pending ? 'Saving…' : 'Save correction'}
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

      {item.finding && <FindingPanel itemId={item.id} auditId={auditId} finding={item.finding} />}

      {item.photos
        .filter((p) => p.evidenceType !== null)
        .map((p) => (
          <EvidenceTablePanel key={p.id} auditId={auditId} photo={p} />
        ))}
    </div>
  );
}
