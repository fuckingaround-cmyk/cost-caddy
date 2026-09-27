'use client';

import type { Dispatch, SetStateAction } from 'react';
import { NA_REASONS } from '@/lib/checklist/naReasons';
import { isItemAnswered } from '@/lib/checklist/isItemAnswered';
import { compressImage } from '@/lib/media/compressImage';
import { removeItemPhoto, setEvidencePhotoType, uploadItemPhoto } from '@/lib/actions/checklist';
import type { AuditItemRow } from '@/lib/queries/audits';
import { EVIDENCE_PHOTO_TYPES, EVIDENCE_PHOTO_TYPE_LABELS, type EvidencePhotoType } from '@/lib/evidence/types';
import { suggestedEvidenceType } from '@/lib/evidence/suggest';

type ItemStatus = AuditItemRow['status'];

// A placeholder key for a photo mid-upload, replaced by the real audit_item_files id
// on success. Pulled out of the component body — react-hooks/purity flags Date.now()/
// Math.random() reachable from render, even though this only ever runs from a click.
function makeTempPhotoId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface PhotoEntry {
  id: string; // a temp id while uploading, the real audit_item_files id once it lands
  name: string;
  meta: string;
  uploading?: boolean;
  kind?: 'image' | 'file';
  // B7/ADR-0012 — the recipe the auditor picked for this photo; undefined while
  // uploading, null once uploaded with no type picked (not a register photo).
  evidenceType?: EvidencePhotoType | null;
}

export interface ChecklistItemState extends AuditItemRow {
  photos: PhotoEntry[];
}

const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--navy-700)" strokeWidth="3">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

const STATUS_CHIP: Record<ItemStatus, { bg: string; color: string; border: string; label: string }> = {
  pending: { bg: 'var(--surface)', color: 'var(--muted)', border: 'var(--border)', label: 'PENDING' },
  pass: { bg: '#eafaf6', color: 'var(--status-pass-fg)', border: '#bfe8dc', label: 'PASS' },
  fail: { bg: 'var(--status-fail-bg)', color: 'var(--status-fail-fg-app)', border: 'var(--status-fail-border)', label: 'FAIL' },
  na: { bg: 'var(--status-neutral-bg)', color: 'var(--status-neutral-fg-1)', border: 'var(--status-neutral-border)', label: 'N/A' },
};

function StatusChip({ status }: { status: ItemStatus }) {
  const c = STATUS_CHIP[status];
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '5px 9px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      {c.label}
    </div>
  );
}

