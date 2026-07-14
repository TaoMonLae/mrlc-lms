export const USER_ROLES = [
  'ADMIN', 'TEACHER', 'STUDENT', 'STAFF', 'ACCOUNTANT', 'CASE_WORKER', 'LIBRARIAN',
] as const;

export type UserRole = typeof USER_ROLES[number];

export const PERMISSIONS = [
  'manage_users', 'manage_roles', 'view_users', 'reset_passwords',
  'manage_students', 'view_students', 'view_own_student', 'manage_admissions', 'view_admissions',
  'manage_teachers', 'view_teachers', 'view_assigned_classes', 'view_assigned_students',
  'manage_classes', 'view_classes', 'manage_subjects', 'view_subjects',
  'manage_exams', 'manage_assigned_exams', 'view_exams', 'view_own_exams', 'view_own_results',
  'manage_results', 'view_results', 'view_assigned_reports',
  'manage_grades', 'view_grades', 'view_own_grades', 'manage_ged_readiness',
  'issue_documents', 'view_own_documents',
  'manage_attendance', 'manage_assigned_attendance', 'view_attendance', 'view_own_attendance',
  'manage_fees', 'view_fees', 'view_own_fees', 'manage_fee_structures', 'view_fee_structures',
  'manage_payments', 'view_payments',
  'manage_donations', 'view_donations', 'manage_campaigns', 'view_campaigns',
  'view_expenses', 'manage_expenses', 'approve_expenses', 'manage_vendors', 'view_vendors',
  'manage_budgets', 'view_budgets', 'view_financial_reports',
  'manage_duties', 'view_duties', 'view_own_duties',
  'manage_library', 'manage_own_library', 'view_library', 'manage_books', 'view_books',
  'manage_ebooks', 'manage_documents', 'view_documents',
  'manage_announcements', 'view_announcements', 'send_notifications',
  'manage_cases', 'view_cases', 'manage_own_cases', 'manage_conduct', 'view_conduct',
  'manage_interventions', 'view_interventions',
  'manage_timetable', 'view_timetable', 'view_audit_logs', 'export_data', 'view_reports',
  'manage_settings', 'manage_videos', 'view_videos', 'manage_all',
] as const;

export type Permission = typeof PERMISSIONS[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  STAFF: 'Staff',
  ACCOUNTANT: 'Accountant',
  CASE_WORKER: 'Case Worker',
  LIBRARIAN: 'Librarian',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Full system administration, configuration, auditing, and unrestricted module access.',
  TEACHER: 'Assigned classes, teaching content, assessment, attendance, reports, and student learning workflows.',
  STUDENT: 'Personal learning, attendance, assessments, results, fees, documents, and assigned resources.',
  STAFF: 'Front-desk and general operations access without unrestricted administrative control.',
  ACCOUNTANT: 'Fees, payments, expenses, budgets, donations, vendors, payroll-related finance, and reporting.',
  CASE_WORKER: 'Restricted student support, cases, interventions, conduct records, and relevant student information.',
  LIBRARIAN: 'Physical and electronic libraries, resources, books, documents, and reader support.',
};

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: ['manage_all'],
  TEACHER: [
    'view_assigned_classes', 'view_assigned_students', 'view_students', 'view_teachers', 'view_classes',
    'view_subjects', 'view_exams', 'view_results', 'view_assigned_reports', 'view_reports', 'view_attendance',
    'view_library', 'view_books', 'view_documents', 'view_announcements', 'view_timetable', 'view_videos',
    'manage_assigned_attendance', 'manage_assigned_exams', 'manage_grades', 'view_grades',
    'manage_ged_readiness', 'issue_documents', 'manage_own_library', 'manage_ebooks',
    'manage_announcements', 'manage_videos', 'export_data', 'send_notifications',
    'manage_conduct', 'view_conduct', 'manage_interventions', 'view_interventions',
  ],
  STUDENT: [
    'view_own_student', 'view_library', 'view_books', 'view_documents', 'view_announcements',
    'view_timetable', 'view_videos', 'view_own_fees', 'view_own_attendance', 'view_own_exams',
    'view_own_results', 'view_own_grades', 'view_own_documents', 'view_own_duties',
  ],
  STAFF: [
    'view_students', 'view_admissions', 'manage_admissions', 'view_teachers', 'view_classes',
    'view_subjects', 'view_library', 'view_announcements', 'view_timetable', 'export_data',
    'view_expenses', 'view_vendors', 'view_budgets', 'view_fee_structures', 'view_financial_reports',
    'manage_duties', 'view_duties', 'view_donations', 'view_campaigns', 'manage_conduct', 'view_conduct',
  ],
  ACCOUNTANT: [
    'manage_fees', 'manage_payments', 'view_fees', 'view_payments', 'view_students', 'export_data',
    'manage_fee_structures', 'view_fee_structures', 'view_expenses', 'manage_expenses',
    'approve_expenses', 'manage_vendors', 'view_vendors', 'view_budgets', 'manage_budgets',
    'view_financial_reports', 'manage_donations', 'view_donations', 'manage_campaigns', 'view_campaigns',
  ],
  CASE_WORKER: [
    'manage_cases', 'manage_own_cases', 'view_cases', 'view_students', 'view_documents',
    'export_data', 'manage_conduct', 'view_conduct', 'manage_interventions', 'view_interventions',
  ],
  LIBRARIAN: [
    'manage_library', 'manage_books', 'manage_ebooks', 'manage_documents', 'view_library',
    'view_books', 'view_documents', 'view_students', 'view_teachers', 'export_data',
  ],
};

