import express from "express";
import { randomInt, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  loadEnglishWordPracticeQuestions,
  loadLanguageQuestCourseDeck,
  type EnglishWordPracticeQuestion,
} from "./englishWordPractice";
import {
  WORD_TRAIL_LAST_POSITION,
  WORD_TRAIL_QUESTION_COUNT,
  WORD_TRAIL_STARTING_HEARTS,
  canUseWordTrail,
  pickWordTrailQuestion,
  resolveWordTrailMovement,
  wordTrailCorrectAnswerPoints,
} from "./shared/wordTrail";

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  gameAccessMiddleware?: express.RequestHandler;
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

interface PendingTurn {
  roll: number;
  question: EnglishWordPracticeQuestion;
}

interface AnswerRecord {
  questionId: string;
  optionId: string;
  correct: boolean;
  roll: number;
  from: number;
  to: number;
  answeredAt: string;
}

const answerSchema = z.object({
  questionId: z.string().min(1).max(200),
  optionId: z.string().min(1).max(200),
});

function databaseUnavailable(error: any): boolean {
  return error?.code === "P2021" || error?.code === "P2022";
}

function asDeck(value: unknown): EnglishWordPracticeQuestion[] {
  return Array.isArray(value) ? value as EnglishWordPracticeQuestion[] : [];
}

function asAnswerHistory(value: unknown): AnswerRecord[] {
  return Array.isArray(value) ? value as AnswerRecord[] : [];
}

function asPendingTurn(value: unknown): PendingTurn | null {
  if (!value || typeof value !== "object") return null;
  const pending = value as Partial<PendingTurn>;
  if (
    !Number.isInteger(pending.roll)
    || !pending.question
    || typeof pending.question.id !== "string"
    || !Array.isArray(pending.question.options)
  ) {
    return null;
  }
  return pending as PendingTurn;
}

function publicQuestion(question: EnglishWordPracticeQuestion) {
  return {
    id: question.id,
    sourceLabel: question.sourceLabel,
    subject: question.subject,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: question.options,
  };
}

function publicGame(game: any) {
  if (!game) return null;
  const pending = asPendingTurn(game.pendingTurn);
  return {
    id: game.id,
    status: game.status,
    position: game.position,
    hearts: game.hearts,
    score: game.score,
    turnCount: game.turnCount,
    correctCount: game.correctCount,
    wrongCount: game.wrongCount,
    currentStreak: game.currentStreak,
    bestStreak: game.bestStreak,
    lastRoll: game.lastRoll,
    pendingTurn: pending
      ? { roll: pending.roll, question: publicQuestion(pending.question) }
      : null,
    completedAt: game.completedAt,
    createdAt: game.createdAt,
  };
}

async function statsFor(prisma: any, userId: string) {
  const games = await prisma.wordTrailGame.findMany({
    where: { userId, status: { in: ["WON", "LOST"] } },
    select: {
      status: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      bestStreak: true,
    },
  });
  const totalCorrect = games.reduce(
    (sum: number, game: any) => sum + game.correctCount,
    0,
  );
  const totalAnswered = games.reduce(
    (sum: number, game: any) => sum + game.correctCount + game.wrongCount,
    0,
  );
  return {
    gamesPlayed: games.length,
    wins: games.filter((game: any) => game.status === "WON").length,
    bestScore: games.reduce(
      (best: number, game: any) => Math.max(best, game.score),
      0,
    ),
    bestStreak: games.reduce(
      (best: number, game: any) => Math.max(best, game.bestStreak),
      0,
    ),
    accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
  };
}

