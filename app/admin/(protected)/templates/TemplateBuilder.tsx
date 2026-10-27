'use client';

import { useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { saveTemplate } from '@/lib/actions/templates';
import { builderCatCode, checklistPointCode } from '@/lib/templates/builderCode';
import { METRIC_CATS, UNIT_OPTIONS, toMetricInput, type MetricCatKey } from '@/lib/templates/metricCats';
import type { TemplateDetail } from '@/lib/queries/templates';
import { POS_REPORT_LABELS, POS_REPORT_TYPES, type PosReportEntry } from '@/lib/evidence/types';
import { Button } from '@/components/ui/Button';
import { CategoryIcon, CheckIcon, CirclePlusIcon, DepartmentIcon, PlusIcon, TrashIcon } from './icons';

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}

type BuilderMetric = {
  key: string;
  label: string;
  unit: 'currency' | 'count' | 'number' | 'percent';
  catKey: MetricCatKey;
  revGroup: 'kitchen' | 'bar';
  den: string;
};

type BuilderPoint = { id: string; label: string; guidance: string; freeform: boolean };
type BuilderDept = { cid: string; cat: string; code: string; points: BuilderPoint[] };

function catForMetric(m: { section: string; revGroup?: string | null; costGroup?: string | null }): MetricCatKey {
  if (m.section === 'covers') return 'covers';
  if (m.section === 'sales') return 'sales';
  if (m.section === 'discount') return 'discounts';
  if (m.costGroup === 'bar') return 'barCost';
  if (m.costGroup === 'kitchen') return 'kitchenCost';
  return 'ncCost';
}

