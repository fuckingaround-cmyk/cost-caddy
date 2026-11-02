'use client';

// Ported from Audit report v4.dc.html's doPrint — actual PDF generation (Playwright,
// version-stamped) is C5's job; this gives the print-first layout something to trigger
// today, and is exactly what a reviewer would use to check print output beforehand.
export function PrintButton() {
  return (
    <button
      type="button"
      data-noprint=""
      onClick={() => window.print()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        border: 'none',
        borderRadius: 4,
        background: 'var(--brand-border)',
        color: 'var(--brand)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Print / PDF Preview
    </button>
  );
}