// B3/B4 — the Departmental Checklist tab. A controlled component: `items` is owned by
// ChecklistScreen (so Save, which lives at that level, always sees the latest state).
// Photos upload one at a time on capture, straight to Supabase Storage (B4) — nothing
// about them is held back for the explicit Save.
export function ChecklistStep({
  items,
  setItems,
  activeItemId,
  setActiveItemId,
  expandedCats,
  setExpandedCats,
}: {
  items: ChecklistItemState[];
  setItems: Dispatch<SetStateAction<ChecklistItemState[]>>;
  activeItemId: string | null;
  setActiveItemId: Dispatch<SetStateAction<string | null>>;
  expandedCats: Set<string>;
  setExpandedCats: Dispatch<SetStateAction<Set<string>>>;
}) {
  const departments: { cat: string; catCode: string; items: ChecklistItemState[] }[] = [];
  for (const it of items) {
    let dept = departments.find((d) => d.cat === it.cat);
    if (!dept) {
      dept = { cat: it.cat, catCode: it.catCode, items: [] };
      departments.push(dept);
    }
    dept.items.push(it);
  }

  const updateItem = (id: string, patch: Partial<ChecklistItemState>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const setStatus = (id: string, status: ItemStatus) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status, naReason: status === 'na' ? it.naReason : null } : it)),
    );
  };

  const addPhotos = async (itemId: string, checkpointCode: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Sequential, not Promise.all — "photos upload one at a time on capture" (B4).
    for (const rawFile of Array.from(files)) {
      const tempId = makeTempPhotoId();
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId ? { ...it, photos: [...it.photos, { id: tempId, name: rawFile.name, meta: 'Uploading…', uploading: true }] } : it,
        ),
      );
      try {
        const prepared = await compressImage(rawFile);
        const formData = new FormData();
        formData.set('file', prepared);
        const uploaded = await uploadItemPhoto(itemId, formData);
        // B7/ADR-0012 — a checkpoint can only suggest a default evidence type, never
        // decide it; applying the suggestion here also fires the extraction.
        const evidenceType = uploaded.kind === 'image' ? suggestedEvidenceType(checkpointCode) : null;
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  photos: it.photos.map((p) =>
                    p.id === tempId ? { id: uploaded.id, name: uploaded.name, meta: uploaded.meta, kind: uploaded.kind, evidenceType } : p,
                  ),
                }
              : it,
          ),
        );
        if (evidenceType) void setEvidencePhotoType(uploaded.id, evidenceType);
      } catch {
        setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, photos: it.photos.filter((p) => p.id !== tempId) } : it)));
      }
    }
  };

  const changeEvidenceType = (itemId: string, photoId: string, evidenceType: EvidencePhotoType | null) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, photos: it.photos.map((p) => (p.id === photoId ? { ...p, evidenceType } : p)) } : it,
      ),
    );
    void setEvidencePhotoType(photoId, evidenceType);
  };

  const removePhoto = async (itemId: string, photoId: string) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, photos: it.photos.filter((p) => p.id !== photoId) } : it)));
    if (!photoId.startsWith('tmp-')) {
      try {
        await removeItemPhoto(photoId);
      } catch {
        // Best-effort: the row is gone from view; a stray storage object isn't visible to
        // the auditor and doesn't block anything else in B4's scope.
      }
    }
  };

  const toggleDept = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div style={{ padding: '16px 24px 32px 24px' }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Department checklist</div>
      <div style={{ fontSize: 12, color: 'var(--hint)', marginBottom: 12 }}>
        Mark each checkpoint and add a remark for the report
      </div>

      {departments.map((dept, i) => {
        const answered = dept.items.filter(isItemAnswered).length;
        const open = expandedCats.has(dept.cat);
        return (
          <div
            key={dept.cat}
            style={{
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-panel)',
              background: 'var(--surface)',
              marginBottom: 12,
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => toggleDept(dept.cat)}
              style={{
                padding: '11px 14px',
                background: 'var(--surface-alt-1)',
                borderBottom: open ? '1px solid var(--border-card)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 'var(--radius-control)',
                    background: 'var(--navy-chip)',
                    border: '1px solid var(--navy-border-soft-1)',
                    color: 'var(--navy-700)',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>{dept.cat}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--hint)', whiteSpace: 'nowrap' }}>
                {answered} of {dept.items.length} answered
              </div>
            </div>

            {open && (
              <div style={{ padding: '2px 14px 6px 14px' }}>
                {dept.items.map((it) => (
                  <ChecklistItemRow
                    key={it.id}
                    item={it}
                    active={activeItemId === it.id}
                    onToggle={() => setActiveItemId((cur) => (cur === it.id ? null : it.id))}
                    onStatus={(s) => setStatus(it.id, s)}
                    onRemarkChange={(remark) => updateItem(it.id, { remark })}
                    onNaReasonChange={(naReason) => updateItem(it.id, { naReason })}
                    onAddPhotos={(files) => void addPhotos(it.id, it.code, files)}
                    onRemovePhoto={(photoId) => void removePhoto(it.id, photoId)}
                    onEvidenceTypeChange={(photoId, evidenceType) => changeEvidenceType(it.id, photoId, evidenceType)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChecklistItemRow({
  item,
  active,
  onToggle,
  onStatus,
  onRemarkChange,
  onNaReasonChange,
  onAddPhotos,
  onRemovePhoto,
  onEvidenceTypeChange,
}: {
  item: ChecklistItemState;
  active: boolean;
  onToggle: () => void;
  onStatus: (s: ItemStatus) => void;
  onRemarkChange: (v: string) => void;
  onNaReasonChange: (v: string) => void;
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (photoId: string) => void;
  onEvidenceTypeChange: (photoId: string, evidenceType: EvidencePhotoType | null) => void;
}) {
  const hasRemark = item.remark.trim() !== '';

  return (
    <div id={`checklist-item-${item.id}`} style={{ borderBottom: '1px solid var(--divider)', padding: '14px 0' }}>
      <div onClick={onToggle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{item.label}</span>
            {hasRemark && CHECK_ICON}
          </div>
          {item.guidance && <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 3 }}>{item.guidance}</div>}
        </div>
        <StatusChip status={item.status} />
      </div>

      {active && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['pass', 'fail', 'na'] as ItemStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatus(s)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: 10,
                  border: item.status === s ? '1px solid var(--navy-700)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  background: item.status === s ? 'var(--navy-chip)' : 'var(--surface)',
                  fontSize: 13,
                  fontWeight: item.status === s ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {s === 'na' ? 'N/A' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {item.status === 'na' && (
            <select
              value={item.naReason ?? ''}
              onChange={(e) => onNaReasonChange(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                fontSize: 13,
                color: item.naReason ? 'var(--ink)' : 'var(--placeholder)',
              }}
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

          {item.status !== 'pending' && (
            <textarea
              value={item.remark}
              onChange={(e) => onRemarkChange(e.target.value)}
              placeholder={item.status === 'pass' ? 'Add a remark (optional)…' : 'Add a remark…'}
              rows={2}
              style={{
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                fontSize: 13,
                resize: 'vertical',
                width: '100%',
                fontFamily: 'var(--font-ui-body)',
              }}
            />
          )}

          <PhotoAttach photos={item.photos} onAdd={onAddPhotos} onRemove={onRemovePhoto} onEvidenceTypeChange={onEvidenceTypeChange} />
        </div>
      )}
    </div>
  );
}

function PhotoAttach({
  photos,
  onAdd,
  onRemove,
  onEvidenceTypeChange,
}: {
  photos: PhotoEntry[];
  onAdd: (files: FileList | null) => void;
  onRemove: (photoId: string) => void;
  onEvidenceTypeChange: (photoId: string, evidenceType: EvidencePhotoType | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <AttachButton label="Camera" accept="image/*" capture onAdd={onAdd} />
        <AttachButton label="Gallery" accept="image/*" onAdd={onAdd} />
        <AttachButton label="File" accept=".csv,.xlsx,.xls,.pdf,image/*" onAdd={onAdd} />
      </div>
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px 6px 6px',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-card)',
                background: 'var(--surface)',
                opacity: p.uploading ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--ink-2)',
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted-2)' }}>{p.meta}</div>
              {!p.uploading && p.kind === 'image' && (
                <select
                  value={p.evidenceType ?? ''}
                  onChange={(e) => onEvidenceTypeChange(p.id, e.target.value === '' ? null : (e.target.value as EvidencePhotoType))}
                  title="Extract this photo as a table?"
                  style={{ fontSize: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', padding: '2px 4px', background: 'var(--surface)' }}
                >
                  <option value="">Not a register</option>
                  {EVIDENCE_PHOTO_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EVIDENCE_PHOTO_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              )}
              {!p.uploading && (
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  style={{ border: 'none', background: 'none', color: 'var(--placeholder)', fontSize: 13, lineHeight: 1, padding: '2px 3px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttachButton({
  label,
  accept,
  capture,
  onAdd,
}: {
  label: string;
  accept: string;
  capture?: boolean;
  onAdd: (files: FileList | null) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-control)',
        background: 'var(--surface)',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {label}
      <input
        type="file"
        accept={accept}
        multiple
        capture={capture ? 'environment' : undefined}
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </label>
  );
}
