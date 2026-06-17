import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { hasPermission, Permission, UserRole } from '../../lib/permissions';

interface ProtectedRouteProps {
  requiredPermission?: Permission;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ requiredPermission, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

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

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !hasPermission(user, 'manage_all')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
