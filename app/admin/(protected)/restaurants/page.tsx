import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listRestaurants } from '@/lib/queries/restaurants';
import { Icon } from '@/components/ui/Icon';
import { NewRestaurantForm } from './NewRestaurantForm';

// A2 — Restaurants list.
export default async function RestaurantsPage() {
  const admin = await requireRole('super_admin');
  const restaurants = await listRestaurants(admin.orgId);

  return (
    <div>
      <NewRestaurantForm />

      {restaurants.length === 0 && (
        <div style={{ color: 'var(--placeholder)', fontSize: 13, padding: '6px 0 30px 0' }}>
          No restaurants yet — create one to get started.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {restaurants.map((r) => (
          <Link
            key={r.id}
            href={`/admin/restaurants/${r.id}`}
            className="cardLink"
            style={{
              border: '1px solid var(--divider)',
              borderRadius: 'var(--radius-card)',
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon>
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1" />
              </Icon>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>{r.city}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
              <Count label="Active" value={r.activeCount} />
              <Count label="To review" value={r.reviewCount} />
              <Count label="Published" value={r.publishedCount} />
              <div style={{ color: 'var(--placeholder)', fontSize: 16 }}>&rsaquo;</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{label}</div>
    </div>
  );
}
