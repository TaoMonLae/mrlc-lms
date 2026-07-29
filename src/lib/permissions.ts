import { useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import {
  getRolePermissions,
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  roleHasPermission,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  USER_ROLES,
  type Permission,
  type UserRole,
} from '../../shared/permissions';

export type { Permission, UserRole } from '../../shared/permissions';
export {
  getRolePermissions, PERMISSION_CATEGORIES, PERMISSION_LABELS, ROLE_DESCRIPTIONS,
  ROLE_LABELS, ROLE_PERMISSIONS, USER_ROLES,
} from '../../shared/permissions';

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  profilePhotoUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  isExternalLearner?: boolean;
  mustChangePassword?: boolean;
  cursorEffect?: string | null;
  mfaEnabled?: boolean;
  mfaRecommended?: boolean;
  studentId?: string;
  teacherId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  return Boolean(user && user.status === 'ACTIVE' && roleHasPermission(user.role, permission));
}

export function useUser() {
  const { user } = useAuth();
  return { user };
}

export function usePermissions() {
  const { user } = useUser();
  return useMemo(() => ({
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    getPermissions: () => getRolePermissions(user?.role || 'STUDENT'),
    getPermissionCategories: () => getUserPermissionCategories(user),
    isAdmin: user?.role === 'ADMIN',
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    isLibrarian: user?.role === 'LIBRARIAN',
    isAccountant: user?.role === 'ACCOUNTANT',
    isCaseWorker: user?.role === 'CASE_WORKER',
    isStaff: user?.role === 'STAFF',
    user,
  }), [user]);
}

export function hasAnyPermission(user: User | null | undefined, permissions: Permission[]): boolean {
  return Boolean(user && user.status === 'ACTIVE' && permissions.some((permission) => roleHasPermission(user.role, permission)));
}

export function hasAllPermissions(user: User | null | undefined, permissions: Permission[]): boolean {
  return Boolean(user && user.status === 'ACTIVE' && permissions.every((permission) => roleHasPermission(user.role, permission)));
}

export function getUserPermissionCategories(user: User | null | undefined): string[] {
  if (!user || user.status !== 'ACTIVE') return [];
  if (roleHasPermission(user.role, 'manage_all')) return Object.keys(PERMISSION_CATEGORIES);
  return Object.entries(PERMISSION_CATEGORIES)
    .filter(([, permissions]) => permissions.some((permission) => roleHasPermission(user.role, permission)))
    .map(([category]) => category);
}

export const canManageUsers = (user: User | null | undefined) => hasPermission(user, 'manage_users');
export const canManageStudents = (user: User | null | undefined) => hasPermission(user, 'manage_students');
export const canManageTeachers = (user: User | null | undefined) => hasPermission(user, 'manage_teachers');
export const canManageFees = (user: User | null | undefined) => hasPermission(user, 'manage_fees');
export const canManageAnnouncements = (user: User | null | undefined) => hasPermission(user, 'manage_announcements');
export const canManageVideos = (user: User | null | undefined) => hasPermission(user, 'manage_videos');
export const canViewReports = (user: User | null | undefined) => hasPermission(user, 'view_reports');
export const canExportData = (user: User | null | undefined) => hasPermission(user, 'export_data');
export const canManageLibrary = (user: User | null | undefined) => hasPermission(user, 'manage_library');
