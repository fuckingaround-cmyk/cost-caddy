'use client';

import { useRef, useState, useTransition } from 'react';
import { attachOperationalFile, replaceOperationalFile } from '@/lib/actions/review';
import { OPERATIONAL_FILE_TYPES } from '@/lib/operational/types';

export interface OperationalFileEntry {
  id: string;
  type: string;
  period: string;
  name: string;
  format: string;
  parseStatus: 'parsed' | 'unreadable';
  coverageSummary: string | null;
}

// C1 — "an operational file can be attached and replaced, each showing what it covers
// and whether it read successfully." Parsing itself lives in lib/operational/parseFile;
// this only drives the attach/replace forms and the resulting list.
export function OperationalFilesPanel({ auditId, files }: { auditId: string; files: OperationalFileEntry[] }) {
  return (
    <div style={{ border: '1px solid var(--border-card)', borderRadius: 'var(--radius-panel)', overflow: 'hidden', marginBottom: 'var(--space-9)' }}>
      <div style={{ padding: '10px 13px', background: 'var(--brand)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Operational Files
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {files.length === 0 && <div style={{ fontSize: 13, color: 'var(--placeholder)' }}>Nothing attached yet.</div>}
        {files.map((f) => (
          <OperationalFileRow key={f.id} auditId={auditId} file={f} />
        ))}
        <AttachForm auditId={auditId} />
      </div>
    </div>
  );
}

function OperationalFileRow({ auditId, file }: { auditId: string; file: OperationalFileEntry }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onReplace = (fileList: FileList | null) => {
    const picked = fileList?.[0];
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('file', picked);
        await replaceOperationalFile(file.id, auditId, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not replace the file.');
      } finally {
        if (inputRef.current) inputRef.current.value = '';
      }
    });
  };

  return (
    <div style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-card)', padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{file.type}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {file.period} · {file.format} · {file.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {file.parseStatus === 'parsed' ? file.coverageSummary ?? 'Covers this period' : 'Needs manual review — could not be read automatically'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              padding: '5px 9px',
              borderRadius: 'var(--radius-pill)',
              background: file.parseStatus === 'parsed' ? 'var(--status-neutral-bg)' : '#fdf6e3',
              color: file.parseStatus === 'parsed' ? 'var(--status-neutral-fg-1)' : 'var(--status-warn-fg)',
              border: `1px solid ${file.parseStatus === 'parsed' ? 'var(--status-neutral-border)' : '#f0e2b6'}`,
            }}
          >
            {file.parseStatus === 'parsed' ? 'PARSED' : 'NEEDS REVIEW'}
          </div>
          <label style={{ fontSize: 12, textDecoration: 'underline', cursor: pending ? 'default' : 'pointer', color: pending ? 'var(--muted)' : 'var(--ink)' }}>
            {pending ? 'Replacing…' : 'Replace'}
            <input ref={inputRef} type="file" disabled={pending} onChange={(e) => onReplace(e.target.files)} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      {error && <div style={{ color: 'var(--status-fail-fg-app)', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function AttachForm({ auditId }: { auditId: string }) {
  const [type, setType] = useState<string>(OPERATIONAL_FILE_TYPES[0]);
  const [period, setPeriod] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onAttach = () => {
    const picked = inputRef.current?.files?.[0];
    if (!picked) {
      setError('Choose a file first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('file', picked);
        await attachOperationalFile(auditId, type as (typeof OPERATIONAL_FILE_TYPES)[number], period, formData);
        setPeriod('');
        if (inputRef.current) inputRef.current.value = '';
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not attach the file.');
      }
    });
  };

  return (
    <div style={{ border: '1px dashed var(--border-dashed)', borderRadius: 'var(--radius-card)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ flex: '1 1 200px', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13 }}
        >
          {OPERATIONAL_FILE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Period covered, e.g. Jul 2026"
          style={{ flex: '1 1 200px', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', fontSize: 13 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.pdf,image/*" style={{ fontSize: 13 }} />
        <button
          type="button"
          disabled={pending}
          onClick={onAttach}
          style={{ padding: '9px 16px', border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', borderRadius: 'var(--radius-control)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          {pending ? 'Attaching…' : 'Attach file'}
        </button>
      </div>
      {error && <div style={{ color: 'var(--status-fail-fg-app)', fontSize: 12 }}>{error}</div>}
    </div>
  );
}
