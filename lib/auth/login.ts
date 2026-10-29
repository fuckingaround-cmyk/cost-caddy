import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, type User } from '@/db/schema';
import { verifyPassword } from './password';

// One org today, so email alone resolves the account; verifyCredentials returns null
// (never throws) on any failure so callers can show the design's single error message.
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || user.status !== 'active') return null;

  const valid = await verifyPassword(user.pwdHash, password);
  if (!valid) return null;

  return user;
}
