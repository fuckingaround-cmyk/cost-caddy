import type { MtdViewModel } from './mtdViewModel';
import type { MtdCandidate, MtdGap } from './mtdContiguity';
import { renderHtmlToPdf } from './htmlToPdf';
import { MtdReportBody } from '@/app/admin/(protected)/restaurants/[id]/mtd/[month]/MtdReportBody';

// The MTD analog of renderReportPdf.tsx (ADR-0021) — renders the same MtdReportBody the
// live /mtd/[month] page shows, with the current gap-exclusion banner baked in, through
// the shared Playwright pipeline.
export async function renderMtdReportPdf(
  vm: MtdViewModel,
  restaurantName: string,
  monthLabel: string,
  excluded: MtdCandidate[],
  gap: MtdGap | null,
): Promise<Buffer> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const bodyMarkup = renderToStaticMarkup(
    <MtdReportBody vm={vm} restaurantName={restaurantName} monthLabel={monthLabel} excluded={excluded} gap={gap} />,
  );
  return renderHtmlToPdf(bodyMarkup);
}
