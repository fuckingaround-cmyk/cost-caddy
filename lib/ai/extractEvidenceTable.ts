import { z } from 'zod';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { auditItemFiles, auditItems } from '@/db/schema';
import { downloadFile } from '@/lib/storage';
import { evidenceExtractionPrompt } from './evidenceRecipes';
import { withTimeout } from './withTimeout';
import type { EvidencePhotoType } from '@/lib/evidence/types';

const ExtractedTableSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});
export type ExtractedTable = z.infer<typeof ExtractedTableSchema>;

const EXTRACT_TIMEOUT_MS = 45_000;
// gpt-4o-mini fabricated/blended rows on dense registers (see ADR-0014 addendum).
const OPENAI_MODEL = 'gpt-4o';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function mimeTypeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

function toBase64(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString('base64');
}

async function callOpenAi(prompt: string, imageBytes: ArrayBuffer, mimeType: string): Promise<ExtractedTable> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${toBase64(imageBytes)}`, detail: 'high' } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI response missing content');
  if (process.env.NODE_ENV !== 'production') console.log('[extractEvidenceTable] raw model output:', content);
  return ExtractedTableSchema.parse(JSON.parse(content));
}

// B7/ADR-0012, provider swapped to OpenAI by ADR-0014 — vision OCR/data-entry, distinct
// from narration (ADR-0004) and from severity classification (ADR-0011): the model
// transcribes exactly what's visible under the recipe's fixed columns, never computing
// or inferring a value. Triggered right after the auditor picks an evidence type for a
// photo (fire-and-forget from setEvidencePhotoType, lib/actions/checklist.ts) — never
// blocks upload or submit, and a failure here is never surfaced to the auditor. The
// extracted table shows immediately once done, editable/overridable by the reviewer
// exactly like AI-assigned severity — no separate confirm step.
export async function extractEvidenceTable(fileId: string): Promise<void> {
  try {
    const [file] = await db
      .select({
        id: auditItemFiles.id,
        kind: auditItemFiles.kind,
        name: auditItemFiles.name,
        storagePath: auditItemFiles.storagePath,
        evidenceType: auditItemFiles.evidenceType,
      })
      .from(auditItemFiles)
      .where(eq(auditItemFiles.id, fileId))
      .limit(1);
    if (!file || file.kind !== 'image' || !file.evidenceType) return;

    await db.update(auditItemFiles).set({ extractionStatus: 'pending' }).where(eq(auditItemFiles.id, fileId));

    const bytes = await downloadFile(file.storagePath);
    const parsed = await withTimeout(
      callOpenAi(evidenceExtractionPrompt(file.evidenceType as EvidencePhotoType), bytes, mimeTypeFor(file.name)),
      EXTRACT_TIMEOUT_MS,
    );

    await db
      .update(auditItemFiles)
      .set({
        extractionStatus: 'extracted',
        extractedTable: parsed,
        extractionModel: OPENAI_MODEL,
        extractedAt: new Date(),
      })
      .where(eq(auditItemFiles.id, fileId));
  } catch {
    // Never blocks or surfaces to the auditor (same resilience as scoreAuditRemarks) —
    // the file simply stays without a table; the admin review screen offers a retry.
    try {
      await db.update(auditItemFiles).set({ extractionStatus: 'failed' }).where(eq(auditItemFiles.id, fileId));
    } catch {
      // Best-effort status update; nothing else to do if even this fails.
    }
  }
}

// Safety-net sweep queued from submitAudit alongside scoreAuditRemarks — picks up any
// image file with a picked evidenceType whose capture-time extraction never fired (e.g.
// a mid-request deploy), the same "fallback for whatever the primary path missed" role
// classify.ts plays for severity.
export async function sweepEvidenceExtraction(auditId: string): Promise<void> {
  const files = await db
    .select({ id: auditItemFiles.id })
    .from(auditItemFiles)
    .innerJoin(auditItems, eq(auditItems.id, auditItemFiles.auditItemId))
    .where(
      and(
        eq(auditItems.auditId, auditId),
        eq(auditItemFiles.kind, 'image'),
        isNotNull(auditItemFiles.evidenceType),
        isNull(auditItemFiles.extractionStatus),
      ),
    );

  for (const f of files) {
    await extractEvidenceTable(f.id);
  }
}
