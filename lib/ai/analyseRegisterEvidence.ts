import { z } from 'zod';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { auditEvidenceFindings, auditItemFiles, auditItems } from '@/db/schema';
import { downloadFile } from '@/lib/storage';
import { posFindingsKey } from '@/lib/evidence/types';
import type { EvidencePhotoType } from '@/lib/evidence/types';
import { EVIDENCE_RECIPES, evidenceTranscriptionRules } from './evidenceRecipes';
import { EVIDENCE_FINDINGS_POLICY_CONTEXT } from './evidenceFindingsPolicyContext';
import { REGISTER_FINDINGS_RULES, generateRegisterFindingsForItem } from './generateRegisterFindings';
import { withTimeout } from './withTimeout';

const TableSchema = z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) });
export type ExtractedTable = z.infer<typeof TableSchema>;
const ResultSchema = z.object({ tables: z.array(TableSchema), findings: z.string(), correctiveMeasures: z.string() });

const ANALYSE_TIMEOUT_MS = 90_000;
// gpt-4o-mini fabricated/blended rows on dense registers (see ADR-0014 addendum).
const OPENAI_VISION_MODEL = 'gpt-4o';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function mimeTypeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

function systemPrompt(type: EvidencePhotoType, photoCount: number): string {
  const columns = EVIDENCE_RECIPES[type].columns;
  return `
You are processing one POS register section (e.g. the discount register) of a restaurant audit. You
are given the field auditor's status and remark for it and ${photoCount} photo(s) of the register. Do two
jobs in one response.

JOB 1 — transcribe each photo, in the order given, into its own table.
${evidenceTranscriptionRules(type)}

JOB 2 — write the "Findings and Observations" and "Corrective Measures" for the client-facing audit
report, grounded ONLY in the auditor's remark and the tables you transcribed in job 1.

${EVIDENCE_FINDINGS_POLICY_CONTEXT}

${REGISTER_FINDINGS_RULES}

Respond with a single JSON object of the exact shape:
{"tables": [{"columns": ${JSON.stringify(columns)}, "rows": [["...", "..."], ...]}, ...], "findings": "...", "correctiveMeasures": "..."}
"tables" must have exactly ${photoCount} entries, one per photo, in the order the photos are given.
`.trim();
}

