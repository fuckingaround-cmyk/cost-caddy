import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { auditorOutlets, users, type User } from '@/db/schema';
import { generatePassword, hashPassword } from './password';
import { endAllSessions } from './session';

export class DuplicateEmailError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'DuplicateEmailError';
  }
}

// A3: name, email, phone, outlets and a password create an account; a duplicate email
// is refused with one clear message. The generated password is returned once — the
// caller must surface it to the admin now, because it is never recoverable again.
export async function createAuditor(input: {
  orgId: string;
  name: string;
  email: string;
  phone?: string;
  outletIds: string[];
  // The design lets the admin type or generate this before the account exists — that's
  // distinct from the reveal-anytime toggle on an already-hashed password, which A3
  // deliberately does not build (EXECUTION.md). Falls back to a random one if omitted.
  password?: string;
}): Promise<{ user: User; password: string }> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, input.orgId), eq(users.email, input.email)))
    .limit(1);
  if (existing) throw new DuplicateEmailError();

  const password = input.password?.trim() || generatePassword();
  const pwdHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      orgId: input.orgId,
      role: 'auditor',
      name: input.name,
      email: input.email,
      phone: input.phone,
      pwdHash,
      mustChangePassword: true,
    })
    .returning();

  if (input.outletIds.length > 0) {
    await db
      .insert(auditorOutlets)
      .values(input.outletIds.map((outletId) => ({ orgId: input.orgId, userId: user.id, outletId })));
  }

  return { user, password };
}

// Admin-initiated reset (A3) — shown once, stored only as a hash. Does not itself end
// sessions; "force sign-out" is its own action on the expanded row.
export async function resetPassword(userId: string): Promise<string> {
  const password = generatePassword();
  const pwdHash = await hashPassword(password);
  await db.update(users).set({ pwdHash, mustChangePassword: true }).where(eq(users.id, userId));
  return password;
}

export async function forceSignOut(userId: string): Promise<void> {
  await endAllSessions(userId);
}

export async function setAuditorStatus(userId: string, status: 'active' | 'suspended' | 'removed'): Promise<void> {
  await db.update(users).set({ status }).where(eq(users.id, userId));
  // A suspended/removed auditor is signed out everywhere, not just refused on next login.
  if (status !== 'active') await endAllSessions(userId);
}
