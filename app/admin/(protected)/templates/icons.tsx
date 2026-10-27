// Inline stroked SVGs copied verbatim from Super Admin Flow.dc.html's builder markup
// (lines 739-841) — never invent icon paths (CLAUDE.md "Design source files").
import type { MetricCatKey } from '@/lib/templates/metricCats';

const CAT_ICON_PATHS: Record<MetricCatKey, React.ReactNode> = {
  covers: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M16 6.5a3 3 0 010 6M18 19c0-2.4-1-4-2.5-4.7" />
    </>
  ),
  sales: (
    <>
      <rect x="2.5" y="7" width="19" height="11" rx="2" />
      <circle cx="12" cy="12.5" r="2.4" />
      <path d="M6 12.5h.01M18 12.5h.01" />
    </>
  ),
  discounts: (
    <>
      <path d="M20.5 12.5l-8 8-9-9V3.5h8z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  barCost: (
    <>
      <path d="M4 4h16l-8 8z" />
      <path d="M12 12v7M8.5 19h7" />
    </>
  ),
  kitchenCost: (
    <>
      <path d="M6 3v7a2.5 2.5 0 005 0V3M8.5 12v9" />
      <path d="M16 3c2 1.5 2.5 3.5 2.5 6s-1 3-2.5 3-2.5-.5-2.5-3S14 4.5 16 3z" />
      <path d="M16 12v9" />
    </>
  ),
  ncCost: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3" />
    </>
  ),
};

export function CategoryIcon({ catKey }: { catKey: MetricCatKey }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.7" style={{ flexShrink: 0 }}>
      {CAT_ICON_PATHS[catKey]}
    </svg>
  );
}

export function DepartmentIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.7" style={{ flexShrink: 0 }}>
      <path d="M3 7a1 1 0 011-1h5l2 2h8a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6b7480" strokeWidth="1.7">
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CirclePlusIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}
