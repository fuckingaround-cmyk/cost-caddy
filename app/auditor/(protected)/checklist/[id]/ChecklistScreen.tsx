'use client';

import { useMemo, useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { metricSections, parseMetricValue, type MetricDef, type MetricValues } from '@/lib/calc';
import { CalculatedField } from '@/components/ui/CalculatedField';
import type { AuditItemFileRow, AuditItemRow } from '@/lib/queries/audits';
import { saveAuditDraft, submitAudit, type ChecklistItemDraft } from '@/lib/actions/checklist';
import { isItemAnswered } from '@/lib/checklist/isItemAnswered';
import { ChecklistStep, type ChecklistItemState } from './ChecklistStep';

type JumpTarget = { kind: 'metric' | 'item'; id: string };

// Auditor tab is local component state (auditorTab in the design's logic class), never
// a URL param — matches the tabs/stacked-steps split between mobile and laptop (UX-001).
type Step = 'metrics' | 'checklist';

function sanitizeNumeric(raw: string): string {
  // Letters are refused without a dialog (B2 done-when): strip anything but digits and
  // a single decimal point, rather than validating and rejecting after the fact.
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

export function ChecklistScreen({
  auditId,
  outletName,
  defs,
  initialValues,
  initialItems,
  initialFiles,
}: {
  auditId: string;
  outletName: string;
  defs: MetricDef[];
  initialValues: MetricValues;
  initialItems: AuditItemRow[];
  initialFiles: AuditItemFileRow[];
}) {
  const [step, setStep] = useState<Step>('metrics');
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const d of defs) {
      const v = initialValues[d.id];
      init[d.id] = v === null || v === undefined ? '' : String(v);
    }
    return init;
  });

  const [items, setItems] = useState<ChecklistItemState[]>(() =>
    initialItems.map((it) => ({
      ...it,
      photos: initialFiles
        .filter((f) => f.auditItemId === it.id)
        .map((f) => ({ id: f.id, name: f.name, meta: f.meta ?? '', kind: f.kind, evidenceType: f.evidenceType })),
    })),
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => {
    const first = initialItems[0]?.cat;
    return new Set(first ? [first] : []);
  });

  const sections = useMemo(() => metricSections(defs, values), [defs, values]);
  const enteredCount = defs.filter((d) => (values[d.id] ?? '').trim() !== '').length;

  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const onSave = () => {
    setSaveError(null);
    const itemDrafts: ChecklistItemDraft[] = items.map((it) => ({ id: it.id, status: it.status, remark: it.remark, naReason: it.naReason }));
    startTransition(async () => {
      try {
        await saveAuditDraft(auditId, values, itemDrafts);
        setSavedAt(new Date());
      } catch {
        setSaveError('Could not save — try again.');
      }
    });
  };

  // B5 — submitDisabled ported from Super Admin Flow.dc.html (~line 2127): checks
  // metrics AND checklist, unlike the auditor file's checklist-only version.
  const checklistDone = items.filter(isItemAnswered).length;
  const checklistTotal = items.length;
  const metricsFilled = defs.filter((d) => parseMetricValue(values[d.id]) !== null).length;
  const metricsTotal = defs.length;
  const complete = checklistTotal > 0 && checklistDone === checklistTotal && metricsFilled === metricsTotal;
  const submitLabel = complete
    ? 'Submit for Review'
    : checklistDone !== checklistTotal
      ? `Complete ${checklistTotal - checklistDone} more checklist item${checklistTotal - checklistDone === 1 ? '' : 's'}`
      : `Enter the remaining ${metricsTotal - metricsFilled} MTD figure${metricsTotal - metricsFilled === 1 ? '' : 's'}`;

  // Not React state — this only ever drives a one-shot scroll+focus right after the
  // click that requested it, never something a render needs to read.
  const jumpToTarget = (target: JumpTarget) => {
    requestAnimationFrame(() => {
      const domId = target.kind === 'metric' ? `metric-input-${target.id}` : `checklist-item-${target.id}`;
      const el = document.getElementById(domId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target.kind === 'metric') (el as HTMLInputElement | null)?.focus();
    });
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, startSubmitTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmitTap = () => {
    if (!complete) {
      // A-10: tapping the (still-clickable) button jumps to the first point needing
      // attention rather than doing nothing — checklist gaps take priority, matching
      // submitLabel's own precedence.
      const firstPendingItem = items.find((it) => !isItemAnswered(it));
      if (firstPendingItem) {
        setExpandedCats((prev) => new Set(prev).add(firstPendingItem.cat));
        setActiveItemId(firstPendingItem.id);
        setStep('checklist');
        jumpToTarget({ kind: 'item', id: firstPendingItem.id });
        return;
      }
      const firstEmptyDef = defs.find((d) => parseMetricValue(values[d.id]) === null);
      if (firstEmptyDef) {
        setStep('metrics');
        jumpToTarget({ kind: 'metric', id: firstEmptyDef.id });
      }
      return;
    }
    setShowConfirm(true);
  };

  const onConfirmSubmit = () => {
    setSubmitError(null);
    const itemDrafts: ChecklistItemDraft[] = items.map((it) => ({ id: it.id, status: it.status, remark: it.remark, naReason: it.naReason }));
    startSubmitTransition(async () => {
      try {
        await saveAuditDraft(auditId, values, itemDrafts); // persist the latest edits first
        await submitAudit(auditId); // throws its own redirect() on success
      } catch (err) {
        unstable_rethrow(err);
        setSubmitError('Could not submit — try again.');
      }
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '14px 24px 0 24px' }}>
        <TabButton active={step === 'metrics'} onClick={() => setStep('metrics')}>
          1 · MTD Metrics
        </TabButton>
        <TabButton active={step === 'checklist'} onClick={() => setStep('checklist')}>
          2 · Departmental Checklist
        </TabButton>
      </div>

      <div hidden={step !== 'metrics'}>
        <div style={{ padding: '16px 24px 32px 24px' }}>
          <div style={{ borderBottom: '1px solid var(--divider)', paddingBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Sales &amp; Cost Metrics</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              {enteredCount} of {defs.length} figures entered · calculated rows fill in automatically
            </div>
          </div>

          {sections.map((sec) => (
            <div key={sec.key} style={{ marginTop: 20 }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '4px 10px',
                  padding: '8px 12px',
                  background: 'var(--navy-chip)',
                  border: '1px solid var(--navy-border-soft-1)',
                  borderRadius: 'var(--radius-control)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--navy-700)' }}>
                  {sec.title}
                </div>
                {sec.note && <div style={{ fontSize: 11, color: 'var(--hint-2)' }}>{sec.note}</div>}
              </div>

              {sec.rows.map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderBottom: '1px solid var(--divider)',
                    background: row.kind === 'derived' ? 'var(--surface-alt-1)' : 'var(--surface)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: row.kind === 'derived' ? 700 : 500 }}>{row.label}</div>
                    {row.kind === 'input' && row.unit && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'var(--muted-2)',
                          marginTop: 2,
                        }}
                      >
                        {row.unit}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    {row.kind === 'input' ? (
                      <input
                        id={`metric-input-${row.metricKey}`}
                        value={values[row.metricKey] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [row.metricKey]: sanitizeNumeric(e.target.value) }))}
                        inputMode="decimal"
                        placeholder="0"
                        style={{
                          width: 100,
                          padding: '8px 10px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-control)',
                          fontSize: 13,
                          textAlign: 'right',
                        }}
                      />
                    ) : (
                      <div style={{ width: 100 }}>
                        <CalculatedField>{row.display}</CalculatedField>
                      </div>
                    )}
                    {row.sub !== '—' && (
                      <div style={{ fontSize: 11, color: 'var(--hint)', whiteSpace: 'nowrap' }}>
                        {`${row.sub} ${row.subLabel}`.trim()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div hidden={step !== 'checklist'}>
        <ChecklistStep
          items={items}
          setItems={setItems}
          activeItemId={activeItemId}
          setActiveItemId={setActiveItemId}
          expandedCats={expandedCats}
          setExpandedCats={setExpandedCats}
        />
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--surface)',
          borderTop: '1px solid var(--divider)',
          padding: '14px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            style={{
              padding: '12px 20px',
              border: '1px solid var(--navy-700)',
              borderRadius: 'var(--radius-control)',
              background: 'var(--surface)',
              color: 'var(--navy-700)',
              fontSize: 13,
              fontWeight: 600,
              cursor: pending ? 'default' : 'pointer',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          {saveError && <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)' }}>{saveError}</div>}
          {!saveError && savedAt && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Saved {savedAt.toLocaleTimeString()}</div>
          )}
        </div>

        <button
          type="button"
          onClick={onSubmitTap}
          style={{
            width: '100%',
            padding: 14,
            border: 'none',
            borderRadius: 'var(--radius-control)',
            fontSize: 14,
            fontWeight: 600,
            background: complete ? 'var(--navy-700)' : 'var(--surface-alt-1)',
            color: complete ? 'var(--surface)' : 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          {submitLabel}
        </button>
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 17, 17, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-panel)',
              padding: 24,
              maxWidth: 360,
              width: '100%',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Submit {outletName}?</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
              {checklistTotal} checklist item{checklistTotal === 1 ? '' : 's'} and {metricsTotal} MTD figure
              {metricsTotal === 1 ? '' : 's'} recorded. This can&apos;t be undone — the audit becomes read-only.
            </div>
            {submitError && (
              <div style={{ fontSize: 12, color: 'var(--status-fail-fg-app)', marginBottom: 14 }}>{submitError}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                style={{
                  padding: '10px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  background: 'var(--surface)',
                  color: 'var(--ink-3)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 16px',
                  border: '1px solid var(--navy-700)',
                  borderRadius: 'var(--radius-control)',
                  background: 'var(--navy-700)',
                  color: 'var(--surface)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: 10,
        borderRadius: 'var(--radius-control)',
        fontSize: 13,
        fontWeight: 600,
        background: active ? 'var(--navy-700)' : 'var(--surface)',
        color: active ? 'var(--surface)' : 'var(--ink-3)',
        border: active ? '1px solid var(--navy-700)' : '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
