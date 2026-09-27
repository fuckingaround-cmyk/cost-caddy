'use server';

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { db } from '@/db';
import { auditItemFiles, auditItems, auditMetricDefs, auditMetricValues, audits } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { auditItemFilePath, deleteFile, uploadFile } from '@/lib/storage';
import { parseMetricValue } from '@/lib/calc';
import { isItemAnswered } from '@/lib/checklist/isItemAnswered';
import { scoreAuditRemarks } from '@/lib/ai/scoreAuditRemarks';
import { extractEvidenceTable, sweepEvidenceExtraction } from '@/lib/ai/extractEvidenceTable';
import type { EvidencePhotoType } from '@/lib/evidence/types';

async function requireOwnedAudit(auditId: string) {
  const user = await requireRole('auditor');
  const [audit] = await db
    .select({ id: audits.id, orgId: audits.orgId, status: audits.status })
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.orgId, user.orgId), eq(audits.auditorId, user.id)))
    .limit(1);
  if (!audit) throw new Error('Not found');
  return { user, audit };
}

// Submit is one-way (invariant) — once `submitted`/`published`, nothing the auditor
// does reaches the DB, regardless of what the client sends.
function assertEditable(status: (typeof audits.status.enumValues)[number]) {
  if (status === 'submitted' || status === 'published') {
    throw new Error('This audit has already been submitted and can no longer be edited.');
  }
}

export type ChecklistItemDraft = {
  id: string;
  status: (typeof auditItems.status.enumValues)[number];
  remark: string;
  naReason: string | null;
};

// B4 — the explicit Save (ADR-0002: no autosave, no offline). Writes only small
// structured data — photos already uploaded on capture via uploadItemPhoto below.
// The first save while still `assigned` flips the audit to `in-progress` (R4).
export async function saveAuditDraft(
  auditId: string,
  metricValues: Record<string, string>,
  items: ChecklistItemDraft[],
): Promise<void> {
  const { audit } = await requireOwnedAudit(auditId);
  assertEditable(audit.status);

  await db.transaction(async (tx) => {
    for (const [metricKey, value] of Object.entries(metricValues)) {
      await tx
        .insert(auditMetricValues)
        .values({ orgId: audit.orgId, auditId, metricKey, value: value === '' ? null : value })
        .onConflictDoUpdate({
          target: [auditMetricValues.auditId, auditMetricValues.metricKey],
          set: { value: value === '' ? null : value },
        });
    }

    for (const item of items) {
      await tx
        .update(auditItems)
        .set({ status: item.status, remark: item.remark, naReason: item.naReason })
        .where(and(eq(auditItems.id, item.id), eq(auditItems.auditId, auditId)));
    }

    if (audit.status === 'assigned') {
      await tx.update(audits).set({ status: 'in-progress' }).where(eq(audits.id, auditId));
    }
  });
}

export type UploadedPhoto = { id: string; name: string; meta: string; kind: 'image' | 'file' };

// Photos upload one at a time on capture (ADR-0002), already compressed and
// EXIF-normalised client-side (see compressImage in ChecklistStep.tsx) — this only
// persists the already-prepared bytes.
export async function uploadItemPhoto(auditItemId: string, formData: FormData): Promise<UploadedPhoto> {
  const user = await requireRole('auditor');
  const [item] = await db
    .select({ id: auditItems.id, auditId: auditItems.auditId, auditStatus: audits.status })
    .from(auditItems)
    .innerJoin(audits, eq(audits.id, auditItems.auditId))
    .where(and(eq(auditItems.id, auditItemId), eq(audits.orgId, user.orgId), eq(audits.auditorId, user.id)))
    .limit(1);
  if (!item) throw new Error('Not found');
  assertEditable(item.auditStatus);

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('No file provided');

  const kind: 'image' | 'file' = file.type.startsWith('image/') ? 'image' : 'file';
  const fileId = randomUUID();
  const path = auditItemFilePath(user.orgId, auditItemId, fileId, file.name);
  const bytes = await file.arrayBuffer();
  await uploadFile(path, bytes, file.type || 'application/octet-stream');

  const meta = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  const [row] = await db
    .insert(auditItemFiles)
    .values({ orgId: user.orgId, auditItemId, kind, name: file.name, storagePath: path, meta })
    .returning({ id: auditItemFiles.id });

  return { id: row.id, name: file.name, meta, kind };
}

