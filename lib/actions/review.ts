'use server';

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { auditItemFiles, auditItems, auditOperationalFiles, audits } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { deleteFile, operationalFilePath, uploadFile } from '@/lib/storage';
import { parseOperationalFile } from '@/lib/operational/parseFile';
import { NA_REASONS } from '@/lib/checklist/naReasons';
import { classifyFinding, type Severity } from '@/lib/report/classify';
import { extractEvidenceTable } from '@/lib/ai/extractEvidenceTable';

async function requireReviewableAudit(auditId: string) {
  const admin = await requireRole('super_admin');
  const [audit] = await db
    .select({ id: audits.id, orgId: audits.orgId, status: audits.status })
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.orgId, admin.orgId)))
    .limit(1);
  if (!audit) throw new Error('Not found');
  // Corrections happen while the audit sits in the review queue. Once published, a
  // fix is a new version (C5), not a silent edit — "publish freezes" invariant.
  if (audit.status !== 'submitted') throw new Error('This audit is not open for review corrections.');
  return { admin, audit };
}

// C1 — a status or remark corrected admin-side. The submission is still shown "exactly
// as captured" on first load; this is the explicit correction action layered on top,
// re-validated server-side the same way B3's own field rules were.
export async function correctAuditItem(
  itemId: string,
  auditId: string,
  status: (typeof auditItems.status.enumValues)[number],
  remark: string,
  naReason: string | null,
): Promise<void> {
  await requireReviewableAudit(auditId);

  if (status === 'fail' && remark.trim() === '') {
    throw new Error('A remark is required for Fail.');
  }
  if (status === 'na' && (!naReason || !NA_REASONS.includes(naReason as (typeof NA_REASONS)[number]))) {
    throw new Error('N/A requires one of the fixed reasons.');
  }

  // A status correction can turn a former finding into a Pass/N-A, or a former
  // Pass/N-A into a new Fail. Either way any existing finding is stale: clear it so
  // "Pass items carry no severity, impact or action" still holds, and so a status
  // newly turned Fail is picked up by the next Generate/Regenerate — via classifyFinding
  // (ADR-0011: now a fallback, since there's no per-item submit-time AI call to redo).
  await db
    .update(auditItems)
    .set({
      status,
      remark,
      naReason: status === 'na' ? naReason : null,
      severity: null,
      impact: null,
      correctiveAction: null,
      sla: null,
      ownership: null,
      resolutionStatus: null,
    })
    .where(and(eq(auditItems.id, itemId), eq(auditItems.auditId, auditId)));

  revalidatePath(`/admin/review/${auditId}`);
}

async function storeOperationalFile(
  orgId: string,
  auditId: string,
  file: File,
): Promise<{
  storagePath: string;
  format: string;
  parseStatus: (typeof auditOperationalFiles.parseStatus.enumValues)[number];
  coverageSummary: string | null;
}> {
  const bytes = await file.arrayBuffer();
  const parsed = await parseOperationalFile(file.name, file.type || '', bytes);
  const fileId = randomUUID();
  const storagePath = operationalFilePath(orgId, auditId, fileId, file.name);
  await uploadFile(storagePath, bytes, file.type || 'application/octet-stream');
  return { storagePath, format: parsed.format, parseStatus: parsed.parseStatus, coverageSummary: parsed.coverageSummary };
}

// C1 — attach an operational report (Bill Edit & Modification, Discounts, …) to the
// audit under review. C2's financial engine reads these later; here we only record
// what it covers and whether it actually parsed.
export async function attachOperationalFile(
  auditId: string,
  type: (typeof auditOperationalFiles.type.enumValues)[number],
  period: string,
  formData: FormData,
): Promise<void> {
  const { admin } = await requireReviewableAudit(auditId);

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('No file provided');
  if (period.trim() === '') throw new Error('Period is required.');

  const stored = await storeOperationalFile(admin.orgId, auditId, file);

  await db.insert(auditOperationalFiles).values({
    orgId: admin.orgId,
    auditId,
    type,
    period,
    name: file.name,
    format: stored.format,
    storagePath: stored.storagePath,
    parseStatus: stored.parseStatus,
    coverageSummary: stored.coverageSummary,
  });

  revalidatePath(`/admin/review/${auditId}`);
}

// Replace keeps the same record (same type/period slot) — only the underlying file,
// its parse result and coverage summary change.
export async function replaceOperationalFile(fileId: string, auditId: string, formData: FormData): Promise<void> {
  const { admin } = await requireReviewableAudit(auditId);

  const [existing] = await db
    .select({ id: auditOperationalFiles.id, storagePath: auditOperationalFiles.storagePath })
    .from(auditOperationalFiles)
    .where(and(eq(auditOperationalFiles.id, fileId), eq(auditOperationalFiles.auditId, auditId)))
    .limit(1);
  if (!existing) throw new Error('Not found');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('No file provided');

  const stored = await storeOperationalFile(admin.orgId, auditId, file);

  await db
    .update(auditOperationalFiles)
    .set({
      name: file.name,
      format: stored.format,
      storagePath: stored.storagePath,
      parseStatus: stored.parseStatus,
      coverageSummary: stored.coverageSummary,
      uploadedAt: new Date(),
    })
    .where(eq(auditOperationalFiles.id, fileId));

  await deleteFile(existing.storagePath);

  revalidatePath(`/admin/review/${auditId}`);
}

