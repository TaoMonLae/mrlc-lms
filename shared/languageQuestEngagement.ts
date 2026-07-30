export const LANGUAGE_QUEST_MASTERY_POINTS = 5;
// Daily Quest Chain: a fast, guided round of this many mastery reviews that
// counts as "done for today" regardless of which review mode they came from.
export const LANGUAGE_QUEST_DAILY_CHAIN_TARGET = 3;

export type LanguageQuestMissionKey =
  | "daily-xp"
  | "weekly-xp"
  | "course-explorer"
  | "mastery-one";

export interface LanguageQuestMissionDefinition {
  key: LanguageQuestMissionKey;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  period: "daily" | "weekly";
  metric: "xp" | "courses" | "mastery";
  emoji: string;
}

export interface LanguageQuestMissionProgress extends LanguageQuestMissionDefinition {
  progress: number;
  progressPercent: number;
  periodKey: string;
  claimed: boolean;
  claimable: boolean;
}

export const LANGUAGE_QUEST_MISSIONS: readonly LanguageQuestMissionDefinition[] = [
  {
    key: "daily-xp",
    title: "Daily spark",
    description: "Earn 30 learning XP today.",
    target: 30,
    rewardXp: 10,
    period: "daily",
    metric: "xp",
    emoji: "⚡",
  },
  {
    key: "mastery-one",
    title: "Memory keeper",
    description: "Win one mastery review today.",
    target: 1,
    rewardXp: 10,
    period: "daily",
    metric: "mastery",
    emoji: "🧠",
  },
  {
    key: "weekly-xp",
    title: "Weekly adventurer",
    description: "Earn 150 learning XP this week.",
    target: 150,
    rewardXp: 25,
    period: "weekly",
    metric: "xp",
    emoji: "🗺️",
  },
  {
    key: "course-explorer",
    title: "Language explorer",
    description: "Learn in two different courses this week.",
    target: 2,
    rewardXp: 20,
    period: "weekly",
    metric: "courses",
    emoji: "🌍",
  },
] as const;

const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function klParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const shifted = new Date(date.getTime() + KL_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function utcFromKlMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - KL_OFFSET_MS);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function languageQuestPeriodBounds(now = new Date()) {
  const parts = klParts(now);
  const dayStart = utcFromKlMidnight(parts.year, parts.month, parts.day);
  const daysSinceMonday = (parts.weekday + 6) % 7;
  const weekStart = new Date(dayStart.getTime() - daysSinceMonday * DAY_MS);
  const monthStart = utcFromKlMidnight(parts.year, parts.month, 1);
  const nextMonthStart = utcFromKlMidnight(
    parts.month === 12 ? parts.year + 1 : parts.year,
    parts.month === 12 ? 1 : parts.month + 1,
    1,
  );
  return {
    dayKey: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    dayStart,
    dayEnd: new Date(dayStart.getTime() + DAY_MS),
    weekKey: weekStart.toISOString().slice(0, 10),
    weekStart,
    weekEnd: new Date(weekStart.getTime() + 7 * DAY_MS),
    monthKey: `${parts.year}-${pad(parts.month)}`,
    monthStart,
    monthEnd: nextMonthStart,
  };
}

export function languageQuestMissionProgress(input: {
  dailyXp: number;
  weeklyXp: number;
  weeklyCourseCount: number;
  dailyMasteryWins: number;
  claimedKeys?: ReadonlySet<string>;
  now?: Date;
}): LanguageQuestMissionProgress[] {
  const periods = languageQuestPeriodBounds(input.now);
  return LANGUAGE_QUEST_MISSIONS.map((mission) => {
    const progress = mission.metric === "courses"
      ? input.weeklyCourseCount
      : mission.metric === "mastery"
        ? input.dailyMasteryWins
        : mission.period === "daily"
          ? input.dailyXp
          : input.weeklyXp;
    const periodKey = mission.period === "daily" ? periods.dayKey : periods.weekKey;
    const claimed = input.claimedKeys?.has(`${mission.key}:${periodKey}`) ?? false;
    return {
      ...mission,
      progress: Math.max(0, progress),
      progressPercent: Math.min(100, Math.round((Math.max(0, progress) / mission.target) * 100)),
      periodKey,
      claimed,
      claimable: progress >= mission.target && !claimed,
    };
  });
}

const MASTERY_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export function nextLanguageQuestMasteryReview(
  currentStage: number,
  correct: boolean,
  now = new Date(),
): { stage: number; dueAt: Date } {
  if (!correct) {
    return { stage: 0, dueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000) };
  }
  const stage = Math.min(MASTERY_INTERVAL_DAYS.length, Math.max(0, currentStage) + 1);
  const intervalDays = MASTERY_INTERVAL_DAYS[Math.min(stage - 1, MASTERY_INTERVAL_DAYS.length - 1)];
  return { stage, dueAt: new Date(now.getTime() + intervalDays * DAY_MS) };
}
