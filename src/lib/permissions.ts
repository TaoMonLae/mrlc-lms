import { useAuth } from '../providers/AuthProvider';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'STAFF' | 'ACCOUNTANT' | 'CASE_WORKER' | 'LIBRARIAN';

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  profilePhotoUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  mustChangePassword?: boolean;
  studentId?: string;
  teacherId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type Permission =
  // User Management
  | 'manage_users'
  | 'manage_roles'
  | 'view_users'
  | 'reset_passwords'
  // Student Management
  | 'manage_students'
  | 'view_students'
  | 'view_own_student'
  | 'manage_admissions'
  | 'view_admissions'
  // Teacher Management
  | 'manage_teachers'
  | 'view_teachers'
  | 'view_assigned_classes'
  | 'view_assigned_students'
  // Academic Management
  | 'manage_classes'
  | 'view_classes'
  | 'manage_subjects'
  | 'view_subjects'
  // Exam & Assessment
  | 'manage_exams'
  | 'manage_assigned_exams'
  | 'view_exams'
  | 'view_own_exams'
  | 'view_own_results'
  | 'manage_results'
  | 'view_results'
  | 'view_assigned_reports'
  // Gradebook & GED readiness
  | 'manage_grades'
  | 'view_grades'
  | 'view_own_grades'
  | 'manage_ged_readiness'
  // Official documents (report cards, transcripts, certificates)
  | 'issue_documents'
  | 'view_own_documents'
  // Attendance
  | 'manage_attendance'
  | 'manage_assigned_attendance'
  | 'view_attendance'
  | 'view_own_attendance'
  // Financial
  | 'manage_fees'
  | 'view_fees'
  | 'view_own_fees'
  | 'manage_payments'
  | 'view_payments'
  // Library & Resources
  | 'manage_library'
  | 'manage_own_library'
  | 'view_library'
  | 'manage_books'
  | 'view_books'
  | 'manage_ebooks'
  | 'manage_documents'
  | 'view_documents'
  // Communications
  | 'manage_announcements'
  | 'view_announcements'
  | 'send_notifications'
  // Cases & Support
  | 'manage_cases'
  | 'view_cases'
  | 'manage_own_cases'
  // System & Reports
  | 'manage_timetable'
  | 'view_timetable'
  | 'view_audit_logs'
  | 'export_data'
  | 'view_reports'
  | 'manage_settings'
  // Video Content
  | 'manage_videos'
  | 'view_videos'
  // Super admin permission
  | 'manage_all';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ['manage_all'],
  TEACHER: [
    // View access
    'view_assigned_classes',
    'view_assigned_students',
    'view_students',
    'view_classes',
    'view_subjects',
    'view_exams',
    'view_results',
    'view_assigned_reports',
    'view_reports',
    'view_attendance',
    'view_library',
    'view_books',
    'view_documents',
    'view_announcements',
    'view_timetable',
    'view_videos',
    // Management for assigned content
    'manage_assigned_attendance',
    'manage_assigned_exams',
    'manage_grades',
    'view_grades',
    'manage_ged_readiness',
    'issue_documents',
    'manage_own_library',
    'manage_ebooks',
    'manage_announcements',
    'manage_videos',
    // Additional capabilities
    'export_data',
    'send_notifications',
  ],
  STUDENT: [
    'view_own_student',
    'view_library',
    'view_books',
    'view_documents',
    'view_announcements',
    'view_timetable',
    'view_videos',
    'view_own_fees',
    'view_own_attendance',
    'view_own_exams',
    'view_own_results',
    'view_own_grades',
    'view_own_documents',
  ],
  STAFF: [
    'view_students',
    'view_admissions',
    'manage_admissions',
    'view_teachers',
    'view_classes',
    'view_subjects',
    'view_library',
    'view_announcements',
    'view_timetable',
    'export_data',
  ],
  ACCOUNTANT: [
    'manage_fees',
    'manage_payments',
    'view_fees',
    'view_payments',
    'view_students',
    'export_data',
  ],
  CASE_WORKER: [
    'manage_cases',
    'manage_own_cases',
    'view_cases',
    'view_students',
    'view_documents',
    'export_data',
  ],
  LIBRARIAN: [
    'manage_library',
    'manage_books',
    'manage_ebooks',
    'manage_documents',
    'view_library',
    'view_books',
    'view_documents',
    'view_students',
    'view_teachers',
    'export_data',
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  STAFF: 'Staff',
  ACCOUNTANT: 'Accountant',
  CASE_WORKER: 'Case Worker',
  LIBRARIAN: 'Librarian',
};

// Export ROLE_PERMISSIONS for use in role management UI
export { ROLE_PERMISSIONS };

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
    user: user,
  };
}

// Permission categories for UI organization
export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: ['manage_users', 'manage_roles', 'view_users', 'reset_passwords'],
  STUDENT_MANAGEMENT: ['manage_students', 'view_students', 'view_own_student', 'manage_admissions', 'view_admissions'],
  TEACHER_MANAGEMENT: ['manage_teachers', 'view_teachers'],
  ACADEMIC_MANAGEMENT: ['manage_classes', 'view_classes', 'manage_subjects', 'view_subjects'],
  EXAM_MANAGEMENT: ['manage_exams', 'manage_assigned_exams', 'view_exams', 'view_own_exams', 'view_own_results', 'manage_results', 'view_results', 'view_assigned_reports'],
  ATTENDANCE_MANAGEMENT: ['manage_attendance', 'manage_assigned_attendance', 'view_attendance', 'view_own_attendance'],
  FINANCIAL_MANAGEMENT: ['manage_fees', 'view_fees', 'view_own_fees', 'manage_payments', 'view_payments'],
 _LIBRARY_MANAGEMENT: ['manage_library', 'manage_own_library', 'view_library', 'manage_books', 'view_books', 'manage_ebooks', 'manage_documents', 'view_documents'],
  COMMUNICATIONS: ['manage_announcements', 'view_announcements', 'send_notifications'],
  CASE_MANAGEMENT: ['manage_cases', 'view_cases', 'manage_own_cases'],
  SYSTEM_MANAGEMENT: ['manage_timetable', 'view_timetable', 'view_audit_logs', 'export_data', 'view_reports', 'manage_settings'],
  CONTENT_MANAGEMENT: ['manage_videos', 'view_videos'],
  SUPER_ADMIN: ['manage_all'],
} as const;

