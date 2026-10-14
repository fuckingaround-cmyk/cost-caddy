import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  auditEvidenceFindings,
  auditItemFiles,
  auditItems,
  auditMetricDefs,
  auditMetricValues,
  auditOperationalFiles,
  audits,
  reports,
} from '@/db/schema';
import { deleteFile } from '@/lib/storage';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ADR-0016: removes audits and all their children in FK order, inside the caller's
// transaction. Returns the storage paths to delete AFTER commit (see deleteStoredFiles).
export async function removeAuditsInTx(tx: Tx, auditIds: string[]): Promise<string[]> {
  if (auditIds.length === 0) return [];
  const paths: string[] = [];

  const items = await tx.select({ id: auditItems.id }).from(auditItems).where(inArray(auditItems.auditId, auditIds));
  const itemIds = items.map((i) => i.id);
  if (itemIds.length > 0) {
    const photos = await tx
      .select({ path: auditItemFiles.storagePath })
      .from(auditItemFiles)
      .where(inArray(auditItemFiles.auditItemId, itemIds));
    paths.push(...photos.map((p) => p.path));
    await tx.delete(auditItemFiles).where(inArray(auditItemFiles.auditItemId, itemIds));
  }
  await tx.delete(auditItems).where(inArray(auditItems.auditId, auditIds));
  await tx.delete(auditMetricValues).where(inArray(auditMetricValues.auditId, auditIds));
  await tx.delete(auditMetricDefs).where(inArray(auditMetricDefs.auditId, auditIds));
  await tx.delete(auditEvidenceFindings).where(inArray(auditEvidenceFindings.auditId, auditIds));

  const opFiles = await tx
    .select({ path: auditOperationalFiles.storagePath })
    .from(auditOperationalFiles)
    .where(inArray(auditOperationalFiles.auditId, auditIds));
  paths.push(...opFiles.map((f) => f.path));
  await tx.delete(auditOperationalFiles).where(inArray(auditOperationalFiles.auditId, auditIds));

  const pdfs = await tx.select({ path: reports.pdfPath }).from(reports).where(inArray(reports.auditId, auditIds));
  for (const r of pdfs) if (r.path) paths.push(r.path);
  await tx.delete(reports).where(inArray(reports.auditId, auditIds));

  await tx.delete(audits).where(inArray(audits.id, auditIds));
  return paths;
}

// Best-effort, after commit: an orphaned file is harmless, a dangling row is not.
export async function deleteStoredFiles(paths: string[], who: string): Promise<void> {
  await Promise.all(
    paths.map((p) => deleteFile(p).catch((err) => console.error(`${who}: could not remove stored file ${p}`, err))),
  );
}

export async function listOutletAuditIds(tx: Tx, outletId: string): Promise<string[]> {
  const rows = await tx.select({ id: audits.id }).from(audits).where(eq(audits.outletId, outletId));
  return rows.map((r) => r.id);
}
