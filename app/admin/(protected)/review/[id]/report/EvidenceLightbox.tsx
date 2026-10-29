'use client';

import { useState } from 'react';
import type { EvidencePhoto } from './ComplianceSection';

// Same thumbnail-link + full-size modal pattern as the Review screen's PhotoLightbox,
// restyled with the report's own --r-* tokens. Thumbnail is a real <a href> (click
// opens the lightbox via preventDefault), not a <button> — so the browser's own
// Print/PDF Preview (window.print(), PrintButton.tsx) and Playwright's static pass
// (EvidenceThumbStatic) both carry it into the PDF as a clickable link annotation,
// without requiring a full Publish to get a clickable evidence photo.
export function EvidenceThumb({ photo }: { photo: EvidencePhoto }) {
  const [open, setOpen] = useState(false);

  const boxStyle = {
    width: 28,
    height: 28,
    padding: 0,
    border: '1px solid var(--r-border)',
    borderRadius: 4,
    overflow: 'hidden',
    background: 'var(--r-surface-alt-2)',
    cursor: photo.url ? 'pointer' : 'default',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  const content = photo.isImage && photo.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.url} alt={photo.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  ) : (
    <span style={{ fontSize: 8, color: 'var(--r-muted)' }}>FILE</span>
  );

  return (
    <>
      {photo.url ? (
        <a
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          title={photo.name}
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          style={boxStyle}
        >
          {content}
        </a>
      ) : (
        <div title={photo.name} style={boxStyle}>
          {content}
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
          }}
        >
          {photo.isImage && photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt={photo.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
          ) : (
            <a
              href={photo.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: '#fff', fontSize: 14, textDecoration: 'underline', fontFamily: 'var(--font-report-mono)' }}
            >
              Open {photo.name}
            </a>
          )}
        </div>
      )}
    </>
  );
}
