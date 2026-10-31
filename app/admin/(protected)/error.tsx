'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Catches requireRole()'s thrown Unauthorized (e.g. a session that expires or is
// revoked between the layout's own auth check and a page's) and sends the admin
// back to login instead of surfacing a raw 500.
export default function AdminProtectedError({ error }: { error: Error & { digest?: string } }) {
  const router = useRouter();

  useEffect(() => {
    if (error.message === 'Unauthorized') {
      router.replace('/admin/login');
    }
  }, [error, router]);

  if (error.message === 'Unauthorized') return null;

  return (
    <div style={{ padding: 'var(--page-padding-desktop)' }}>
      <p>Something went wrong.</p>
      <button type="button" onClick={() => router.refresh()}>
        Try again
      </button>
    </div>
  );
}
