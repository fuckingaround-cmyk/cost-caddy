'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { auditorOutlets } from '@/db/schema';
import {
  DuplicateEmailError,
  createAuditor as createAuditorAccount,
  forceSignOut as forceSignOutAccount,
  requireRole,
  resetPassword as resetPasswordAccount,
  setAuditorStatus as setAuditorStatusAccount,
} from '@/lib/auth';

export type CreateAuditorState = { error?: string; created?: { name: string; email: string; password: string } };

// A3: name, email, phone, outlets and a password create an account; a duplicate email
// is refused with one clear message; the generated password is shown ONCE.
export async function createAuditor(
  _prev: CreateAuditorState,
  formData: FormData,
): Promise<CreateAuditorState> {
  const admin = await requireRole('super_admin');
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const outletIds = formData.getAll('outletIds').map(String);

  if (!name) return { error: "Enter the auditor's full name" };
  if (!email.includes('@')) return { error: 'Enter a valid work email — this is their login ID' };
  if (!password) return { error: 'Set or generate a temporary password' };

  try {
    const { user } = await createAuditorAccount({
      orgId: admin.orgId,
      name,
      email,
      phone: phone || undefined,
      outletIds,
      password,
    });
    revalidatePath('/admin/auditors');
    return { created: { name: user.name, email: user.email, password } };
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return { error: 'An auditor already exists with that email' };
    }
    throw err;
  }
}

export async function resetAuditorPassword(userId: string): Promise<string> {
  await requireRole('super_admin');
  const password = await resetPasswordAccount(userId);
  revalidatePath('/admin/auditors');
  return password;
}

export async function forceSignOutAuditor(userId: string): Promise<void> {
  await requireRole('super_admin');
  await forceSignOutAccount(userId);
  revalidatePath('/admin/auditors');
}

export async function setAuditorStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
  await requireRole('super_admin');
  await setAuditorStatusAccount(userId, status);
  revalidatePath('/admin/auditors');
}

// "Remove" is a distinct, terminal status from "suspended" (see plan: audits.auditorId is
// notNull with no cascade, so the user row itself can't be deleted without orphaning
// submitted audits) — but unlike suspend, removed is not reactivatable from the UI and the
// email can't log in again. Force sign-out + status change revokes login immediately while
// leaving submitted audits intact.
export async function removeAuditor(userId: string): Promise<void> {
  await requireRole('super_admin');
  await setAuditorStatusAccount(userId, 'removed');
  await forceSignOutAccount(userId);
  revalidatePath('/admin/auditors');
}

export async function toggleAuditorOutlet(userId: string, outletId: string, on: boolean): Promise<void> {
  const admin = await requireRole('super_admin');
  if (on) {
    await db
      .insert(auditorOutlets)
      .values({ orgId: admin.orgId, userId, outletId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(auditorOutlets)
      .where(and(eq(auditorOutlets.userId, userId), eq(auditorOutlets.outletId, outletId)));
  }
  revalidatePath('/admin/auditors');
}
