import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRole, Permission, PERMISSION_LABELS, ROLE_PERMISSIONS } from '@/src/lib/permissions';
import { Check, X } from 'lucide-react';

interface PermissionMatrixProps {
  showAllPermissions?: boolean;
  className?: string;
}

// Define the key permissions to show in the matrix
const KEY_PERMISSIONS: Permission[] = [
  'manage_users',
  'manage_students',
  'manage_teachers',
  'manage_classes',
  'manage_exams',
  'manage_fees',
  'manage_library',
  'manage_announcements',
  'manage_videos',
  'view_reports',
  'export_data',
  'manage_all',
];

export default function PermissionMatrix({ showAllPermissions = false, className = '' }: PermissionMatrixProps) {
  const permissionsToShow = showAllPermissions
    ? Object.keys(PERMISSION_LABELS) as Permission[]
    : KEY_PERMISSIONS;

  const hasPermission = (role: UserRole, permission: Permission): boolean => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(permission) || rolePermissions.includes('manage_all');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm text-slate-600 dark:text-slate-400">
        <p>Overview of role permissions across the system. Green checkmarks indicate access.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left p-3 text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800">
                Role
              </th>
              {permissionsToShow.map(permission => (
                <th key={permission} className="text-center p-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800" title={PERMISSION_LABELS[permission]}>
                  <div className="w-full max-w-[100px] truncate">
                    {PERMISSION_LABELS[permission]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => {
              const role = roleKey as UserRole;
              return (
                <tr key={role} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/20">
                  <td className="p-3 font-medium text-sm text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>{roleLabel}</span>
                    </div>
                  </td>
                  {permissionsToShow.map(permission => {
                    const hasAccess = hasPermission(role, permission);
                    return (
                      <td key={permission} className="p-2 text-center">
                        {hasAccess ? (
                          <div className="flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <X className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900">
          <Check className="h-3 w-3 mr-1" /> Has Permission
        </Badge>
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-900">
          <X className="h-3 w-3 mr-1" /> No Permission
        </Badge>
      </div>
    </div>
  );
}