export async function leaderboardFor(prisma: any) {
  const bestByUser = new Map<string, any>();
  let cursor: { id: string } | undefined;

  while (bestByUser.size < 10) {
    const rows = await prisma.wordTrailGame.findMany({
      where: {
        status: "WON",
        user: { role: { in: ["STUDENT", "TEACHER"] } },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            profilePhotoUrl: true,
          },
        },
      },
      orderBy: [{ score: "desc" }, { completedAt: "asc" }, { id: "asc" }],
      take: 100,
      ...(cursor ? { cursor, skip: 1 } : {}),
    });
    for (const row of rows) {
      if (!canUseWordTrail(row.user.role) || bestByUser.has(row.userId)) continue;
      bestByUser.set(row.userId, row);
      if (bestByUser.size === 10) break;
    }
    if (rows.length < 100) break;
    cursor = { id: rows[rows.length - 1].id };
  }

  return [...bestByUser.values()].slice(0, 10).map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    name: `${row.user.firstName} ${row.user.lastName}`.trim(),
    role: row.user.role,
    profilePhotoUrl: row.user.profilePhotoUrl,
    score: row.score,
    accuracy: row.correctCount + row.wrongCount
      ? Math.round((row.correctCount / (row.correctCount + row.wrongCount)) * 100)
      : 0,
  }));
}

