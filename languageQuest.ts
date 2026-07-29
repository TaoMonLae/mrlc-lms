import { randomUUID } from "node:crypto";
import express from "express";
import {
  LANGUAGE_QUEST_FIRST_CLEAR_POINTS,
  LANGUAGE_QUEST_MAX_HEARTS,
  LANGUAGE_QUEST_PRACTICE_POINTS,
  languageQuestDayKey,
  languageQuestPracticePrompt,
  nextLanguageQuestStreak,
} from "./shared/languageQuest";
import {
  DEFAULT_LANGUAGE_QUEST_AVATAR,
  isLanguageQuestAvatarId,
} from "./shared/languageQuestAvatars";
import { languageQuestCategoryForLanguage } from "./shared/languageQuestCourseCategories";
import { languageQuestPinyin } from "./shared/languageQuestPinyin";
import { languageQuestLeaderboardAudienceWhere } from "./shared/externalLearnerAccess";
import {
  languageQuestRewardProgress,
  newlyUnlockedLanguageQuestRewardIds,
} from "./shared/languageQuestRewards";
import {
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
type DraftChallenge = { id?: string; type: "SELECT" | "ASSIST"; question: string; options: DraftOption[] };
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

function normalizeCourseDraft(raw: any): { value?: CourseDraft; error?: string } {
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
        if (!Array.isArray(sourceChallenge?.options) || sourceChallenge.options.length < 2 || sourceChallenge.options.length > 6) {
          return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” needs 2–6 answer options` };
        }
        const options: DraftOption[] = sourceChallenge.options.map((option: any) => ({
          id: typeof option?.id === "string" ? option.id : undefined,
          text: text(option?.text, 500),
          correct: Boolean(option?.correct),
          emoji: nullableText(option?.emoji, 16),
          audioText: nullableText(option?.audioText, 500),
        }));
        if (options.some((option) => !option.text)) return { error: `Every option in challenge ${challengeIndex + 1} needs text` };
        if (options.filter((option) => option.correct).length !== 1) {
          return { error: `Challenge ${challengeIndex + 1} in “${lessonTitle}” needs exactly one correct answer` };
        }
        challenges.push({
          id: typeof sourceChallenge?.id === "string" ? sourceChallenge.id : undefined,
          type: sourceChallenge?.type === "ASSIST" ? "ASSIST" : "SELECT",
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

async function ensureOfficialCourse(prisma: any, course: OfficialLanguageQuestCourse): Promise<any> {
  const existing = await prisma.languageQuestCourse.findUnique({ where: { code: course.code } });
  if (existing) return existing;
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
      const completed = new Set(completedRows.map((row: any) => row.challengeId));
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
      });
    } catch (error) {
      logger.error("Error loading Language Quest course:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the course" });
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
    if (!optionId) { res.status(400).json({ error: "Choose an answer" }); return; }
    try {
      const challenge = await prisma.languageQuestChallenge.findUnique({
        where: { id: req.params.id },
        include: { options: true, lesson: { include: { unit: { include: { course: true } } } } },
      });
      if (!challenge || !challenge.lesson.unit.course.published) { res.status(404).json({ error: "Challenge not found" }); return; }
      const selected = challenge.options.find((option: any) => option.id === optionId);
      if (!selected) { res.status(400).json({ error: "That answer does not belong to this challenge" }); return; }
      const correctOption = challenge.options.find((option: any) => option.correct);
      if (!correctOption) { res.status(409).json({ error: "This challenge has no correct answer configured" }); return; }
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
        if (selected.correct) {
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
      res.json({ ...result, correctOptionId: correctOption.id, correctAnswer: correctOption.text });
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
      const [dueCount, cards] = await Promise.all([
        prisma.languageQuestMasteryProgress.count({
          where: { userId: jwtUser.userId, dueAt: { lte: now } },
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
        cards: cards.map((row: any) => ({
          challengeId: row.challengeId,
          stage: row.stage,
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
    if (!optionId) { res.status(400).json({ error: "Choose an answer" }); return; }
    const now = new Date();
    try {
      const challenge = await prisma.languageQuestChallenge.findUnique({
        where: { id: req.params.id },
        include: {
          options: true,
          lesson: { include: { unit: { include: { course: true } } } },
        },
      });
      const selected = challenge?.options.find((option: any) => option.id === optionId);
      const correctOption = challenge?.options.find((option: any) => option.correct);
      if (!challenge || !selected || !correctOption) {
        res.status(400).json({ error: "That mastery answer is not available" });
        return;
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
        const next = nextLanguageQuestMasteryReview(review.stage, Boolean(selected.correct), now);
        await tx.languageQuestMasteryProgress.update({
          where: { userId_challengeId: { userId: jwtUser.userId, challengeId: challenge.id } },
          data: {
            stage: next.stage,
            dueAt: next.dueAt,
            lastReviewedAt: now,
            ...(selected.correct
              ? { correctReviews: { increment: 1 } }
              : { wrongReviews: { increment: 1 } }),
          },
        });
        if (!selected.correct) {
          return {
            correct: false,
            pointsAwarded: 0,
            nextDueAt: next.dueAt,
            correctOptionId: correctOption.id,
            correctAnswer: correctOption.text,
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
          correctOptionId: correctOption.id,
          correctAnswer: correctOption.text,
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
      // Public learner accounts and private LMS accounts use separate boards.
      // This keeps school identities out of the outsider-facing experience
      // while preserving a school-wide leaderboard for enrolled users.
      const externalAudience = Boolean(jwtUser.externalLearner);
      const audienceWhere = languageQuestLeaderboardAudienceWhere(externalAudience);
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
    try {
      const learners = await prisma.user.findMany({
        where: {
          isExternalLearner: true,
          ...(status === "ACTIVE" ? { isActive: true } : status === "INACTIVE" ? { isActive: false } : {}),
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
          isActive: true,
          languageQuestAvatar: true,
          languageQuestBio: true,
          lastLoginAt: true,
          createdAt: true,
          languageQuestProgress: true,
          languageQuestChallenges: { where: { completed: true }, select: { id: true } },
          languageQuestMemberships: {
            select: { classroom: { select: { id: true, name: true } } },
          },
        },
      } as any);
      res.json({
        learners: learners.map((learner: any) => ({
          id: learner.id,
          name: `${learner.firstName} ${learner.lastName}`.trim(),
          email: learner.email,
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
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest public learners:", error);
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
        published: course.published, official: course.createdById === null, updatedAt: course.updatedAt,
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
      res.json(course);
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
