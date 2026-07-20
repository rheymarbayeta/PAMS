'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getHomePath } from '@/utils/homePath';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** Prefer permissions over roles when both provided */
  allowedPermissions?: string[];
  /** @deprecated Use allowedPermissions — kept for temporary compatibility */
  allowedUsernames?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowedPermissions,
  allowedUsernames,
}) => {
  const { user, isAuthenticated, loading, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  const isUsernameAllowed =
    !allowedUsernames ||
    (user && allowedUsernames.some((name) => name.toLowerCase() === user.username.toLowerCase()));

  const isRoleAllowed = !allowedRoles || (user && hasRole(allowedRoles));
  const isPermissionAllowed =
    !allowedPermissions || (user && hasPermission(allowedPermissions));

  const isAllowed = isRoleAllowed && isPermissionAllowed && isUsernameAllowed;

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (user && !isAllowed) {
        router.push(getHomePath(user));
      }
    }
  }, [isAuthenticated, loading, user, isAllowed, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user && !isAllowed) {
    return null;
  }

  return <>{children}</>;
};