export function registerWordTrailRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;
  const gameAccessMiddleware = deps.gameAccessMiddleware ?? ((_req, _res, next) => next());
  const learnerOnly: express.RequestHandler = (req, res, next) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canUseWordTrail(jwtUser.role)) {
      res.status(403).json({ error: "Word Trail is available only to students and teachers" });
      return;
    }
    next();
  };

  app.get("/api/games/word-trail", authMiddleware, learnerOnly, gameAccessMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const [activeGame, recentGame, stats, leaderboard] = await Promise.all([
        prisma.wordTrailGame.findUnique({ where: { activeKey: jwtUser.userId } }),
        prisma.wordTrailGame.findFirst({
          where: { userId: jwtUser.userId, status: { in: ["WON", "LOST"] } },
          orderBy: { completedAt: "desc" },
        }),
        statsFor(prisma, jwtUser.userId),
        leaderboardFor(prisma),
      ]);
      res.json({
        activeGame: publicGame(activeGame),
        recentGame: publicGame(recentGame),
        stats,
        leaderboard,
      });
    } catch (error) {
      logger.error("Error loading Word Trail:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({
          error: "Word Trail database tables are not ready — run `npx prisma migrate deploy` and restart the server.",
        });
        return;
      }
      res.status(500).json({ error: "Unable to load Word Trail" });
    }
  });

  app.post("/api/games/word-trail/start", authMiddleware, learnerOnly, gameAccessMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    // Optional crossover: build the board from one specific Language Quest
    // course's own challenges instead of the default English-word pool, so
    // a learner can practise a Mandarin, Spanish, or any other course they're
    // taking through the Word Trail board game.
    const courseId = typeof req.body?.courseId === "string" ? req.body.courseId.trim().slice(0, 100) : "";
    try {
      const existing = await prisma.wordTrailGame.findUnique({
        where: { activeKey: jwtUser.userId },
      });
      if (existing) {
        res.json({ game: publicGame(existing) });
        return;
      }

      const seed = `${jwtUser.userId}:word-trail:${randomUUID()}`;
      let deck: EnglishWordPracticeQuestion[];
      if (courseId) {
        const course = await prisma.languageQuestCourse.findUnique({
          where: { id: courseId },
          select: { id: true, title: true, published: true },
        });
        if (!course || !course.published) {
          res.status(404).json({ error: "That Language Quest course is not available" });
          return;
        }
        deck = await loadLanguageQuestCourseDeck(prisma, courseId, seed, WORD_TRAIL_QUESTION_COUNT);
        if (deck.length < 6) {
          res.status(409).json({
            error: `${course.title} doesn't have enough challenges yet to fill a Word Trail board.`,
          });
          return;
        }
      } else {
        deck = await loadEnglishWordPracticeQuestions(prisma, seed, WORD_TRAIL_QUESTION_COUNT);
        if (deck.length < 12) {
          res.status(409).json({
            error: "There are not enough published English Word questions to start Word Trail.",
          });
          return;
        }
      }

      let game;
      try {
        game = await prisma.wordTrailGame.create({
          data: {
            userId: jwtUser.userId,
            activeKey: jwtUser.userId,
            hearts: WORD_TRAIL_STARTING_HEARTS,
            questionDeck: deck as unknown as Prisma.InputJsonValue,
            answerHistory: [] as Prisma.InputJsonValue,
          },
        });
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
        game = await prisma.wordTrailGame.findUnique({
          where: { activeKey: jwtUser.userId },
        });
      }
      res.status(201).json({ game: publicGame(game) });
    } catch (error) {
      logger.error("Error starting Word Trail:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({
          error: "Word Trail database tables are not ready — run `npx prisma migrate deploy` and restart the server.",
        });
        return;
      }
      res.status(500).json({ error: "Unable to start Word Trail" });
    }
  });

  app.post("/api/games/word-trail/:id/roll", authMiddleware, learnerOnly, gameAccessMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const game = await prisma.wordTrailGame.findFirst({
        where: { id: req.params.id, userId: jwtUser.userId },
      });
      if (!game) {
        res.status(404).json({ error: "Word Trail game not found" });
        return;
      }
      if (game.status !== "ACTIVE") {
        res.status(409).json({ error: "This Word Trail game is already complete" });
        return;
      }
      if (asPendingTurn(game.pendingTurn)) {
        res.json({ game: publicGame(game) });
        return;
      }

      const deck = asDeck(game.questionDeck);
      const history = asAnswerHistory(game.answerHistory);
      const question = pickWordTrailQuestion(
        deck,
        history.map((entry) => entry.questionId),
        game.turnCount,
      );
      if (!question) {
        res.status(409).json({ error: "This game has no vocabulary questions remaining" });
        return;
      }
      const pendingTurn: PendingTurn = { roll: randomInt(1, 7), question };
      const changed = await prisma.wordTrailGame.updateMany({
        where: {
          id: game.id,
          userId: jwtUser.userId,
          status: "ACTIVE",
          updatedAt: game.updatedAt,
        },
        data: {
          lastRoll: pendingTurn.roll,
          pendingTurn: pendingTurn as unknown as Prisma.InputJsonValue,
        },
      });
      if (changed.count !== 1) {
        res.status(409).json({ error: "The game changed in another tab; refresh to continue" });
        return;
      }
      const updated = await prisma.wordTrailGame.findUnique({ where: { id: game.id } });
      res.json({ game: publicGame(updated) });
    } catch (error) {
      logger.error("Error rolling in Word Trail:", error);
      res.status(500).json({ error: "Unable to roll the die" });
    }
  });

  app.post("/api/games/word-trail/:id/answer", authMiddleware, learnerOnly, gameAccessMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const parsed = answerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose an answer for the current word" });
      return;
    }

    try {
      const game = await prisma.wordTrailGame.findFirst({
        where: { id: req.params.id, userId: jwtUser.userId },
      });
      if (!game) {
        res.status(404).json({ error: "Word Trail game not found" });
        return;
      }
      if (game.status !== "ACTIVE") {
        res.status(409).json({ error: "This Word Trail game is already complete" });
        return;
      }
      const pending = asPendingTurn(game.pendingTurn);
      if (!pending || pending.question.id !== parsed.data.questionId) {
        res.status(409).json({ error: "Roll the die to receive your next word" });
        return;
      }
      if (!pending.question.options.some((option) => option.id === parsed.data.optionId)) {
        res.status(400).json({ error: "That answer does not belong to this word" });
        return;
      }

      const correct = parsed.data.optionId === pending.question.correctOptionId;
      const movement = correct
        ? resolveWordTrailMovement(game.position, pending.roll)
        : null;
      const nextPosition = movement?.to ?? game.position;
      const nextHearts = correct ? game.hearts : Math.max(0, game.hearts - 1);
      const nextStreak = correct ? game.currentStreak + 1 : 0;
      const won = correct && nextPosition >= WORD_TRAIL_LAST_POSITION;
      const lost = !won && nextHearts <= 0;
      const status = won ? "WON" : lost ? "LOST" : "ACTIVE";
      const pointsEarned = correct
        ? wordTrailCorrectAnswerPoints({
            spacesMoved: movement
              ? movement.rolledTo - movement.from
              : 0,
            streak: nextStreak,
            effect: movement?.effect,
            won,
          })
        : 0;
      const history: AnswerRecord[] = [
        ...asAnswerHistory(game.answerHistory),
        {
          questionId: pending.question.id,
          optionId: parsed.data.optionId,
          correct,
          roll: pending.roll,
          from: game.position,
          to: nextPosition,
          answeredAt: new Date().toISOString(),
        },
      ];
      const completedAt = status === "ACTIVE" ? null : new Date();

      const changed = await prisma.wordTrailGame.updateMany({
        where: {
          id: game.id,
          userId: jwtUser.userId,
          status: "ACTIVE",
          updatedAt: game.updatedAt,
        },
        data: {
          activeKey: status === "ACTIVE" ? game.activeKey : null,
          status,
          position: nextPosition,
          hearts: nextHearts,
          score: game.score + pointsEarned,
          turnCount: game.turnCount + 1,
          correctCount: game.correctCount + (correct ? 1 : 0),
          wrongCount: game.wrongCount + (correct ? 0 : 1),
          currentStreak: nextStreak,
          bestStreak: Math.max(game.bestStreak, nextStreak),
          pendingTurn: Prisma.DbNull,
          answerHistory: history as unknown as Prisma.InputJsonValue,
          completedAt,
        },
      });
      if (changed.count !== 1) {
        res.status(409).json({ error: "That turn was already answered; refresh to continue" });
        return;
      }
      const updated = await prisma.wordTrailGame.findUnique({ where: { id: game.id } });

      if (status !== "ACTIVE") {
        void createAuditLog(
          jwtUser.userId,
          jwtUser.email,
          "COMPLETE",
          "WORD_TRAIL",
          game.id,
          `${status === "WON" ? "Won" : "Finished"} Word Trail with ${updated.score} points and ${updated.correctCount} correct answers.`,
          req.ip,
          req.headers["user-agent"] || null,
          status === "WON" ? "SUCCESS" : "INFO",
        ).catch((error) => logger.error("Word Trail audit log failed:", error));
      }

      res.json({
        correct,
        correctOptionId: pending.question.correctOptionId,
        correctAnswer: pending.question.options.find(
          (option) => option.id === pending.question.correctOptionId,
        )?.text ?? "",
        explanation: pending.question.explanation,
        pointsEarned,
        heartLost: !correct,
        heartsRemaining: nextHearts,
        movement,
        completed: status !== "ACTIVE",
        game: publicGame(updated),
      });
    } catch (error) {
      logger.error("Error answering in Word Trail:", error);
      res.status(500).json({ error: "Unable to check that word" });
    }
  });

  app.post("/api/games/word-trail/:id/abandon", authMiddleware, learnerOnly, gameAccessMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const game = await prisma.wordTrailGame.findFirst({
        where: { id: req.params.id, userId: jwtUser.userId },
      });
      if (!game) {
        res.status(404).json({ error: "Word Trail game not found" });
        return;
      }
      if (game.status !== "ACTIVE") {
        res.json({ game: publicGame(game) });
        return;
      }

      const changed = await prisma.wordTrailGame.updateMany({
        where: {
          id: game.id,
          userId: jwtUser.userId,
          status: "ACTIVE",
          updatedAt: game.updatedAt,
        },
        data: {
          activeKey: null,
          status: "ABANDONED",
          pendingTurn: Prisma.DbNull,
          completedAt: new Date(),
        },
      });
      if (changed.count !== 1) {
        res.status(409).json({ error: "The game changed in another tab; refresh to continue" });
        return;
      }
      const updated = await prisma.wordTrailGame.findUnique({ where: { id: game.id } });
      res.json({ game: publicGame(updated) });
    } catch (error) {
      logger.error("Error abandoning Word Trail:", error);
      res.status(500).json({ error: "Unable to leave this trail" });
    }
  });
}
