export const LANGUAGE_QUEST_CLASSROOM_CODE_LENGTH = 8;

export type LanguageQuestProfileSection = "profile" | "cards" | "comfort" | "classrooms";

export function normalizeLanguageQuestClassroomCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LANGUAGE_QUEST_CLASSROOM_CODE_LENGTH);
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
