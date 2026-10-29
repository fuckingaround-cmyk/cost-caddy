import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import type { ReportViewModel } from './reportViewModel';
import { ReportBody, type PublishBadge } from '@/app/admin/(protected)/review/[id]/report/ReportBody';

const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter+Tight:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
]
  .map((href) => `<link rel="stylesheet" href="${href}">`)
  .join('\n');

let tokensCss: string | null = null;
function loadTokensCss(): string {
  if (tokensCss === null) {
    tokensCss = readFileSync(path.join(process.cwd(), 'styles', 'tokens.css'), 'utf-8');
  }
  return tokensCss;
}

// C5 — the report's own print CSS (globals.css) plus the token layer, standing in for
// Next's usual stylesheet pipeline since this HTML is handed to Playwright directly,
// outside any Next request. Same [data-avoid]/[data-break] rules as the live page.
function buildHtmlDocument(bodyMarkup: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${FONT_LINKS}
<style>
${loadTokensCss()}
* { box-sizing: border-box; }
body { margin: 0; background: #ffffff; font-family: var(--font-report-body), 'Inter Tight', sans-serif; }
body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
[data-noprint] { display: none !important; }
[data-avoid] { page-break-inside: avoid; }
[data-break] { page-break-before: always; }
[data-scroll-x] { overflow: visible !important; }
[data-pos-table] th, [data-pos-table] td { padding: 5px 8px !important; font-size: 10.5px !important; }
tr { page-break-inside: avoid; }
/* Compact print: the screen layout is designed for ~1420px but a landscape Letter page's
   printable width (11in - 0.8in margins) is ~980px, so zoom must shrink by that full ratio
   or the right-most columns clip. Zoom the report down and tighten page 1. */
[data-report-main] {
  zoom: 0.63;
}
[data-report-title] {
  font-size: 30px !important;
}
[data-kpi-card] {
  padding: 10px 12px !important;
}
[data-kpi-value] {
  font-size: 17px !important;
}
[data-matrix] th,
[data-matrix] td {
  padding-top: 7px !important;
  padding-bottom: 7px !important;
}
[data-gap] {
  margin-bottom: 8px !important;
}
</style>
</head>
<body>
<main data-report-main="" style="width:100%;margin:0;padding:0;background:#fff;box-sizing:border-box;">
${bodyMarkup}
</main>
</body>
</html>`;
}

// Vercel's serverless runtime has no headless-Chromium system deps and doesn't bundle
// playwright's downloaded browser, so @sparticuz/chromium (a Lambda-compatible build)
// stands in for it there; locally, npm's devDependency on full `playwright` provides a
// real installed browser via its own executablePath. Never bundle full `playwright` as a
// prod dependency — its browsers.json/binary aren't traced into the function bundle.
async function launchChromium() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const sparticuzChromium = (await import('@sparticuz/chromium')).default;
    return chromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }
  const { chromium: devChromium } = await import('playwright');
  return chromium.launch({ executablePath: devChromium.executablePath() });
}

// Renders the SAME ReportBody component tree the review screen shows (lib/report/
// reportViewModel.ts assembles identical data for both), to a static HTML string, then
// prints it to a PDF buffer via headless Chromium. Letter landscape, 0.4in margin, so the wide
// register tables fit the page width instead of clipping.
export async function renderReportPdf(vm: ReportViewModel, publish?: PublishBadge): Promise<Buffer> {
  // Dynamic, not a static top-level import — Next's bundler refuses to let any
  // Server Component/Server Action module statically import react-dom/server (it owns
  // RSC rendering itself). This runs only inside the publish server action, entirely
  // outside the request-render path, so rendering a static HTML string here for
  // Playwright to print doesn't touch Next's own rendering at all.
  const { renderToStaticMarkup } = await import('react-dom/server');
  const bodyMarkup = renderToStaticMarkup(<ReportBody vm={vm} publish={publish} interactive={false} />);
  const html = buildHtmlDocument(bodyMarkup);

  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({
      format: 'Letter',
      landscape: true,
      margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' },
      printBackground: true,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
