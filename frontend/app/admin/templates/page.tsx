'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** DOCX templates page — redirects to unified report templates (Phase 8). */
export default function LegacyTemplatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/report-templates');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-600 text-sm">
      Redirecting to Report Templates…
    </div>
  );
}