// C3 — every Fail becomes a finding. Since ADR-0011, DeepSeek already assigns findings
// for most Fail items at submit time (lib/ai/scoreAuditRemarks.ts); this deterministic
// classifier (EXECUTION.md C3, ported from Super Admin Flow.dc.html's
// generateReport/enhanceAll ~line 1611/1842) is now the fallback for whatever that AI
// job didn't reach (it failed/timed out, or the item was corrected into Fail after
// submit). Idempotent: only items with no severity yet are classified, so re-running
// never overwrites an AI-set or reviewer-edited finding — same as the mock's
// `it.severity || r.sev` pattern. Pass/N-A items are never touched (no severity,
// impact or action — EXECUTION.md C3 done-when).
export async function generateReport(auditId: string): Promise<void> {
  await requireReviewableAudit(auditId);

  const items = await db
    .select({ id: auditItems.id, code: auditItems.code, label: auditItems.label, remark: auditItems.remark, status: auditItems.status, severity: auditItems.severity })
    .from(auditItems)
    .where(eq(auditItems.auditId, auditId));

  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.severity !== null) continue; // already classified or reviewer-edited
      if (item.status !== 'fail') continue;

      const finding = classifyFinding(item.label, item.remark);
      await tx
        .update(auditItems)
        .set({
          refId: item.code,
          category: finding.category,
          severity: finding.severity,
          impact: finding.impact,
          correctiveAction: finding.correctiveAction,
          sla: finding.sla,
          ownership: finding.ownership,
          resolutionStatus: 'Pending',
        })
        .where(eq(auditItems.id, item.id));
    }

    await tx.update(audits).set({ reportGeneratedAt: new Date() }).where(eq(audits.id, auditId));
  });

  revalidatePath(`/admin/review/${auditId}`);
}

// Every generated field is editable by the reviewer (EXECUTION.md C3 done-when) — this
// is that edit, separate from generation so a manual correction is never silently
// clobbered by a later "Regenerate" (generateReport skips anything with severity set).
export async function updateFinding(
  itemId: string,
  auditId: string,
  fields: { severity: Severity; impact: string; correctiveAction: string; sla: string; ownership: string; resolutionStatus: 'Pending' | 'Resolved' },
): Promise<void> {
  await requireReviewableAudit(auditId);

  const [item] = await db.select({ status: auditItems.status }).from(auditItems).where(and(eq(auditItems.id, itemId), eq(auditItems.auditId, auditId))).limit(1);
  if (!item) throw new Error('Not found');
  if (item.status !== 'fail') {
    throw new Error('Only Fail points carry a finding.');
  }

  await db.update(auditItems).set(fields).where(eq(auditItems.id, itemId));

  revalidatePath(`/admin/review/${auditId}`);
}

async function requireOwnedEvidenceFile(fileId: string, auditId: string) {
  const { admin } = await requireReviewableAudit(auditId);
  const [file] = await db
    .select({ id: auditItemFiles.id })
    .from(auditItemFiles)
    .innerJoin(auditItems, eq(auditItems.id, auditItemFiles.auditItemId))
    .where(and(eq(auditItemFiles.id, fileId), eq(auditItems.auditId, auditId)))
    .limit(1);
  if (!file) throw new Error('Not found');
  return { admin };
}

// B7/ADR-0012 — every extracted cell is reviewer-editable, exactly as updateFinding
// already allows for severity: no separate confirm step, since the table is already
// live in the report the moment extraction succeeds. Also covers an admin manually
// filling in a table after a failed extraction.
export async function updateEvidenceTable(
  fileId: string,
  auditId: string,
  table: { columns: string[]; rows: string[][] },
): Promise<void> {
  await requireOwnedEvidenceFile(fileId, auditId);

  await db
    .update(auditItemFiles)
    .set({ extractedTable: table, extractionStatus: 'extracted' })
    .where(eq(auditItemFiles.id, fileId));

  revalidatePath(`/admin/review/${auditId}`);
}

// Synchronous, unlike the fire-and-forget capture-time/submit-time triggers — the admin
// is waiting on this one.
export async function retryEvidenceExtraction(fileId: string, auditId: string): Promise<void> {
  await requireOwnedEvidenceFile(fileId, auditId);

  await extractEvidenceTable(fileId);

  revalidatePath(`/admin/review/${auditId}`);
}
