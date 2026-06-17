import { useAuth } from '../providers/AuthProvider';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'STAFF' | 'ACCOUNTANT' | 'CASE_WORKER' | 'LIBRARIAN';

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  studentId?: string;
  teacherId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type Permission = 
  | 'manage_users'
  | 'manage_roles'
  | 'manage_students'
  | 'manage_teachers'
  | 'manage_classes'
  | 'manage_subjects'
  | 'manage_exams'
  | 'manage_attendance'
  | 'view_assigned_classes'
  | 'view_assigned_students'
  | 'manage_assigned_attendance'
  | 'manage_assigned_exams'
  | 'view_assigned_reports'
  | 'manage_own_library'
  | 'view_own_student'
  | 'view_library'
  | 'view_reports'
  | 'manage_fees'
  | 'view_own_fees'
  | 'view_own_attendance'
  | 'view_own_exams'
  | 'view_own_results'
  | 'manage_cases'
  | 'manage_announcements'
  | 'view_announcements'
  | 'manage_documents'
  | 'view_documents'
  | 'manage_timetable'
  | 'view_timetable'
  | 'view_audit_logs'
  | 'export_data'
  | 'manage_videos'
  | 'view_videos'
  | 'manage_books'
  | 'view_books'
  | 'manage_all';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ['manage_all'],
  TEACHER: [
    'view_assigned_classes',
    'view_assigned_students',
    'manage_assigned_attendance',
    'manage_assigned_exams',
    'view_assigned_reports',
    'view_reports',
    'manage_own_library',
    'view_library',
    'view_announcements',
    'manage_announcements',
    'view_documents',
    'view_timetable',
    'export_data',
    'manage_videos',
    'view_videos',
  ],
  STUDENT: [
    'view_own_student',
    'view_library',
    'view_own_fees',
    'view_own_attendance',
    'view_own_exams',
    'view_own_results',
    'view_announcements',
    'view_timetable',
    'view_videos',
  ],
  STAFF: [],
  ACCOUNTANT: ['manage_fees'],
  CASE_WORKER: ['manage_cases'],
  LIBRARIAN: ['manage_books', 'view_books'],
};

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.status !== 'ACTIVE') return false;

  const userPermissions = ROLE_PERMISSIONS[user.role] || [];

  // ADMIN has full access via manage_all
  if (userPermissions.includes('manage_all')) return true;

  return userPermissions.includes(permission);
}

/** Returns the currently authenticated user from the real AuthContext. */
export function useUser() {
  const { user } = useAuth();
  return { user };
}

export function usePermissions() {
  const { user } = useUser();

  return {
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    isAdmin: user?.role === 'ADMIN',
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    isLibrarian: user?.role === 'LIBRARIAN',
  };
}
