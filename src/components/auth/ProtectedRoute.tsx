import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { hasPermission, Permission, UserRole } from '../../lib/permissions';

interface ProtectedRouteProps {
  requiredPermission?: Permission;
  allowedRoles?: UserRole[];
  strictRoles?: UserRole[];
}

export function ProtectedRoute({ requiredPermission, allowedRoles, strictRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Auth is still being validated (checking existing token on mount)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-aubergine-600 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-500">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status !== 'ACTIVE') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Public self-signups are intentionally scoped to Language Quest. This UI
  // guard complements the server-side API allowlist, so an outside learner
  // cannot wander into private school modules.
  if (
    user.isExternalLearner
    && !location.pathname.startsWith('/games/language-quest')
    && location.pathname !== '/change-password'
  ) {
    return <Navigate to="/games/language-quest" replace />;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !hasPermission(user, 'manage_all')) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (strictRoles && !strictRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