async function callOpenAI(
  type: EvidencePhotoType,
  meta: { report: string; status: string; auditorRemark: string },
  photos: { bytes: ArrayBuffer; mimeType: string }[],
) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt(type, photos.length) },
        {
          role: 'user',
          content: [
            { type: 'text', text: JSON.stringify(meta) },
            ...photos.map((p) => ({
              type: 'image_url',
              image_url: { url: `data:${p.mimeType};base64,${Buffer.from(p.bytes).toString('base64')}`, detail: 'high' },
            })),
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI response missing content');
  if (process.env.NODE_ENV !== 'production') console.log('[analyseRegisterEvidence] raw model output:', content);
  const parsed = ResultSchema.parse(JSON.parse(content));
  if (parsed.tables.length !== photos.length) throw new Error('OpenAI returned the wrong number of tables');
  return parsed;
}

// ADR-0018 (supersedes ADR-0012/0015's two-step flow) — ONE vision call per POS report:
// every photo of the register + the auditor's remark in, each photo's verbatim table AND
// the Findings / Corrective Measures out. Runs only in the backend after submit
// (`after()` in submitAudit) or when an admin retries — never at upload or in the auditor's
// request. Throws on failure (the admin retry surfaces it); the audit-level wrapper swallows.
// `keepExistingFindings` stops a retry/fallback from clobbering text an admin already edited.
export async function analyseRegisterItem(itemId: string, opts: { keepExistingFindings?: boolean } = {}): Promise<void> {
  const [item] = await db
    .select({
      orgId: auditItems.orgId,
      auditId: auditItems.auditId,
      label: auditItems.label,
      status: auditItems.status,
      remark: auditItems.remark,
      reportType: auditItems.reportType,
    })
    .from(auditItems)
    .where(and(eq(auditItems.id, itemId), eq(auditItems.section, 'pos_report')))
    .limit(1);
  if (!item || !item.reportType) throw new Error('Not found');

  const files = await db
    .select({ id: auditItemFiles.id, name: auditItemFiles.name, storagePath: auditItemFiles.storagePath })
    .from(auditItemFiles)
    .where(and(eq(auditItemFiles.auditItemId, itemId), eq(auditItemFiles.kind, 'image'), isNotNull(auditItemFiles.evidenceType)))
    .orderBy(asc(auditItemFiles.uploadedAt));

  // No photo to read — write findings from the remark alone, as before.
  if (files.length === 0) {
    await generateRegisterFindingsForItem(itemId);
    return;
  }

  const fileIds = files.map((f) => f.id);
  const setStatus = async (status: 'pending' | 'failed') => {
    for (const id of fileIds) await db.update(auditItemFiles).set({ extractionStatus: status }).where(eq(auditItemFiles.id, id));
  };
  await setStatus('pending');

  let result: Awaited<ReturnType<typeof callOpenAI>>;
  try {
    const photos = await Promise.all(files.map(async (f) => ({ bytes: await downloadFile(f.storagePath), mimeType: mimeTypeFor(f.name) })));
    result = await withTimeout(
      callOpenAI(item.reportType, { report: item.label, status: item.status, auditorRemark: item.remark }, photos),
      ANALYSE_TIMEOUT_MS,
    );
  } catch (e) {
    await setStatus('failed');
    throw e;
  }

  const now = new Date();
  for (const [i, f] of files.entries()) {
    await db
      .update(auditItemFiles)
      .set({ extractionStatus: 'extracted', extractedTable: result.tables[i], extractionModel: OPENAI_VISION_MODEL, extractedAt: now })
      .where(eq(auditItemFiles.id, f.id));
  }

  const reportLabel = posFindingsKey(item.reportType, item.label);
  if (opts.keepExistingFindings) {
    const [existing] = await db
      .select({ findings: auditEvidenceFindings.findings })
      .from(auditEvidenceFindings)
      .where(
        and(
          eq(auditEvidenceFindings.auditId, item.auditId),
          eq(auditEvidenceFindings.evidenceType, item.reportType),
          eq(auditEvidenceFindings.reportLabel, reportLabel),
        ),
      )
      .limit(1);
    if (existing && existing.findings.trim() !== '') return;
  }

  await db
    .insert(auditEvidenceFindings)
    .values({
      orgId: item.orgId,
      auditId: item.auditId,
      evidenceType: item.reportType,
      reportLabel,
      findings: result.findings,
      correctiveMeasures: result.correctiveMeasures,
      aiPolishedAt: now,
    })
    .onConflictDoUpdate({
      target: [auditEvidenceFindings.auditId, auditEvidenceFindings.evidenceType, auditEvidenceFindings.reportLabel],
      set: { findings: result.findings, correctiveMeasures: result.correctiveMeasures, aiPolishedAt: now, updatedAt: now },
    });
}

// Submit-time job (queued from submitAudit) and the "Generate report" fallback
// (onlyMissing): every answered, non-N/A POS item. One report failing never blocks the
// others, the submit or the report — its table/text simply stays empty until the admin retries.
export async function analyseRegisterEvidence(auditId: string, opts: { onlyMissing?: boolean } = {}): Promise<void> {
  try {
    const items = await db
      .select({ id: auditItems.id, status: auditItems.status, reportType: auditItems.reportType, label: auditItems.label })
      .from(auditItems)
      .where(and(eq(auditItems.auditId, auditId), eq(auditItems.section, 'pos_report')));

    const findings = opts.onlyMissing
      ? await db
          .select({ evidenceType: auditEvidenceFindings.evidenceType, reportLabel: auditEvidenceFindings.reportLabel, findings: auditEvidenceFindings.findings })
          .from(auditEvidenceFindings)
          .where(eq(auditEvidenceFindings.auditId, auditId))
      : [];
    const hasFindings = new Set(findings.filter((e) => e.findings.trim() !== '').map((e) => `${e.evidenceType}|${e.reportLabel}`));

    const unreadPhotos = opts.onlyMissing
      ? new Set(
          (
            await db
              .select({ auditItemId: auditItemFiles.auditItemId, status: auditItemFiles.extractionStatus })
              .from(auditItemFiles)
              .innerJoin(auditItems, eq(auditItems.id, auditItemFiles.auditItemId))
              .where(and(eq(auditItems.auditId, auditId), eq(auditItemFiles.kind, 'image'), isNotNull(auditItemFiles.evidenceType)))
          )
            .filter((f) => f.status !== 'extracted')
            .map((f) => f.auditItemId),
        )
      : new Set<string>();

    for (const it of items) {
      if (it.status === 'pending' || it.status === 'na' || !it.reportType) continue;
      if (hasFindings.has(`${it.reportType}|${posFindingsKey(it.reportType, it.label)}`) && !unreadPhotos.has(it.id)) continue;
      try {
        await analyseRegisterItem(it.id, { keepExistingFindings: opts.onlyMissing });
      } catch {
        // Best-effort per report — see above.
      }
    }
  } catch {
    // Never throws out of after().
  }
}
