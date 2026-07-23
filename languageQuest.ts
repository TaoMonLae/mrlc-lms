import { randomUUID } from "node:crypto";
import express from "express";
import {
  LANGUAGE_QUEST_FIRST_CLEAR_POINTS,
  LANGUAGE_QUEST_MAX_HEARTS,
  LANGUAGE_QUEST_PRACTICE_POINTS,
  languageQuestDayKey,
  nextLanguageQuestStreak,
} from "./shared/languageQuest";
import { importedSpanishCourse, type OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";
import { mandarinFoundationsCourse } from "./languageQuestMandarinCourse";
import { completeMandarinCourse } from "./languageQuestCompleteMandarinCourse";
import { englishWordCourses } from "./languageQuestEnglishWordCourses";
import { advancedEnglishCourses } from "./languageQuestAdvancedEnglishCourses";

interface JwtPayload { userId: string; role: string; email: string; }

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
  title: string; description: string | null; language: string; imageEmoji: string;
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
  return { value: { title, description, language, imageEmoji, accentColor, published, units } };
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

async function ensureOfficialCourses(prisma: any): Promise<void> {
  const courses = [
    starterCourse,
    importedSpanishCourse,
    mandarinFoundationsCourse,
    completeMandarinCourse,
    ...englishWordCourses,
    ...advancedEnglishCourses,
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
  };
}

function databaseUnavailable(error: any): boolean {
  return error?.code === "P2021" || error?.code === "P2022";
}

function databaseError(res: express.Response, error: any): boolean {
  if (!databaseUnavailable(error)) return false;
  res.status(503).json({ error: "Language Quest database tables are not ready — run `npx prisma migrate deploy` and restart the server." });
  return true;
}

// Learners must clear every challenge in a lesson before the next one unlocks.
// Managers previewing/editing course content bypass this check.
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

export function registerLanguageQuestRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;

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
            language: course.language, imageEmoji: course.imageEmoji, accentColor: course.accentColor,
            unitCount: course.units.length, lessonCount, challengeCount: challengeIds.length,
            completedChallenges,
            progressPercent: challengeIds.length ? Math.round((completedChallenges / challengeIds.length) * 100) : 0,
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
      // Refill yesterday's spent hearts before touching updatedAt by selecting
      // this course; otherwise a direct course visit could suppress the refill.
      await getProgress(prisma, jwtUser.userId);
      await prisma.languageQuestUserProgress.upsert({
        where: { userId: jwtUser.userId },
        update: { activeCourseId: course.id },
        create: { userId: jwtUser.userId, activeCourseId: course.id },
      });
      res.json({
        id: course.id, title: course.title, description: course.description, language: course.language,
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
          id: challenge.id, type: challenge.type, question: challenge.question,
          options: challenge.options.map((option: any) => ({
            id: option.id, text: option.text, emoji: option.emoji, audioText: option.audioText,
          })),
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest lesson:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the lesson" });
    }
  });

  // Learning mode: a scoring-free flashcard walkthrough of a lesson's content,
  // shown before the graded challenges. Reuses the same access/lock rules as
  // the quiz endpoint above but exposes each challenge's correct answer since
  // nothing here is graded.
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
            text: correct?.text ?? "",
            emoji: correct?.emoji ?? null,
            audioText: correct?.audioText ?? correct?.text ?? null,
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
      await getProgress(prisma, jwtUser.userId);
      const result = await prisma.$transaction(async (tx: any) => {
        const progress = await tx.languageQuestUserProgress.upsert({
          where: { userId: jwtUser.userId }, update: {}, create: { userId: jwtUser.userId },
        });
        const existing = await tx.languageQuestChallengeProgress.findUnique({
          where: { userId_challengeId: { userId: jwtUser.userId, challengeId: challenge.id } },
        });
        if (selected.correct) {
          const firstClear = !existing?.completed;
          const pointsAwarded = firstClear ? LANGUAGE_QUEST_FIRST_CLEAR_POINTS : LANGUAGE_QUEST_PRACTICE_POINTS;
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
          const updated = await tx.languageQuestUserProgress.update({
            where: { userId: jwtUser.userId },
            data: {
              activeCourseId: challenge.lesson.unit.courseId,
              points: { increment: pointsAwarded },
              hearts: existing?.completed ? Math.min(LANGUAGE_QUEST_MAX_HEARTS, progress.hearts + 1) : progress.hearts,
              currentStreak: streak.currentStreak, bestStreak: streak.bestStreak, lastPlayedDate: now,
            },
          });
          return { correct: true, pointsAwarded, profile: profileJson(updated) };
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
        return { correct: false, pointsAwarded: 0, profile: profileJson(updated) };
      });
      res.json({ ...result, correctOptionId: correctOption.id, correctAnswer: correctOption.text });
    } catch (error) {
      logger.error("Error saving Language Quest answer:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to check that answer" });
    }
  });

  app.get("/api/language-quest/leaderboard", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const [leaders, mine] = await Promise.all([
        prisma.languageQuestUserProgress.findMany({
          take: 50,
          orderBy: [{ points: "desc" }, { currentStreak: "desc" }, { updatedAt: "asc" }],
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true, profilePhotoUrl: true } } },
        }),
        getProgress(prisma, jwtUser.userId),
      ]);
      const rank = await prisma.languageQuestUserProgress.count({ where: { points: { gt: mine.points } } });
      res.json({
        currentUserId: jwtUser.userId,
        currentUserRank: rank + 1,
        leaders: leaders.map((row: any, index: number) => ({
          rank: index + 1, userId: row.userId,
          name: `${row.user.firstName} ${row.user.lastName}`.trim(), role: row.user.role,
          profilePhotoUrl: row.user.profilePhotoUrl, points: row.points, currentStreak: row.currentStreak,
        })),
      });
    } catch (error) {
      logger.error("Error loading Language Quest leaderboard:", error);
      if (!databaseError(res, error)) res.status(500).json({ error: "Unable to load the leaderboard" });
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
        language: course.language, imageEmoji: course.imageEmoji, accentColor: course.accentColor,
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
              language: normalized.value.language, imageEmoji: normalized.value.imageEmoji,
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
