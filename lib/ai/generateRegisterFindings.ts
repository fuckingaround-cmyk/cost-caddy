import { z } from 'zod';
import { posFindingsKey } from '@/lib/evidence/types';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { auditEvidenceFindings, auditItemFiles, auditItems } from '@/db/schema';
import { EVIDENCE_FINDINGS_POLICY_CONTEXT } from './evidenceFindingsPolicyContext';
import { withTimeout } from './withTimeout';

const GeneratedSchema = z.object({ findings: z.string(), correctiveMeasures: z.string() });

const GENERATE_TIMEOUT_MS = 45_000;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TEXT_MODEL = 'gpt-4o-mini';

// Shared with lib/ai/analyseRegisterEvidence.ts so the single vision call and the text-only
// Regenerate write findings to the same standard.
export const REGISTER_FINDINGS_RULES = `
Rules:
- Ground every statement in the auditor's remark and the table rows. Never invent a fact.
- Be BRIEF: "findings" and "correctiveMeasures" must each be at most TWO short sentences (about
  two lines in a printed report). This is a summary only — the reader can see every row in the
  table printed right below, so never list individual bills, dates or names.
- Findings style, for example: "Several bills were found with discounts ranging from 20% to 53%,
  well above the 10% threshold." Say what pattern was found across the register, not each entry.
- You may quote the lowest and highest figure exactly as they appear in the rows (a range), and
  the threshold exactly as stated in the policy context. You must NEVER compute a difference, sum,
  average, count or percentage-point delta — never derive a new number from the figures.
- Corrective measures: one concrete, general action (e.g. require documented manager approval for
  discounts above the threshold), not a long list.
- Preserve the auditor's meaning; write clear, professional prose.
- If the auditor's remark is empty, write a short, factual, non-alarmist observation based only
  on patterns visible in the rows (e.g. a repeated approver, missing reasons) and a modest
  corrective measure. If the status is "pass", say no exception was noted unless the rows show
  otherwise, and keep the corrective measure to maintaining the current standard.
`.trim();

const SYSTEM_PROMPT = `
You write the "Findings and Observations" and "Corrective Measures" for one POS register
section (e.g. the discount register) of a client-facing restaurant audit report. You are given
the field auditor's status and remark for that register and the table transcribed verbatim from
the auditor's photo of it.

${EVIDENCE_FINDINGS_POLICY_CONTEXT}

${REGISTER_FINDINGS_RULES}

Respond with a single JSON object of the exact shape: {"findings": "...", "correctiveMeasures": "..."}
`.trim();

async function callOpenAI(payload: {
  report: string;
  status: string;
  auditorRemark: string;
  tables: { columns: string[]; rows: string[][] }[];
}) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_TEXT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI response missing content');
  return GeneratedSchema.parse(JSON.parse(content));
}

// ADR-0015 — one POS report item's Findings + Corrective Measures, from the auditor's remark
// and the table(s) extracted from its photo(s), via OpenAI (text-only: the photo has already
// been transcribed, so every figure it can quote traces to a stored table cell). Throws on
// failure — the admin "Regenerate" button surfaces it; the submit-time wrapper below swallows.
export async function generateRegisterFindingsForItem(itemId: string): Promise<{ findings: string; correctiveMeasures: string }> {
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
    .select({ extractedTable: auditItemFiles.extractedTable })
    .from(auditItemFiles)
    .where(
      and(eq(auditItemFiles.auditItemId, itemId), eq(auditItemFiles.extractionStatus, 'extracted'), isNotNull(auditItemFiles.extractedTable)),
    );
  const tables = files.map((f) => f.extractedTable).filter((t): t is { columns: string[]; rows: string[][] } => t !== null);

  const reportLabel = posFindingsKey(item.reportType, item.label);
  const generated = await withTimeout(
    callOpenAI({ report: item.label, status: item.status, auditorRemark: item.remark, tables }),
    GENERATE_TIMEOUT_MS,
  );

  await db
    .insert(auditEvidenceFindings)
    .values({
      orgId: item.orgId,
      auditId: item.auditId,
      evidenceType: item.reportType,
      reportLabel,
      findings: generated.findings,
      correctiveMeasures: generated.correctiveMeasures,
      aiPolishedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [auditEvidenceFindings.auditId, auditEvidenceFindings.evidenceType, auditEvidenceFindings.reportLabel],
      set: {
        findings: generated.findings,
        correctiveMeasures: generated.correctiveMeasures,
        aiPolishedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  return generated;
}

// Submit-time job (queued from submitAudit) and the "Generate report" fallback
// (onlyMissing): every answered, non-N/A POS item. A failure for one report never blocks the
// others, the submit, or the report — its text simply stays empty until Regenerate.
export async function generateRegisterFindings(auditId: string, opts: { onlyMissing?: boolean } = {}): Promise<void> {
  try {
    const items = await db
      .select({ id: auditItems.id, status: auditItems.status, reportType: auditItems.reportType, label: auditItems.label })
      .from(auditItems)
      .where(and(eq(auditItems.auditId, auditId), eq(auditItems.section, 'pos_report')));

    const existing = opts.onlyMissing
      ? await db
          .select({ evidenceType: auditEvidenceFindings.evidenceType, reportLabel: auditEvidenceFindings.reportLabel, findings: auditEvidenceFindings.findings })
          .from(auditEvidenceFindings)
          .where(eq(auditEvidenceFindings.auditId, auditId))
      : [];
    const done = new Set(existing.filter((e) => e.findings.trim() !== '').map((e) => `${e.evidenceType}|${e.reportLabel}`));

    for (const it of items) {
      if (it.status === 'pending' || it.status === 'na' || !it.reportType) continue;
      if (done.has(`${it.reportType}|${posFindingsKey(it.reportType, it.label)}`)) continue;
      try {
        await generateRegisterFindingsForItem(it.id);
      } catch {
        // Best-effort per report — see above.
      }
    }
  } catch {
    // Never throws out of after().
  }
}
