import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRole, Permission, PERMISSION_LABELS, ROLE_LABELS, ROLE_PERMISSIONS } from '@/src/lib/permissions';
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
    <div className={`min-w-0 space-y-4 ${className}`}>
      <div className="text-sm text-muted-foreground">
        <p>Overview of role permissions across the system. Green checkmarks indicate access.</p>
      </div>

      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <table className="min-w-[900px] w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-sm font-semibold text-foreground bg-muted/50">
                Role
              </th>
              {permissionsToShow.map(permission => (
                <th key={permission} className="text-center p-2 text-xs font-medium text-muted-foreground bg-muted/50" title={PERMISSION_LABELS[permission]}>
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
                <tr key={role} className="border-b border-border hover:bg-muted/50">
                  <td className="p-3 font-medium text-sm text-foreground">
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
        <Badge variant="outline" className="bg-muted/50 text-foreground border-border">
          <X className="h-3 w-3 mr-1" /> No Permission
        </Badge>
      </div>
    </div>
  );
}
