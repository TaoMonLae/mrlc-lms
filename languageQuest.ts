import { randomUUID } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import {
  LANGUAGE_QUEST_BOSS_BATTLE_MAX_QUESTIONS,
  LANGUAGE_QUEST_BOSS_BATTLE_MIN_QUESTIONS,
  LANGUAGE_QUEST_BOSS_BATTLE_PASS_RATIO,
  LANGUAGE_QUEST_BOSS_BATTLE_POINTS,
  LANGUAGE_QUEST_FIRST_CLEAR_POINTS,
  LANGUAGE_QUEST_MAX_HEARTS,
  LANGUAGE_QUEST_PRACTICE_POINTS,
  bossBattleResult,
  isValidMatchingSubmission,
  isValidReorderSubmission,
  languageQuestDayKey,
  languageQuestPracticePrompt,
  matchingChallengeIsCorrect,
  nextLanguageQuestStreak,
  pairedMatchAnswerSummary,
  reorderChallengeIsCorrect,
} from "./shared/languageQuest";
import {
  DEFAULT_LANGUAGE_QUEST_AVATAR,
  isLanguageQuestAvatarId,
} from "./shared/languageQuestAvatars";
import { languageQuestCategoryForLanguage } from "./shared/languageQuestCourseCategories";
import { languageQuestAnswerMatches, languageQuestPinyin } from "./shared/languageQuestPinyin";
import { languageQuestGlobalLeaderboardWhere } from "./shared/externalLearnerAccess";
import {
  languageQuestRewardProgress,
  newlyUnlockedLanguageQuestRewardIds,
} from "./shared/languageQuestRewards";
import {
  LANGUAGE_QUEST_DAILY_CHAIN_TARGET,
  LANGUAGE_QUEST_MASTERY_POINTS,
  LANGUAGE_QUEST_MISSIONS,
  languageQuestMissionProgress,
  languageQuestPeriodBounds,
  nextLanguageQuestMasteryReview,
} from "./shared/languageQuestEngagement";
import { importedSpanishCourse, type OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "./languageQuestMandarinCourse";
import { completeMandarinCourse } from "./languageQuestCompleteMandarinCourse";
import { chineseConversationStarterCourse } from "./languageQuestChineseConversationCourse";
import { englishWordCourses } from "./languageQuestEnglishWordCourses";
import { advancedEnglishCourses } from "./languageQuestAdvancedEnglishCourses";
import { linguifyCefrCourses } from "./languageQuestLinguifyCourses";
import { malayCefrCourses } from "./languageQuestMalayCourses";
import { malaySpeakingCourse } from "./languageQuestMalayCourse";
import { malayGuideModernCourse } from "./languageQuestMalayGuideCourse";
import { teachYourselfMalayCourse } from "./languageQuestTeachYourselfMalayCourse";
import { languageQuestVoiceServiceFromEnv } from "./languageQuestVoice";
import {
  kokoroSupportsLanguage,
  LANGUAGE_QUEST_VOICE_MAX_TEXT_LENGTH,
  normalizeLanguageQuestSpeechText,
} from "./shared/languageQuestVoice";

const RETIRED_OFFICIAL_COURSE_CODES = new Set(
  [importedSpanishCourse]
    .filter((course) => course.retired)
    .map((course) => course.code),
);

interface JwtPayload { userId: string; role: string; email: string; externalLearner?: boolean; }

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  createAuditLog: (
    userId: string | null, userName: string | null, action: string,
    entityType: string, entityId: string | null, description: string,
    ip: string | null, ua: string | null, severity?: string,
  ) => Promise<void>;
  logger: { error: (...a: any[]) => void; warn?: (...a: any[]) => void };
}

type DraftOption = { id?: string; text: string; correct: boolean; emoji: string | null; audioText: string | null };
type DraftChallengeType =
  | "SELECT" | "ASSIST" | "CLOZE" | "ODD_ONE_OUT" | "REORDER"
  | "MATCHING" | "MINIMAL_PAIR_LISTENING" | "DICTATION" | "GRAMMAR_TRANSFORM";
const DRAFT_CHALLENGE_TYPES: readonly DraftChallengeType[] = [
  "SELECT", "ASSIST", "CLOZE", "ODD_ONE_OUT", "REORDER",
  "MATCHING", "MINIMAL_PAIR_LISTENING", "DICTATION", "GRAMMAR_TRANSFORM",
];
type DraftChallenge = { id?: string; type: DraftChallengeType; question: string; options: DraftOption[] };
type DraftLesson = { id?: string; title: string; description: string | null; challenges: DraftChallenge[] };
type DraftUnit = { id?: string; title: string; description: string | null; lessons: DraftLesson[] };
type CourseDraft = {
  title: string; description: string | null; language: string; category: string; imageEmoji: string;
  accentColor: string; published: boolean; units: DraftUnit[];
};

const STARTER_COURSE_CODE = "MRLC-EVERYDAY-ENGLISH";

const starterUnits = [
  {
    title: "Everyday Basics",
    description: "Friendly English for common conversations.",
    lessons: [
      {
        title: "Greetings",
        description: "Say hello and respond politely.",
        challenges: [
          {
            question: "Which greeting is normally used in the morning?",
            options: [
              { text: "Good morning", correct: true, emoji: "☀️", audioText: "Good morning" },
              { text: "Good night", correct: false, emoji: "🌙", audioText: "Good night" },
              { text: "Goodbye", correct: false, emoji: "👋", audioText: "Goodbye" },
            ],
          },
          {
            question: "Choose the polite response to “Thank you.”",
            options: [
              { text: "You're welcome", correct: true, emoji: "😊", audioText: "You're welcome" },
              { text: "Never mind", correct: false, emoji: "🤷", audioText: "Never mind" },
              { text: "See you", correct: false, emoji: "👋", audioText: "See you" },
            ],
          },
          {
            question: "Which question asks for a person's name?",
            options: [
              { text: "What is your name?", correct: true, emoji: "🪪", audioText: "What is your name?" },
              { text: "Where is the library?", correct: false, emoji: "📚", audioText: "Where is the library?" },
              { text: "How old is it?", correct: false, emoji: "🎂", audioText: "How old is it?" },
            ],
          },
        ],
      },
      {
        title: "Helpful Words",
        description: "Use please, sorry, and excuse me.",
        challenges: [
          {
            question: "Which word makes a request more polite?",
            options: [
              { text: "Please", correct: true, emoji: "🙏", audioText: "Please" },
              { text: "Quickly", correct: false, emoji: "⚡", audioText: "Quickly" },
              { text: "Yesterday", correct: false, emoji: "📅", audioText: "Yesterday" },
            ],
          },
          {
            question: "What should you say when you make a mistake?",
            options: [
              { text: "I'm sorry", correct: true, emoji: "😔", audioText: "I'm sorry" },
              { text: "Well done", correct: false, emoji: "🎉", audioText: "Well done" },
              { text: "Come here", correct: false, emoji: "👉", audioText: "Come here" },
            ],
          },
          {
            question: "Which phrase politely gets someone's attention?",
            options: [
              { text: "Excuse me", correct: true, emoji: "👋", audioText: "Excuse me" },
              { text: "Be quiet", correct: false, emoji: "🤫", audioText: "Be quiet" },
              { text: "No problem", correct: false, emoji: "👌", audioText: "No problem" },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Around School",
    description: "Recognise useful people, places, and classroom phrases.",
    lessons: [
      {
        title: "People and Places",
        description: "Learn common school words.",
        challenges: [
          {
            question: "Who helps students learn in a classroom?",
            options: [
              { text: "Teacher", correct: true, emoji: "🧑‍🏫", audioText: "Teacher" },
              { text: "Driver", correct: false, emoji: "🚌", audioText: "Driver" },
              { text: "Chef", correct: false, emoji: "🧑‍🍳", audioText: "Chef" },
            ],
          },
          {
            question: "Where can you borrow and read books?",
            options: [
              { text: "Library", correct: true, emoji: "📚", audioText: "Library" },
              { text: "Playground", correct: false, emoji: "🛝", audioText: "Playground" },
              { text: "Cafeteria", correct: false, emoji: "🍛", audioText: "Cafeteria" },
            ],
          },
          {
            question: "What do students complete at home after class?",
            options: [
              { text: "Homework", correct: true, emoji: "📝", audioText: "Homework" },
              { text: "Holiday", correct: false, emoji: "🏖️", audioText: "Holiday" },
              { text: "Breakfast", correct: false, emoji: "🍳", audioText: "Breakfast" },
            ],
          },
        ],
      },
      {
        title: "Classroom English",
        description: "Ask for help and follow simple instructions.",
        challenges: [
          {
            question: "Which sentence asks a teacher for help?",
            options: [
              { text: "Could you help me, please?", correct: true, emoji: "🙋", audioText: "Could you help me, please?" },
              { text: "I have finished lunch.", correct: false, emoji: "🍱", audioText: "I have finished lunch." },
              { text: "The bus is late.", correct: false, emoji: "🚌", audioText: "The bus is late." },
            ],
          },
          {
            question: "What does “Open your book” ask you to do?",
            options: [
              { text: "Start reading", correct: true, emoji: "📖", audioText: "Start reading" },
              { text: "Close the door", correct: false, emoji: "🚪", audioText: "Close the door" },
              { text: "Write your name", correct: false, emoji: "✍️", audioText: "Write your name" },
            ],
          },
          {
            question: "Which sentence says you do not understand?",
            options: [
              { text: "Could you explain that again?", correct: true, emoji: "🔁", audioText: "Could you explain that again?" },
              { text: "I know the answer.", correct: false, emoji: "💡", audioText: "I know the answer." },
              { text: "This is my notebook.", correct: false, emoji: "📓", audioText: "This is my notebook." },
            ],
          },
        ],
      },
    ],
  },
] as const;

function isManager(role: string): boolean {
  return role === "ADMIN" || role === "TEACHER";
}

function languageQuestJoinCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max: number): string | null {
  return text(value, max) || null;
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function normalizeCourseDraft(raw: any): { value?: CourseDraft; error?: string } {
  const title = text(raw?.title, 120);
  const language = text(raw?.language, 80);
  const category = text(raw?.category, 80) || languageQuestCategoryForLanguage(language);
  const description = nullableText(raw?.description, 1000);
  const imageEmoji = text(raw?.imageEmoji, 16) || "🌍";
  const accentCandidate = text(raw?.accentColor, 7);
  const accentColor = isHexColor(accentCandidate) ? accentCandidate : "#7c3aed";
  const published = Boolean(raw?.published);
  if (!title) return { error: "Course title is required" };
  if (!language) return { error: "Course language is required" };
  if (!Array.isArray(raw?.units)) return { error: "Course units must be a list" };
  if (raw.units.length > 20) return { error: "A course can contain at most 20 units" };

  const units: DraftUnit[] = [];
  for (let unitIndex = 0; unitIndex < raw.units.length; unitIndex += 1) {
    const sourceUnit = raw.units[unitIndex];
    const unitTitle = text(sourceUnit?.title, 160);
    if (!unitTitle) return { error: `Unit ${unitIndex + 1} needs a title` };
    if (!Array.isArray(sourceUnit?.lessons) || sourceUnit.lessons.length > 30) {
      return { error: `Unit ${unitIndex + 1} must contain at most 30 lessons` };
    }
    const lessons: DraftLesson[] = [];
    for (let lessonIndex = 0; lessonIndex < sourceUnit.lessons.length; lessonIndex += 1) {
      const sourceLesson = sourceUnit.lessons[lessonIndex];
      const lessonTitle = text(sourceLesson?.title, 160);
      if (!lessonTitle) return { error: `Lesson ${lessonIndex + 1} in unit ${unitIndex + 1} needs a title` };
      if (!Array.isArray(sourceLesson?.challenges) || sourceLesson.challenges.length > 50) {
        return { error: `“${lessonTitle}” must contain at most 50 challenges` };
      }
      const challenges: DraftChallenge[] = [];
      for (let challengeIndex = 0; challengeIndex < sourceLesson.challenges.length; challengeIndex += 1) {
        const sourceChallenge = sourceLesson.challenges[challengeIndex];
        const question = text(sourceChallenge?.question, 1000);
        if (!question) return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” needs a question` };
        // Course Studio only offers authoring for SELECT/ASSIST, but it must
        // still be able to load, save, and publish courses (like the
        // generator-built Malay CEFR courses) that also contain
        // CLOZE/ODD_ONE_OUT/MINIMAL_PAIR_LISTENING/GRAMMAR_TRANSFORM (still
        // "pick one correct option" under the hood) and REORDER/MATCHING
        // (no single correct option -- every option is `correct: true`)
        // without silently collapsing their type back to SELECT or rejecting
        // them for not having "exactly one correct answer".
        const type: DraftChallengeType = DRAFT_CHALLENGE_TYPES.includes(sourceChallenge?.type) ? sourceChallenge.type : "SELECT";
        const isUnorderedCorrectType = type === "REORDER" || type === "MATCHING";
        const minOptions = type === "DICTATION" ? 1 : 2;
        if (!Array.isArray(sourceChallenge?.options) || sourceChallenge.options.length < minOptions) {
          return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” needs at least ${minOptions} answer option${minOptions > 1 ? "s" : ""}` };
        }
        // REORDER challenges are built from a sentence's own word tokens and
        // can run longer than the 6-option multiple-choice bank; every other
        // type (including MATCHING, capped generously at 12 tiles / 6 pairs)
        // stays within the UI's supported range.
        const maxOptions = type === "REORDER" ? Infinity : type === "MATCHING" ? 12 : 6;
        if (sourceChallenge.options.length > maxOptions) {
          return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” has too many answer options` };
        }
        if (type === "MATCHING" && sourceChallenge.options.length % 2 !== 0) {
          return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” needs an even number of options to form pairs` };
        }
        const options: DraftOption[] = sourceChallenge.options.map((option: any) => ({
          id: typeof option?.id === "string" ? option.id : undefined,
          text: text(option?.text, 500),
          correct: Boolean(option?.correct),
          emoji: nullableText(option?.emoji, 16),
          audioText: nullableText(option?.audioText, 500),
        }));
        if (options.some((option) => !option.text)) return { error: `Every option in challenge ${challengeIndex + 1} needs text` };
        if (isUnorderedCorrectType) {
          if (options.some((option) => !option.correct)) {
            return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” needs every ${type === "REORDER" ? "tile" : "tile pair"} marked correct` };
          }
        } else if (options.filter((option) => option.correct).length !== 1) {
          return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” needs exactly one correct answer` };
        }
        challenges.push({
          id: typeof sourceChallenge?.id === "string" ? sourceChallenge.id : undefined,
          type,
          question,
          options,
        });
      }
      lessons.push({
        id: typeof sourceLesson?.id === "string" ? sourceLesson.id : undefined,
        title: lessonTitle,
        description: nullableText(sourceLesson?.description, 500),
        challenges,
      });
    }
    units.push({
      id: typeof sourceUnit?.id === "string" ? sourceUnit.id : undefined,
      title: unitTitle,
      description: nullableText(sourceUnit?.description, 500),
      lessons,
    });
  }
  const challengeCount = units.reduce((sum, unit) => sum + unit.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.challenges.length, 0), 0);
  if (published && challengeCount === 0) return { error: "Add at least one challenge before publishing the course" };
  return { value: { title, description, language, category, imageEmoji, accentColor, published, units } };
}

export async function ensureOfficialCourse(prisma: any, course: OfficialLanguageQuestCourse): Promise<any> {
  const existing = await prisma.languageQuestCourse.findUnique({ where: { code: course.code } });
  if (existing) {
    if (!course.retired || !existing.published) return existing;
    return prisma.$transaction(async (tx: any) => {
      const retired = await tx.languageQuestCourse.update({
        where: { id: existing.id },
        data: { published: false },
      });
      await tx.languageQuestUserProgress.updateMany({
        where: { activeCourseId: existing.id },
        data: { activeCourseId: null },
      });
      return retired;
    });
  }
  try {
    return await prisma.$transaction(async (tx: any) => {
      const created = await tx.languageQuestCourse.create({
        data: {
          code: course.code,
          title: course.title,
          description: course.description,
          language: course.language,
          category: course.category || languageQuestCategoryForLanguage(course.language),
          imageEmoji: course.imageEmoji,
          accentColor: course.accentColor,
          published: course.published,
        },
      });
      const units: any[] = [];
      const lessons: any[] = [];
      const challenges: any[] = [];
      const options: any[] = [];

      course.units.forEach((unit, unitOrder) => {
        const unitId = randomUUID();
        units.push({ id: unitId, courseId: created.id, title: unit.title, description: unit.description, order: unitOrder });
        unit.lessons.forEach((lesson, lessonOrder) => {
          const lessonId = randomUUID();
          lessons.push({ id: lessonId, unitId, title: lesson.title, description: lesson.description, order: lessonOrder });
          lesson.challenges.forEach((challenge, challengeOrder) => {
            const challengeId = randomUUID();
            challenges.push({ id: challengeId, lessonId, type: challenge.type, question: challenge.question, order: challengeOrder });
            challenge.options.forEach((option, optionOrder) => {
              options.push({ id: randomUUID(), challengeId, ...option, order: optionOrder });
            });
          });
        });
      });

      if (units.length) await tx.languageQuestUnit.createMany({ data: units });
      if (lessons.length) await tx.languageQuestLesson.createMany({ data: lessons });
      if (challenges.length) await tx.languageQuestChallenge.createMany({ data: challenges });
      if (options.length) await tx.languageQuestOption.createMany({ data: options });
      return created;
    }, { maxWait: 10_000, timeout: 120_000 });
  } catch (error: any) {
    if (error?.code === "P2002") return prisma.languageQuestCourse.findUnique({ where: { code: course.code } });
    throw error;
  }
}

const starterCourse: OfficialLanguageQuestCourse = {
  code: STARTER_COURSE_CODE,
  title: "Everyday English",
  description: "Short, practical lessons for friendly conversations and school life.",
  language: "English",
  imageEmoji: "🗣️",
  accentColor: "#7c3aed",
  published: true,
  units: starterUnits.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      challenges: lesson.challenges.map((challenge) => ({ type: "SELECT" as const, ...challenge })),
    })),
  })),
};

