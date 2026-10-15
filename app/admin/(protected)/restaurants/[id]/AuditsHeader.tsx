'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { createAudit, type CreateAuditState } from '@/lib/actions/audits';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';

const initialState: CreateAuditState = {};

function TabBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '4px 8px',
        borderRadius: 'var(--radius-pill)',
        background: active ? 'var(--navy-050)' : 'var(--surface)',
        color: active ? 'var(--navy-700)' : 'var(--status-neutral-fg-1)',
        border: active ? 'none' : '1px solid var(--status-neutral-border)',
      }}
    >
      {children}
    </span>
  );
}

// A2/A5: the tabs and the "+ New Audit" toggle live in the same row (Super Admin
// Flow.dc.html:448-464) — the button stays visible whenever the Audits tab is active,
// it doesn't get replaced by the panel. The panel itself is a separate block below,
// shown only while naOpen is true (:469), with no Cancel — the same button closes it,
// and a successful create also closes it silently (:1602, no confirmation step).
export function AuditsHeader({
  outletId,
  isReports,
  activeCount,
  publishedCount,
  templates,
  auditors,
}: {
  outletId: string;
  isReports: boolean;
  activeCount: number;
  publishedCount: number;
  templates: { id: string; name: string }[];
  auditors: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-12)',
          alignItems: 'center',
          borderBottom: '1px solid var(--divider)',
          marginBottom: 'var(--space-10)',
        }}
      >
        <Link
          href={`/admin/restaurants/${outletId}?tab=audits`}
          style={{
            padding: '0 2px 12px 2px',
            marginBottom: -1,
            fontSize: 14,
            fontWeight: 600,
            borderBottom: `2px solid ${!isReports ? 'var(--navy-700)' : 'transparent'}`,
            color: !isReports ? 'var(--navy-900)' : 'var(--status-neutral-fg-2)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>Audits</span>
          <TabBadge active={!isReports}>{activeCount} Active</TabBadge>
        </Link>
        <Link
          href={`/admin/restaurants/${outletId}?tab=reports`}
          style={{
            padding: '0 2px 12px 2px',
            marginBottom: -1,
            fontSize: 14,
            fontWeight: 600,
            borderBottom: `2px solid ${isReports ? 'var(--navy-700)' : 'transparent'}`,
            color: isReports ? 'var(--navy-900)' : 'var(--status-neutral-fg-2)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>Reports</span>
          <TabBadge active={isReports}>{publishedCount} published</TabBadge>
        </Link>
        <div style={{ flex: 1 }} />
        {!isReports && (
          <div style={{ paddingBottom: 8 }}>
            <Button onClick={() => setOpen((v) => !v)} style={{ padding: '10px 18px' }}>
              + New Audit
            </Button>
          </div>
        )}
      </div>

      {!isReports && open && (
        <AuditForm
          key={formKey}
          outletId={outletId}
          templates={templates}
          auditors={auditors}
          onCreated={() => {
            setOpen(false);
            setFormKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function AuditForm({
  outletId,
  templates,
  auditors,
  onCreated,
}: {
  outletId: string;
  templates: { id: string; name: string }[];
  auditors: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAudit, initialState);

  useEffect(() => {
    if (state.created) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.created]);

  return (
    <form
      action={formAction}
      style={{
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-8)',
        marginBottom: 'var(--space-11)',
        background: 'var(--surface-alt-2)',
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--hint)',
          marginBottom: 'var(--space-7)',
        }}
      >
        Create audit
      </div>
      <input type="hidden" name="outletId" value={outletId} />
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextInput
          label="Audit name"
          name="name"
          placeholder="e.g. July Week 4 — Full Ops"
          style={{ flex: 1.4, minWidth: 220 }}
        />
        <SelectField label="Audit template" name="templateId" flex={1.4} minWidth={220} required>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1.3, minWidth: 240 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Audit date range</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" name="periodStart" style={dateInputStyle} />
            <input type="date" name="periodEnd" required style={dateInputStyle} />
          </div>
        </div>
        <SelectField label="Auditor" name="auditorId" flex={1} minWidth={150} required>
          {auditors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create audit'}
        </Button>
      </div>
      {state.error && (
        <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)', fontWeight: 600, marginTop: 'var(--space-6)' }}>
          {state.error}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 'var(--space-6)' }}>
        The audit appears in the auditor&apos;s portal on create — no link to send, no login setup
        needed.
      </div>
    </form>
  );
}

const dateInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-control)',
  padding: '10px 12px',
  fontSize: 13.5,
  fontFamily: 'var(--font-ui-mono)',
  background: 'var(--surface)',
};

function SelectField({
  label,
  name,
  required,
  flex,
  minWidth = 200,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  flex?: number;
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex, minWidth }}>
      <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
      <select
        name={name}
        required={required}
        defaultValue=""
        style={{
          padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-control)',
          fontSize: 14,
          background: 'var(--surface)',
        }}
      >
        <option value="" disabled>
          Select…
        </option>
        {children}
      </select>
    </div>
  );
}
