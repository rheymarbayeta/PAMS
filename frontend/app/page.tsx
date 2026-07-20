'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getHomePath } from '@/utils/homePath';

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push(getHomePath(user));
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-12 w-12">
          <div className="h-12 w-12 rounded-full border-4 border-slate-100"></div>
          <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary) transparent transparent transparent' }}></div>
        </div>
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

