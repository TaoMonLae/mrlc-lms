/** Student identity photos are controlled by the school, including user-avatar aliases. */
export function canChangeProfilePhoto(actorRole: string | undefined, targetType: string, targetIsStudent = false): boolean {
  if (actorRole === 'ADMIN') return true;
  if (!actorRole || actorRole === 'STUDENT' || targetType === 'student' || targetIsStudent) return false;
  return true; // Existing ownership checks still apply to non-student profiles.
}
