import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
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
  const { user, isLoading, isSessionVerified, retrySessionValidation } = useAuth();
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
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.status !== 'ACTIVE') {
    return <Navigate to="/unauthorized" replace />;
  }

  const requiresElevatedAccess = Boolean(requiredPermission || allowedRoles || strictRoles);
  if (requiresElevatedAccess && !isSessionVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Session verification unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            We kept you signed in, but privileged access stays locked until the server confirms your account.
          </p>
          <button
            type="button"
            onClick={retrySessionValidation}
            className="mt-5 min-h-11 rounded-lg bg-aubergine-600 px-5 text-sm font-bold text-white hover:bg-aubergine-700"
          >
            Retry verification
          </button>
        </div>
      </div>
    );
  }

  // Enforce temporary-password replacement for every protected experience,
  // including the standalone Learning Quest shell. AppLayout also keeps this
  // guard as defense in depth for the wider LMS.
  if (shouldForcePasswordChange(user.mustChangePassword, location.pathname)) {
    return <Navigate to="/change-password" replace />;
  }

  // Public self-signups are intentionally scoped to Learning Quest. This UI
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
