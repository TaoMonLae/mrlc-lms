import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser, hasPermission, Permission, UserRole } from '../../lib/permissions';

interface ProtectedRouteProps {
  requiredPermission?: Permission;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ requiredPermission, allowedRoles }: ProtectedRouteProps) {
  const { user } = useUser();

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
