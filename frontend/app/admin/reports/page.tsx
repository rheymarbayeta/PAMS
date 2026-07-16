'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy permit reports — redirects to primary reports UI (Phase 8). */
export default function LegacyAdminReportsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/reports');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-600 text-sm">
      Redirecting to Permit Reports…
    </div>
  );
}
