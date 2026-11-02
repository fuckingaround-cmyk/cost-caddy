import type { ReportViewModel } from './reportViewModel';
import { renderHtmlToPdf } from './htmlToPdf';
import { ReportBody, type PublishBadge } from '@/app/admin/(protected)/review/[id]/report/ReportBody';

// Renders the SAME ReportBody component tree the review screen shows (lib/report/
// reportViewModel.ts assembles identical data for both), to a static HTML string, then
// prints it to a PDF buffer via headless Chromium (lib/report/htmlToPdf.ts).
export async function renderReportPdf(vm: ReportViewModel, publish?: PublishBadge): Promise<Buffer> {
  // Dynamic, not a static top-level import — Next's bundler refuses to let any
  // Server Component/Server Action module statically import react-dom/server (it owns
  // RSC rendering itself). This runs only inside the publish server action, entirely
  // outside the request-render path, so rendering a static HTML string here for
  // Playwright to print doesn't touch Next's own rendering at all.
  const { renderToStaticMarkup } = await import('react-dom/server');
  const bodyMarkup = renderToStaticMarkup(<ReportBody vm={vm} publish={publish} interactive={false} />);
  return renderHtmlToPdf(bodyMarkup);
}
