'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { auditorOutlets, outlets } from '@/db/schema';
import { requireRole } from '@/lib/auth';
import { deleteStoredFiles, listOutletAuditIds, removeAuditsInTx } from '@/lib/audits/removeAudits';
import { getOrCreateDefaultBrand } from '@/lib/queries/restaurants';

export type CreateRestaurantState = { error?: string; created?: string };

// A2: a name and city added inline appear in the list immediately; an empty name is refused.
export async function createRestaurant(
  _prev: CreateRestaurantState,
  formData: FormData,
): Promise<CreateRestaurantState> {
  const admin = await requireRole('super_admin');
  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();

  if (!name) return { error: 'Enter a restaurant name' };

  const brandId = await getOrCreateDefaultBrand(admin.orgId);
  await db.insert(outlets).values({ orgId: admin.orgId, brandId, name, city: city || null });

  revalidatePath('/admin/restaurants');
  return { created: name };
}

export type EditRestaurantState = { error?: string; saved?: boolean };

// A6: rename / relocate. Same rule as create — an empty name is refused.
export async function updateRestaurant(
  outletId: string,
  _prev: EditRestaurantState,
  formData: FormData,
): Promise<EditRestaurantState> {
  const admin = await requireRole('super_admin');
  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  if (!name) return { error: 'Enter a restaurant name' };

  await db
    .update(outlets)
    .set({ name, city: city || null })
    .where(and(eq(outlets.id, outletId), eq(outlets.orgId, admin.orgId)));

  revalidatePath('/admin/restaurants');
  revalidatePath(`/admin/restaurants/${outletId}`);
  revalidatePath('/admin/auditors');
  return { saved: true };
}

// A6 / ADR-0016: deletes the outlet together with all its audits (and their children and
// stored files), then auditor access rows.
export async function deleteRestaurant(outletId: string): Promise<{ error: string } | void> {
  const admin = await requireRole('super_admin');
  const [outlet] = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(and(eq(outlets.id, outletId), eq(outlets.orgId, admin.orgId)))
    .limit(1);
  if (!outlet) return { error: 'Restaurant not found' };

  const paths = await db.transaction(async (tx) => {
    const auditIds = await listOutletAuditIds(tx, outletId);
    const stored = await removeAuditsInTx(tx, auditIds);
    await tx.delete(auditorOutlets).where(eq(auditorOutlets.outletId, outletId));
    await tx.delete(outlets).where(eq(outlets.id, outletId));
    return stored;
  });
  await deleteStoredFiles(paths, 'deleteRestaurant');

  revalidatePath('/admin/restaurants');
  revalidatePath('/admin/auditors');
  redirect('/admin/restaurants');
}
