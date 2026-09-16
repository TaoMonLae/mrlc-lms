export const STUDENT_COUNCIL_ROLES = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'LIBRARIAN',
  'SECRETARY',
  'HOSTEL_MONITOR_BOYS',
  'HOSTEL_MONITOR_GIRLS',
  'RESOURCE_MONITOR',
] as const;

export type StudentCouncilRole = typeof STUDENT_COUNCIL_ROLES[number];

export const STUDENT_COUNCIL_ROLE_LABELS: Record<StudentCouncilRole, string> = {
  PRESIDENT: 'President',
  VICE_PRESIDENT: 'Vice President',
  LIBRARIAN: 'Librarian',
  SECRETARY: 'Secretary',
  HOSTEL_MONITOR_BOYS: "Boys' Hostel Monitor",
  HOSTEL_MONITOR_GIRLS: "Girls' Hostel Monitor",
  RESOURCE_MONITOR: 'Resource Monitor',
};

export function isStudentCouncilRole(value: unknown): value is StudentCouncilRole {
  return typeof value === 'string' && STUDENT_COUNCIL_ROLES.includes(value as StudentCouncilRole);
}

export function studentCouncilRoleLabel(value: unknown) {
  return isStudentCouncilRole(value) ? STUDENT_COUNCIL_ROLE_LABELS[value] : null;
}

const roleKey = (value: unknown) => String(value ?? '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z]+/g, '_')
  .replace(/^_|_$/g, '');

export function parseStudentCouncilRole(value: unknown): StudentCouncilRole | null {
  const normalized = roleKey(value);
  if (!normalized) return null;
  if (isStudentCouncilRole(normalized)) return normalized;
  const labelMatch = STUDENT_COUNCIL_ROLES.find((role) => roleKey(STUDENT_COUNCIL_ROLE_LABELS[role]) === normalized);
  if (labelMatch) return labelMatch;
  if (normalized === 'BOYS_HOSTEL_MONITOR') return 'HOSTEL_MONITOR_BOYS';
  if (normalized === 'GIRLS_HOSTEL_MONITOR') return 'HOSTEL_MONITOR_GIRLS';
  return null;
}
