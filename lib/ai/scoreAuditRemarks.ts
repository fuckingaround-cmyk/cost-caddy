import { z } from 'zod';
import { eq } from 'drizzle-orm';
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
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `
You turn a field auditor's shorthand notes into polished, professional report prose for a
restaurant audit report, and assess the severity of each failed checkpoint.

For every item, rewrite its remark as one or two clear sentences suitable for a
client-facing PDF. Preserve every fact exactly: never add, remove, or change a number,
quantity, date, unit, or proper noun that appears in the original, and never invent a
figure that isn't already there. Keep the auditor's meaning intact — you are copy-editing,
not re-assessing the wording. Return exactly one polished remark per input id, in the same
field "polishedRemark".

For items whose "status" is "fail" (never for "na"), additionally assess severity using
this rubric, and return "category", "severity", "impact", "correctiveAction", "sla", and
"ownership" alongside "polishedRemark":

${SEVERITY_RUBRIC}

Respond with a single JSON object of the exact shape:
{"items": [{"id": "...", "polishedRemark": "...", "category": "...", "severity": "High|Medium|Low", "impact": "...", "correctiveAction": "...", "sla": "...", "ownership": "..."}]}
Omit category/severity/impact/correctiveAction/sla/ownership for non-fail items.
`.trim();

async function callDeepSeek(items: { id: string; checkpoint: string; department: string; status: string; remark: string }[]) {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(items) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek request failed: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek response missing content');
  return ScoredRemarksSchema.parse(JSON.parse(content));
}

// ADR-0011 (replaces B6/ADR-0004's polishAuditRemarks) — queued from `submitAudit` via
// `after()`, never awaited by the request that triggers it. In one call: rewrites every
// non-pass remark into report prose (replacing the raw remark — no verbatim copy kept,
// same as before) AND assigns severity/category/impact/correctiveAction/sla/ownership for
// every Fail item, using the rubric above. The reviewer can still edit every finding
// field, severity included — this only changes where the starting value comes from and
// when it first appears (at submit, not at "Generate report"). A failure or timeout here
// must never surface to the auditor or touch the submit itself: the audit is already
// `submitted`. On failure, findings simply stay unset until classifyFinding (C3, now a
// fallback) fills them at "Generate report".
export async function scoreAuditRemarks(auditId: string): Promise<void> {
  try {
    const items = await db
      .select({ id: auditItems.id, code: auditItems.code, cat: auditItems.cat, label: auditItems.label, remark: auditItems.remark, status: auditItems.status })
      .from(auditItems)
      .where(eq(auditItems.auditId, auditId));

    const toScore = items.filter((it) => it.status !== 'pass' && it.status !== 'pending' && it.remark.trim() !== '');
    if (toScore.length === 0) {
      await db.update(audits).set({ aiState: 'ready' }).where(eq(audits.id, auditId));
      return;
    }

    const parsed = await withTimeout(
      callDeepSeek(
        toScore.map((it) => ({ id: it.id, checkpoint: it.label, department: it.cat, status: it.status, remark: it.remark })),
      ),
      SCORE_TIMEOUT_MS,
    );

    const scoredById = new Map(parsed.items.map((r) => [r.id, r]));
    await db.transaction(async (tx) => {
      for (const it of toScore) {
        const scored = scoredById.get(it.id);
        if (!scored || scored.polishedRemark.trim() === '') continue;

        if (it.status === 'fail' && scored.severity && scored.category && scored.impact && scored.correctiveAction && scored.sla && scored.ownership) {
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
          await tx.update(auditItems).set({ remark: scored.polishedRemark }).where(eq(auditItems.id, it.id));
        }
      }
      await tx.update(audits).set({ aiState: 'ready' }).where(eq(audits.id, auditId));
    });
  } catch {
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