// Get user-friendly permission labels
export const PERMISSION_LABELS: Record<Permission, string> = {
  'manage_users': 'Manage Users',
  'manage_roles': 'Manage Roles',
  'view_users': 'View Users',
  'reset_passwords': 'Reset Passwords',
  'manage_students': 'Manage Students',
  'view_students': 'View Students',
  'view_own_student': 'View Own Profile',
  'manage_admissions': 'Manage Admissions',
  'view_admissions': 'View Admissions',
  'manage_teachers': 'Manage Teachers',
  'view_teachers': 'View Teachers',
  'view_assigned_classes': 'View Assigned Classes',
  'view_assigned_students': 'View Assigned Students',
  'manage_classes': 'Manage Classes',
  'view_classes': 'View Classes',
  'manage_subjects': 'Manage Subjects',
  'view_subjects': 'View Subjects',
  'manage_exams': 'Manage All Exams',
  'manage_assigned_exams': 'Manage Assigned Exams',
  'view_exams': 'View Exams',
  'view_own_exams': 'View Own Exams',
  'view_own_results': 'View Own Results',
  'manage_results': 'Manage Results',
  'view_results': 'View Results',
  'view_assigned_reports': 'View Assigned Reports',
  'manage_attendance': 'Manage All Attendance',
  'manage_assigned_attendance': 'Manage Assigned Attendance',
  'view_attendance': 'View Attendance',
  'view_own_attendance': 'View Own Attendance',
  'manage_fees': 'Manage Fees',
  'view_fees': 'View Fees',
  'view_own_fees': 'View Own Fees',
  'manage_payments': 'Manage Payments',
  'view_payments': 'View Payments',
  'manage_library': 'Manage Library',
  'manage_own_library': 'Manage Own Library',
  'view_library': 'View Library',
  'manage_books': 'Manage Books',
  'view_books': 'View Books',
  'manage_ebooks': 'Manage E-books',
  'manage_documents': 'Manage Documents',
  'view_documents': 'View Documents',
  'manage_announcements': 'Manage Announcements',
  'view_announcements': 'View Announcements',
  'send_notifications': 'Send Notifications',
  'manage_cases': 'Manage Cases',
  'view_cases': 'View Cases',
  'manage_own_cases': 'Manage Own Cases',
  'manage_timetable': 'Manage Timetable',
  'view_timetable': 'View Timetable',
  'view_audit_logs': 'View Audit Logs',
  'export_data': 'Export Data',
  'view_reports': 'View Reports',
  'manage_settings': 'Manage Settings',
  'manage_videos': 'Manage Videos',
  'view_videos': 'View Videos',
  'manage_all': 'Full System Access',
};

// Get all permissions for a specific role
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Check if user has any of the specified permissions
export function hasAnyPermission(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  if (user.status !== 'ACTIVE') return false;

  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  if (userPermissions.includes('manage_all')) return true;

  return permissions.some(permission => userPermissions.includes(permission));
}

// Check if user has all of the specified permissions
export function hasAllPermissions(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  if (user.status !== 'ACTIVE') return false;

  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  if (userPermissions.includes('manage_all')) return true;

  return permissions.every(permission => userPermissions.includes(permission));
}

// Get a list of permission categories a user has access to
export function getUserPermissionCategories(user: User | null | undefined): string[] {
  if (!user || user.status !== 'ACTIVE') return [];

  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  if (userPermissions.includes('manage_all')) {
    return Object.keys(PERMISSION_CATEGORIES);
  }

  const categories: string[] = [];
  for (const [category, categoryPermissions] of Object.entries(PERMISSION_CATEGORIES)) {
    if (categoryPermissions.some((perm: Permission) => userPermissions.includes(perm))) {
      categories.push(category);
    }
  }

  return categories;
}

// Role-specific helper functions for common checks
export function canManageUsers(user: User | null | undefined): boolean {
  return hasPermission(user, 'manage_users');
}

export function canManageStudents(user: User | null | undefined): boolean {
  return hasPermission(user, 'manage_students') || hasPermission(user, 'manage_all');
}

export function canManageTeachers(user: User | null | undefined): boolean {
  return hasPermission(user, 'manage_teachers') || hasPermission(user, 'manage_all');
}

export function canManageFees(user: User | null | undefined): boolean {
  return hasPermission(user, 'manage_fees') || hasPermission(user, 'manage_all');
}

export function canManageAnnouncements(user: User | null | undefined): boolean {
  return hasPermission(user, 'manage_announcements') || hasPermission(user, 'manage_all');
}

export function canManageVideos(user: User | null | undefined): boolean {
  return hasPermission(user, 'manage_videos') || hasPermission(user, 'manage_all');
}

export function canViewReports(user: User | null | undefined): boolean {
  return hasPermission(user, 'view_reports') || hasPermission(user, 'manage_all');
}

export function canExportData(user: User | null | undefined): boolean {
  return hasPermission(user, 'export_data') || hasPermission(user, 'manage_all');
}

export function canManageLibrary(user: User | null | undefined): boolean {
  return hasPermission(user, 'manage_library') || hasPermission(user, 'manage_all');
}
