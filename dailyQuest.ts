import express from "express";
import { randomUUID } from "node:crypto";
import {
  DAILY_QUEST_MODE_COUNTS,
  canUseDailyQuest,
  calculateDailyQuestStreak,
  dailyQuestDayKey,
  dailyQuestPoints,
  seededDailyQuestShuffle,
  type DailyQuestMode,
} from "./shared/dailyQuest";
import { ensureOfficialCourses } from "./languageQuest";
import { englishWordCourses } from "./languageQuestEnglishWordCourses";
import { advancedEnglishCourses } from "./languageQuestAdvancedEnglishCourses";

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  createAuditLog: (
    userId: string | null,
    userName: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    description: string,
    ip: string | null,
    ua: string | null,
    severity?: string,
  ) => Promise<void>;
  logger: { error: (...args: any[]) => void };
}

interface StoredOption {
  id: string;
  text: string;
  emoji?: string | null;
}

interface StoredItem {
  id: string;
  sourceType: "LANGUAGE_QUEST";
  sourceId: string;
  courseCode: string;
  sourceLabel: string;
  subject: string;
  difficulty: string;
  prompt: string;
  passageText?: string | null;
  imageUrl?: string | null;
  options: StoredOption[];
  correctOptionId: string;
  explanation: string | null;
  isReview?: boolean;
}

interface StoredAnswer {
  itemId: string;
  optionId: string;
  correct: boolean;
  answeredAt: string;
}

const MODES = new Set<DailyQuestMode>(["RELAXED", "STANDARD", "CHALLENGE"]);
const ENGLISH_WORD_COURSES = [...englishWordCourses, ...advancedEnglishCourses];
const ENGLISH_WORD_COURSE_CODES = ENGLISH_WORD_COURSES.map((course) => course.code);
const ENGLISH_WORD_COURSE_TITLES = new Set(ENGLISH_WORD_COURSES.map((course) => course.title));

function asItems(value: unknown): StoredItem[] {
  return Array.isArray(value) ? value as StoredItem[] : [];
}

function asAnswers(value: unknown): StoredAnswer[] {
  return Array.isArray(value) ? value as StoredAnswer[] : [];
}

function databaseUnavailable(error: any): boolean {
  return error?.code === "P2021" || error?.code === "P2022";
}

