'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedUsernames?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowedUsernames,
}) => {
  const { user, isAuthenticated, loading, hasRole } = useAuth();
  const router = useRouter();

  const isUsernameAllowed =
    !allowedUsernames ||
    (user && allowedUsernames.some((name) => name.toLowerCase() === user.username.toLowerCase()));

  const isRoleAllowed = !allowedRoles || (user && hasRole(allowedRoles));

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (user && (!isRoleAllowed || !isUsernameAllowed)) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, loading, user, isRoleAllowed, isUsernameAllowed, router]);

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

  if (user && (!isRoleAllowed || !isUsernameAllowed)) {
    return null;
  }

  return <>{children}</>;
};

