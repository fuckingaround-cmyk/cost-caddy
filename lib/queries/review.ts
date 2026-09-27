import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { auditOperationalFiles, audits, outlets, templates, users } from '@/db/schema';

export type ReviewAuditDetail = {
  id: string;
  status: (typeof audits.status.enumValues)[number];
  periodEnd: string;
  outletId: string;
  outletName: string;
  auditorName: string;
  templateName: string;
  reportGeneratedAt: Date | null;
  version: number;
  publishedAt: Date | null;
  // ADR-0011 — surfaced so the reviewer knows whether findings already carry an
  // AI-assigned severity or are still waiting on classifyFinding's fallback.
  aiState: (typeof audits.aiState.enumValues)[number] | null;
};

// Loads one audit scoped to the reviewing org — never trusts a bare id across orgs.
export async function getAuditForReview(orgId: string, auditId: string): Promise<ReviewAuditDetail | null> {
  const [row] = await db
    .select({
      id: audits.id,
      status: audits.status,
      periodEnd: audits.periodEnd,
      outletId: audits.outletId,
      outletName: outlets.name,
      auditorName: users.name,
      templateName: templates.name,
      reportGeneratedAt: audits.reportGeneratedAt,
      version: audits.version,
      publishedAt: audits.publishedAt,
      aiState: audits.aiState,
    })
    .from(audits)
    .innerJoin(outlets, eq(outlets.id, audits.outletId))
    .innerJoin(users, eq(users.id, audits.auditorId))
    .innerJoin(templates, eq(templates.id, audits.templateId))
    .where(and(eq(audits.id, auditId), eq(audits.orgId, orgId)))
    .limit(1);

  return row ?? null;
}

export type OperationalFileRow = {
  id: string;
  type: (typeof auditOperationalFiles.type.enumValues)[number];
  period: string;
  name: string;
  format: string;
  storagePath: string;
  parseStatus: (typeof auditOperationalFiles.parseStatus.enumValues)[number];
  coverageSummary: string | null;
  uploadedAt: Date;
};

export async function listOperationalFiles(auditId: string): Promise<OperationalFileRow[]> {
  return db
    .select({
      id: auditOperationalFiles.id,
      type: auditOperationalFiles.type,
      period: auditOperationalFiles.period,
      name: auditOperationalFiles.name,
      format: auditOperationalFiles.format,
      storagePath: auditOperationalFiles.storagePath,
      parseStatus: auditOperationalFiles.parseStatus,
      coverageSummary: auditOperationalFiles.coverageSummary,
      uploadedAt: auditOperationalFiles.uploadedAt,
    })
    .from(auditOperationalFiles)
    .where(eq(auditOperationalFiles.auditId, auditId))
    .orderBy(asc(auditOperationalFiles.uploadedAt));
}