function decodeEntities(value: unknown): string {
  return String(value ?? "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}

function publicItem(item: StoredItem | undefined) {
  if (!item) return null;
  return {
    id: item.id,
    sourceLabel: item.sourceLabel,
    subject: item.subject,
    difficulty: item.difficulty,
    prompt: item.prompt,
    passageText: item.passageText ?? null,
    imageUrl: item.imageUrl ?? null,
    options: item.options,
    isReview: Boolean(item.isReview),
  };
}

function normalizeLanguageChallenge(challenge: any, seed: string): StoredItem | null {
  const correct = challenge.options?.filter((option: any) => option.correct) ?? [];
  if (correct.length !== 1 || challenge.options.length < 2) return null;
  const course = challenge.lesson.unit.course;
  const options = seededDailyQuestShuffle<StoredOption>(
    challenge.options.map((option: any) => ({
      id: option.id,
      text: decodeEntities(option.text),
      emoji: option.emoji ?? null,
    })),
    `${seed}:options:${challenge.id}`,
  );
  return {
    id: `language:${challenge.id}`,
    sourceType: "LANGUAGE_QUEST",
    sourceId: challenge.id,
    courseCode: course.code,
    sourceLabel: `Language Quest · ${course.title}`,
    subject: course.language,
    difficulty: "Practice",
    prompt: decodeEntities(challenge.question),
    options,
    correctOptionId: correct[0].id,
    explanation: `The correct answer is “${decodeEntities(correct[0].text)}”.`,
  };
}

async function recentReviewItems(prisma: any, userId: string): Promise<StoredItem[]> {
  const sessions = await prisma.dailyQuestSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 14,
    select: { items: true, answers: true },
  });
  const reviews: StoredItem[] = [];
  const seen = new Set<string>();
  for (const session of sessions) {
    const items = asItems(session.items);
    const answers = asAnswers(session.answers);
    const wrongIds = new Set(answers.filter((answer) => !answer.correct).map((answer) => answer.itemId));
    for (const item of items) {
      const legacyCourseTitle = item.sourceLabel.replace(/^Language Quest · /, "");
      const isEnglishWordCourse = ENGLISH_WORD_COURSE_CODES.includes(item.courseCode)
        || ENGLISH_WORD_COURSE_TITLES.has(legacyCourseTitle);
      if (item.sourceType !== "LANGUAGE_QUEST" || !isEnglishWordCourse) continue;
      if (!wrongIds.has(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      reviews.push({
        ...item,
        id: `review:${item.sourceType}:${item.sourceId}`,
        sourceLabel: `Review · ${item.subject}`,
        isReview: true,
      });
    }
  }
  return reviews;
}

async function buildQuestItems(
  prisma: any,
  userId: string,
  dayKey: string,
  mode: DailyQuestMode,
): Promise<StoredItem[]> {
  await ensureOfficialCourses(prisma);
  const seed = `${userId}:${dayKey}:${mode}`;
  const [languageRows, reviewRows] = await Promise.all([
    prisma.languageQuestChallenge.findMany({
      where: {
        lesson: {
          unit: {
            course: {
              published: true,
              code: { in: ENGLISH_WORD_COURSE_CODES },
            },
          },
        },
      },
      include: {
        options: { orderBy: { order: "asc" } },
        lesson: { include: { unit: { include: { course: true } } } },
      },
      take: 250,
      orderBy: { createdAt: "asc" },
    }),
    recentReviewItems(prisma, userId),
  ]);

  const language = seededDailyQuestShuffle<StoredItem>(
    (languageRows as any[])
      .map((row: any) => normalizeLanguageChallenge(row, seed))
      .filter((item: StoredItem | null): item is StoredItem => item !== null),
    `${seed}:language`,
  );
  const reviews = seededDailyQuestShuffle<StoredItem>(reviewRows, `${seed}:reviews`);

  const total = DAILY_QUEST_MODE_COUNTS[mode];
  const selected: StoredItem[] = [];
  const sourceKeys = new Set<string>();
  const add = (item: StoredItem | undefined) => {
    if (!item) return;
    const key = `${item.sourceType}:${item.sourceId}`;
    if (sourceKeys.has(key)) return;
    sourceKeys.add(key);
    selected.push(item);
  };

  add(reviews[0]);
  for (const item of seededDailyQuestShuffle<StoredItem>(
    [...language, ...reviews],
    `${seed}:backfill`,
  )) {
    if (selected.length >= total) break;
    add(item);
  }

  return seededDailyQuestShuffle(selected.slice(0, total), `${seed}:final`);
}

async function statsFor(prisma: any, userId: string, todayKey: string) {
  const completed = await prisma.dailyQuestSession.findMany({
    where: { userId, status: "COMPLETED" },
    select: { dayKey: true, pointsEarned: true },
    orderBy: { dayKey: "asc" },
  });
  const streak = calculateDailyQuestStreak(completed.map((session: any) => session.dayKey), todayKey);
  return {
    currentStreak: streak.current,
    bestStreak: streak.best,
    totalXp: completed.reduce((sum: number, session: any) => sum + session.pointsEarned, 0),
    completedQuests: completed.length,
  };
}

async function sessionPayload(prisma: any, session: any, userId: string) {
  const items = asItems(session.items);
  return {
    available: true,
    session: {
      id: session.id,
      dayKey: session.dayKey,
      mode: session.mode,
      status: session.status,
      currentIndex: session.currentIndex,
      totalQuestions: items.length,
      correctCount: session.correctCount,
      pointsEarned: session.pointsEarned,
      currentItem: session.status === "IN_PROGRESS" ? publicItem(items[session.currentIndex]) : null,
      completedAt: session.completedAt,
    },
    stats: await statsFor(prisma, userId, session.dayKey),
  };
}

export function registerDailyQuestRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;
  const learnerOnly: express.RequestHandler = (req, res, next) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canUseDailyQuest(jwtUser.role)) {
      res.status(403).json({ error: "Daily Quest is available only to students and teachers" });
      return;
    }
    next();
  };

  app.get("/api/daily-quest", authMiddleware, learnerOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const dayKey = dailyQuestDayKey(new Date());
    try {
      const session = await prisma.dailyQuestSession.findUnique({
        where: { userId_dayKey: { userId: jwtUser.userId, dayKey } },
      });
      if (session) {
        res.json(await sessionPayload(prisma, session, jwtUser.userId));
        return;
      }
      res.json({
        available: true,
        session: null,
        dayKey,
        modes: Object.entries(DAILY_QUEST_MODE_COUNTS).map(([mode, questionCount]) => ({
          mode,
          questionCount,
        })),
        stats: await statsFor(prisma, jwtUser.userId, dayKey),
      });
    } catch (error) {
      logger.error("Error loading Daily Learning Quest:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Daily Quest database tables are not ready — run `npx prisma migrate deploy` and restart the server." });
        return;
      }
      res.status(500).json({ error: "Unable to load today’s quest" });
    }
  });

  app.post("/api/daily-quest/start", authMiddleware, learnerOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const requestedMode = String(req.body?.mode ?? "STANDARD").toUpperCase() as DailyQuestMode;
    if (!MODES.has(requestedMode)) {
      res.status(400).json({ error: "Choose Relaxed, Standard, or Challenge mode" });
      return;
    }
    const dayKey = dailyQuestDayKey(new Date());
    try {
      const existing = await prisma.dailyQuestSession.findUnique({
        where: { userId_dayKey: { userId: jwtUser.userId, dayKey } },
      });
      if (existing) {
        res.json(await sessionPayload(prisma, existing, jwtUser.userId));
        return;
      }

      const items = await buildQuestItems(prisma, jwtUser.userId, dayKey, requestedMode);
      if (items.length < DAILY_QUEST_MODE_COUNTS[requestedMode]) {
        res.status(409).json({
          error: "There are not enough published English Word questions for this mode yet. Try a shorter mode.",
        });
        return;
      }

      let session;
      try {
        session = await prisma.dailyQuestSession.create({
          data: {
            userId: jwtUser.userId,
            dayKey,
            mode: requestedMode,
            items,
            answers: [],
          },
        });
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
        session = await prisma.dailyQuestSession.findUnique({
          where: { userId_dayKey: { userId: jwtUser.userId, dayKey } },
        });
      }
      res.status(201).json(await sessionPayload(prisma, session, jwtUser.userId));
    } catch (error) {
      logger.error("Error starting Daily Learning Quest:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Daily Quest database tables are not ready — run `npx prisma migrate deploy` and restart the server." });
        return;
      }
      res.status(500).json({ error: "Unable to start today’s quest" });
    }
  });

  app.post("/api/daily-quest/:id/answer", authMiddleware, learnerOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const itemId = String(req.body?.itemId ?? "").slice(0, 200);
    const optionId = String(req.body?.optionId ?? "").slice(0, 200);
    if (!itemId || !optionId) {
      res.status(400).json({ error: "Choose an answer" });
      return;
    }

    try {
      const session = await prisma.dailyQuestSession.findFirst({
        where: { id: req.params.id, userId: jwtUser.userId },
      });
      if (!session) {
        res.status(404).json({ error: "Daily quest not found" });
        return;
      }
      if (session.status !== "IN_PROGRESS") {
        res.status(409).json({ error: "Today’s quest is already complete" });
        return;
      }

      const items = asItems(session.items);
      const item = items[session.currentIndex];
      if (!item || item.id !== itemId) {
        res.status(409).json({ error: "This question is no longer active" });
        return;
      }
      if (!item.options.some((option) => option.id === optionId)) {
        res.status(400).json({ error: "That answer does not belong to this question" });
        return;
      }

      const correct = optionId === item.correctOptionId;
      const nextCorrectCount = session.correctCount + (correct ? 1 : 0);
      const nextIndex = session.currentIndex + 1;
      const completed = nextIndex >= items.length;
      const answers = [
        ...asAnswers(session.answers),
        { itemId, optionId, correct, answeredAt: new Date().toISOString() },
      ];
      const pointsEarned = completed
        ? dailyQuestPoints(session.mode as DailyQuestMode, nextCorrectCount, items.length)
        : 0;
      const completedAt = completed ? new Date() : null;

      const updated = await prisma.$transaction(async (tx: any) => {
        const changed = await tx.dailyQuestSession.updateMany({
          where: {
            id: session.id,
            userId: jwtUser.userId,
            status: "IN_PROGRESS",
            currentIndex: session.currentIndex,
          },
          data: {
            answers,
            currentIndex: nextIndex,
            correctCount: nextCorrectCount,
            pointsEarned,
            status: completed ? "COMPLETED" : "IN_PROGRESS",
            completedAt,
          },
        });
        if (changed.count !== 1) {
          throw Object.assign(new Error("Answer already recorded"), { statusCode: 409 });
        }
        return tx.dailyQuestSession.findUnique({ where: { id: session.id } });
      });

      if (completed) {
        void createAuditLog(
          jwtUser.userId,
          jwtUser.email,
          "COMPLETE",
          "DAILY_QUEST",
          session.id,
          `Completed the ${session.mode.toLowerCase()} Daily Learning Quest with ${nextCorrectCount}/${items.length} correct.`,
          req.ip,
          req.headers["user-agent"] || null,
          "SUCCESS",
        ).catch((error) => logger.error("Daily Quest audit log failed:", error));
      }

      res.json({
        correct,
        correctOptionId: item.correctOptionId,
        correctAnswer: item.options.find((option) => option.id === item.correctOptionId)?.text ?? "",
        explanation: item.explanation,
        completed,
        ...(await sessionPayload(prisma, updated, jwtUser.userId)),
      });
    } catch (error: any) {
      logger.error("Error recording Daily Learning Quest answer:", error);
      if (error?.statusCode === 409) {
        res.status(409).json({ error: error.message });
        return;
      }
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Daily Quest database tables are not ready — run `npx prisma migrate deploy` and restart the server." });
        return;
      }
      res.status(500).json({ error: "Unable to check that answer" });
    }
  });
}