export function TemplateBuilder({ initial }: { initial: TemplateDetail }) {
  const [name, setName] = useState(initial.name);
  const [metrics, setMetrics] = useState<BuilderMetric[]>(
    initial.metrics
      .filter((m) => m.section !== 'tax')
      .map((m) => ({
        key: m.metricKey,
        label: m.label,
        unit: m.unit ?? 'currency',
        catKey: catForMetric(m),
        revGroup: m.revGroup === 'bar' ? 'bar' : 'kitchen',
        den: m.den ?? '',
      })),
  );
  const [departments, setDepartments] = useState<BuilderDept[]>(
    initial.departments.length > 0
      ? initial.departments.map((d) => ({
          cid: newId('c'),
          cat: d.cat,
          code: d.code,
          points: d.points.map((p) => ({ id: newId('p'), label: p.label, guidance: p.guidance ?? '', freeform: !!p.freeform })),
        }))
      : [{ cid: newId('c'), cat: 'New Category 1', code: 'NC', points: [] }],
  );
  const [posReports, setPosReports] = useState<PosReportEntry[]>(initial.posReports);
  const [posPick, setPosPick] = useState('');
  const [posCustom, setPosCustom] = useState('');
  const [openCids, setOpenCids] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addMetric = (catKey: MetricCatKey) => {
    setMetrics((ms) => [...ms, { key: newId('m'), label: '', unit: 'currency', catKey, revGroup: 'kitchen', den: '' }]);
  };
  const updateMetric = (key: string, patch: Partial<BuilderMetric>) =>
    setMetrics((ms) => ms.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  const removeMetric = (key: string) => setMetrics((ms) => ms.filter((m) => m.key !== key));

  const addDept = () => {
    const n = departments.length + 1;
    const cid = newId('c');
    setDepartments((ds) => [...ds, { cid, cat: `New Category ${n}`, code: builderCatCode(`New Category ${n}`), points: [] }]);
    setOpenCids((cur) => [...(cur ?? departments.map((d) => d.cid)), cid]);
  };
  const removeDept = (cid: string) => setDepartments((ds) => ds.filter((d) => d.cid !== cid));
  const renameDept = (cid: string, cat: string) => setDepartments((ds) => ds.map((d) => (d.cid === cid ? { ...d, cat } : d)));
  const commitDeptCode = (cid: string) =>
    setDepartments((ds) => ds.map((d) => (d.cid === cid ? { ...d, code: builderCatCode(d.cat) } : d)));
  const toggleDept = (cid: string) =>
    setOpenCids((cur) => {
      const base = cur ?? (departments[0] ? [departments[0].cid] : []);
      return base.includes(cid) ? base.filter((c) => c !== cid) : [...base, cid];
    });
  const isOpen = (cid: string, index: number) => (openCids === null ? index === 0 : openCids.includes(cid));

  const addPoint = (cid: string) =>
    setDepartments((ds) =>
      ds.map((d) => (d.cid === cid ? { ...d, points: [...d.points, { id: newId('p'), label: '', guidance: '', freeform: false }] } : d)),
    );
  const updatePoint = (cid: string, pid: string, patch: Partial<BuilderPoint>) =>
    setDepartments((ds) =>
      ds.map((d) => (d.cid === cid ? { ...d, points: d.points.map((p) => (p.id === pid ? { ...p, ...patch } : p)) } : d)),
    );
  const removePoint = (cid: string, pid: string) =>
    setDepartments((ds) => ds.map((d) => (d.cid === cid ? { ...d, points: d.points.filter((p) => p.id !== pid) } : d)));

  const denChoices = [
    { value: 'net', label: 'All net sales' },
    { value: 'bar', label: 'All bar sales' },
    { value: 'kitchen', label: 'All food sales' },
    ...metrics.filter((m) => m.catKey === 'sales' && m.label.trim()).map((m) => ({ value: m.key, label: m.label })),
  ];

  const totalPoints = departments.reduce((n, d) => n + d.points.length, 0);

  const CUSTOM = '__custom';
  const hasPosReport = (r: PosReportEntry) => posReports.some((x) => x.reportType === r.reportType && x.label.toLowerCase() === r.label.toLowerCase());
  const availablePosTypes = POS_REPORT_TYPES.filter((t) => !posReports.some((r) => r.reportType === t));
  const customName = posCustom.trim();
  const canAddPos = posPick === CUSTOM ? customName !== '' : posPick !== '';
  const addPosReport = () => {
    if (!canAddPos) return;
    const entry: PosReportEntry =
      posPick === CUSTOM
        ? { reportType: 'other', label: customName }
        : { reportType: posPick as PosReportEntry['reportType'], label: POS_REPORT_LABELS[posPick as keyof typeof POS_REPORT_LABELS] };
    if (!hasPosReport(entry)) setPosReports((rs) => [...rs, entry]);
    setPosPick('');
    setPosCustom('');
  };
  const removePosReport = (r: PosReportEntry) => setPosReports((rs) => rs.filter((x) => x !== r));

  const onSave = () => {
    setSaveError(null);
    startTransition(async () => {
      try {
        await saveTemplateWithPayload();
      } catch (err) {
        unstable_rethrow(err); // redirect() throws internally on success — let it through
        setSaveError('Could not save the template — try again.');
      }
    });
  };

  const saveTemplateWithPayload = async () => {
    await saveTemplate({
        id: initial.id,
        name,
        metrics: metrics
          .filter((m) => m.label.trim())
          // A den pointing at a deleted/unlabelled sales metric falls back to the category default.
          .map((m) => toMetricInput(m.den && !denChoices.some((c) => c.value === m.den) ? { ...m, den: '' } : m)),
        departments: departments
          .filter((d) => d.cat.trim())
          .map((d) => ({
            cat: d.cat,
            code: d.code || builderCatCode(d.cat),
            points: d.points
              .filter((p) => p.label.trim())
              .map((p) => ({ label: p.label, guidance: p.guidance, freeform: p.freeform, code: '' })),
          })),
        posReports,
    });
  };

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-ui-title)', fontSize: 'var(--text-screen-title)', fontWeight: 600, marginBottom: 4 }}>
        Template Builder
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 'var(--space-10)' }}>
        Metrics the auditor enters, department-wise checklist points, then POS reports
      </div>

      <div style={{ maxWidth: 720 }}>
        <div style={{ border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-large)', background: 'var(--surface)', padding: 'var(--space-8)', marginBottom: 'var(--space-11)' }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
            Template name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily Operations Checklist"
            style={{
              width: '100%',
              marginTop: 8,
              padding: '11px 14px',
              border: '1px solid var(--border-dashed)',
              borderRadius: 'var(--radius-card)',
              fontSize: 15,
              fontWeight: 600,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ padding: '0 0 4px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--navy-700)' }}>
            Part 1 · Metrics
          </div>
          <div style={{ fontSize: 12, color: 'var(--hint)', marginTop: 4 }}>
            {metrics.length} metric{metrics.length === 1 ? '' : 's'} entered by the auditor · totals calculated
          </div>
        </div>

        {METRIC_CATS.map((cat) => {
          const rows = metrics.filter((m) => m.catKey === cat.key);
          return (
            <div key={cat.key}>
              <div style={{ marginTop: 14, border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-large)', overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', borderBottom: '1px solid var(--surface-alt-1)' }}>
                  <CategoryIcon catKey={cat.key} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--navy-900)' }}>
                      {cat.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 3 }}>{cat.hint}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--status-neutral-fg-2)', whiteSpace: 'nowrap' }}>
                    {rows.length} metric{rows.length === 1 ? '' : 's'}
                  </div>
                  <button
                    type="button"
                    onClick={() => addMetric(cat.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--navy-700)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <PlusIcon />
                    Add Metric to {cat.title}
                  </button>
                </div>
                <div style={{ padding: '14px 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rows.map((m) => (
                    <div key={m.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                          value={m.label}
                          onChange={(e) => updateMetric(m.key, { label: e.target.value })}
                          placeholder="Metric name"
                          style={{ flex: 1, minWidth: 0, padding: '9px 12px', border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-card)', fontSize: 13, fontWeight: 500 }}
                        />
                        <select
                          value={m.unit}
                          onChange={(e) => updateMetric(m.key, { unit: e.target.value as BuilderMetric['unit'] })}
                          style={{ width: 170, flexShrink: 0, padding: '9px 10px', border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-card)', fontSize: 12.5, background: 'var(--surface)' }}
                        >
                          {UNIT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeMetric(m.key)}
                          title="Delete metric"
                          style={{ border: 'none', background: 'transparent', padding: 6, display: 'flex', flexShrink: 0, cursor: 'pointer' }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      {cat.hasDen && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2, fontSize: 12, color: 'var(--ink-2)' }}>
                          Costed against
                          <select
                            value={m.den || cat.defaultDen}
                            onChange={(e) => updateMetric(m.key, { den: e.target.value })}
                            style={{ padding: '6px 10px', border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-card)', fontSize: 12, background: 'var(--surface)' }}
                          >
                            {denChoices.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {cat.key === 'sales' && (
                        <div style={{ display: 'flex', gap: 14, paddingLeft: 2 }}>
                          {(['kitchen', 'bar'] as const).map((g) => (
                            <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name={`revGroup_${m.key}`}
                                checked={m.revGroup === g}
                                onChange={() => updateMetric(m.key, { revGroup: g })}
                              />
                              {g === 'kitchen' ? 'Kitchen revenue' : 'Bar revenue'}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {cat.derived.map((d) => (
                    <div
                      key={d.label}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-calculated)', border: '1px dashed var(--border-dashed)', borderRadius: 'var(--radius-card)' }}
                    >
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--navy-900)' }}>{d.label}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'var(--navy-050)', color: 'var(--navy-700)', whiteSpace: 'nowrap' }}>
                        {d.badge}
                      </div>
                      <div style={{ width: 170, flexShrink: 0, padding: '8px 0', fontSize: 11.5, fontStyle: 'italic', color: 'var(--status-neutral-fg-2)', textAlign: 'right' }}>
                        Auto-sum · no input
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {cat.after.map((d) => (
                <div
                  key={d.label}
                  style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--navy-050)', border: '1px solid var(--navy-border-soft-2)', borderRadius: 'var(--radius-card)' }}
                >
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--navy-700)' }}>{d.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'var(--navy-700)', color: 'var(--surface)' }}>
                    {d.badge}
                  </div>
                  <div style={{ width: 170, flexShrink: 0, padding: '8px 0', fontSize: 11.5, fontStyle: 'italic', color: 'var(--navy-500)', textAlign: 'right' }}>
                    Auto-sum · no input
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '30px 0 10px 0' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--navy-700)' }}>
              Part 2 · Department-wise checklist
            </div>
            <div style={{ fontSize: 12, color: 'var(--hint)', marginTop: 4 }}>
              {departments.length} categor{departments.length === 1 ? 'y' : 'ies'} · {totalPoints} checklist point
              {totalPoints === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {departments.map((d, di) => {
          const open = isOpen(d.cid, di);
          return (
            <div key={d.cid} style={{ marginTop: 14, border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-large)', overflow: 'hidden', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--surface-alt-1)', borderBottom: '1px solid var(--border-dashed)' }}>
                <button type="button" onClick={() => toggleDept(d.cid)} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 11, color: 'var(--hint)', width: 12, cursor: 'pointer' }}>
                  {open ? '▾' : '▸'}
                </button>
                <DepartmentIcon />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--font-ui-mono)', flexShrink: 0 }}>{di + 1}</span>
                <input
                  value={d.cat}
                  onChange={(e) => renameDept(d.cid, e.target.value)}
                  onBlur={() => commitDeptCode(d.cid)}
                  placeholder="Department name (e.g. Security)"
                  style={{ flex: 1, minWidth: 0, padding: '4px 7px', border: '1px solid transparent', borderRadius: 6, fontSize: 13.5, fontWeight: 700, background: 'transparent', color: 'var(--navy-900)' }}
                />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--status-neutral-fg-2)', flexShrink: 0, fontFamily: 'var(--font-ui-mono)' }}>{d.code}</span>
                <span style={{ fontSize: 11.5, color: 'var(--hint)', whiteSpace: 'nowrap', flexShrink: 0 }}>{d.points.length} points</span>
                <button type="button" onClick={() => addPoint(d.cid)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--navy-700)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }}>
                  <PlusIcon />
                  Add Checklist Point
                </button>
                <button type="button" onClick={() => removeDept(d.cid)} title="Delete department" style={{ border: 'none', background: 'transparent', padding: 5, display: 'flex', flexShrink: 0, cursor: 'pointer' }}>
                  <TrashIcon />
                </button>
              </div>
              {open && (
                <div>
                  {d.points.map((p, pi) => (
                    <div key={p.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 18px', borderBottom: '1px solid var(--surface-alt-1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--ink-2)', paddingTop: 11, width: 60, flexShrink: 0, fontFamily: 'var(--font-ui-mono)' }}>
                        {checklistPointCode(d.code, pi)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <input
                          value={p.label}
                          onChange={(e) => updatePoint(d.cid, p.id, { label: e.target.value })}
                          placeholder="Question / inspection check"
                          style={{ padding: '10px 13px', border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-card)', fontSize: 13, fontWeight: 600, width: '100%', boxSizing: 'border-box' }}
                        />
                        <input
                          value={p.guidance}
                          onChange={(e) => updatePoint(d.cid, p.id, { guidance: e.target.value })}
                          placeholder="Guidance for the auditor (optional)"
                          style={{ padding: '9px 13px', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-card)', fontSize: 12.5, color: 'var(--ink-2)', width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePoint(d.cid, p.id)}
                        title="Delete checkpoint"
                        style={{ border: 'none', background: 'transparent', padding: '9px 4px', display: 'flex', flexShrink: 0, cursor: 'pointer' }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addDept}
          style={{ marginTop: 16, width: '100%', padding: 16, border: '2px dashed var(--border-dashed)', background: 'transparent', borderRadius: 'var(--radius-large)', fontSize: 13, fontWeight: 600, color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer' }}
        >
          <CirclePlusIcon />
          Add Department
        </button>

        <div style={{ padding: '30px 0 10px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--navy-700)' }}>
            Part 3 · POS Report
          </div>
          <div style={{ fontSize: 12, color: 'var(--hint)', marginTop: 4 }}>
            {posReports.length} report{posReports.length === 1 ? '' : 's'} · the auditor attaches each report and its remark
          </div>
        </div>

        <div style={{ marginTop: 14, border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-large)', overflow: 'hidden', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'var(--surface-alt-1)', borderBottom: posReports.length > 0 ? '1px solid var(--border-dashed)' : 'none' }}>
            <select
              value={posPick}
              onChange={(e) => setPosPick(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '9px 10px', border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-card)', fontSize: 12.5, background: 'var(--surface)' }}
            >
              <option value="">Select a report type…</option>
              {availablePosTypes.map((t) => (
                <option key={t} value={t}>
                  {POS_REPORT_LABELS[t]}
                </option>
              ))}
              <option value={CUSTOM}>Other (custom name)…</option>
            </select>
            {posPick === CUSTOM && (
              <input
                value={posCustom}
                onChange={(e) => setPosCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPosReport();
                  }
                }}
                placeholder="Report name, e.g. Void report"
                maxLength={80}
                autoFocus
                style={{ flex: 1, minWidth: 0, padding: '9px 10px', border: '1px solid var(--border-dashed)', borderRadius: 'var(--radius-card)', fontSize: 12.5, background: 'var(--surface)' }}
              />
            )}
            <button
              type="button"
              onClick={addPosReport}
              disabled={!canAddPos}
              style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--navy-700)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: canAddPos ? 'pointer' : 'default', opacity: canAddPos ? 1 : 0.5 }}
            >
              <PlusIcon />
              Add Report
            </button>
          </div>
          {posReports.map((r) => (
            <div key={`${r.reportType}|${r.label}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--surface-alt-1)' }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--navy-900)' }}>{r.label}</div>
              <button type="button" onClick={() => removePosReport(r)} title="Remove report" style={{ border: 'none', background: 'transparent', padding: 5, display: 'flex', cursor: 'pointer' }}>
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        {saveError && (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--status-fail-fg-app)', fontWeight: 600, textAlign: 'right' }}>
            {saveError}
          </div>
        )}
        <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onSave} disabled={pending} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}>
            {!pending && <CheckIcon />}
            {pending ? 'Saving…' : 'Save Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}