// B7/ADR-0012 — the auditor picks (or changes) the evidence-type recipe for a photo
// after it's attached; a checkpoint can only suggest a default (see
// lib/ai/evidenceRecipes.ts's suggestedEvidenceType), never decide it, since the same
// checkpoint code can imply more than one register type. Setting it queues a Gemini
// extraction, fire-and-forget, same as B4's photo upload never blocking on anything.
export async function setEvidencePhotoType(fileId: string, evidenceType: EvidencePhotoType | null): Promise<void> {
  const user = await requireRole('auditor');
  const [file] = await db
    .select({ id: auditItemFiles.id, auditStatus: audits.status })
    .from(auditItemFiles)
    .innerJoin(auditItems, eq(auditItems.id, auditItemFiles.auditItemId))
    .innerJoin(audits, eq(audits.id, auditItems.auditId))
    .where(and(eq(auditItemFiles.id, fileId), eq(audits.orgId, user.orgId), eq(audits.auditorId, user.id)))
    .limit(1);
  if (!file) throw new Error('Not found');
  assertEditable(file.auditStatus);

  await db
    .update(auditItemFiles)
    .set({ evidenceType, extractionStatus: null, extractedTable: null, extractionModel: null, extractedAt: null })
    .where(eq(auditItemFiles.id, fileId));

  if (evidenceType) {
    after(() => extractEvidenceTable(fileId));
  }
}

// B5 — the submit gate. Recomputes completeness from the DB rather than trusting the
// client's own submitDisabled check, then flips the audit to `submitted`, permanently
// immutable for the auditor from here (no unsubmit). Ported from the Super Admin
// file's `submitDisabled` (~line 2127) — checks metrics *and* checklist; the auditor
// file's own version only checks the checklist and is incomplete (EXECUTION.md B5).
export async function submitAudit(auditId: string): Promise<void> {
  const { audit } = await requireOwnedAudit(auditId);

  if (audit.status === 'submitted' || audit.status === 'published') {
    redirect(`/auditor/report/${auditId}`);
  }

  const [defs, values, items] = await Promise.all([
    db.select({ metricKey: auditMetricDefs.metricKey }).from(auditMetricDefs).where(eq(auditMetricDefs.auditId, auditId)),
    db
      .select({ metricKey: auditMetricValues.metricKey, value: auditMetricValues.value })
      .from(auditMetricValues)
      .where(eq(auditMetricValues.auditId, auditId)),
    db
      .select({ status: auditItems.status, remark: auditItems.remark, naReason: auditItems.naReason })
      .from(auditItems)
      .where(eq(auditItems.auditId, auditId)),
  ]);

  const valueByKey = new Map(values.map((v) => [v.metricKey, v.value]));
  const mtdComplete = defs.every((d) => parseMetricValue(valueByKey.get(d.metricKey)) !== null);
  const checklistComplete = items.length > 0 && items.every(isItemAnswered);
  if (!mtdComplete || !checklistComplete) {
    throw new Error('This audit is not complete yet.');
  }

  await db
    .update(audits)
    .set({ status: 'submitted', submittedAt: new Date(), aiState: 'polishing' })
    .where(eq(audits.id, auditId));

  // ADR-0011 (was B6/ADR-0004): queued after the response is sent (survives the
  // redirect() below — `after()` runs even when redirect/notFound is called), never
  // awaited here. A failure inside it can never block or reverse this submit — see
  // scoreAuditRemarks.
  after(() => scoreAuditRemarks(auditId));
  // Safety net for any evidence photo whose capture-time extraction never fired
  // (ADR-0012) — see sweepEvidenceExtraction.
  after(() => sweepEvidenceExtraction(auditId));

  redirect(`/auditor/report/${auditId}`);
}

export async function removeItemPhoto(fileId: string): Promise<void> {
  const user = await requireRole('auditor');
  const [file] = await db
    .select({ id: auditItemFiles.id, storagePath: auditItemFiles.storagePath, auditStatus: audits.status })
    .from(auditItemFiles)
    .innerJoin(auditItems, eq(auditItems.id, auditItemFiles.auditItemId))
    .innerJoin(audits, eq(audits.id, auditItems.auditId))
    .where(and(eq(auditItemFiles.id, fileId), eq(audits.orgId, user.orgId), eq(audits.auditorId, user.id)))
    .limit(1);
  if (!file) throw new Error('Not found');
  assertEditable(file.auditStatus);

  await deleteFile(file.storagePath);
  await db.delete(auditItemFiles).where(eq(auditItemFiles.id, fileId));
}
