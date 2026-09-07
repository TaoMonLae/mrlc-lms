export const LANGUAGE_QUEST_XP_ADJUSTMENT_LIMIT = 10_000;

export type LanguageQuestRelationship =
  | 'SELF'
  | 'NONE'
  | 'OUTGOING'
  | 'INCOMING'
  | 'FRIENDS';

export function languageQuestRelationship(
  outgoing: boolean,
  incoming: boolean,
  isSelf = false,
): LanguageQuestRelationship {
  if (isSelf) return 'SELF';
  if (outgoing && incoming) return 'FRIENDS';
  if (outgoing) return 'OUTGOING';
  if (incoming) return 'INCOMING';
  return 'NONE';
}

export function languageQuestFriendCourseIsVisible(
  relationship: LanguageQuestRelationship,
): boolean {
  return relationship === 'SELF' || relationship === 'FRIENDS';
}

export function languageQuestXpAdjustment(
  currentPoints: number,
  requestedDelta: number,
): { nextPoints: number; appliedDelta: number } | null {
  if (!Number.isInteger(requestedDelta) || requestedDelta === 0) return null;
  if (Math.abs(requestedDelta) > LANGUAGE_QUEST_XP_ADJUSTMENT_LIMIT) return null;
  const safeCurrentPoints = Math.max(0, Math.floor(Number.isFinite(currentPoints) ? currentPoints : 0));
  const nextPoints = Math.max(0, safeCurrentPoints + requestedDelta);
  const appliedDelta = nextPoints - safeCurrentPoints;
  return appliedDelta === 0 ? null : { nextPoints, appliedDelta };
}
