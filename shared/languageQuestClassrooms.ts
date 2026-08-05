export const LANGUAGE_QUEST_CLASSROOM_CODE_LENGTH = 8;

export type LanguageQuestProfileSection = "profile" | "cards" | "comfort" | "classrooms";
export type LanguageQuestClassroomChallengeStatus = "ACTIVE" | "COMPLETED" | "CLOSED" | "ENDED" | "UPCOMING";

export function normalizeLanguageQuestClassroomCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LANGUAGE_QUEST_CLASSROOM_CODE_LENGTH);
}

export function canJoinLanguageQuestClassroom(active: boolean, alreadyMember: boolean): boolean {
  return active || alreadyMember;
}

export function languageQuestProfileSection(hash: string): LanguageQuestProfileSection {
  switch (hash.replace(/^#/, "")) {
    case "quest-cards": return "cards";
    case "comfort": return "comfort";
    case "classrooms": return "classrooms";
    default: return "profile";
  }
}

export function languageQuestClassroomInvitePath(joinCode: string): string {
  const code = normalizeLanguageQuestClassroomCode(joinCode);
  const query = new URLSearchParams({ classroomCode: code });
  return `/games/language-quest/profile?${query.toString()}#classrooms`;
}

export function languageQuestClassroomChallengeStatus(
  challenge: { active: boolean; complete: boolean; startsAt: string | Date; endsAt: string | Date },
  now = new Date(),
): LanguageQuestClassroomChallengeStatus {
  if (challenge.complete) return "COMPLETED";
  if (!challenge.active) return "CLOSED";
  const startsAt = new Date(challenge.startsAt);
  const endsAt = new Date(challenge.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return "CLOSED";
  if (now < startsAt) return "UPCOMING";
  if (now >= endsAt) return "ENDED";
  return "ACTIVE";
}
