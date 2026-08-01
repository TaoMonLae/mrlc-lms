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
const MIN_MASTERY_EASE = 1.3;
const MAX_MASTERY_EASE = 3.2;

export const LANGUAGE_QUEST_MASTERY_CONFIDENCE_LEVELS = ["HARD", "GOOD", "EASY"] as const;
export type LanguageQuestMasteryConfidence = typeof LANGUAGE_QUEST_MASTERY_CONFIDENCE_LEVELS[number];

export function isLanguageQuestMasteryConfidence(value: unknown): value is LanguageQuestMasteryConfidence {
  return LANGUAGE_QUEST_MASTERY_CONFIDENCE_LEVELS.includes(value as LanguageQuestMasteryConfidence);
}

function rounded(value: number, digits = 3): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function languageQuestMasteryAccuracy(
  correctReviews: number,
  wrongReviews: number,
  recentAccuracy: number | null | undefined,
): number {
  if (typeof recentAccuracy === "number" && Number.isFinite(recentAccuracy)) {
    return Math.min(1, Math.max(0, recentAccuracy));
  }
  const correct = Math.max(0, correctReviews);
  const wrong = Math.max(0, wrongReviews);
  // A light Bayesian prior stops a single miss from permanently overwhelming
  // the queue while still ranking repeated misses as the weakest material.
  return (correct + 1) / (correct + wrong + 2);
}

export function nextLanguageQuestMasteryReview(
  currentStage: number,
  correct: boolean,
  now = new Date(),
  state: {
    easeFactor?: number | null;
    intervalDays?: number | null;
    recentAccuracy?: number | null;
    confidence?: LanguageQuestMasteryConfidence;
  } = {},
): { stage: number; dueAt: Date; easeFactor: number; intervalDays: number; recentAccuracy: number } {
  const stageBefore = Math.max(0, currentStage);
  const easeBefore = typeof state.easeFactor === "number" && Number.isFinite(state.easeFactor)
    ? Math.min(MAX_MASTERY_EASE, Math.max(MIN_MASTERY_EASE, state.easeFactor))
    : 2.5;
  const fallbackInterval = stageBefore > 0
    ? MASTERY_INTERVAL_DAYS[Math.min(stageBefore - 1, MASTERY_INTERVAL_DAYS.length - 1)]
    : 0;
  const intervalBefore = typeof state.intervalDays === "number" && Number.isFinite(state.intervalDays)
    ? Math.max(0, state.intervalDays)
    : fallbackInterval;
  const accuracyBefore = typeof state.recentAccuracy === "number" && Number.isFinite(state.recentAccuracy)
    ? Math.min(1, Math.max(0, state.recentAccuracy))
    : null;
  const recentAccuracy = accuracyBefore === null
    ? (correct ? 1 : 0)
    : rounded(accuracyBefore * 0.7 + (correct ? 0.3 : 0));

  if (!correct) {
    // A lapse steps a mature card down gradually instead of erasing all of
    // its history. Repeated misses still bring it back progressively sooner.
    const stage = Math.max(0, stageBefore - 2);
    const intervalDays = rounded(Math.min(2, Math.max(4 / 24, intervalBefore * 0.2)), 2);
    return {
      stage,
      dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
      easeFactor: rounded(Math.max(MIN_MASTERY_EASE, easeBefore - 0.2), 2),
      intervalDays,
      recentAccuracy,
    };
  }

  const confidence = state.confidence ?? "GOOD";
  const quality = confidence === "EASY" ? 5 : confidence === "HARD" ? 3 : 4;
  const easeFactor = rounded(Math.min(
    MAX_MASTERY_EASE,
    Math.max(MIN_MASTERY_EASE, easeBefore + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  ), 2);
  const stage = stageBefore + 1;
  let intervalDays: number;
  if (stage === 1) intervalDays = confidence === "HARD" ? 0.5 : confidence === "EASY" ? 3 : 1;
  else if (stage === 2) intervalDays = confidence === "HARD" ? 2 : confidence === "EASY" ? 6 : 3;
  else {
    const confidenceMultiplier = confidence === "HARD" ? 0.8 : confidence === "EASY" ? 1.3 : 1;
    intervalDays = Math.min(180, Math.max(1, intervalBefore) * easeFactor * confidenceMultiplier);
  }
  intervalDays = rounded(intervalDays, 2);
  return {
    stage,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    easeFactor,
    intervalDays,
    recentAccuracy,
  };
}
