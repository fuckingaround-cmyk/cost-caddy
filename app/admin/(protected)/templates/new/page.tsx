import { requireRole } from '@/lib/auth';
import type { TemplateDetail } from '@/lib/queries/templates';
import { TemplateBuilder } from '../TemplateBuilder';

const BLANK: TemplateDetail = { id: null, name: '', metrics: [], departments: [], posReports: [] };

export default async function NewTemplatePage() {
  await requireRole('super_admin');
  return <TemplateBuilder initial={BLANK} />;
}