export async function ensureOfficialCourses(prisma: any): Promise<void> {
  const courses = [
    starterCourse,
    importedSpanishCourse,
    mandarinFoundationsCourse,
    completeMandarinCourse,
    chineseConversationStarterCourse,
    ...englishWordCourses,
    ...advancedEnglishCourses,
    ...linguifyCefrCourses,
    ...malayCefrCourses,
    malaySpeakingCourse,
    malayGuideModernCourse,
    teachYourselfMalayCourse,
  ];
  for (const course of courses) {
    await ensureOfficialCourse(prisma, course);
  }
}

async function getProgress(prisma: any, userId: string): Promise<any> {
  let progress = await prisma.languageQuestUserProgress.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  if (
    progress.updatedAt
    && languageQuestDayKey(progress.updatedAt) !== languageQuestDayKey(new Date())
    && progress.hearts < LANGUAGE_QUEST_MAX_HEARTS
  ) {
    progress = await prisma.languageQuestUserProgress.update({
      where: { userId },
      data: { hearts: LANGUAGE_QUEST_MAX_HEARTS },
    });
  }
  return progress;
}

function profileJson(progress: any) {
  return {
    hearts: progress.hearts,
    maxHearts: LANGUAGE_QUEST_MAX_HEARTS,
    points: progress.points,
    currentStreak: progress.currentStreak,
    bestStreak: progress.bestStreak,
    activeCourseId: progress.activeCourseId,
    rewards: languageQuestRewardProgress(progress.points),
  };
}

// Walks a course's units/lessons in path order (mirroring the lock logic in
// GET /api/language-quest/courses/:id) to find the first lesson that's both
// unlocked and not yet fully completed. Powers the "resume where you left
// off" shortcut on the home page and course page, so learners with progress
// don't have to re-open the course path and hunt for where they stopped.
// Returns null once every lesson is complete (or the course has none).
export function nextIncompleteLessonId(units: any[], completed: Set<string>): string | null {
  let previousLessonComplete = true;
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      const challengeIds = lesson.challenges.map((challenge: any) => challenge.id);
      const isComplete = challengeIds.length > 0 && challengeIds.every((id: string) => completed.has(id));
      const locked = !previousLessonComplete;
      previousLessonComplete = isComplete;
      if (!locked && !isComplete && challengeIds.length > 0) return lesson.id;
    }
  }
  return null;
}

async function missionSnapshot(prisma: any, userId: string, now = new Date()) {
  const periods = languageQuestPeriodBounds(now);
  const [events, claims] = await Promise.all([
    prisma.languageQuestXpEvent.findMany({
      where: {
        userId,
        occurredAt: { gte: periods.weekStart, lt: periods.weekEnd },
        source: { not: "MISSION_REWARD" },
      },
      select: { courseId: true, points: true, source: true, occurredAt: true },
    }),
    prisma.languageQuestMissionClaim.findMany({
      where: {
        userId,
        OR: [
          { periodKey: periods.dayKey },
          { periodKey: periods.weekKey },
        ],
      },
      select: { missionKey: true, periodKey: true },
    }),
  ]);
  const daily = events.filter((event: any) => event.occurredAt >= periods.dayStart);
  const claimedKeys = new Set<string>(
    claims.map((claim: any) => `${claim.missionKey}:${claim.periodKey}`),
  );
  return {
    periods,
    missions: languageQuestMissionProgress({
      dailyXp: daily.reduce((sum: number, event: any) => sum + event.points, 0),
      weeklyXp: events.reduce((sum: number, event: any) => sum + event.points, 0),
      weeklyCourseCount: new Set(events.map((event: any) => event.courseId).filter(Boolean)).size,
      dailyMasteryWins: daily.filter((event: any) => event.source === "MASTERY").length,
      claimedKeys,
      now,
    }),
  };
}

async function classroomChallengeProgress(prisma: any, challenge: any): Promise<number> {
  const members = await prisma.languageQuestClassroomMember.findMany({
    where: { classroomId: challenge.classroomId },
    select: { userId: true },
  });
  if (members.length === 0) return 0;
  const aggregate = await prisma.languageQuestXpEvent.aggregate({
    where: {
      userId: { in: members.map((member: any) => member.userId) },
      occurredAt: { gte: challenge.startsAt, lte: challenge.endsAt },
      source: { not: "MISSION_REWARD" },
      ...(challenge.classroom?.focusCourseId ? { courseId: challenge.classroom.focusCourseId } : {}),
    },
    _sum: { points: true },
  });
  return aggregate._sum.points || 0;
}

function databaseUnavailable(error: any): boolean {
  return error?.code === "P2021" || error?.code === "P2022";
}

function databaseError(res: express.Response, error: any): boolean {
  if (!databaseUnavailable(error)) return false;
  res.status(503).json({ error: "Language Quest database tables are not ready — run `npx prisma migrate deploy` and restart the server." });
  return true;
}

async function lessonLockMessage(prisma: any, jwtUser: JwtPayload, lesson: any): Promise<string | null> {
  if (isManager(jwtUser.role)) return null;
  const orderedUnits = await prisma.languageQuestUnit.findMany({
    where: { courseId: lesson.unit.courseId },
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" }, include: { challenges: { select: { id: true } } } } },
  });
  const lessons = orderedUnits.flatMap((unit: any) => unit.lessons);
  const index = lessons.findIndex((candidate: any) => candidate.id === lesson.id);
  const previous = index > 0 ? lessons[index - 1] : null;
  if (!previous) return null;
  const completed = await prisma.languageQuestChallengeProgress.count({
    where: { userId: jwtUser.userId, completed: true, challengeId: { in: previous.challenges.map((challenge: any) => challenge.id) } },
  });
  if (previous.challenges.length === 0 || completed !== previous.challenges.length) {
    return "Complete the previous lesson first";
  }
  return null;
}

export function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function canAttemptNewChallenge(hearts: number, alreadyCompleted: boolean): boolean {
  return hearts > 0 || alreadyCompleted;
}

