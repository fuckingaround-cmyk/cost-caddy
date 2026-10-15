import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { auditItems, audits } from '@/db/schema';
import { SEVERITY_RUBRIC } from './severityRubric';
import { withTimeout } from './withTimeout';

const ScoredItemSchema = z.object({
  id: z.string(),
  polishedRemark: z.string(),
  category: z.string().optional(),
  severity: z.enum(['High', 'Medium', 'Low']).optional(),
  impact: z.string().optional(),
  correctiveAction: z.string().optional(),
  sla: z.string().optional(),
  ownership: z.string().optional(),
});
const ScoredRemarksSchema = z.object({ items: z.array(ScoredItemSchema) });

const SCORE_TIMEOUT_MS = 45_000;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TEXT_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `
You turn a field auditor's shorthand notes into polished, professional report prose for a
restaurant audit report, and assess the severity of each failed checkpoint.

For every item, rewrite its remark as one or two clear sentences suitable for a
client-facing PDF. Preserve every fact exactly: never add, remove, or change a number,
quantity, date, unit, or proper noun that appears in the original, and never invent a
figure that isn't already there. Keep the auditor's meaning intact — you are copy-editing,
not re-assessing the wording. Return exactly one polished remark per input id, in the same
field "polishedRemark".

Every item you receive is a failed checkpoint. For each one, additionally assess severity
using this rubric, and return "category", "severity", "impact", "correctiveAction", "sla", and
"ownership" alongside "polishedRemark":

${SEVERITY_RUBRIC}

Respond with a single JSON object of the exact shape:
{"items": [{"id": "...", "polishedRemark": "...", "category": "...", "severity": "High|Medium|Low", "impact": "...", "correctiveAction": "...", "sla": "...", "ownership": "..."}]}
`.trim();

async function callOpenAI(items: { id: string; checkpoint: string; department: string; status: string; remark: string }[]) {
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
        { role: 'user', content: JSON.stringify(items) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI response missing content');
  return ScoredRemarksSchema.parse(JSON.parse(content));
}

// ADR-0011 (replaces B6/ADR-0004's polishAuditRemarks) — queued from `submitAudit` via
// `after()`, never awaited by the request that triggers it. In one call: rewrites every
// Fail remark into report prose (replacing the raw remark — no verbatim copy kept,
// same as before) AND assigns severity/category/impact/correctiveAction/sla/ownership for
// every Fail item, using the rubric above. The reviewer can still edit every finding
// field, severity included — this only changes where the starting value comes from and
// when it first appears (at submit, not at "Generate report"). A failure or timeout here
// must never surface to the auditor or touch the submit itself: the audit is already
// `submitted`. On failure, findings simply stay unset until classifyFinding (C3, now a
// fallback) fills them at "Generate report".
//
// `onlyUnpolished` is the "Generate report" retry: it only touches Fail points the submit-time
// run never reached (no aiAssessment) and leaves any finding fields already set — by the
// classifier fallback or by the reviewer — alone, updating just the observation.
export async function scoreAuditRemarks(auditId: string, opts: { onlyUnpolished?: boolean } = {}): Promise<void> {
  try {
    const items = await db
      .select({ id: auditItems.id, code: auditItems.code, cat: auditItems.cat, label: auditItems.label, remark: auditItems.remark, status: auditItems.status, severity: auditItems.severity, polished: sql<boolean>`${auditItems.aiAssessment} is not null` })
      .from(auditItems)
      .where(and(eq(auditItems.auditId, auditId), eq(auditItems.section, 'checklist')));

    const toScore = items.filter((it) => it.status === 'fail' && it.remark.trim() !== '' && !(opts.onlyUnpolished && it.polished));
    if (toScore.length === 0) {
      await db.update(audits).set({ aiState: 'ready' }).where(eq(audits.id, auditId));
      return;
    }

    const parsed = await withTimeout(
      callOpenAI(
        toScore.map((it) => ({ id: it.id, checkpoint: it.label, department: it.cat, status: it.status, remark: it.remark })),
      ),
      SCORE_TIMEOUT_MS,
    );

    const scoredById = new Map(parsed.items.map((r) => [r.id, r]));
    await db.transaction(async (tx) => {
      for (const it of toScore) {
        const scored = scoredById.get(it.id);
        if (!scored || scored.polishedRemark.trim() === '') continue;

        if (!(opts.onlyUnpolished && it.severity !== null) && scored.severity && scored.category && scored.impact && scored.correctiveAction && scored.sla && scored.ownership) {
          await tx
            .update(auditItems)
            .set({
              remark: scored.polishedRemark,
              refId: it.code,
              category: scored.category,
              severity: scored.severity,
              impact: scored.impact,
              correctiveAction: scored.correctiveAction,
              sla: scored.sla,
              ownership: scored.ownership,
              resolutionStatus: 'Pending',
              aiAssessment: scored,
            })
            .where(eq(auditItems.id, it.id));
        } else {
          // Polished but not fully scored — classifyFinding fills the rest at "Generate report".
          await tx.update(auditItems).set({ remark: scored.polishedRemark, aiAssessment: scored }).where(eq(auditItems.id, it.id));
        }
      }
      await tx.update(audits).set({ aiState: 'ready' }).where(eq(audits.id, auditId));
    });
  } catch (e) {
    console.error('[scoreAuditRemarks] failed for audit', auditId, e);
    // Never blocks or reverses the submit (ADR-0004/ADR-0011) — unpolished remarks pass
    // through verbatim and Fail items simply have no finding yet; classifyFinding (C3)
    // is the fallback that fills severity/finding fields at "Generate report".
    try {
      await db.update(audits).set({ aiState: 'failed' }).where(eq(audits.id, auditId));
    } catch {
      // Best-effort status update; nothing else to do if even this fails.
    }
  }
}
