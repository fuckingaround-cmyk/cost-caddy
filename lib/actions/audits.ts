'use server';

import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  auditItems,
  auditMetricDefs,
  audits,
  users,
  templateChecklistPoints,
  templateDepartments,
  templateMetrics,
  templatePosReports,
} from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { deleteStoredFiles, removeAuditsInTx } from '@/lib/audits/removeAudits';
import { POS_REPORT_LABELS, isPosReportType } from '@/lib/evidence/types';

export type CreateAuditState = { error?: string; created?: boolean };

function generateToken(): string {
  return randomBytes(6).toString('base64url');
}

// A5: picking a template and an auditor creates the audit; it holds its OWN COPY of the
// template (metricDefs cloned, items materialised) so later template edits never touch
// it — the "template snapshot on assign" invariant, done in one transaction.
export async function createAudit(
  _prev: CreateAuditState,
  formData: FormData,
): Promise<CreateAuditState> {
  const admin = await requireRole('super_admin');
  const outletId = String(formData.get('outletId') ?? '');
  const templateId = String(formData.get('templateId') ?? '');
  const auditorId = String(formData.get('auditorId') ?? '');
  const name = String(formData.get('name') ?? '').trim() || null;
  const periodStart = String(formData.get('periodStart') ?? '') || null;
  const periodEnd = String(formData.get('periodEnd') ?? '') || null;

  if (!outletId || !templateId || !auditorId) {
    return { error: 'Pick a template and an auditor' };
  }
  if (!periodEnd && !periodStart) {
    return { error: 'Set an audit period' };
  }

  await db.transaction(async (tx) => {
    const [audit] = await tx
      .insert(audits)
      .values({
        orgId: admin.orgId,
        token: generateToken(),
        outletId,
        auditorId,
        templateId,
        name,
        periodStart,
        periodEnd: periodEnd ?? periodStart!,
        status: 'assigned',
      })
      .returning({ id: audits.id });

    const metrics = await tx.select().from(templateMetrics).where(eq(templateMetrics.templateId, templateId));
    if (metrics.length > 0) {
      await tx.insert(auditMetricDefs).values(
        metrics.map((m) => ({
          orgId: admin.orgId,
          auditId: audit.id,
          metricKey: m.metricKey,
          label: m.label,
          section: m.section,
          revGroup: m.revGroup,
          kind: m.kind,
          costGroup: m.costGroup,
          den: m.den,
          unit: m.unit,
          sortOrder: m.sortOrder,
        })),
      );
    }

    const departments = await tx
      .select()
      .from(templateDepartments)
      .where(eq(templateDepartments.templateId, templateId));
    const points = await tx
      .select()
      .from(templateChecklistPoints)
      .where(eq(templateChecklistPoints.templateId, templateId));

    let sortOrder = 0;
    for (const dept of departments) {
      const deptPoints = points.filter((p) => p.departmentId === dept.id);
      if (deptPoints.length === 0) continue;
      await tx.insert(auditItems).values(
        deptPoints.map((p) => ({
          orgId: admin.orgId,
          auditId: audit.id,
          code: p.code,
          cat: dept.cat,
          catCode: dept.code,
          label: p.label,
          guidance: p.guidance,
          freeform: p.freeform,
          sortOrder: sortOrder++,
        })),
      );
    }

    // ADR-0015 — the template's POS Report section becomes pos_report items on the audit.
    // 'RPT' prefix can't collide with a department code (a legacy "POS Report" dept is 'PR').
    const posReports = await tx
      .select()
      .from(templatePosReports)
      .where(eq(templatePosReports.templateId, templateId))
      .orderBy(templatePosReports.sortOrder);
    if (posReports.length > 0) {
      await tx.insert(auditItems).values(
        posReports.map((r, i) => ({
          orgId: admin.orgId,
          auditId: audit.id,
          code: `RPT-${String(i + 1).padStart(2, '0')}`,
          cat: 'POS Report',
          catCode: 'RPT',
          label: r.label || (isPosReportType(r.reportType) ? POS_REPORT_LABELS[r.reportType] : 'Report'),
          section: 'pos_report' as const,
          reportType: r.reportType,
          sortOrder: sortOrder++,
        })),
      );
    }
  });

  revalidatePath(`/admin/restaurants/${outletId}`);
  return { created: true };
}

export type AuditActionResult = { error?: string };

async function loadOwnedAudit(orgId: string, auditId: string) {
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.orgId, orgId)))
    .limit(1);
  return audit ?? null;
}

// A6: move an audit to another auditor while it is still theirs to work on. Saved draft
// data lives on the audit, so it moves with it; submitted audits stay immutable.
export async function reassignAudit(auditId: string, auditorId: string): Promise<AuditActionResult> {
  const admin = await requireRole('super_admin');
  const audit = await loadOwnedAudit(admin.orgId, auditId);
  if (!audit) return { error: 'Audit not found' };
  if (audit.status !== 'assigned' && audit.status !== 'in-progress') {
    return { error: 'Only audits the auditor has not submitted can be reassigned' };
  }

  const [auditor] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, auditorId), eq(users.orgId, admin.orgId), eq(users.role, 'auditor'), eq(users.status, 'active')))
    .limit(1);
  if (!auditor) return { error: 'Pick an active auditor' };

  await db.update(audits).set({ auditorId }).where(eq(audits.id, auditId));

  revalidatePath(`/admin/restaurants/${audit.outletId}`);
  return {};
}

// A6 / ADR-0016: any status. FKs are all `no action`, so children go first, in one
// transaction; stored files are removed after commit (a leftover file is harmless, a
// dangling row is not).
export async function deleteAudit(auditId: string): Promise<AuditActionResult> {
  const admin = await requireRole('super_admin');
  const audit = await loadOwnedAudit(admin.orgId, auditId);
  if (!audit) return { error: 'Audit not found' };

  const paths = await db.transaction((tx) => removeAuditsInTx(tx, [auditId]));
  await deleteStoredFiles(paths, 'deleteAudit');

  revalidatePath(`/admin/restaurants/${audit.outletId}`);
  revalidatePath('/admin/restaurants');
  revalidatePath('/admin/review');
  return {};
}