export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: ['manage_users', 'manage_roles', 'view_users', 'reset_passwords'],
  STUDENT_MANAGEMENT: ['manage_students', 'view_students', 'view_own_student', 'manage_admissions', 'view_admissions'],
  TEACHER_MANAGEMENT: ['manage_teachers', 'view_teachers', 'view_assigned_classes', 'view_assigned_students'],
  ACADEMIC_MANAGEMENT: ['manage_classes', 'view_classes', 'manage_subjects', 'view_subjects'],
  EXAM_MANAGEMENT: ['manage_exams', 'manage_assigned_exams', 'view_exams', 'view_own_exams', 'view_own_results', 'manage_results', 'view_results', 'view_assigned_reports'],
  GRADEBOOK: ['manage_grades', 'view_grades', 'view_own_grades', 'manage_ged_readiness'],
  DOCUMENTS: ['issue_documents', 'view_own_documents', 'manage_documents', 'view_documents'],
  ATTENDANCE_MANAGEMENT: ['manage_attendance', 'manage_assigned_attendance', 'view_attendance', 'view_own_attendance'],
  FINANCIAL_MANAGEMENT: ['manage_fees', 'view_fees', 'view_own_fees', 'manage_payments', 'view_payments', 'manage_fee_structures', 'view_fee_structures'],
  EXPENSE_MANAGEMENT: ['view_expenses', 'manage_expenses', 'approve_expenses', 'manage_vendors', 'view_vendors', 'manage_budgets', 'view_budgets', 'view_financial_reports'],
  DONATION_MANAGEMENT: ['manage_donations', 'view_donations', 'manage_campaigns', 'view_campaigns'],
  DUTY_MANAGEMENT: ['manage_duties', 'view_duties', 'view_own_duties'],
  LIBRARY_MANAGEMENT: ['manage_library', 'manage_own_library', 'view_library', 'manage_books', 'view_books', 'manage_ebooks'],
  COMMUNICATIONS: ['manage_announcements', 'view_announcements', 'send_notifications'],
  CASE_MANAGEMENT: ['manage_cases', 'view_cases', 'manage_own_cases', 'manage_interventions', 'view_interventions'],
  CONDUCT_MANAGEMENT: ['manage_conduct', 'view_conduct'],
  SYSTEM_MANAGEMENT: ['manage_timetable', 'view_timetable', 'view_audit_logs', 'export_data', 'view_reports', 'manage_settings'],
  CONTENT_MANAGEMENT: ['manage_videos', 'view_videos'],
  SUPER_ADMIN: ['manage_all'],
} as const satisfies Record<string, readonly Permission[]>;

