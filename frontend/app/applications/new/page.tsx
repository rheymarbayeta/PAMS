'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy application form — redirects to wizard (Phase 8 consolidation). */
export default function LegacyNewApplicationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/applications/create');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-600 text-sm">
      Redirecting to application wizard…
    </div>
  );
}
