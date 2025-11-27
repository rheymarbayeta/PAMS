'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Check if user has any of the allowed roles
      if (allowedRoles && user && !hasRole(allowedRoles)) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, loading, user, allowedRoles, router, hasRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Check if user has any of the allowed roles
  if (allowedRoles && user && !hasRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>;
};

