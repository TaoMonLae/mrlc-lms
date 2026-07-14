import React from 'react';
import { Shield, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PermissionMatrix from '../../components/users/PermissionMatrix';
import {
  ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS, USER_ROLES,
} from '../../lib/permissions';

export default function RolesPermissions() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Roles & Permissions</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Authoritative system access reference. Role rules are shared by the API, navigation, and protected pages.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {USER_ROLES.map((role) => {
          const permissions = ROLE_PERMISSIONS[role];
          const fullAccess = permissions.includes('manage_all');
          return (
            <section key={role} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                    {role === 'STUDENT' || role === 'TEACHER' ? <Users className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{ROLE_LABELS[role]}</h3>
                    <p className="text-[11px] font-medium tracking-wide text-slate-400">{role}</p>
                  </div>
                </div>
                <Badge variant={fullAccess ? 'default' : 'secondary'}>
                  {fullAccess ? 'Full access' : `${permissions.length} grants`}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{ROLE_DESCRIPTIONS[role]}</p>
              {role === 'TEACHER' && (
                <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                  Full-time, part-time, and volunteer are employment types. Their academic data scope comes from class and subject assignments.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-surface-raised dark:bg-surface-indigo">
        <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Access matrix</h3>
        <p className="mb-4 text-sm text-slate-500">This read-only matrix is generated from the same registry used by access checks.</p>
        <PermissionMatrix showAllPermissions />
      </section>
    </div>
  );
}