export const PERMISSION_LABELS: Record<Permission, string> = {
  manage_users: 'Manage Users', manage_roles: 'Manage Roles', view_users: 'View Users', reset_passwords: 'Reset Passwords',
  manage_students: 'Manage Students', view_students: 'View Students', view_own_student: 'View Own Profile',
  manage_admissions: 'Manage Admissions', view_admissions: 'View Admissions', manage_teachers: 'Manage Teachers',
  view_teachers: 'View Teachers', view_assigned_classes: 'View Assigned Classes', view_assigned_students: 'View Assigned Students',
  manage_classes: 'Manage Classes', view_classes: 'View Classes', manage_subjects: 'Manage Subjects', view_subjects: 'View Subjects',
  manage_exams: 'Manage All Exams', manage_assigned_exams: 'Manage Assigned Exams', view_exams: 'View Exams',
  view_own_exams: 'View Own Exams', view_own_results: 'View Own Results', manage_results: 'Manage Results',
  view_results: 'View Results', view_assigned_reports: 'View Assigned Reports', manage_grades: 'Manage Grades',
  view_grades: 'View Grades', view_own_grades: 'View Own Grades', manage_ged_readiness: 'Manage GED Readiness',
  issue_documents: 'Issue Documents', view_own_documents: 'View Own Documents', manage_attendance: 'Manage All Attendance',
  manage_assigned_attendance: 'Manage Assigned Attendance', view_attendance: 'View Attendance', view_own_attendance: 'View Own Attendance',
  manage_fees: 'Manage Fees', view_fees: 'View Fees', view_own_fees: 'View Own Fees', manage_fee_structures: 'Manage Fee Structures',
  view_fee_structures: 'View Fee Structures', manage_payments: 'Manage Payments', view_payments: 'View Payments',
  manage_donations: 'Manage Donations', view_donations: 'View Donations', manage_campaigns: 'Manage Campaigns', view_campaigns: 'View Campaigns',
  view_expenses: 'View Expenses', manage_expenses: 'Manage Expenses', approve_expenses: 'Approve Expenses',
  manage_vendors: 'Manage Vendors', view_vendors: 'View Vendors', manage_budgets: 'Manage Budgets', view_budgets: 'View Budgets',
  view_financial_reports: 'View Financial Reports', manage_duties: 'Manage Student Duties', view_duties: 'View Student Duties',
  view_own_duties: 'View Own Duties', manage_library: 'Manage Library', manage_own_library: 'Manage Own Library',
  view_library: 'View Library', manage_books: 'Manage Books', view_books: 'View Books', manage_ebooks: 'Manage E-books',
  manage_documents: 'Manage Documents', view_documents: 'View Documents', manage_announcements: 'Manage Announcements',
  view_announcements: 'View Announcements', send_notifications: 'Send Notifications', manage_cases: 'Manage Cases',
  view_cases: 'View Cases', manage_own_cases: 'Manage Own Cases', manage_conduct: 'Manage Conduct/Discipline',
  manage_interventions: 'Manage Student Interventions', view_interventions: 'View Student Success',
  view_conduct: 'View Conduct/Discipline', manage_timetable: 'Manage Timetable', view_timetable: 'View Timetable',
  view_audit_logs: 'View Audit Logs', export_data: 'Export Data', view_reports: 'View Reports', manage_settings: 'Manage Settings',
  manage_videos: 'Manage Videos', view_videos: 'View Videos', manage_all: 'Full System Access',
};

export function roleHasPermission(role: UserRole | string | null | undefined, permission: Permission): boolean {
  if (!role || !USER_ROLES.includes(role as UserRole)) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions.includes('manage_all') || permissions.includes(permission);
}

export function rolesWithPermission(permission: Permission): UserRole[] {
  return USER_ROLES.filter((role) => roleHasPermission(role, permission));
}

export function getRolePermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
