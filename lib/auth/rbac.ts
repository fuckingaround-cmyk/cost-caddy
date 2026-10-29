import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, type User } from '@/db/schema';
import { readSessionCookie } from './cookies';
import { getSession } from './session';

export type Role = User['role'];

// Resolves the signed-in user from the session cookie — never a hardcoded name (R6).
// Returns null for a missing/expired/tampered session, or a suspended/removed account.
export async function getCurrentUser(): Promise<User | null> {
  const cookieValue = await readSessionCookie();
  if (!cookieValue) return null;

  const session = await getSession(cookieValue);
  if (!session) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.status !== 'active') return null;
  return user;
}

export async function requireRole(role: Role | Role[]): Promise<User> {
  const roles = Array.isArray(role) ? role : [role];
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) {
    throw new Error('Unauthorized');
  }
  return user;
}
