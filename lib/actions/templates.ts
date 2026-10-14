'use server';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { audits, templateChecklistPoints, templateDepartments, templateMetrics, templatePosReports, templates } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { builderCatCode, checklistPointCode } from '@/lib/templates/builderCode';
import { isPosReportType, type PosReportType } from '@/lib/evidence/types';
import type { TemplateDepartmentInput, TemplateMetricInput } from '@/lib/queries/templates';

export type SaveTemplateInput = {
  id: string | null;
  name: string;
  metrics: TemplateMetricInput[];
  departments: TemplateDepartmentInput[];
  posReports: PosReportType[];
};

// A4: "Save Template" replaces the whole metric/department/checklist-point set in one
// transaction — the builder always submits full state, not a diff (mirrors the mock's
// saveTemplate). Reference codes are recomputed here, not trusted from the client.
export async function saveTemplate(input: SaveTemplateInput): Promise<void> {
  const admin = await requireRole('super_admin');
  const name = input.name.trim() || 'Untitled Checklist';
  const cleanMetrics = input.metrics.filter((m) => m.label.trim());
  const cleanDepartments = input.departments
    .map((d) => ({ ...d, code: d.code || builderCatCode(d.cat) }))
    .filter((d) => d.cat.trim());
  // Re-validated server-side: only the four known report types, each at most once.
  const cleanPosReports = [...new Set(input.posReports.filter((r) => isPosReportType(r)))];

  await db.transaction(async (tx) => {
    let tid = input.id;
    if (tid) {
      await tx.update(templates).set({ name }).where(eq(templates.id, tid));
      await tx.delete(templatePosReports).where(eq(templatePosReports.templateId, tid));
      await tx.delete(templateMetrics).where(eq(templateMetrics.templateId, tid));
      await tx.delete(templateChecklistPoints).where(eq(templateChecklistPoints.templateId, tid));
      await tx.delete(templateDepartments).where(eq(templateDepartments.templateId, tid));
    } else {
      const [created] = await tx.insert(templates).values({ orgId: admin.orgId, name }).returning({ id: templates.id });
      tid = created.id;
    }

    if (cleanMetrics.length > 0) {
      await tx.insert(templateMetrics).values(
        cleanMetrics.map((m, i) => ({
          orgId: admin.orgId,
          templateId: tid!,
          metricKey: m.metricKey,
          label: m.label,
          section: m.section,
          revGroup: m.revGroup ?? null,
          kind: m.kind ?? null,
          costGroup: m.costGroup ?? null,
          den: m.den ?? null,
          unit: m.unit ?? null,
          sortOrder: i,
        })),
      );
    }

    for (let di = 0; di < cleanDepartments.length; di++) {
      const dept = cleanDepartments[di];
      const [createdDept] = await tx
        .insert(templateDepartments)
        .values({ orgId: admin.orgId, templateId: tid!, cat: dept.cat, code: dept.code, sortOrder: di })
        .returning({ id: templateDepartments.id });

      const points = dept.points.filter((p) => p.label.trim());
      if (points.length > 0) {
        await tx.insert(templateChecklistPoints).values(
          points.map((p, pi) => ({
            orgId: admin.orgId,
            templateId: tid!,
            departmentId: createdDept.id,
            label: p.label,
            guidance: p.guidance || null,
            freeform: !!p.freeform,
            code: checklistPointCode(dept.code, pi),
            sortOrder: pi,
          })),
        );
      }
    }

    if (cleanPosReports.length > 0) {
      await tx.insert(templatePosReports).values(
        cleanPosReports.map((reportType, i) => ({ orgId: admin.orgId, templateId: tid!, reportType, sortOrder: i })),
      );
    }

    return tid!;
  });

  revalidatePath('/admin/templates');
  redirect('/admin/templates');
}

function omit<T extends object, K extends keyof T>(row: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...row };
  for (const k of keys) delete copy[k];
  return copy;
}

async function loadOwnedTemplate(orgId: string, templateId: string) {
  const [t] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.orgId, orgId), isNull(templates.archivedAt)))
    .limit(1);
  if (!t) throw new Error('Template not found');
  return t;
}

// A6: a copy is a fully independent template ("<name> (copy)") — same metrics, departments,
// points, POS reports and reference codes (codes are only unique per template, so they carry over).
export async function duplicateTemplate(templateId: string): Promise<void> {
  const admin = await requireRole('super_admin');
  const source = await loadOwnedTemplate(admin.orgId, templateId);

  await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(templates)
      .values({ orgId: admin.orgId, name: `${source.name} (copy)` })
      .returning({ id: templates.id });

    const metrics = await tx.select().from(templateMetrics).where(eq(templateMetrics.templateId, templateId));
    if (metrics.length > 0) {
      await tx
        .insert(templateMetrics)
        .values(metrics.map((m) => ({ ...omit(m, 'id'), templateId: copy.id })));
    }

    const departments = await tx.select().from(templateDepartments).where(eq(templateDepartments.templateId, templateId));
    const points = await tx.select().from(templateChecklistPoints).where(eq(templateChecklistPoints.templateId, templateId));
    for (const dept of departments) {
      const [newDept] = await tx
        .insert(templateDepartments)
        .values({ ...omit(dept, 'id'), templateId: copy.id })
        .returning({ id: templateDepartments.id });
      const deptPoints = points.filter((p) => p.departmentId === dept.id);
      if (deptPoints.length > 0) {
        await tx.insert(templateChecklistPoints).values(
          deptPoints.map((p) => ({
            ...omit(p, 'id'),
            templateId: copy.id,
            departmentId: newDept.id,
          })),
        );
      }
    }

    const posReports = await tx.select().from(templatePosReports).where(eq(templatePosReports.templateId, templateId));
    if (posReports.length > 0) {
      await tx
        .insert(templatePosReports)
        .values(posReports.map((r) => ({ ...omit(r, 'id'), templateId: copy.id })));
    }
  });

  revalidatePath('/admin/templates');
}

// A6 / ADR-0016: never-used templates are hard-deleted; one that any audit was created
// from is archived instead (audits.template_id is NOT NULL and the audit's own snapshot
// is unaffected either way).
export async function deleteTemplate(templateId: string): Promise<void> {
  const admin = await requireRole('super_admin');
  await loadOwnedTemplate(admin.orgId, templateId);

  await db.transaction(async (tx) => {
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)` })
      .from(audits)
      .where(eq(audits.templateId, templateId));

    if (Number(n) > 0) {
      await tx.update(templates).set({ archivedAt: new Date() }).where(eq(templates.id, templateId));
      return;
    }
    await tx.delete(templateChecklistPoints).where(eq(templateChecklistPoints.templateId, templateId));
    await tx.delete(templatePosReports).where(eq(templatePosReports.templateId, templateId));
    await tx.delete(templateDepartments).where(eq(templateDepartments.templateId, templateId));
    await tx.delete(templateMetrics).where(eq(templateMetrics.templateId, templateId));
    await tx.delete(templates).where(eq(templates.id, templateId));
  });

  revalidatePath('/admin/templates');
}
