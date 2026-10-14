import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { audits, brands, outlets } from '@/db/schema';

export type RestaurantRow = {
  id: string;
  name: string;
  city: string | null;
  activeCount: number;
  reviewCount: number;
  publishedCount: number;
};

// A2: each row shows its active / in-review / published counts.
export async function listRestaurants(orgId: string): Promise<RestaurantRow[]> {
  const rows = await db
    .select({
      id: outlets.id,
      name: outlets.name,
      city: outlets.city,
      activeCount: sql<number>`count(*) filter (where ${audits.status} in ('assigned','in-progress'))`,
      reviewCount: sql<number>`count(*) filter (where ${audits.status} = 'submitted')`,
      publishedCount: sql<number>`count(*) filter (where ${audits.status} = 'published')`,
    })
    .from(outlets)
    .leftJoin(audits, eq(audits.outletId, outlets.id))
    .where(eq(outlets.orgId, orgId))
    .groupBy(outlets.id)
    .orderBy(outlets.createdAt);

  return rows.map((r) => ({
    ...r,
    activeCount: Number(r.activeCount),
    reviewCount: Number(r.reviewCount),
    publishedCount: Number(r.publishedCount),
  }));
}

export async function listOutletOptions(orgId: string): Promise<{ id: string; name: string; city: string | null }[]> {
  return db.select({ id: outlets.id, name: outlets.name, city: outlets.city }).from(outlets).where(eq(outlets.orgId, orgId)).orderBy(outlets.name);
}

export async function getRestaurant(orgId: string, outletId: string) {
  const [row] = await db
    .select()
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);
  if (!row || row.orgId !== orgId) return null;
  return row;
}

// Every outlet hangs off a brand (CLAUDE.md "brand -> outlet hierarchy"). There's no
// brand-picker UI yet (not part of A1-A5), so a restaurant is created under the org's
// one default brand, created lazily the first time it's needed.
export async function getOrCreateDefaultBrand(orgId: string): Promise<string> {
  const [existing] = await db.select({ id: brands.id }).from(brands).where(eq(brands.orgId, orgId)).limit(1);
  if (existing) return existing.id;

  const [created] = await db.insert(brands).values({ orgId, name: 'Default' }).returning({ id: brands.id });
  return created.id;
}

export async function countOutletAudits(outletId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(audits).where(eq(audits.outletId, outletId));
  return Number(row.n);
}
