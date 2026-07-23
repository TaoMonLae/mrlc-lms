export const DAILY_QUEST_TIME_ZONE = "Asia/Kuala_Lumpur";

export type DailyQuestMode = "RELAXED" | "STANDARD" | "CHALLENGE";

export const DAILY_QUEST_ALLOWED_ROLES = ["STUDENT", "TEACHER"] as const;

export const DAILY_QUEST_MODE_COUNTS: Record<DailyQuestMode, number> = {
  RELAXED: 3,
  STANDARD: 5,
  CHALLENGE: 7,
};

export function canUseDailyQuest(role: string): boolean {
  return (DAILY_QUEST_ALLOWED_ROLES as readonly string[]).includes(role);
}

export function dailyQuestDayKey(
  value: Date,
  timeZone = DAILY_QUEST_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000);
}

export function calculateDailyQuestStreak(
  completedDayKeys: string[],
  todayKey: string,
): { current: number; best: number } {
  const days = [...new Set(completedDayKeys)]
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
    .sort((a, b) => dayNumber(a) - dayNumber(b));
  if (days.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    run = dayNumber(days[index]) - dayNumber(days[index - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const latest = days[days.length - 1];
  const gapFromToday = dayNumber(todayKey) - dayNumber(latest);
  if (gapFromToday > 1 || gapFromToday < 0) return { current: 0, best };

  let current = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (dayNumber(days[index]) - dayNumber(days[index - 1]) !== 1) break;
    current += 1;
  }
  return { current, best };
}

export function dailyQuestPoints(
  mode: DailyQuestMode,
  correctCount: number,
  totalQuestions: number,
): number {
  const safeCorrect = Math.max(0, Math.min(totalQuestions, Math.floor(correctCount)));
  const completionBonus = 20;
  const challengeBonus = mode === "CHALLENGE" ? 10 : 0;
  return completionBonus + challengeBonus + safeCorrect * 10;
}

export function seededDailyQuestShuffle<T>(items: T[], seed: string): T[] {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  let state = hash >>> 0;
  const random = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
