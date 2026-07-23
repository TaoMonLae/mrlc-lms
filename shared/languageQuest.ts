export const LANGUAGE_QUEST_MAX_HEARTS = 5;
export const LANGUAGE_QUEST_FIRST_CLEAR_POINTS = 10;
export const LANGUAGE_QUEST_PRACTICE_POINTS = 2;
export const LANGUAGE_QUEST_TIME_ZONE = "Asia/Kuala_Lumpur";

export function languageQuestDayKey(
  value: Date,
  timeZone = LANGUAGE_QUEST_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function nextLanguageQuestStreak(input: {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: Date | null;
  now: Date;
  timeZone?: string;
}): { currentStreak: number; bestStreak: number; countsAsNewDay: boolean } {
  const timeZone = input.timeZone ?? LANGUAGE_QUEST_TIME_ZONE;
  const today = languageQuestDayKey(input.now, timeZone);
  const previous = input.lastPlayedDate
    ? languageQuestDayKey(input.lastPlayedDate, timeZone)
    : null;

  if (previous === today) {
    return {
      currentStreak: input.currentStreak,
      bestStreak: input.bestStreak,
      countsAsNewDay: false,
    };
  }

  const dayDifference = previous
    ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`)) / 86_400_000)
    : Number.POSITIVE_INFINITY;
  const currentStreak = dayDifference === 1 ? input.currentStreak + 1 : 1;
  return {
    currentStreak,
    bestStreak: Math.max(input.bestStreak, currentStreak),
    countsAsNewDay: true,
  };
}
