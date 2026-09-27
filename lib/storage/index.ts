import { getStorageClient } from './client';

export { auditItemFilePath, operationalFilePath, reportFilePath } from './paths';

// One private bucket for photos, PDFs and uploads (F5) — never public; every read goes
// through a signed URL that expires. Exception: report evidence photos use a long-lived
// signed URL (ADR-0009) so links baked into a published PDF still work years later —
// still not public, but a bearer credential per photo until expiry or file deletion.
export const STORAGE_BUCKET = 'audit-files';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
export const REPORT_EVIDENCE_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years — ADR-0009

export async function ensureBucketExists(): Promise<void> {
  const client = getStorageClient();

  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw listError;
  if (buckets.some((bucket) => bucket.name === STORAGE_BUCKET)) return;

  const { error: createError } = await client.storage.createBucket(STORAGE_BUCKET, { public: false });
  if (createError) throw createError;
}

export async function uploadFile(
  path: string,
  body: Buffer | Blob | ArrayBuffer,
  contentType: string,
): Promise<void> {
  const client = getStorageClient();
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
}

export async function createSignedUrl(
  path: string,
  expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// Gemini's vision API takes inline base64 bytes, not a fetchable URL (ADR-0012) — a
// signed URL is no use here, unlike every other read in this module.
export async function downloadFile(path: string): Promise<ArrayBuffer> {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(STORAGE_BUCKET).download(path);
  if (error) throw error;
  return data.arrayBuffer();
}

export async function deleteFile(path: string): Promise<void> {
  const client = getStorageClient();
  const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
