'use client';

import { useActionState, useState, useTransition } from 'react';
import { createAuditor, type CreateAuditorState } from '@/lib/actions/auditors';
import {
  forceSignOutAuditor,
  removeAuditor,
  resetAuditorPassword,
  setAuditorStatus,
  toggleAuditorOutlet,
} from '@/lib/actions/auditors';
import type { AuditorRow } from '@/lib/queries/auditors';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';

const initialCreateState: CreateAuditorState = {};

// Ported from Super Admin Flow.dc.html's genPwd — an easy-to-read temporary password the
// admin can hand off verbally, editable/regeneratable before the account is even created.
const PASSWORD_WORDS = ['Chiller', 'Pantry', 'Griddle', 'Cellar', 'Larder', 'Skillet'];
function outletLabel(o: { name: string; city: string | null }): string {
  return o.city ? `${o.name} — ${o.city}` : o.name;
}

function generateTempPassword(): string {
  const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function AuditorsClient({
  auditors,
  outlets,
}: {
  auditors: AuditorRow[];
  outlets: { id: string; name: string; city: string | null }[];
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash((f) => (f === msg ? null : f)), 3400);
  };

  const closeNewAuditor = (message?: string) => {
    setNewOpen(false);
    setCreateFormKey((k) => k + 1); // remounts NewAuditorForm, resetting its useActionState
    if (message) showFlash(message);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-9)',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-ui-title)', fontSize: 'var(--text-screen-title)', fontWeight: 600 }}>
            Auditors
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
            Add or remove auditors, issue passwords, control outlet access
          </div>
        </div>
        <Button onClick={() => (newOpen ? closeNewAuditor() : setNewOpen(true))}>+ Add Auditor</Button>
      </div>

      {flash && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            border: '1px solid var(--navy-border)',
            background: 'var(--navy-050)',
            borderRadius: 'var(--radius-card)',
            padding: '11px 14px',
            marginBottom: 'var(--space-9)',
            fontSize: 12.5,
            color: 'var(--navy-700)',
            fontWeight: 600,
          }}
        >
          {flash}
        </div>
      )}

      {newOpen && (
        <NewAuditorForm
          key={createFormKey}
          outlets={outlets}
          onCancel={() => closeNewAuditor()}
          onDone={(name) => closeNewAuditor(`${name} added — share the temporary password now`)}
        />
      )}

      {auditors.map((u) => {
        const expanded = expandedId === u.id;
        const initials = u.name
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        const active = u.status === 'active';

        return (
          <div key={u.id} style={{ borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 2px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: active ? 'var(--navy-025)' : 'var(--surface-alt-1)',
                  color: active ? 'var(--navy-700)' : 'var(--muted-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12.5,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{u.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: active ? 'var(--navy-050)' : '#f7f0f0',
                      color: active ? 'var(--navy-700)' : 'var(--status-fail-fg-app)',
                      border: `1px solid ${active ? 'var(--navy-border)' : '#e6c9c9'}`,
                    }}
                  >
                    {active ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                  {u.email} · {u.phone || '—'} · {u.outletNames.join(', ') || 'no outlets'}
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setExpandedId(expanded ? null : u.id)}
                style={{ padding: '9px 14px', fontSize: 12 }}
              >
                {expanded ? 'Close' : 'Manage'}
              </Button>
            </div>

            {expanded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18, padding: '4px 2px 22px 2px' }}>
                <div style={{ border: '1px solid var(--divider)', borderRadius: 'var(--radius-card)', padding: 16, background: 'var(--surface-alt-2)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Password
                  </div>
                  {resetPasswords[u.id] ? (
                    <OneTimePassword
                      title="New password"
                      password={resetPasswords[u.id]}
                      note="Share this with them now — it cannot be shown again."
                    />
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        startTransition(async () => {
                          const password = await resetAuditorPassword(u.id);
                          setResetPasswords((s) => ({ ...s, [u.id]: password }));
                        })
                      }
                    >
                      Reset password
                    </Button>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Outlet access
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {outlets.map((o) => {
                        const on = u.outletIds.includes(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                await toggleAuditorOutlet(u.id, o.id, !on);
                              })
                            }
                            style={{
                              fontSize: 12,
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-pill)',
                              border: `1px solid ${on ? 'var(--navy-700)' : 'var(--border)'}`,
                              background: on ? 'var(--navy-700)' : 'var(--surface)',
                              color: on ? 'var(--surface)' : 'var(--ink-3)',
                              cursor: 'pointer',
                            }}
                          >
                            {outletLabel(o)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ border: '1px solid var(--divider)', borderRadius: 'var(--radius-card)', padding: 16, background: 'var(--surface-alt-2)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Access
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          startTransition(async () => {
                            await setAuditorStatus(u.id, active ? 'suspended' : 'active');
                            showFlash(`${u.name} ${active ? 'suspended' : 'reactivated'}`);
                          })
                        }
                      >
                        {active ? 'Suspend' : 'Reactivate'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          startTransition(async () => {
                            await forceSignOutAuditor(u.id);
                            showFlash(`${u.name} signed out everywhere`);
                          })
                        }
                      >
                        Force sign-out
                      </Button>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--divider)', borderRadius: 'var(--radius-card)', padding: 16, background: 'var(--surface-alt-2)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Remove from platform
                    </div>
                    {confirmRemoveId !== u.id ? (
                      <div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 14 }}>
                          Login is revoked immediately. Submitted audits and published reports stay on
                          record.
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(u.id)}
                          style={{
                            padding: '10px 14px',
                            border: '1px solid #e6c9c9',
                            background: 'var(--surface)',
                            color: 'var(--status-fail-fg-app)',
                            borderRadius: 'var(--radius-control)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Remove {u.name.split(' ')[0]}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, fontWeight: 600 }}>
                          Remove {u.name}?
                        </div>
                        <div style={{ fontSize: 12, color: '#8a6a6a', lineHeight: 1.55, margin: '5px 0 14px 0' }}>
                          Their login is revoked immediately and cannot be undone from here.
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                await removeAuditor(u.id);
                                setConfirmRemoveId(null);
                                showFlash(`${u.name} removed — submitted audits stay on record`);
                              })
                            }
                            style={{
                              padding: '10px 14px',
                              border: '1px solid var(--status-fail-fg-app)',
                              background: 'var(--status-fail-fg-app)',
                              color: 'var(--surface)',
                              borderRadius: 'var(--radius-control)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Yes, remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: 'var(--muted)',
                              fontSize: 12,
                              textDecoration: 'underline',
                              padding: 0,
                              cursor: 'pointer',
                            }}
                          >
                            Keep account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// A3: name/email/phone/outlets and a temp password create the account. The password
// field is editable/regeneratable pre-submit (the design's genPwd/genNaAudPwd) — distinct
// from the reveal-anytime toggle on an already-hashed password, which this build does not
// implement (EXECUTION.md's deliberate divergence). After success, the one-time password
// stays visible until the admin explicitly confirms they've saved it ("Done").
function NewAuditorForm({
  outlets,
  onCancel,
  onDone,
}: {
  outlets: { id: string; name: string; city: string | null }[];
  onCancel: () => void;
  onDone: (name: string) => void;
}) {
  const [password, setPassword] = useState(generateTempPassword);
  const [state, formAction, pending] = useActionState(createAuditor, initialCreateState);

  if (state.created) {
    return (
      <div
        style={{
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-9)',
          marginBottom: 'var(--space-11)',
          background: 'var(--surface-alt-2)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-7)' }}>
          {state.created.name} added
        </div>
        <OneTimePassword
          title={`Password for ${state.created.name}`}
          password={state.created.password}
          note={`Share this with ${state.created.email} now — it cannot be shown again.`}
        />
        <Button onClick={() => onDone(state.created!.name)}>Done</Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      style={{
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-9)',
        marginBottom: 'var(--space-11)',
        background: 'var(--surface-alt-2)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-7)' }}>New auditor account</div>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', marginBottom: 'var(--space-7)' }}>
        <TextInput label="Full name" name="name" required style={{ flex: 1, minWidth: 190 }} />
        <TextInput label="Work email" name="email" type="email" required style={{ flex: 1.2, minWidth: 210 }} />
        <TextInput label="Mobile" name="phone" style={{ flex: 0.8, minWidth: 150 }} />
      </div>
      <div style={{ marginBottom: 'var(--space-7)', maxWidth: 340 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Temporary password</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Generate or type one"
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              fontSize: 14,
              fontFamily: 'var(--font-ui-mono)',
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPassword(generateTempPassword())}
            style={{ padding: '10px 14px', fontSize: 12 }}
          >
            Generate
          </Button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-7)' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', width: '100%' }}>Outlet access</span>
        {outlets.map((o) => (
          <label
            key={o.id}
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <input type="checkbox" name="outletIds" value={o.id} /> {outletLabel(o)}
          </label>
        ))}
      </div>
      {state.error && (
        <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)', fontWeight: 600, marginBottom: 'var(--space-6)' }}>
          {state.error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create auditor'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// A3: password shown ONCE at set/reset — no reveal-anytime (overrides the design file's
// persistent Show/Hide toggle; see CLAUDE.md / EXECUTION.md precedence).
function OneTimePassword({ title, password, note }: { title: string; password: string; note: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--navy-border)',
        background: 'var(--navy-050)',
        borderRadius: 'var(--radius-card)',
        padding: 12,
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 10.5, color: 'var(--navy-700)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontFamily: 'var(--font-ui-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{password}</div>
      <div style={{ fontSize: 11.5, color: 'var(--navy-700)', marginTop: 6 }}>{note}</div>
    </div>
  );
}
