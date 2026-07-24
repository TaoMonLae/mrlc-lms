import { Router, Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export function registerCheckersGameRoutes({
  app,
  prisma,
  authMiddleware,
}: {
  app: any;
  prisma: PrismaClient;
  authMiddleware: (req: Request, res: Response, next: (err?: unknown) => void) => void;
}) {
  const router = Router();

  // Only teachers and admins may curate vocabulary.
  const requireEditor = (req: Request, res: Response, next: (err?: unknown) => void) => {
    const role = (req as any).user?.role;
    if (role === "ADMIN" || role === "TEACHER") return next();
    return res.status(403).json({
      success: false,
      error: "Only teachers and admins can manage vocabulary",
    });
  };

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Get vocabulary words for the checkers game — teacher/admin-added words mixed
  // together with the built-in English–Myanmar dictionary. Public (the game is
  // behind login anyway, and this needs no per-user data).
  router.get("/vocabulary-words", async (req: Request, res: Response) => {
    try {
      const { limit = "20" } = req.query;
      const take = parseInt(limit as string) || 20;

      // Active teacher/admin-curated words.
      const custom = await prisma.checkerVocabularyWord.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
      });
      const customWords = custom.map((w) => ({
        id: w.id,
        word: w.word,
        definition: w.definition,
        partOfSpeech: w.partOfSpeech || "unknown",
        language: w.language,
        difficulty: w.difficulty,
        source: "custom" as const,
      }));

      // Fill the remainder from the dictionary, skipping any words already
      // supplied by staff (case-insensitive) so definitions don't collide.
      // Sample from a random window so students don't always see the same A-words.
      const remaining = Math.max(0, take - customWords.length);
      let dictWords: Array<Record<string, unknown>> = [];
      if (remaining > 0) {
        const totalDict = await prisma.enMyDictionaryEntry.count();
        const sampleSize = Math.min(totalDict, Math.max(remaining * 8, 80));
        const maxSkip = Math.max(0, totalDict - sampleSize);
        const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0;
        const dict = await prisma.enMyDictionaryEntry.findMany({
          skip,
          take: sampleSize,
          orderBy: { wordLower: "asc" },
          select: { id: true, word: true, pos: true, definition: true },
        });
        const customLower = new Set(customWords.map((w) => w.word.toLowerCase()));
        dictWords = shuffle(
          dict.filter((d) => !customLower.has(d.word.toLowerCase()) && d.definition?.trim()),
        )
          .slice(0, remaining)
          .map((d) => ({
            id: d.id,
            word: d.word,
            definition: d.definition,
            partOfSpeech: d.pos || "unknown",
            language: "en-my",
            difficulty: "medium",
            source: "dictionary" as const,
          }));
      }

      const words = shuffle([...customWords, ...dictWords]);
      res.json({ success: true, words, total: words.length });
    } catch (error) {
      console.error("Error fetching vocabulary words:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vocabulary words",
      });
    }
  });

  // ── Vocabulary management (teacher/admin) ──────────────────────────────────
  // List every curated word (active + hidden) for the management UI.
  router.get("/vocabulary", authMiddleware, requireEditor, async (_req: Request, res: Response) => {
    try {
      const words = await prisma.checkerVocabularyWord.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, words });
    } catch (error) {
      console.error("Error listing vocabulary:", error);
      res.status(500).json({ success: false, error: "Failed to list vocabulary" });
    }
  });

  const wordSchema = z.object({
    word: z.string().trim().min(1).max(100),
    definition: z.string().trim().min(1).max(500),
    partOfSpeech: z.string().trim().max(50).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    language: z.string().trim().max(20).default("en"),
  });

  // Create a word.
  router.post("/vocabulary", authMiddleware, requireEditor, async (req: Request, res: Response) => {
    try {
      const data = wordSchema.parse(req.body);
      const user = (req as any).user;
      const created = await prisma.checkerVocabularyWord.create({
        data: {
          ...data,
          createdById: user?.userId ?? null,
          createdByName: user?.email ?? null,
        },
      });
      res.json({ success: true, word: created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: "Invalid word data", details: error.issues });
      }
      console.error("Error creating vocabulary word:", error);
      res.status(500).json({ success: false, error: "Failed to create word" });
    }
  });

  // Bulk import words.
  router.post("/vocabulary/import", authMiddleware, requireEditor, async (req: Request, res: Response) => {
    try {
      const itemsSchema = z.array(wordSchema);
      const items = itemsSchema.parse(req.body);
      const user = (req as any).user;

      const created = await prisma.$transaction(
        items.map((item) =>
          prisma.checkerVocabularyWord.create({
            data: {
              ...item,
              createdById: user?.userId ?? null,
              createdByName: user?.email ?? null,
            },
          })
        )
      );

      res.json({ success: true, count: created.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: "Invalid words data", details: error.issues });
      }
      console.error("Error importing vocabulary words:", error);
      res.status(500).json({ success: false, error: "Failed to import vocabulary words" });
    }
  });

  // Update a word (edit fields or toggle active).
  router.put("/vocabulary/:id", authMiddleware, requireEditor, async (req: Request, res: Response) => {
    try {
      const updateSchema = wordSchema.partial().extend({ active: z.boolean().optional() });
      const data = updateSchema.parse(req.body);
      const updated = await prisma.checkerVocabularyWord.update({
        where: { id: req.params.id },
        data,
      });
      res.json({ success: true, word: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: "Invalid word data", details: error.issues });
      }
      if ((error as { code?: string }).code === "P2025") {
        return res.status(404).json({ success: false, error: "Word not found" });
      }
      console.error("Error updating vocabulary word:", error);
      res.status(500).json({ success: false, error: "Failed to update word" });
    }
  });

  // Delete a word.
  router.delete("/vocabulary/:id", authMiddleware, requireEditor, async (req: Request, res: Response) => {
    try {
      await prisma.checkerVocabularyWord.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      if ((error as { code?: string }).code === "P2025") {
        return res.status(404).json({ success: false, error: "Word not found" });
      }
      console.error("Error deleting vocabulary word:", error);
      res.status(500).json({ success: false, error: "Failed to delete word" });
    }
  });

  // Get Mon language vocabulary words
  router.get("/mon-words", async (req: Request, res: Response) => {
    try {
      const { limit = "20" } = req.query;

      const words = await prisma.monWord.findMany({
        take: parseInt(limit as string) || 20,
        include: {
          definitions: {
            where: {
              lang: "eng",
            },
          },
        },
        orderBy: {
          word: "asc",
        },
      });

      const vocabularyWords = words.map((wordObj) => {
        const englishDef = wordObj.definitions.find((d: any) => d.lang === "eng");
        return {
          id: wordObj.id,
          word: wordObj.word,
          pronunciation: wordObj.ipa,
          definition: englishDef?.definition || "",
          partOfSpeech: englishDef?.pos || "unknown",
          language: "mon-en",
          difficulty: "medium",
        };
      });

      res.json({
        success: true,
        words: vocabularyWords,
        total: vocabularyWords.length,
      });
    } catch (error) {
      console.error("Error fetching Mon words:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch Mon vocabulary words",
      });
    }
  });

  // Save game score
  router.post("/scores", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const scoreSchema = z.object({
        result: z.enum(["WIN", "LOSE", "DRAW", "PLAYING", "ABANDONED"]).default("PLAYING"),
        score: z.number().int().min(0).default(0),
        highScore: z.boolean().default(false),
        gameMode: z.enum(["CLASSIC", "VOCABULARY", "PVP"]).default("CLASSIC"),
        opponentType: z.enum(["HUMAN", "AI", "CPU"]).default("HUMAN"),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
        gameDuration: z.number().int().min(0),
        movesCount: z.number().int().min(0).default(0),
        playerPiecesCaptured: z.number().int().min(0).default(0),
        opponentPiecesCaptured: z.number().int().min(0).default(0),
        playerKingsEarned: z.number().int().min(0).default(0),
        opponentKingsEarned: z.number().int().min(0).default(0),
        vocabularyWords: z.number().int().default(0),
        wordsList: z.array(z.string()).default([]),
        deviceInfo: z.object({
          userAgent: z.string().optional(),
          screen: z.object({
            width: z.number().optional(),
            height: z.number().optional(),
          }).optional(),
        }).optional(),
      });

      const validatedData = scoreSchema.parse(req.body);

      // Get student information
      const student = await prisma.student.findUnique({
        where: { userId },
        include: { class: true },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: "Student not found",
        });
      }

      // Check if this is a high score (for the same game mode). Forfeits never
      // count as a personal best even if the student has no other games yet.
      const existingHighScore = await prisma.checkerGameScore.findFirst({
        where: {
          studentId: student.id,
          gameMode: validatedData.gameMode,
          result: { notIn: ["ABANDONED", "PLAYING"] },
        },
        orderBy: {
          score: "desc",
        },
        take: 1,
      });

      const isFinished =
        validatedData.result === "WIN" ||
        validatedData.result === "LOSE" ||
        validatedData.result === "DRAW";
      const isNewHighScore =
        isFinished &&
        (!existingHighScore || validatedData.score > existingHighScore.score);

      // Keep a single current high-score flag per student + mode.
      const gameScore = await prisma.$transaction(async (tx) => {
        if (isNewHighScore) {
          await tx.checkerGameScore.updateMany({
            where: {
              studentId: student.id,
              gameMode: validatedData.gameMode,
              highScore: true,
            },
            data: { highScore: false },
          });
        }

        return tx.checkerGameScore.create({
          data: {
            studentId: student.id,
            classId: student.classId,
            className: student.class?.name || "Unknown",
            result: validatedData.result,
            score: validatedData.score,
            highScore: isNewHighScore,
            gameMode: validatedData.gameMode,
            opponentType: validatedData.opponentType,
            difficulty: validatedData.difficulty,
            gameDuration: validatedData.gameDuration,
            movesCount: validatedData.movesCount,
            playerPiecesCaptured: validatedData.playerPiecesCaptured,
            opponentPiecesCaptured: validatedData.opponentPiecesCaptured,
            playerKingsEarned: validatedData.playerKingsEarned,
            opponentKingsEarned: validatedData.opponentKingsEarned,
            vocabularyWords: validatedData.vocabularyWords,
            wordsList: validatedData.wordsList,
            deviceInfo: validatedData.deviceInfo as any,
            ipAddress: req.ip,
            playedAt: new Date(),
          },
        });
      });

      res.json({
        success: true,
        score: {
          id: gameScore.id,
          score: gameScore.score,
          result: gameScore.result,
          highScore: gameScore.highScore,
          isNewHighScore: isNewHighScore,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid score data",
          details: error.issues,
        });
      }

      console.error("Error saving game score:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save game score",
      });
    }
  });

  // Get leaderboard — best score per student in the selected window.
  // Auth required so we can mark the caller's row and optionally scope to their class.
  router.get("/leaderboard", authMiddleware, async (req: Request, res: Response) => {
    try {
      const {
        timeRange = "WEEK",
        classId,
        gameMode = "CLASSIC",
        scope = "all", // "all" | "class"
        limit = "20",
      } = req.query;

      const take = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 50);

      // Calculate date filter without mutating a shared Date (setHours/setDate would).
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case "TODAY": {
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "WEEK":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "MONTH":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "ALL_TIME":
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Resolve the current student when a Bearer token is present (route is public).
      let currentStudentId: string | null = null;
      let currentClassId: string | null = null;
      const userId = (req as any).user?.userId as string | undefined;
      if (userId) {
        const student = await prisma.student.findUnique({
          where: { userId },
          select: { id: true, classId: true },
        });
        if (student) {
          currentStudentId = student.id;
          currentClassId = student.classId;
        }
      }

      const scopedClassId =
        (classId as string | undefined) ||
        (scope === "class" && currentClassId ? currentClassId : undefined);

      // Pull a larger window so we can collapse to one best row per student.
      const scores = await prisma.checkerGameScore.findMany({
        where: {
          gameMode: gameMode as string,
          playedAt: { gte: startDate },
          result: { notIn: ["ABANDONED", "PLAYING"] },
          ...(scopedClassId ? { classId: scopedClassId } : {}),
        },
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              preferredName: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: [
          { score: "desc" },
          { gameDuration: "asc" },
        ],
        take: 300,
      });

      // One entry per student: highest score, then faster game as tie-break.
      type ScoreRow = (typeof scores)[number];
      const bestByStudent = new Map<string, ScoreRow>();
      for (const score of scores) {
        const existing = bestByStudent.get(score.studentId);
        if (
          !existing ||
          score.score > existing.score ||
          (score.score === existing.score && score.gameDuration < existing.gameDuration)
        ) {
          bestByStudent.set(score.studentId, score);
        }
      }

      // Aggregate W/L/D for the same window so the board shows more than a single score.
      const recordByStudent = new Map<string, { wins: number; losses: number; draws: number; games: number }>();
      for (const score of scores) {
        const rec = recordByStudent.get(score.studentId) ?? { wins: 0, losses: 0, draws: 0, games: 0 };
        rec.games += 1;
        if (score.result === "WIN") rec.wins += 1;
        else if (score.result === "LOSE") rec.losses += 1;
        else if (score.result === "DRAW") rec.draws += 1;
        recordByStudent.set(score.studentId, rec);
      }

      const leaderboard = [...bestByStudent.values()]
        .sort((a, b) => b.score - a.score || a.gameDuration - b.gameDuration)
        .slice(0, take)
        .map((score, index) => {
          const record = recordByStudent.get(score.studentId) ?? {
            wins: 0,
            losses: 0,
            draws: 0,
            games: 0,
          };
          return {
            id: score.id,
            rank: index + 1,
            studentName:
              score.student.preferredName ||
              `${score.student.user.firstName} ${score.student.user.lastName}`.trim(),
            studentCode: score.student.studentCode,
            className: score.className,
            score: score.score,
            result: score.result,
            gameDuration: score.gameDuration,
            movesCount: score.movesCount,
            vocabularyWords: score.vocabularyWords,
            difficulty: score.difficulty,
            wins: record.wins,
            losses: record.losses,
            draws: record.draws,
            games: record.games,
            playedAt: score.playedAt.toISOString(),
            isCurrentUser: currentStudentId !== null && score.studentId === currentStudentId,
          };
        });

      res.json({
        success: true,
        leaderboard,
        timeRange,
        gameMode,
        scope: scopedClassId ? "class" : "all",
        total: leaderboard.length,
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch leaderboard",
      });
    }
  });

  // Get student's vocabulary progress
  router.get("/vocabulary-progress", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: "Student not found",
        });
      }

      // Get vocabulary game scores
      const vocabScores = await prisma.checkerGameScore.findMany({
        where: {
          studentId: student.id,
          gameMode: "VOCABULARY",
        },
        orderBy: {
          playedAt: "desc",
        },
        take: 50,
      });

      // Aggregate learning data
      const wordsLearned = new Set<string>();
      vocabScores.forEach((score) => {
        score.wordsList.forEach((word) => wordsLearned.add(word));
      });

      const totalGames = vocabScores.length;
      const totalScore = vocabScores.reduce((sum, score) => sum + score.score, 0);
      const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
      const totalWordsLearned = wordsLearned.size;

      // Calculate win rate
      const wins = vocabScores.filter((s) => s.result === "WIN").length;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      res.json({
        success: true,
        progress: {
          totalGames,
          totalScore,
          averageScore: avgScore,
          uniqueWordsLearned: totalWordsLearned,
          winRate,
          recentScores: vocabScores.slice(0, 10).map((score) => ({
            score: score.score,
            result: score.result,
            wordsLearned: score.wordsList.length,
            playedAt: score.playedAt,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching vocabulary progress:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vocabulary progress",
      });
    }
  });

  // Get student stats
  router.get("/stats", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: "Student not found",
        });
      }

      // Get all game scores
      const allScores = await prisma.checkerGameScore.findMany({
        where: {
          studentId: student.id,
        },
        orderBy: {
          playedAt: "desc",
        },
      });

      // Calculate stats
      const totalGames = allScores.length;
      const wins = allScores.filter((s) => s.result === "WIN").length;
      const losses = allScores.filter((s) => s.result === "LOSE").length;
      const draws = allScores.filter((s) => s.result === "DRAW").length;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      const highScore = allScores.length > 0
        ? Math.max(...allScores.map((s) => s.score))
        : 0;

      const totalMoves = allScores.reduce((sum, s) => sum + s.movesCount, 0);
      const avgMoves = totalGames > 0 ? Math.round(totalMoves / totalGames) : 0;

      const totalPieces = allScores.reduce((sum, s) => sum + s.playerPiecesCaptured, 0);
      const avgPieces = totalGames > 0 ? Math.round(totalPieces / totalGames) : 0;

      res.json({
        success: true,
        stats: {
          totalGames,
          wins,
          losses,
          draws,
          winRate,
          highScore,
          avgMoves,
          avgPiecesCaptured: avgPieces,
          recentScores: allScores.slice(0, 5).map((score) => ({
            score: score.score,
            result: score.result,
            gameMode: score.gameMode,
            playedAt: score.playedAt,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch stats",
      });
    }
  });

  // Register routes
  app.use("/api/checkers-game", router);

  console.log("🎲 Checkers game routes registered");
}