export function registerLanguageQuestRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;
  const voiceService = languageQuestVoiceServiceFromEnv();
  const voiceLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String((req as any).user.userId),
    message: {
      error: "Please wait before requesting more lesson audio",
      code: "VOICE_RATE_LIMITED",
    },
  });

  // Public catalog intentionally exposes only published course marketing
  // details and counts. Lessons, answers, progress, and learner identities
  // remain behind signup and authentication.
  app.get("/api/language-quest/public/catalog", async (_req, res) => {
    try {
      await ensureOfficialCourses(prisma);
      const courses = await prisma.languageQuestCourse.findMany({
        where: { published: true },
        orderBy: [{ createdAt: "asc" }, { title: "asc" }],
        include: {
          units: {
            include: {
              lessons: { include: { challenges: { select: { id: true } } } },
            },
          },
        },
      });
      res.json({
        courses: courses.map((course: any) => ({
          id: course.id,
          code: course.code,
          title: course.title,
          description: course.description,
          language: course.language,
          category: course.category,
          imageEmoji: course.imageEmoji,
          accentColor: course.accentColor,
          unitCount: course.units.length,
          lessonCount: course.units.reduce((sum: number, unit: any) => sum + unit.lessons.length, 0),
          challengeCount: course.units.reduce(
            (sum: number, unit: any) =>
              sum + unit.lessons.reduce((inner: number, lesson: any) => inner + lesson.challenges.length, 0),
            0,
          ),
        })),
      });
    } catch (error) {
      logger.error("Error loading the public Language Quest catalog:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the course catalog" });
    }
  });

  app.get("/api/language-quest/voice", authMiddleware, (_req, res) => {
    res.json({
      provider: voiceService.enabled ? "kokoro" : "browser",
      enabled: voiceService.enabled,
      model: voiceService.enabled ? voiceService.model : null,
    });
  });

  app.post("/api/language-quest/voice", authMiddleware, voiceLimiter, async (req, res) => {
    const text = normalizeLanguageQuestSpeechText(req.body?.text);
    const language = typeof req.body?.language === "string" ? req.body.language : "";
    if (!text) {
      res.status(422).json({
        error: `Voice text must contain 1-${LANGUAGE_QUEST_VOICE_MAX_TEXT_LENGTH} characters`,
        code: "INVALID_VOICE_TEXT",
      });
      return;
    }
    if (!kokoroSupportsLanguage(language)) {
      res.status(422).json({
        error: "This course language uses the browser voice",
        code: "VOICE_LANGUAGE_UNSUPPORTED",
      });
      return;
    }
    if (!voiceService.enabled) {
      res.status(503).json({
        error: "Kokoro is offline; use the browser voice",
        code: "VOICE_PROVIDER_UNAVAILABLE",
      });
      return;
    }
    try {
      const audio = await voiceService.synthesize(text, language);
      res.setHeader("Content-Type", audio.contentType);
      res.setHeader("Content-Length", String(audio.data.length));
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(audio.data);
    } catch (error) {
      logger.warn?.("Kokoro Language Quest synthesis failed:", error);
      res.status(503).json({
        error: "Kokoro could not generate speech; use the browser voice",
        code: "VOICE_PROVIDER_UNAVAILABLE",
      });
    }
  });

  app.get("/api/language-quest/profile", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const user = await prisma.user.findUnique({
        where: { id: jwtUser.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isExternalLearner: true,
          languageQuestAvatar: true,
          languageQuestBio: true,
          languageQuestProgress: true,
          languageQuestMemberships: {
            orderBy: { joinedAt: "desc" },
            include: {
              classroom: {
                include: {
                  teacher: { select: { firstName: true, lastName: true } },
                  focusCourse: { select: { id: true, title: true, imageEmoji: true } },
                },
              },
            },
          },
        },
      } as any);
      if (!user) { res.status(404).json({ error: "Learner profile not found" }); return; }
      res.json({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        isExternalLearner: Boolean(user.isExternalLearner),
        avatarId: user.languageQuestAvatar || DEFAULT_LANGUAGE_QUEST_AVATAR,
        bio: user.languageQuestBio || "",
        profile: profileJson(user.languageQuestProgress || await getProgress(prisma, jwtUser.userId)),
        classrooms: user.languageQuestMemberships.map((membership: any) => ({
          id: membership.classroom.id,
          name: membership.classroom.name,
          active: membership.classroom.active,
          joinedAt: membership.joinedAt,
          teacherName: `${membership.classroom.teacher.firstName} ${membership.classroom.teacher.lastName}`.trim(),
          focusCourse: membership.classroom.focusCourse,
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest learner profile:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load your learner profile" });
    }
  });

  app.patch("/api/language-quest/profile", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const avatarId = req.body?.avatarId;
    const bio = text(req.body?.bio, 240);
    if (!isLanguageQuestAvatarId(avatarId)) {
      res.status(400).json({ error: "Choose one of the available Language Quest avatars" });
      return;
    }
    try {
      const user = await prisma.user.update({
        where: { id: jwtUser.userId },
        data: { languageQuestAvatar: avatarId, languageQuestBio: bio || null },
        select: { languageQuestAvatar: true, languageQuestBio: true },
      } as any);
      res.json({ avatarId: user.languageQuestAvatar, bio: user.languageQuestBio || "" });
    } catch (error) {
      logger.error("Error updating Language Quest learner profile:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to save your learner profile" });
    }
  });

  app.post("/api/language-quest/profile/classrooms", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const joinCode = text(req.body?.joinCode, 20).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!joinCode) { res.status(400).json({ error: "Enter the classroom join code" }); return; }
    try {
      const classroom = await prisma.languageQuestClassroom.findUnique({
        where: { joinCode },
        include: { teacher: { select: { firstName: true, lastName: true } } },
      });
      if (!classroom || !classroom.active) {
        res.status(404).json({ error: "That classroom code is not active" });
        return;
      }
      await prisma.languageQuestClassroomMember.upsert({
        where: { classroomId_userId: { classroomId: classroom.id, userId: jwtUser.userId } },
        update: {},
        create: { classroomId: classroom.id, userId: jwtUser.userId },
      });
      res.status(201).json({
        id: classroom.id,
        name: classroom.name,
        teacherName: `${classroom.teacher.firstName} ${classroom.teacher.lastName}`.trim(),
      });
    } catch (error) {
      logger.error("Error joining Language Quest classroom:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to join that classroom" });
    }
  });

  app.delete("/api/language-quest/profile/classrooms/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      await prisma.languageQuestClassroomMember.deleteMany({
        where: { classroomId: req.params.id, userId: jwtUser.userId },
      });
      res.json({ success: true });
    } catch (error) {
      logger.error("Error leaving Language Quest classroom:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to leave that classroom" });
    }
  });

  app.get("/api/language-quest/overview", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      await ensureOfficialCourses(prisma);
      const [progress, courses, completedRows] = await Promise.all([
        getProgress(prisma, jwtUser.userId),
        prisma.languageQuestCourse.findMany({
          where: { published: true },
          orderBy: [{ createdAt: "asc" }, { title: "asc" }],
          include: {
            units: {
              orderBy: { order: "asc" },
              include: { lessons: { orderBy: { order: "asc" }, include: { challenges: { select: { id: true } } } } },
            },
          },
        }),
        prisma.languageQuestChallengeProgress.findMany({
          where: { userId: jwtUser.userId, completed: true },
          select: { challengeId: true },
        }),
      ]);
      const completed = new Set<string>(completedRows.map((row: any) => row.challengeId));
      res.json({
        profile: profileJson(progress),
        canManage: isManager(jwtUser.role),
        courses: courses.map((course: any) => {
          const challengeIds = course.units.flatMap((unit: any) => unit.lessons.flatMap((lesson: any) => lesson.challenges.map((challenge: any) => challenge.id)));
          const completedChallenges = challengeIds.filter((id: string) => completed.has(id)).length;
          const lessonCount = course.units.reduce((sum: number, unit: any) => sum + unit.lessons.length, 0);
          return {
            id: course.id, code: course.code, title: course.title, description: course.description,
            language: course.language, category: course.category,
            imageEmoji: course.imageEmoji, accentColor: course.accentColor,
            unitCount: course.units.length, lessonCount, challengeCount: challengeIds.length,
            completedChallenges,
            progressPercent: challengeIds.length ? Math.round((completedChallenges / challengeIds.length) * 100) : 0,
            // Exact match, not the rounded progressPercent: on a large course
            // (e.g. the Mandarin Complete Course has 1,870 challenges),
            // Math.round((completedChallenges / challengeIds.length) * 100)
            // can already read 100 with up to ~9 challenges still unfinished.
            // Certificate eligibility and any other "is this course done"
            // check should use this, not progressPercent === 100.
            completed: challengeIds.length > 0 && completedChallenges === challengeIds.length,
            nextLessonId: nextIncompleteLessonId(course.units, completed),
          };
        }),
      });
    } catch (error) {
      logger.error("Error loading Language Quest overview:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load Language Quest" });
    }
  });

  app.get("/api/language-quest/courses/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const course = await prisma.languageQuestCourse.findUnique({
        where: { id: req.params.id },
        include: {
          units: {
            orderBy: { order: "asc" },
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: { challenges: { orderBy: { order: "asc" }, select: { id: true } } },
              },
            },
          },
        },
      });
      if (!course || (!course.published && !isManager(jwtUser.role))) { res.status(404).json({ error: "Course not found" }); return; }
      const completedRows = await prisma.languageQuestChallengeProgress.findMany({
        where: { userId: jwtUser.userId, completed: true, challenge: { lesson: { unit: { courseId: course.id } } } },
        select: { challengeId: true },
      });
      const completed = new Set(completedRows.map((row: any) => row.challengeId));
      let previousLessonComplete = true;
      let completedLessons = 0;
      let nextLessonId: string | null = null;
      const units = course.units.map((unit: any) => ({
        id: unit.id,
        title: unit.title,
        description: unit.description,
        lessons: unit.lessons.map((lesson: any) => {
          const completedChallenges = lesson.challenges.filter((challenge: any) => completed.has(challenge.id)).length;
          const isComplete = lesson.challenges.length > 0 && completedChallenges === lesson.challenges.length;
          const locked = !previousLessonComplete;
          previousLessonComplete = isComplete;
          if (isComplete) completedLessons += 1;
          // First unlocked, unfinished lesson with content -- the "resume
          // where you left off" target shown at the top of the course page.
          if (!nextLessonId && !locked && !isComplete && lesson.challenges.length > 0) nextLessonId = lesson.id;
          return {
            id: lesson.id, title: lesson.title, description: lesson.description,
            challengeCount: lesson.challenges.length, completedChallenges, completed: isComplete, locked,
          };
        }),
      }));
      await getProgress(prisma, jwtUser.userId);
      await prisma.languageQuestUserProgress.upsert({
        where: { userId: jwtUser.userId },
        update: { activeCourseId: course.id },
        create: { userId: jwtUser.userId, activeCourseId: course.id },
      });
      res.json({
        id: course.id, title: course.title, description: course.description,
        language: course.language, category: course.category,
        imageEmoji: course.imageEmoji, accentColor: course.accentColor, units,
        completedLessons, totalLessons: units.reduce((sum: number, unit: any) => sum + unit.lessons.length, 0),
        nextLessonId,
      });
    } catch (error) {
      logger.error("Error loading Language Quest course:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the course" });
    }
  });

  // Boss Battle: a timed gauntlet built from the learner's own toughest
  // questions in a course they've already fully completed. Unlike the
  // mastery review endpoints, per-question correctness is never revealed
  // mid-battle -- the whole set of answers is graded together in the finish
  // endpoint below, both so the answer key can't be probed one request at a
  // time and so the "boss battle report" at the end has real drama to it.
  app.get("/api/language-quest/courses/:id/boss-battle", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const course = await prisma.languageQuestCourse.findUnique({
        where: { id: req.params.id },
        include: {
          units: {
            orderBy: { order: "asc" },
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: { challenges: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
              },
            },
          },
        },
      });
      if (!course || (!course.published && !isManager(jwtUser.role))) { res.status(404).json({ error: "Course not found" }); return; }

      const challenges = course.units.flatMap((unit: any) => unit.lessons.flatMap((lesson: any) => lesson.challenges));
      if (challenges.length === 0) { res.status(409).json({ error: "This course does not have any challenges yet" }); return; }

      const progressRows = await prisma.languageQuestChallengeProgress.findMany({
        where: { userId: jwtUser.userId, challengeId: { in: challenges.map((challenge: any) => challenge.id) } },
        select: { challengeId: true, completed: true, wrongAttempts: true },
      });
      const progressByChallenge = new Map<string, any>(progressRows.map((row: any) => [row.challengeId, row]));
      const courseCompleted = challenges.every((challenge: any) => progressByChallenge.get(challenge.id)?.completed);
      if (!courseCompleted) {
        res.status(403).json({ error: "Finish every lesson in this course to challenge its Boss Battle." });
        return;
      }

      const clearedEvent = await prisma.languageQuestXpEvent.findFirst({
        where: { userId: jwtUser.userId, courseId: course.id, source: "BOSS_BATTLE" },
        select: { id: true },
      });

      // Boss Battle's UI only supports "click one option to answer," so types
      // that grade something other than a single chosen option -- REORDER
      // (a submitted sequence), MATCHING (connected tile pairs), and
      // DICTATION (typed text, whose lone option would otherwise render as a
      // directly clickable answer) -- aren't eligible questions here.
      // Finishing the course still requires clearing them in the normal
      // lesson flow above; they're just never selected into a battle deck.
      const BATTLE_INELIGIBLE_TYPES = new Set(["REORDER", "MATCHING", "DICTATION"]);
      const battleEligibleChallenges = challenges.filter((challenge: any) => !BATTLE_INELIGIBLE_TYPES.has(challenge.type));

      // Rank by how often the learner has gotten each one wrong before, so
      // the battle is built from *their* weak spots. Most challenges will
      // tie at zero wrong attempts, so shuffle first to keep the deck fresh
      // across attempts instead of always picking course order.
      const ranked = shuffle(battleEligibleChallenges)
        .map((challenge: any) => ({ challenge, wrongAttempts: progressByChallenge.get(challenge.id)?.wrongAttempts ?? 0 }))
        .sort((a: any, b: any) => b.wrongAttempts - a.wrongAttempts)
        .slice(0, LANGUAGE_QUEST_BOSS_BATTLE_MAX_QUESTIONS)
        .map((entry: any) => entry.challenge);

      res.json({
        course: { id: course.id, title: course.title, language: course.language, accentColor: course.accentColor },
        cleared: Boolean(clearedEvent),
        minQuestions: LANGUAGE_QUEST_BOSS_BATTLE_MIN_QUESTIONS,
        passRatio: LANGUAGE_QUEST_BOSS_BATTLE_PASS_RATIO,
        cards: shuffle(ranked).map((challenge: any) => ({
          challengeId: challenge.id,
          question: languageQuestPracticePrompt(challenge.question),
          options: shuffle(challenge.options).map((option: any) => ({
            id: option.id, text: option.text, emoji: option.emoji, audioText: option.audioText,
            pinyin: languageQuestPinyin(option.text, course.language),
          })),
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest boss battle:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the boss battle" });
    }
  });

  app.post("/api/language-quest/courses/:id/boss-battle/finish", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const submitted = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (submitted.length === 0 || submitted.length > LANGUAGE_QUEST_BOSS_BATTLE_MAX_QUESTIONS * 2) {
      res.status(400).json({ error: "Submit your boss battle answers" });
      return;
    }
    const answers = submitted
      .filter((entry: any) => entry && typeof entry.challengeId === "string")
      .map((entry: any) => ({
        challengeId: entry.challengeId,
        optionId: typeof entry.optionId === "string" ? entry.optionId : null,
      }));
    const now = new Date();
    try {
      const course = await prisma.languageQuestCourse.findUnique({
        where: { id: req.params.id },
        include: {
          units: { include: { lessons: { include: { challenges: { include: { options: true } } } } } },
        },
      });
      if (!course || (!course.published && !isManager(jwtUser.role))) { res.status(404).json({ error: "Course not found" }); return; }

      const challenges = course.units.flatMap((unit: any) => unit.lessons.flatMap((lesson: any) => lesson.challenges));
      const progressRows = await prisma.languageQuestChallengeProgress.findMany({
        where: { userId: jwtUser.userId, challengeId: { in: challenges.map((challenge: any) => challenge.id) } },
        select: { challengeId: true, completed: true },
      });
      const completedIds = new Set(progressRows.filter((row: any) => row.completed).map((row: any) => row.challengeId));
      const courseCompleted = challenges.length > 0 && challenges.every((challenge: any) => completedIds.has(challenge.id));
      if (!courseCompleted) {
        res.status(403).json({ error: "Finish every lesson in this course to challenge its Boss Battle." });
        return;
      }

      // The answer key is built fresh from the database here -- never from
      // anything the client sent -- so grading can't be spoofed by a crafted
      // request claiming a made-up option id was correct.
      const answerKey = challenges.map((challenge: any) => {
        const correctOption = challenge.options.find((option: any) => option.correct);
        return { challengeId: challenge.id, correctOptionId: correctOption?.id ?? "", correctAnswer: correctOption?.text ?? "" };
      });
      const outcome = bossBattleResult(answers, answerKey, {
        minQuestions: LANGUAGE_QUEST_BOSS_BATTLE_MIN_QUESTIONS,
        passRatio: LANGUAGE_QUEST_BOSS_BATTLE_PASS_RATIO,
      });

      const existingClear = await prisma.languageQuestXpEvent.findFirst({
        where: { userId: jwtUser.userId, courseId: course.id, source: "BOSS_BATTLE" },
        select: { id: true },
      });
      if (!outcome.won || existingClear) {
        const progress = await getProgress(prisma, jwtUser.userId);
        res.json({ ...outcome, pointsAwarded: 0, alreadyCleared: Boolean(existingClear), profile: profileJson(progress), unlockedRewardIds: [] });
        return;
      }

      await prisma.languageQuestUserProgress.upsert({
        where: { userId: jwtUser.userId },
        update: {},
        create: { userId: jwtUser.userId },
      });
      const award = await prisma.$transaction(async (tx: any) => {
        const rows: any[] = await tx.$queryRaw`
          SELECT * FROM "LanguageQuestUserProgress" WHERE "userId" = ${jwtUser.userId} FOR UPDATE
        `;
        const before = rows[0];
        // Re-check for an existing clear *after* taking the row lock, so two
        // finish requests racing each other can't both slip past the outer
        // check above and both award the one-time bonus.
        const raceCheck = await tx.languageQuestXpEvent.findFirst({
          where: { userId: jwtUser.userId, courseId: course.id, source: "BOSS_BATTLE" },
          select: { id: true },
        });
        if (raceCheck) {
          return { pointsAwarded: 0, alreadyCleared: true, profile: profileJson(before), unlockedRewardIds: [] as string[] };
        }
        const updated = await tx.languageQuestUserProgress.update({
          where: { userId: jwtUser.userId },
          data: { points: { increment: LANGUAGE_QUEST_BOSS_BATTLE_POINTS } },
        });
        await tx.languageQuestXpEvent.create({
          data: {
            userId: jwtUser.userId, courseId: course.id, source: "BOSS_BATTLE", sourceId: course.id,
            points: LANGUAGE_QUEST_BOSS_BATTLE_POINTS, occurredAt: now,
          },
        });
        return {
          pointsAwarded: LANGUAGE_QUEST_BOSS_BATTLE_POINTS,
          alreadyCleared: false,
          profile: profileJson(updated),
          unlockedRewardIds: newlyUnlockedLanguageQuestRewardIds(before.points, updated.points),
        };
      });

      res.json({ ...outcome, ...award });
    } catch (error) {
      logger.error("Error finishing Language Quest boss battle:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to finish the boss battle" });
    }
  });

  app.get("/api/language-quest/lessons/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const lesson = await prisma.languageQuestLesson.findUnique({
        where: { id: req.params.id },
        include: {
          unit: { include: { course: true } },
          challenges: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
        },
      });
      if (!lesson || (!lesson.unit.course.published && !isManager(jwtUser.role))) { res.status(404).json({ error: "Lesson not found" }); return; }
      if (lesson.challenges.length === 0) { res.status(409).json({ error: "This lesson does not have any challenges yet" }); return; }

      const lockMessage = await lessonLockMessage(prisma, jwtUser, lesson);
      if (lockMessage) { res.status(403).json({ error: lockMessage }); return; }

      const progress = await getProgress(prisma, jwtUser.userId);
      const completions = await prisma.languageQuestChallengeProgress.findMany({
        where: { userId: jwtUser.userId, challengeId: { in: lesson.challenges.map((challenge: any) => challenge.id) } },
        select: { challengeId: true, completed: true },
      });
      const completedIds = new Set(completions.filter((row: any) => row.completed).map((row: any) => row.challengeId));

      res.json({
        id: lesson.id, title: lesson.title, description: lesson.description,
        course: {
          id: lesson.unit.course.id,
          title: lesson.unit.course.title,
          language: lesson.unit.course.language,
          accentColor: lesson.unit.course.accentColor,
        },
        profile: profileJson(progress),
        challenges: lesson.challenges.map((challenge: any) => ({
          id: challenge.id,
          type: challenge.type,
          question: languageQuestPracticePrompt(challenge.question),
          completed: completedIds.has(challenge.id),
          options: shuffle(challenge.options).map((option: any) => ({
            id: option.id, text: option.text, emoji: option.emoji, audioText: option.audioText,
            pinyin: languageQuestPinyin(option.text, lesson.unit.course.language),
          })),
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest lesson:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the lesson" });
    }
  });

  app.get("/api/language-quest/lessons/:id/preview", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const lesson = await prisma.languageQuestLesson.findUnique({
        where: { id: req.params.id },
        include: {
          unit: { include: { course: true } },
          challenges: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
        },
      });
      if (!lesson || (!lesson.unit.course.published && !isManager(jwtUser.role))) { res.status(404).json({ error: "Lesson not found" }); return; }
      if (lesson.challenges.length === 0) { res.status(409).json({ error: "This lesson does not have any challenges yet" }); return; }

      const lockMessage = await lessonLockMessage(prisma, jwtUser, lesson);
      if (lockMessage) { res.status(403).json({ error: lockMessage }); return; }

      res.json({
        id: lesson.id, title: lesson.title, description: lesson.description,
        course: {
          id: lesson.unit.course.id,
          title: lesson.unit.course.title,
          language: lesson.unit.course.language,
          accentColor: lesson.unit.course.accentColor,
        },
        cards: lesson.challenges.map((challenge: any) => {
          const correct = challenge.options.find((option: any) => option.correct);
          return {
            id: challenge.id,
            prompt: challenge.question,
            practicePrompt: languageQuestPracticePrompt(challenge.question),
            text: correct?.text ?? "",
            emoji: correct?.emoji ?? null,
            audioText: correct?.audioText ?? correct?.text ?? null,
            pinyin: languageQuestPinyin(correct?.text ?? "", lesson.unit.course.language),
          };
        }),
      });
    } catch (error) {
      logger.error("Error loading Language Quest lesson preview:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the lesson preview" });
    }
  });

  app.post("/api/language-quest/challenges/:id/answer", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const optionId = text(req.body?.optionId, 100);
    // REORDER challenges submit the whole sequence the learner built, MATCHING
    // submits the tile pairs they connected, DICTATION submits typed text --
    // everything else (SELECT/ASSIST/CLOZE/ODD_ONE_OUT/MINIMAL_PAIR_LISTENING)
    // still submits one optionId, checked the original way.
    const orderedOptionIds = Array.isArray(req.body?.orderedOptionIds)
      ? req.body.orderedOptionIds.filter((id: unknown): id is string => typeof id === "string")
      : null;
    const matchedPairs = Array.isArray(req.body?.matchedPairs)
      ? req.body.matchedPairs.filter(
          (pair: unknown): pair is [string, string] => Array.isArray(pair) && pair.length === 2 && pair.every((id) => typeof id === "string"),
        )
      : null;
    const typedAnswer = text(req.body?.typedAnswer, 300);
    try {
      const challenge = await prisma.languageQuestChallenge.findUnique({
        where: { id: req.params.id },
        include: {
          options: { orderBy: { order: "asc" } },
          lesson: { include: { unit: { include: { course: true } } } },
        },
      });
      if (!challenge || !challenge.lesson.unit.course.published) { res.status(404).json({ error: "Challenge not found" }); return; }

      let isCorrect: boolean;
      let correctOptionId: string;
      let correctAnswer: string;
      if (challenge.type === "REORDER") {
        const canonicalIds = challenge.options.map((option: any) => option.id);
        if (!isValidReorderSubmission(canonicalIds, orderedOptionIds)) {
          res.status(400).json({ error: "Place every tile before checking your answer" });
          return;
        }
        isCorrect = reorderChallengeIsCorrect(canonicalIds, orderedOptionIds);
        correctOptionId = canonicalIds[0];
        correctAnswer = challenge.options.map((option: any) => option.text).join(" ");
      } else if (challenge.type === "MATCHING") {
        const canonicalIds = challenge.options.map((option: any) => option.id);
        if (!isValidMatchingSubmission(canonicalIds, matchedPairs)) {
          res.status(400).json({ error: "Connect every tile before checking your answer" });
          return;
        }
        isCorrect = matchingChallengeIsCorrect(canonicalIds, matchedPairs);
        correctOptionId = canonicalIds[0];
        correctAnswer = pairedMatchAnswerSummary(challenge.options);
      } else if (challenge.type === "DICTATION") {
        if (!typedAnswer) { res.status(400).json({ error: "Type what you heard" }); return; }
        const correctOption = challenge.options.find((option: any) => option.correct);
        if (!correctOption) { res.status(409).json({ error: "This challenge has no correct answer configured" }); return; }
        isCorrect = languageQuestAnswerMatches(typedAnswer, correctOption.text);
        correctOptionId = correctOption.id;
        correctAnswer = correctOption.text;
      } else {
        if (!optionId) { res.status(400).json({ error: "Choose an answer" }); return; }
        const selected = challenge.options.find((option: any) => option.id === optionId);
        if (!selected) { res.status(400).json({ error: "That answer does not belong to this challenge" }); return; }
        const correctOption = challenge.options.find((option: any) => option.correct);
        if (!correctOption) { res.status(409).json({ error: "This challenge has no correct answer configured" }); return; }
        isCorrect = Boolean(selected.correct);
        correctOptionId = correctOption.id;
        correctAnswer = correctOption.text;
      }
      const now = new Date();
      // Make sure a progress row exists before we try to lock it below (upsert
      // outside the transaction is fine — it's idempotent and only needs to run once).
      await prisma.languageQuestUserProgress.upsert({
        where: { userId: jwtUser.userId }, update: {}, create: { userId: jwtUser.userId },
      });
      const result = await prisma.$transaction(async (tx: any) => {
        // Lock the learner's progress row for the whole transaction so concurrent
        // answer submissions (double-click, retry, multiple tabs) are serialized
        // instead of racing on a stale JS-side read of `hearts`. Previously the
        // hearts check happened before the transaction and the decrement was a
        // read-then-write, so two simultaneous requests at hearts === 1 could both
        // pass the gate and both be processed (a partial regression of 5178e5f).
        const rows: any[] = await tx.$queryRaw`
          SELECT * FROM "LanguageQuestUserProgress" WHERE "userId" = ${jwtUser.userId} FOR UPDATE
        `;
        let progress = rows[0];
        if (
          progress?.updatedAt
          && languageQuestDayKey(progress.updatedAt) !== languageQuestDayKey(now)
          && progress.hearts < LANGUAGE_QUEST_MAX_HEARTS
        ) {
          progress = await tx.languageQuestUserProgress.update({
            where: { userId: jwtUser.userId },
            data: { hearts: LANGUAGE_QUEST_MAX_HEARTS },
          });
        }
        const existing = await tx.languageQuestChallengeProgress.findUnique({
          where: { userId_challengeId: { userId: jwtUser.userId, challengeId: challenge.id } },
        });
        if (!canAttemptNewChallenge(progress.hearts, Boolean(existing?.completed))) {
          return { outOfHearts: true as const, profile: profileJson(progress) };
        }
        if (isCorrect) {
          const firstClear = !existing?.completed;
          // Practising an already-cleared challenge only earns points while it is
          // actually refilling a heart (hearts below max). Once hearts are full,
          // replaying the same cleared challenge pays out nothing, which closes off
          // unlimited point farming from scripted replays while preserving the
          // "replay a finished lesson to earn hearts back" design.
          const refillsHeart = !firstClear && progress.hearts < LANGUAGE_QUEST_MAX_HEARTS;
          const pointsAwarded = firstClear
            ? LANGUAGE_QUEST_FIRST_CLEAR_POINTS
            : (refillsHeart ? LANGUAGE_QUEST_PRACTICE_POINTS : 0);
          const streak = nextLanguageQuestStreak({
            currentStreak: progress.currentStreak,
            bestStreak: progress.bestStreak,
            lastPlayedDate: progress.lastPlayedDate,
            now,
          });
          await tx.languageQuestChallengeProgress.upsert({
            where: { userId_challengeId: { userId: jwtUser.userId, challengeId: challenge.id } },
            update: {
              completed: true, attempts: { increment: 1 }, correctAttempts: { increment: 1 },
              completedAt: existing?.completedAt ?? now, lastAttemptAt: now,
            },
            create: {
              userId: jwtUser.userId, challengeId: challenge.id, completed: true,
              attempts: 1, correctAttempts: 1, completedAt: now, lastAttemptAt: now,
            },
          });
          if (firstClear) {
            const firstReview = nextLanguageQuestMasteryReview(0, true, now);
            await tx.languageQuestMasteryProgress.upsert({
              where: {
                userId_challengeId: { userId: jwtUser.userId, challengeId: challenge.id },
              },
              update: {},
              create: {
                userId: jwtUser.userId,
                challengeId: challenge.id,
                stage: 1,
                dueAt: firstReview.dueAt,
              },
            });
          }
          const updated = await tx.languageQuestUserProgress.update({
            where: { userId: jwtUser.userId },
            data: {
              activeCourseId: challenge.lesson.unit.courseId,
              points: { increment: pointsAwarded },
              hearts: refillsHeart ? progress.hearts + 1 : progress.hearts,
              currentStreak: streak.currentStreak, bestStreak: streak.bestStreak, lastPlayedDate: now,
            },
          });
          if (pointsAwarded > 0) {
            await tx.languageQuestXpEvent.create({
              data: {
                userId: jwtUser.userId,
                courseId: challenge.lesson.unit.courseId,
                source: firstClear ? "CHALLENGE_FIRST_CLEAR" : "CHALLENGE_PRACTICE",
                sourceId: challenge.id,
                points: pointsAwarded,
                occurredAt: now,
              },
            });
          }
          return {
            correct: true,
            pointsAwarded,
            profile: profileJson(updated),
            unlockedRewardIds: newlyUnlockedLanguageQuestRewardIds(progress.points, updated.points),
          };
        }
        await tx.languageQuestChallengeProgress.upsert({
          where: { userId_challengeId: { userId: jwtUser.userId, challengeId: challenge.id } },
          update: { attempts: { increment: 1 }, wrongAttempts: { increment: 1 }, lastAttemptAt: now },
          create: { userId: jwtUser.userId, challengeId: challenge.id, attempts: 1, wrongAttempts: 1, lastAttemptAt: now },
        });
        const updated = await tx.languageQuestUserProgress.update({
          where: { userId: jwtUser.userId },
          data: { activeCourseId: challenge.lesson.unit.courseId, hearts: Math.max(0, progress.hearts - 1) },
        });
        return { correct: false, pointsAwarded: 0, profile: profileJson(updated), unlockedRewardIds: [] };
      });
      if (result.outOfHearts) {
        res.status(403).json({
          error: "You're out of hearts for new challenges. Replay a lesson you've already finished to earn hearts back, or come back after your daily refill.",
          code: "OUT_OF_HEARTS",
          profile: result.profile,
        });
        return;
      }
      res.json({ ...result, correctOptionId, correctAnswer });
    } catch (error) {
      logger.error("Error saving Language Quest answer:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to check that answer" });
    }
  });

  app.get("/api/language-quest/engagement", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const now = new Date();
    try {
      const [{ missions }, classroomChallenges, masteryDueCount] = await Promise.all([
        missionSnapshot(prisma, jwtUser.userId, now),
        prisma.languageQuestClassroomChallenge.findMany({
          where: {
            active: true,
            startsAt: { lte: now },
            endsAt: { gte: now },
            classroom: {
              active: true,
              members: { some: { userId: jwtUser.userId } },
            },
          },
          orderBy: { endsAt: "asc" },
          include: {
            classroom: {
              select: { id: true, name: true, focusCourseId: true },
            },
          },
        }),
        prisma.languageQuestMasteryProgress.count({
          where: { userId: jwtUser.userId, dueAt: { lte: now } },
        }),
      ]);
      const teamChallenges = await Promise.all(classroomChallenges.map(async (challenge: any) => {
        const progressXp = await classroomChallengeProgress(prisma, challenge);
        return {
          id: challenge.id,
          classroomName: challenge.classroom.name,
          title: challenge.title,
          description: challenge.description,
          targetXp: challenge.targetXp,
          progressXp,
          progressPercent: Math.min(100, Math.round((progressXp / challenge.targetXp) * 100)),
          rewardLabel: challenge.rewardLabel,
          endsAt: challenge.endsAt,
          complete: progressXp >= challenge.targetXp,
        };
      }));
      res.json({ missions, classroomChallenges: teamChallenges, masteryDueCount });
    } catch (error) {
      logger.error("Error loading Language Quest engagement:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load missions and challenges" });
    }
  });

  app.post("/api/language-quest/missions/:key/claim", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const key = text(req.params.key, 40);
    if (!LANGUAGE_QUEST_MISSIONS.some((mission) => mission.key === key)) {
      res.status(404).json({ error: "Mission not found" });
      return;
    }
    try {
      const snapshot = await missionSnapshot(prisma, jwtUser.userId);
      const mission = snapshot.missions.find((candidate) => candidate.key === key);
      if (!mission || !mission.claimable) {
        res.status(409).json({
          error: mission?.claimed ? "This mission reward was already claimed" : "Complete the mission before claiming its reward",
        });
        return;
      }
      await prisma.languageQuestUserProgress.upsert({
        where: { userId: jwtUser.userId },
        update: {},
        create: { userId: jwtUser.userId },
      });
      const result = await prisma.$transaction(async (tx: any) => {
        const rows: any[] = await tx.$queryRaw`
          SELECT * FROM "LanguageQuestUserProgress" WHERE "userId" = ${jwtUser.userId} FOR UPDATE
        `;
        const progress = rows[0];
        await tx.languageQuestMissionClaim.create({
          data: {
            userId: jwtUser.userId,
            missionKey: mission.key,
            periodKey: mission.periodKey,
            rewardXp: mission.rewardXp,
          },
        });
        const updated = await tx.languageQuestUserProgress.update({
          where: { userId: jwtUser.userId },
          data: { points: { increment: mission.rewardXp } },
        });
        await tx.languageQuestXpEvent.create({
          data: {
            userId: jwtUser.userId,
            source: "MISSION_REWARD",
            sourceId: `${mission.key}:${mission.periodKey}`,
            points: mission.rewardXp,
          },
        });
        return {
          pointsAwarded: mission.rewardXp,
          profile: profileJson(updated),
          unlockedRewardIds: newlyUnlockedLanguageQuestRewardIds(progress.points, updated.points),
        };
      });
      res.json(result);
    } catch (error: any) {
      if (error?.code === "P2002") {
        res.status(409).json({ error: "This mission reward was already claimed" });
        return;
      }
      logger.error("Error claiming Language Quest mission:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to claim this mission" });
    }
  });

  app.get("/api/language-quest/mastery", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const now = new Date();
    try {
      const completed = await prisma.languageQuestChallengeProgress.findMany({
        where: { userId: jwtUser.userId, completed: true },
        select: { challengeId: true },
      });
      const existing = await prisma.languageQuestMasteryProgress.findMany({
        where: { userId: jwtUser.userId },
        select: { challengeId: true },
      });
      const existingIds = new Set(existing.map((row: any) => row.challengeId));
      const missing = completed
        .filter((row: any) => !existingIds.has(row.challengeId))
        .map((row: any) => ({
          userId: jwtUser.userId,
          challengeId: row.challengeId,
          stage: 0,
          dueAt: now,
        }));
      if (missing.length > 0) {
        await prisma.languageQuestMasteryProgress.createMany({ data: missing, skipDuplicates: true });
      }
      const { dayStart, dayEnd } = languageQuestPeriodBounds(now);
      const [dueCount, reviewsToday, cards] = await Promise.all([
        prisma.languageQuestMasteryProgress.count({
          where: { userId: jwtUser.userId, dueAt: { lte: now } },
        }),
        // Counts any review touched today, correct or not, and from either
        // Mastery Arena or Lightning Round -- both write to the same
        // lastReviewedAt column, so Daily Quest Chain progress reflects
        // real review activity everywhere, not a separate counter.
        prisma.languageQuestMasteryProgress.count({
          where: { userId: jwtUser.userId, lastReviewedAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.languageQuestMasteryProgress.findMany({
          where: { userId: jwtUser.userId, dueAt: { lte: now } },
          take: 10,
          orderBy: [{ dueAt: "asc" }, { stage: "asc" }],
          include: {
            challenge: {
              include: {
                options: { orderBy: { order: "asc" } },
                lesson: { include: { unit: { include: { course: true } } } },
              },
            },
          },
        }),
      ]);
      res.json({
        dueCount,
        reviewsToday,
        chainTarget: LANGUAGE_QUEST_DAILY_CHAIN_TARGET,
        cards: cards.map((row: any) => ({
          challengeId: row.challengeId,
          stage: row.stage,
          type: row.challenge.type,
          question: languageQuestPracticePrompt(row.challenge.question),
          course: {
            id: row.challenge.lesson.unit.course.id,
            title: row.challenge.lesson.unit.course.title,
            language: row.challenge.lesson.unit.course.language,
            accentColor: row.challenge.lesson.unit.course.accentColor,
          },
          options: shuffle(row.challenge.options).map((option: any) => ({
            id: option.id,
            text: option.text,
            emoji: option.emoji,
            audioText: option.audioText,
            pinyin: languageQuestPinyin(option.text, row.challenge.lesson.unit.course.language),
          })),
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest mastery reviews:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load mastery reviews" });
    }
  });

  app.post("/api/language-quest/mastery/:id/answer", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const optionId = text(req.body?.optionId, 100);
    const orderedOptionIds = Array.isArray(req.body?.orderedOptionIds)
      ? req.body.orderedOptionIds.filter((id: unknown): id is string => typeof id === "string")
      : null;
    const matchedPairs = Array.isArray(req.body?.matchedPairs)
      ? req.body.matchedPairs.filter(
          (pair: unknown): pair is [string, string] => Array.isArray(pair) && pair.length === 2 && pair.every((id) => typeof id === "string"),
        )
      : null;
    const typedAnswer = text(req.body?.typedAnswer, 300);
    const now = new Date();
    try {
      const challenge = await prisma.languageQuestChallenge.findUnique({
        where: { id: req.params.id },
        include: {
          options: { orderBy: { order: "asc" } },
          lesson: { include: { unit: { include: { course: true } } } },
        },
      });
      if (!challenge) {
        res.status(400).json({ error: "That mastery answer is not available" });
        return;
      }

      let isCorrect: boolean;
      let correctOptionId: string;
      let correctAnswer: string;
      if (challenge.type === "REORDER") {
        const canonicalIds = challenge.options.map((option: any) => option.id);
        if (!isValidReorderSubmission(canonicalIds, orderedOptionIds)) {
          res.status(400).json({ error: "That mastery answer is not available" });
          return;
        }
        isCorrect = reorderChallengeIsCorrect(canonicalIds, orderedOptionIds);
        correctOptionId = canonicalIds[0];
        correctAnswer = challenge.options.map((option: any) => option.text).join(" ");
      } else if (challenge.type === "MATCHING") {
        const canonicalIds = challenge.options.map((option: any) => option.id);
        if (!isValidMatchingSubmission(canonicalIds, matchedPairs)) {
          res.status(400).json({ error: "That mastery answer is not available" });
          return;
        }
        isCorrect = matchingChallengeIsCorrect(canonicalIds, matchedPairs);
        correctOptionId = canonicalIds[0];
        correctAnswer = pairedMatchAnswerSummary(challenge.options);
      } else if (challenge.type === "DICTATION") {
        const correctOption = challenge.options.find((option: any) => option.correct);
        if (!typedAnswer || !correctOption) {
          res.status(400).json({ error: "That mastery answer is not available" });
          return;
        }
        isCorrect = languageQuestAnswerMatches(typedAnswer, correctOption.text);
        correctOptionId = correctOption.id;
        correctAnswer = correctOption.text;
      } else {
        const selected = optionId ? challenge.options.find((option: any) => option.id === optionId) : null;
        const correctOption = challenge.options.find((option: any) => option.correct);
        if (!selected || !correctOption) {
          res.status(400).json({ error: "That mastery answer is not available" });
          return;
        }
        isCorrect = Boolean(selected.correct);
        correctOptionId = correctOption.id;
        correctAnswer = correctOption.text;
      }

      await prisma.languageQuestUserProgress.upsert({
        where: { userId: jwtUser.userId },
        update: {},
        create: { userId: jwtUser.userId },
      });
      const result = await prisma.$transaction(async (tx: any) => {
        const reviewRows: any[] = await tx.$queryRaw`
          SELECT * FROM "LanguageQuestMasteryProgress"
          WHERE "userId" = ${jwtUser.userId} AND "challengeId" = ${challenge.id}
          FOR UPDATE
        `;
        const review = reviewRows[0];
        if (!review || review.dueAt > now) return { unavailable: true as const };
        const next = nextLanguageQuestMasteryReview(review.stage, isCorrect, now);
        await tx.languageQuestMasteryProgress.update({
          where: { userId_challengeId: { userId: jwtUser.userId, challengeId: challenge.id } },
          data: {
            stage: next.stage,
            dueAt: next.dueAt,
            lastReviewedAt: now,
            ...(isCorrect
              ? { correctReviews: { increment: 1 } }
              : { wrongReviews: { increment: 1 } }),
          },
        });
        if (!isCorrect) {
          return {
            correct: false,
            pointsAwarded: 0,
            nextDueAt: next.dueAt,
            correctOptionId,
            correctAnswer,
          };
        }
        const progressRows: any[] = await tx.$queryRaw`
          SELECT * FROM "LanguageQuestUserProgress" WHERE "userId" = ${jwtUser.userId} FOR UPDATE
        `;
        const progress = progressRows[0];
        const streak = nextLanguageQuestStreak({
          currentStreak: progress.currentStreak,
          bestStreak: progress.bestStreak,
          lastPlayedDate: progress.lastPlayedDate,
          now,
        });
        const updated = await tx.languageQuestUserProgress.update({
          where: { userId: jwtUser.userId },
          data: {
            points: { increment: LANGUAGE_QUEST_MASTERY_POINTS },
            activeCourseId: challenge.lesson.unit.courseId,
            currentStreak: streak.currentStreak,
            bestStreak: streak.bestStreak,
            lastPlayedDate: now,
          },
        });
        await tx.languageQuestXpEvent.create({
          data: {
            userId: jwtUser.userId,
            courseId: challenge.lesson.unit.courseId,
            source: "MASTERY",
            sourceId: challenge.id,
            points: LANGUAGE_QUEST_MASTERY_POINTS,
            occurredAt: now,
          },
        });
        return {
          correct: true,
          pointsAwarded: LANGUAGE_QUEST_MASTERY_POINTS,
          nextDueAt: next.dueAt,
          correctOptionId,
          correctAnswer,
          profile: profileJson(updated),
          unlockedRewardIds: newlyUnlockedLanguageQuestRewardIds(progress.points, updated.points),
        };
      });
      if (result.unavailable) {
        res.status(409).json({ error: "This review is no longer due" });
        return;
      }
      res.json(result);
    } catch (error) {
      logger.error("Error checking Language Quest mastery answer:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to check this mastery answer" });
    }
  });

  app.get("/api/language-quest/leaderboard", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const periods = languageQuestPeriodBounds();
      // Language Quest uses one global board for every active learner. Access
      // to private LMS routes and APIs remains independently restricted.
      const audienceWhere = languageQuestGlobalLeaderboardWhere();
      const [leaders, mine, monthlyXp] = await Promise.all([
        prisma.languageQuestUserProgress.findMany({
          where: { user: audienceWhere },
          take: 50,
          orderBy: [{ points: "desc" }, { currentStreak: "desc" }, { updatedAt: "asc" }],
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true, languageQuestAvatar: true } } },
        }),
        getProgress(prisma, jwtUser.userId),
        prisma.languageQuestXpEvent.groupBy({
          by: ["userId"],
          where: {
            occurredAt: { gte: periods.monthStart, lt: periods.monthEnd },
            source: { not: "MISSION_REWARD" },
            user: audienceWhere,
          },
          _sum: { points: true },
          orderBy: { _sum: { points: "desc" } },
          take: 3,
        }),
      ]);
      const showcaseUsers = monthlyXp.length
        ? await prisma.user.findMany({
          where: { id: { in: monthlyXp.map((row: any) => row.userId) } },
          select: {
            id: true, firstName: true, lastName: true, languageQuestAvatar: true,
            languageQuestProgress: { select: { points: true } },
          },
        })
        : [];
      const showcaseById = new Map(showcaseUsers.map((user: any) => [user.id, user]));
      const rank = await prisma.languageQuestUserProgress.count({
        where: {
          points: { gt: mine.points },
          user: audienceWhere,
        },
      });
      res.json({
        currentUserId: jwtUser.userId,
        currentUserRank: rank + 1,
        monthlyShowcase: monthlyXp.map((row: any, index: number) => {
          const user: any = showcaseById.get(row.userId);
          const rewards = languageQuestRewardProgress(user?.languageQuestProgress?.points || 0);
          return {
            rank: index + 1,
            userId: row.userId,
            name: user ? `${user.firstName} ${user.lastName}`.trim() : "Learner",
            avatarId: user?.languageQuestAvatar || DEFAULT_LANGUAGE_QUEST_AVATAR,
            monthXp: row._sum.points || 0,
            currentCardId: rewards.currentCardId,
            monthKey: periods.monthKey,
          };
        }),
        leaders: leaders.map((row: any, index: number) => ({
          rank: index + 1, userId: row.userId,
          name: `${row.user.firstName} ${row.user.lastName}`.trim(), role: row.user.role,
          avatarId: row.user.languageQuestAvatar || DEFAULT_LANGUAGE_QUEST_AVATAR,
          points: row.points, currentStreak: row.currentStreak,
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest leaderboard:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the leaderboard" });
    }
  });

  app.get("/api/language-quest/classrooms", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const classrooms = await prisma.languageQuestClassroom.findMany({
        where: jwtUser.role === "ADMIN" ? {} : { teacherId: jwtUser.userId },
        orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
        include: {
          teacher: { select: { firstName: true, lastName: true } },
          focusCourse: { select: { id: true, title: true, imageEmoji: true } },
          _count: { select: { members: true } },
        },
      });
      const courses = await prisma.languageQuestCourse.findMany({
        where: { published: true },
        orderBy: { title: "asc" },
        select: { id: true, title: true, imageEmoji: true },
      });
      res.json({
        courses,
        classrooms: classrooms.map((classroom: any) => ({
          id: classroom.id,
          name: classroom.name,
          joinCode: classroom.joinCode,
          active: classroom.active,
          memberCount: classroom._count.members,
          teacherName: `${classroom.teacher.firstName} ${classroom.teacher.lastName}`.trim(),
          focusCourse: classroom.focusCourse,
          updatedAt: classroom.updatedAt,
          canEdit: jwtUser.role === "ADMIN" || classroom.teacherId === jwtUser.userId,
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest classrooms:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load classrooms" });
    }
  });

  app.post("/api/language-quest/classrooms", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const name = text(req.body?.name, 100);
    const focusCourseId = text(req.body?.focusCourseId, 100) || null;
    if (!name) { res.status(400).json({ error: "Classroom name is required" }); return; }
    try {
      if (focusCourseId) {
        const course = await prisma.languageQuestCourse.findFirst({ where: { id: focusCourseId, published: true }, select: { id: true } });
        if (!course) { res.status(400).json({ error: "Choose a published focus course" }); return; }
      }
      let classroom: any;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          classroom = await prisma.languageQuestClassroom.create({
            data: { name, teacherId: jwtUser.userId, focusCourseId, joinCode: languageQuestJoinCode() },
          });
          break;
        } catch (error: any) {
          if (error?.code !== "P2002" || attempt === 3) throw error;
        }
      }
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "LANGUAGE_QUEST_CLASSROOM", classroom.id,
        `Created Language Quest classroom '${name}'.`, req.ip || null, req.headers["user-agent"] || null);
      res.status(201).json(classroom);
    } catch (error) {
      logger.error("Error creating Language Quest classroom:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to create classroom" });
    }
  });

  app.patch("/api/language-quest/classrooms/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const name = req.body?.name === undefined ? undefined : text(req.body.name, 100);
    const focusCourseId = req.body?.focusCourseId === undefined ? undefined : (text(req.body.focusCourseId, 100) || null);
    const active = typeof req.body?.active === "boolean" ? req.body.active : undefined;
    if (name !== undefined && !name) { res.status(400).json({ error: "Classroom name cannot be empty" }); return; }
    try {
      const existing = await prisma.languageQuestClassroom.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Classroom not found" }); return; }
      if (jwtUser.role !== "ADMIN" && existing.teacherId !== jwtUser.userId) {
        res.status(403).json({ error: "You can only manage your own classrooms" });
        return;
      }
      if (focusCourseId) {
        const course = await prisma.languageQuestCourse.findFirst({ where: { id: focusCourseId, published: true }, select: { id: true } });
        if (!course) { res.status(400).json({ error: "Choose a published focus course" }); return; }
      }
      const classroom = await prisma.languageQuestClassroom.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(focusCourseId !== undefined ? { focusCourseId } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
      res.json(classroom);
    } catch (error) {
      logger.error("Error updating Language Quest classroom:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to update classroom" });
    }
  });

  app.get("/api/language-quest/classrooms/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const classroom = await prisma.languageQuestClassroom.findUnique({
        where: { id: req.params.id },
        include: {
          teacher: { select: { firstName: true, lastName: true } },
          focusCourse: {
            include: { units: { include: { lessons: { include: { challenges: { select: { id: true } } } } } } },
          },
          members: {
            orderBy: { joinedAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  isActive: true,
                  languageQuestAvatar: true,
                  languageQuestProgress: true,
                  languageQuestChallenges: {
                    where: { completed: true },
                    select: { challengeId: true },
                  },
                },
              },
            },
          },
          challenges: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!classroom) { res.status(404).json({ error: "Classroom not found" }); return; }
      if (jwtUser.role !== "ADMIN" && classroom.teacherId !== jwtUser.userId) {
        res.status(403).json({ error: "You can only view your own classroom roster" });
        return;
      }
      const focusChallengeIds = new Set<string>(
        classroom.focusCourse?.units.flatMap((unit: any) =>
          unit.lessons.flatMap((lesson: any) => lesson.challenges.map((challenge: any) => challenge.id)),
        ) || [],
      );
      const challenges = await Promise.all(classroom.challenges.map(async (challenge: any) => {
        const progressXp = await classroomChallengeProgress(prisma, {
          ...challenge,
          classroom: { focusCourseId: classroom.focusCourseId },
        });
        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          targetXp: challenge.targetXp,
          rewardLabel: challenge.rewardLabel,
          startsAt: challenge.startsAt,
          endsAt: challenge.endsAt,
          active: challenge.active,
          progressXp,
          progressPercent: Math.min(100, Math.round((progressXp / challenge.targetXp) * 100)),
          complete: progressXp >= challenge.targetXp,
        };
      }));
      res.json({
        id: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
        active: classroom.active,
        teacherName: `${classroom.teacher.firstName} ${classroom.teacher.lastName}`.trim(),
        focusCourse: classroom.focusCourse ? {
          id: classroom.focusCourse.id,
          title: classroom.focusCourse.title,
          imageEmoji: classroom.focusCourse.imageEmoji,
          challengeCount: focusChallengeIds.size,
        } : null,
        challenges,
        members: classroom.members.map((membership: any) => {
          const completedIds = membership.user.languageQuestChallenges.map((row: any) => row.challengeId);
          const focusCompleted = focusChallengeIds.size
            ? completedIds.filter((id: string) => focusChallengeIds.has(id)).length
            : completedIds.length;
          const denominator = focusChallengeIds.size || completedIds.length;
          return {
            userId: membership.user.id,
            name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
            avatarId: membership.user.languageQuestAvatar || DEFAULT_LANGUAGE_QUEST_AVATAR,
            active: membership.user.isActive,
            joinedAt: membership.joinedAt,
            points: membership.user.languageQuestProgress?.points || 0,
            currentStreak: membership.user.languageQuestProgress?.currentStreak || 0,
            bestStreak: membership.user.languageQuestProgress?.bestStreak || 0,
            lastPlayedDate: membership.user.languageQuestProgress?.lastPlayedDate || null,
            completedChallenges: completedIds.length,
            focusCompleted,
            focusProgressPercent: denominator ? Math.round((focusCompleted / denominator) * 100) : 0,
          };
        }),
      });
    } catch (error) {
      logger.error("Error loading Language Quest classroom roster:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load classroom roster" });
    }
  });

  app.post("/api/language-quest/classrooms/:id/challenges", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const title = text(req.body?.title, 120);
    const description = nullableText(req.body?.description, 300);
    const rewardLabel = nullableText(req.body?.rewardLabel, 80);
    const targetXp = Number(req.body?.targetXp);
    const durationDays = Number(req.body?.durationDays);
    if (!title) { res.status(400).json({ error: "Challenge title is required" }); return; }
    if (!Number.isInteger(targetXp) || targetXp < 30 || targetXp > 10_000) {
      res.status(400).json({ error: "Target XP must be between 30 and 10,000" });
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) {
      res.status(400).json({ error: "Challenge duration must be between 1 and 30 days" });
      return;
    }
    try {
      const classroom = await prisma.languageQuestClassroom.findUnique({
        where: { id: req.params.id },
        select: { id: true, name: true, teacherId: true, active: true },
      });
      if (!classroom) { res.status(404).json({ error: "Classroom not found" }); return; }
      if (jwtUser.role !== "ADMIN" && classroom.teacherId !== jwtUser.userId) {
        res.status(403).json({ error: "You can only manage your own classroom" });
        return;
      }
      if (!classroom.active) { res.status(409).json({ error: "Activate the classroom before starting a challenge" }); return; }
      const startsAt = new Date();
      const challenge = await prisma.languageQuestClassroomChallenge.create({
        data: {
          classroomId: classroom.id,
          title,
          description,
          rewardLabel,
          targetXp,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000),
        },
      });
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "LANGUAGE_QUEST_CLASSROOM_CHALLENGE",
        challenge.id, `Started team challenge '${title}' for ${classroom.name}.`,
        req.ip || null, req.headers["user-agent"] || null,
      );
      res.status(201).json(challenge);
    } catch (error) {
      logger.error("Error creating Language Quest classroom challenge:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to create classroom challenge" });
    }
  });

  app.patch("/api/language-quest/classrooms/:id/challenges/:challengeId", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    if (typeof req.body?.active !== "boolean") {
      res.status(400).json({ error: "Challenge active status is required" });
      return;
    }
    try {
      const classroom = await prisma.languageQuestClassroom.findUnique({
        where: { id: req.params.id },
        select: { teacherId: true },
      });
      if (!classroom) { res.status(404).json({ error: "Classroom not found" }); return; }
      if (jwtUser.role !== "ADMIN" && classroom.teacherId !== jwtUser.userId) {
        res.status(403).json({ error: "You can only manage your own classroom" });
        return;
      }
      const updated = await prisma.languageQuestClassroomChallenge.updateMany({
        where: { id: req.params.challengeId, classroomId: req.params.id },
        data: { active: req.body.active },
      });
      if (!updated.count) { res.status(404).json({ error: "Classroom challenge not found" }); return; }
      res.json({ success: true });
    } catch (error) {
      logger.error("Error updating Language Quest classroom challenge:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to update classroom challenge" });
    }
  });

  app.delete("/api/language-quest/classrooms/:id/members/:userId", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const classroom = await prisma.languageQuestClassroom.findUnique({ where: { id: req.params.id }, select: { teacherId: true } });
      if (!classroom) { res.status(404).json({ error: "Classroom not found" }); return; }
      if (jwtUser.role !== "ADMIN" && classroom.teacherId !== jwtUser.userId) {
        res.status(403).json({ error: "You can only manage your own classroom roster" });
        return;
      }
      await prisma.languageQuestClassroomMember.deleteMany({
        where: { classroomId: req.params.id, userId: req.params.userId },
      });
      res.json({ success: true });
    } catch (error) {
      logger.error("Error removing Language Quest classroom member:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to remove learner" });
    }
  });

  app.get("/api/language-quest/admin/learners", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Administrator access required" }); return; }
    const query = text(req.query.q, 100);
    const status = text(req.query.status, 20).toUpperCase();
    const courseId = text(req.query.courseId, 60);
    // "external" (default) matches the original scope of this page — public
    // self-signup learners, whose account lifecycle (deactivate/terminate)
    // lives here. "all" widens the list to every account with any Language
    // Quest activity — students, teachers, everyone — purely so an admin can
    // see and filter by course; the account-management actions below stay
    // restricted to external learners regardless of which scope is loaded.
    const scope = text(req.query.scope, 20).toLowerCase() === "all" ? "all" : "external";
    try {
      const learners = await prisma.user.findMany({
        where: {
          ...(scope === "external" ? { isExternalLearner: true } : { languageQuestProgress: { isNot: null } }),
          ...(status === "ACTIVE" ? { isActive: true } : status === "INACTIVE" ? { isActive: false } : {}),
          ...(courseId ? { languageQuestProgress: { activeCourseId: courseId } } : {}),
          ...(query ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          } : {}),
        },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          isExternalLearner: true,
          languageQuestAvatar: true,
          languageQuestBio: true,
          lastLoginAt: true,
          createdAt: true,
          languageQuestProgress: {
            include: {
              activeCourse: { select: { id: true, code: true, title: true, language: true, category: true, imageEmoji: true } },
            },
          },
          languageQuestChallenges: { where: { completed: true }, select: { id: true } },
          languageQuestMemberships: {
            select: { classroom: { select: { id: true, name: true } } },
          },
        },
      } as any);

      // Beyond "what course are they on right now", pull each learner's full
      // course history (every course they've ever earned XP in) so an admin
      // can spot patterns like course-hopping or which courses actually hold
      // attention — the activeCourse alone only shows the most recent one.
      const learnerIds = learners.map((learner: any) => learner.id);
      const xpByUserCourse = learnerIds.length
        ? await prisma.languageQuestXpEvent.groupBy({
            by: ["userId", "courseId"],
            where: { userId: { in: learnerIds }, courseId: { not: null } },
            _sum: { points: true },
            _max: { occurredAt: true },
          })
        : [];
      const courseIds = [...new Set(xpByUserCourse.map((row: any) => row.courseId).filter(Boolean))];
      const courses = courseIds.length
        ? await prisma.languageQuestCourse.findMany({
            where: { id: { in: courseIds as string[] } },
            select: { id: true, code: true, title: true, language: true, imageEmoji: true },
          })
        : [];
      const courseById = new Map(courses.map((course: any) => [course.id, course]));
      const historyByUser = new Map<string, any[]>();
      for (const row of xpByUserCourse) {
        const course = courseById.get(row.courseId as string);
        if (!course) continue;
        const list = historyByUser.get(row.userId) ?? [];
        list.push({
          course,
          points: row._sum.points ?? 0,
          lastActivityAt: row._max.occurredAt,
        });
        historyByUser.set(row.userId, list);
      }
      for (const list of historyByUser.values()) {
        list.sort((a, b) => b.points - a.points);
      }

      res.json({
        learners: learners.map((learner: any) => ({
          id: learner.id,
          name: `${learner.firstName} ${learner.lastName}`.trim(),
          email: learner.email,
          role: learner.role,
          isExternalLearner: learner.isExternalLearner,
          active: learner.isActive,
          avatarId: learner.languageQuestAvatar || DEFAULT_LANGUAGE_QUEST_AVATAR,
          bio: learner.languageQuestBio || "",
          points: learner.languageQuestProgress?.points || 0,
          currentStreak: learner.languageQuestProgress?.currentStreak || 0,
          lastPlayedDate: learner.languageQuestProgress?.lastPlayedDate || null,
          completedChallenges: learner.languageQuestChallenges.length,
          lastLoginAt: learner.lastLoginAt,
          createdAt: learner.createdAt,
          classrooms: learner.languageQuestMemberships.map((membership: any) => membership.classroom),
          activeCourse: learner.languageQuestProgress?.activeCourse || null,
          courseHistory: historyByUser.get(learner.id) ?? [],
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest learners:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load learner accounts" });
    }
  });

  app.patch("/api/language-quest/admin/learners/:id/status", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Administrator access required" }); return; }
    if (typeof req.body?.active !== "boolean") { res.status(400).json({ error: "Active status is required" }); return; }
    try {
      const learner = await prisma.user.findFirst({
        where: { id: req.params.id, isExternalLearner: true },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (!learner) { res.status(404).json({ error: "Language Quest learner not found" }); return; }
      await prisma.$transaction([
        prisma.user.update({ where: { id: learner.id }, data: { isActive: req.body.active } }),
        ...(req.body.active ? [] : [
          prisma.authSession.updateMany({ where: { userId: learner.id, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]),
      ]);
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "PUBLIC_LEARNER_ACCOUNT", learner.id,
        `${req.body.active ? "Reactivated" : "Deactivated"} Language Quest learner '${learner.firstName} ${learner.lastName}' (${learner.email}).`,
        req.ip || null, req.headers["user-agent"] || null, req.body.active ? "SUCCESS" : "WARNING");
      res.json({ success: true, active: req.body.active });
    } catch (error) {
      logger.error("Error updating Language Quest learner status:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to update learner status" });
    }
  });

  app.delete("/api/language-quest/admin/learners/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Administrator access required" }); return; }
    try {
      const learner = await prisma.user.findFirst({
        where: { id: req.params.id, isExternalLearner: true },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
      });
      if (!learner) { res.status(404).json({ error: "Language Quest learner not found" }); return; }
      if (learner.isActive) {
        res.status(409).json({ error: "Deactivate this learner before permanently terminating the account" });
        return;
      }
      const label = `${learner.firstName} ${learner.lastName}`.trim();
      await prisma.user.delete({ where: { id: learner.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "PUBLIC_LEARNER_ACCOUNT", learner.id,
        `Permanently terminated inactive Language Quest learner '${label}' (${learner.email}).`,
        req.ip || null, req.headers["user-agent"] || null, "WARNING");
      res.json({ success: true });
    } catch (error) {
      logger.error("Error terminating Language Quest learner:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to terminate learner account" });
    }
  });

  app.get("/api/language-quest/manage/courses", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      await ensureOfficialCourses(prisma);
      const courses = await prisma.languageQuestCourse.findMany({
        where: jwtUser.role === "ADMIN" ? {} : { createdById: jwtUser.userId },
        orderBy: { updatedAt: "desc" },
        include: { units: { include: { lessons: { include: { challenges: { select: { id: true } } } } } } },
      });
      res.json(courses.map((course: any) => ({
        id: course.id, code: course.code, title: course.title, description: course.description,
        language: course.language, category: course.category,
        imageEmoji: course.imageEmoji, accentColor: course.accentColor,
        published: course.published, official: course.createdById === null,
        retired: RETIRED_OFFICIAL_COURSE_CODES.has(course.code), updatedAt: course.updatedAt,
        unitCount: course.units.length,
        lessonCount: course.units.reduce((sum: number, unit: any) => sum + unit.lessons.length, 0),
        challengeCount: course.units.reduce((sum: number, unit: any) => sum + unit.lessons.reduce((inner: number, lesson: any) => inner + lesson.challenges.length, 0), 0),
      })));
    } catch (error) {
      logger.error("Error listing managed Language Quest courses:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load courses" });
    }
  });

  app.get("/api/language-quest/manage/courses/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const course = await prisma.languageQuestCourse.findUnique({
        where: { id: req.params.id },
        include: {
          units: { orderBy: { order: "asc" }, include: {
            lessons: { orderBy: { order: "asc" }, include: {
              challenges: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
            } },
          } },
        },
      });
      if (!course) { res.status(404).json({ error: "Course not found" }); return; }
      if (jwtUser.role !== "ADMIN" && course.createdById !== jwtUser.userId) { res.status(403).json({ error: "You can only edit courses you created" }); return; }
      res.json({ ...course, retired: RETIRED_OFFICIAL_COURSE_CODES.has(course.code) });
    } catch (error) {
      logger.error("Error loading managed Language Quest course:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the course editor" });
    }
  });

  async function saveCurriculum(courseId: string, draft: CourseDraft): Promise<any> {
    const current = await prisma.languageQuestCourse.findUnique({
      where: { id: courseId },
      include: { units: { include: { lessons: { include: { challenges: { include: { options: true } } } } } } },
    });
    if (!current) throw Object.assign(new Error("Course not found"), { statusCode: 404 });
    const unitMap = new Map(current.units.map((unit: any) => [unit.id, unit]));
    const lessonMap = new Map(current.units.flatMap((unit: any) => unit.lessons).map((lesson: any) => [lesson.id, lesson]));
    const challengeMap = new Map(current.units.flatMap((unit: any) => unit.lessons.flatMap((lesson: any) => lesson.challenges)).map((challenge: any) => [challenge.id, challenge]));
    const optionMap = new Map(current.units.flatMap((unit: any) => unit.lessons.flatMap((lesson: any) => lesson.challenges.flatMap((challenge: any) => challenge.options))).map((option: any) => [option.id, option]));
    for (const unit of draft.units) {
      if (unit.id && !unitMap.has(unit.id)) throw Object.assign(new Error("A unit no longer belongs to this course"), { statusCode: 409 });
      for (const lesson of unit.lessons) {
        if (lesson.id && !lessonMap.has(lesson.id)) throw Object.assign(new Error("A lesson no longer belongs to this course"), { statusCode: 409 });
        for (const challenge of lesson.challenges) {
          if (challenge.id && !challengeMap.has(challenge.id)) throw Object.assign(new Error("A challenge no longer belongs to this course"), { statusCode: 409 });
          for (const option of challenge.options) {
            if (option.id && !optionMap.has(option.id)) throw Object.assign(new Error("An option no longer belongs to this course"), { statusCode: 409 });
          }
        }
      }
    }

    return prisma.$transaction(async (tx: any) => {
      await Promise.all([
        tx.languageQuestUnit.updateMany({ where: { courseId }, data: { order: { increment: 10_000 } } }),
        tx.languageQuestLesson.updateMany({ where: { unit: { courseId } }, data: { order: { increment: 10_000 } } }),
        tx.languageQuestChallenge.updateMany({ where: { lesson: { unit: { courseId } } }, data: { order: { increment: 10_000 } } }),
        tx.languageQuestOption.updateMany({ where: { challenge: { lesson: { unit: { courseId } } } }, data: { order: { increment: 10_000 } } }),
      ]);
      const savedUnitIds: string[] = [];
      for (let unitOrder = 0; unitOrder < draft.units.length; unitOrder += 1) {
        const unitDraft = draft.units[unitOrder];
        const unit = unitDraft.id
          ? await tx.languageQuestUnit.update({ where: { id: unitDraft.id }, data: { title: unitDraft.title, description: unitDraft.description, order: unitOrder } })
          : await tx.languageQuestUnit.create({ data: { courseId, title: unitDraft.title, description: unitDraft.description, order: unitOrder } });
        savedUnitIds.push(unit.id);
        const savedLessonIds: string[] = [];
        for (let lessonOrder = 0; lessonOrder < unitDraft.lessons.length; lessonOrder += 1) {
          const lessonDraft = unitDraft.lessons[lessonOrder];
          const lesson = lessonDraft.id
            ? await tx.languageQuestLesson.update({ where: { id: lessonDraft.id }, data: { unitId: unit.id, title: lessonDraft.title, description: lessonDraft.description, order: lessonOrder } })
            : await tx.languageQuestLesson.create({ data: { unitId: unit.id, title: lessonDraft.title, description: lessonDraft.description, order: lessonOrder } });
          savedLessonIds.push(lesson.id);
          const savedChallengeIds: string[] = [];
          for (let challengeOrder = 0; challengeOrder < lessonDraft.challenges.length; challengeOrder += 1) {
            const challengeDraft = lessonDraft.challenges[challengeOrder];
            const challenge = challengeDraft.id
              ? await tx.languageQuestChallenge.update({ where: { id: challengeDraft.id }, data: { lessonId: lesson.id, type: challengeDraft.type, question: challengeDraft.question, order: challengeOrder } })
              : await tx.languageQuestChallenge.create({ data: { lessonId: lesson.id, type: challengeDraft.type, question: challengeDraft.question, order: challengeOrder } });
            savedChallengeIds.push(challenge.id);
            const savedOptionIds: string[] = [];
            for (let optionOrder = 0; optionOrder < challengeDraft.options.length; optionOrder += 1) {
              const optionDraft = challengeDraft.options[optionOrder];
              const option = optionDraft.id
                ? await tx.languageQuestOption.update({ where: { id: optionDraft.id }, data: { challengeId: challenge.id, text: optionDraft.text, correct: optionDraft.correct, emoji: optionDraft.emoji, audioText: optionDraft.audioText, order: optionOrder } })
                : await tx.languageQuestOption.create({ data: { challengeId: challenge.id, text: optionDraft.text, correct: optionDraft.correct, emoji: optionDraft.emoji, audioText: optionDraft.audioText, order: optionOrder } });
              savedOptionIds.push(option.id);
            }
            await tx.languageQuestOption.deleteMany({ where: { challengeId: challenge.id, ...(savedOptionIds.length ? { id: { notIn: savedOptionIds } } : {}) } });
          }
          await tx.languageQuestChallenge.deleteMany({ where: { lessonId: lesson.id, ...(savedChallengeIds.length ? { id: { notIn: savedChallengeIds } } : {}) } });
        }
        await tx.languageQuestLesson.deleteMany({ where: { unitId: unit.id, ...(savedLessonIds.length ? { id: { notIn: savedLessonIds } } : {}) } });
      }
      await tx.languageQuestUnit.deleteMany({ where: { courseId, ...(savedUnitIds.length ? { id: { notIn: savedUnitIds } } : {}) } });
      return tx.languageQuestCourse.update({
        where: { id: courseId },
        data: {
          title: draft.title, description: draft.description, language: draft.language,
          category: draft.category,
          imageEmoji: draft.imageEmoji, accentColor: draft.accentColor, published: draft.published,
        },
      });
    }, { timeout: 30_000 });
  }

  app.post("/api/language-quest/manage/courses", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const normalized = normalizeCourseDraft(req.body);
    if (!normalized.value) { res.status(400).json({ error: normalized.error }); return; }
    try {
      const slug = normalized.value.title.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "COURSE";
      let course: any;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          course = await prisma.languageQuestCourse.create({
            data: {
              code: `${slug}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
              title: normalized.value.title, description: normalized.value.description,
              language: normalized.value.language, category: normalized.value.category,
              imageEmoji: normalized.value.imageEmoji,
              accentColor: normalized.value.accentColor, published: false, createdById: jwtUser.userId,
            },
          });
          break;
        } catch (error: any) {
          if (error?.code !== "P2002" || attempt === 2) throw error;
        }
      }
      const saved = await saveCurriculum(course.id, normalized.value);
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "LANGUAGE_QUEST_COURSE", saved.id, `Created Language Quest course “${saved.title}”`, req.ip || null, req.headers["user-agent"] || null);
      res.status(201).json({ id: saved.id });
    } catch (error) {
      logger.error("Error creating Language Quest course:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to create the course" });
    }
  });

  app.put("/api/language-quest/manage/courses/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const normalized = normalizeCourseDraft(req.body);
    if (!normalized.value) { res.status(400).json({ error: normalized.error }); return; }
    try {
      const course = await prisma.languageQuestCourse.findUnique({ where: { id: req.params.id } });
      if (!course) { res.status(404).json({ error: "Course not found" }); return; }
      if (jwtUser.role !== "ADMIN" && course.createdById !== jwtUser.userId) { res.status(403).json({ error: "You can only edit courses you created" }); return; }
      if (RETIRED_OFFICIAL_COURSE_CODES.has(course.code) && normalized.value.published) {
        res.status(409).json({ error: "This legacy course is retired and cannot be republished. Its learner progress is preserved for records." });
        return;
      }
      const saved = await saveCurriculum(course.id, normalized.value);
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "LANGUAGE_QUEST_COURSE", saved.id, `Updated Language Quest course “${saved.title}”`, req.ip || null, req.headers["user-agent"] || null);
      res.json({ id: saved.id });
    } catch (error: any) {
      logger.error("Error updating Language Quest course:", error);
      if (error?.statusCode) { res.status(error.statusCode).json({ error: error.message }); return; }
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to update the course" });
    }
  });

  app.delete("/api/language-quest/manage/courses/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!isManager(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const course = await prisma.languageQuestCourse.findUnique({ where: { id: req.params.id } });
      if (!course) { res.status(404).json({ error: "Course not found" }); return; }
      if (course.createdById === null) { res.status(400).json({ error: "Official courses cannot be deleted" }); return; }
      if (jwtUser.role !== "ADMIN" && course.createdById !== jwtUser.userId) { res.status(403).json({ error: "You can only delete courses you created" }); return; }
      await prisma.languageQuestCourse.delete({ where: { id: course.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "LANGUAGE_QUEST_COURSE", course.id, `Deleted Language Quest course “${course.title}”`, req.ip || null, req.headers["user-agent"] || null, "WARNING");
      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting Language Quest course:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to delete the course" });
    }
  });
}
