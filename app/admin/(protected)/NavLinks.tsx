'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin/restaurants', label: 'Restaurants' },
  { href: '/admin/auditors', label: 'Auditors' },
  { href: '/admin/templates', label: 'Templates' },
];

// Design: active nav item gets bg #f0f4f9, border-left #1e3a5f, weight 700
// (Super Admin Flow.dc.html's superNav render). Needs the current path, so it's a
// client component — the surrounding layout stays a server component.
export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: 'var(--ink)',
              textDecoration: 'none',
              background: active ? 'var(--brand-tint)' : 'transparent',
              borderLeft: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
