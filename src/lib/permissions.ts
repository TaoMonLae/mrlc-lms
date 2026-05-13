export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'STAFF' | 'ACCOUNTANT' | 'CASE_WORKER';

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
  | 'manage_all';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ['manage_all'],
  TEACHER: [
    'view_assigned_classes',
    'view_assigned_students',
    'manage_assigned_attendance',
    'manage_assigned_exams',
    'view_assigned_reports',
    'manage_own_library',
    'view_library',
    'view_announcements',
    'view_documents',
    'view_timetable',
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
  ],
  STAFF: [],
  ACCOUNTANT: ['manage_fees'],
  CASE_WORKER: ['manage_cases'],
};

// Mock current user
export const _MOCK_CURRENT_USER: User = {
  id: 'u1',
  name: 'Admin User',
  username: 'admin',
  email: 'admin@lms.edu',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.status !== 'ACTIVE') return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  
  // ADMIN has full access
  if (userPermissions.includes('manage_all')) return true;
  
  return userPermissions.includes(permission);
}

// In a real app we would use React Context, but we can export a hook for now
export function useUser() {
  // Simulating logged-in user
  return { user: _MOCK_CURRENT_USER };
}

export function usePermissions() {
  const { user } = useUser();
  
  return {
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    isAdmin: user?.role === 'ADMIN',
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
  };
}
