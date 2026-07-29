import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { hasPermission, Permission, UserRole } from '../../lib/permissions';
import { isExternalLearnerAppPathAllowed } from '@/shared/externalLearnerAccess';
import { shouldForcePasswordChange } from '@/shared/accountAccess';

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

  // Enforce temporary-password replacement for every protected experience,
  // including the standalone Language Quest shell. AppLayout also keeps this
  // guard as defense in depth for the wider LMS.
  if (shouldForcePasswordChange(user.mustChangePassword, location.pathname)) {
    return <Navigate to="/change-password" replace />;
  }

  // Public self-signups are intentionally scoped to Language Quest. This UI
  // guard complements the server-side API allowlist, so an outside learner
  // cannot wander into private school modules.
  if (
    user.isExternalLearner
    && !isExternalLearnerAppPathAllowed(location.pathname)
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

/**
 * Covers public and protected routes alike. Anonymous visitors may still use
 * genuinely public pages, but once a public learner is signed in their browser
 * is kept inside the learning-only experience.
 */
export function ExternalLearnerBoundary({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (
    !isLoading
    && user?.isExternalLearner
    && !isExternalLearnerAppPathAllowed(location.pathname)
  ) {
    return <Navigate to="/games/language-quest" replace />;
  }

  return <>{children}</>;
}
