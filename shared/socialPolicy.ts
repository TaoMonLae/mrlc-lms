export type SocialPolicyRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'STAFF' | 'ACCOUNTANT' | 'CASE_WORKER' | 'LIBRARIAN';
export type SocialPolicyAudience = 'SCHOOL' | 'CLASS' | 'STAFF';
export type SocialPolicyPostType = 'POST' | 'CLASS_SNAPSHOT' | 'VIDEO_HIGHLIGHT';

export function canCurateSocialContent(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'TEACHER';
}

export function canViewSocialAudience(input: {
  role: string;
  audience: SocialPolicyAudience;
  postClassId?: string | null;
  viewerClassIds?: string[];
}): boolean {
  if (input.role === 'ADMIN') return true;
  if (input.audience === 'SCHOOL') return true;
  if (input.audience === 'STAFF') return input.role !== 'STUDENT';
  if (!input.postClassId) return false;
  return Boolean(input.viewerClassIds?.includes(input.postClassId));
}

export function normaliseSocialRetentionDays(type: SocialPolicyPostType, requested: unknown): number {
  if (type === 'POST') return 1;
  const fallback = type === 'CLASS_SNAPSHOT' ? 30 : 7;
  const parsed = Number(requested);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(90, Math.max(1, Math.round(parsed)));
}
