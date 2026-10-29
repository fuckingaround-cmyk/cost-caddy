import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { auditorOutlets, outlets, users } from '@/db/schema';

export type AuditorRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended';
  lastActiveAt: Date | null;
  outletIds: string[];
  outletNames: string[];
};

// Removed auditors are terminal and never shown — "removed" means gone from the roster,
// not a third visible state alongside active/suspended (BUG-032 follow-up).
export async function listAuditors(orgId: string): Promise<AuditorRow[]> {
  const auditorRows = await db
    .select()
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.role, 'auditor'), ne(users.status, 'removed')))
    .orderBy(users.createdAt);

  const access = await db
    .select({ userId: auditorOutlets.userId, outletId: auditorOutlets.outletId, outletName: outlets.name, outletCity: outlets.city })
    .from(auditorOutlets)
    .innerJoin(outlets, eq(outlets.id, auditorOutlets.outletId))
    .where(eq(auditorOutlets.orgId, orgId));

  return auditorRows.map((u) => {
    const mine = access.filter((a) => a.userId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.status as 'active' | 'suspended',
      lastActiveAt: u.lastActiveAt,
      outletIds: mine.map((m) => m.outletId),
      outletNames: mine.map((m) => (m.outletCity ? `${m.outletName} (${m.outletCity})` : m.outletName)),
    };
  });
}

export async function listActiveAuditors(orgId: string) {
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.role, 'auditor'), eq(users.status, 'active')))
    .orderBy(users.name);
  return rows;
}
