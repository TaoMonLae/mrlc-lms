import { Router, Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export function registerSnakeGameRoutes({
  app,
  prisma,
  authMiddleware,
}: {
  app: any;
  prisma: PrismaClient;
  // Populates req.user from the Bearer token (and 401s if it's missing/invalid).
  // Applied to the routes that need an authenticated student below.
  authMiddleware: (req: Request, res: Response, next: (err?: unknown) => void) => void;
}) {
  const router = Router();

  // Get vocabulary words for the snake game
  router.get("/vocabulary-words", async (req: Request, res: Response) => {
    try {
      const { limit = "20", difficulty, language } = req.query;

      // Fetch words from the English-Myanmar dictionary
      const words = await prisma.enMyDictionaryEntry.findMany({
        take: parseInt(limit as string) || 20,
        orderBy: {
          wordLower: "asc",
        },
        where: {
          // Optional: filter by difficulty or other criteria
          ...(difficulty && { definition: { contains: difficulty as string } }),
        },
        select: {
          id: true,
          word: true,
          wordLower: true,
          pos: true,
          definition: true,
        },
      });

      // Format for the game
      const vocabularyWords = words.map((wordObj) => ({
        id: wordObj.id,
        word: wordObj.word,
        definition: wordObj.definition,
        partOfSpeech: wordObj.pos || "unknown",
        language: "en-my",
        difficulty: "medium", // Can be enhanced with actual difficulty logic
      }));

      res.json({
        success: true,
        words: vocabularyWords,
        total: vocabularyWords.length,
      });
    } catch (error) {
      console.error("Error fetching vocabulary words:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vocabulary words",
      });
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
              lang: "eng", // English definitions
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
      const userId = (req as any).user?.id; // Get authenticated user ID

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const scoreSchema = z.object({
        score: z.number().int().min(0),
        highScore: z.boolean().default(false),
        gameMode: z.enum(["CLASSIC", "VOCABULARY", "COMPETITION"]),
        speed: z.enum(["SLOW", "NORMAL", "FAST"]),
        gridSize: z.number().int().min(10).max(30),
        gameDuration: z.number().int().min(0),
        vocabularyWords: z.number().int().default(0),
        wordsList: z.array(z.string()).default([]),
        competitionId: z.string().optional(),
        rank: z.number().int().optional(),
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

      // Check if this is a high score
      const existingHighScore = await prisma.snakeGameScore.findFirst({
        where: {
          studentId: student.id,
          gameMode: validatedData.gameMode,
        },
        orderBy: {
          score: "desc",
        },
        take: 1,
      });

      const isNewHighScore =
        !existingHighScore || validatedData.score > existingHighScore.score;

      // Save the score
      const gameScore = await prisma.snakeGameScore.create({
        data: {
          studentId: student.id,
          classId: student.classId,
          className: student.class?.name || "Unknown",
          score: validatedData.score,
          highScore: isNewHighScore,
          gameMode: validatedData.gameMode,
          speed: validatedData.speed,
          gridSize: validatedData.gridSize,
          gameDuration: validatedData.gameDuration,
          vocabularyWords: validatedData.vocabularyWords,
          wordsList: validatedData.wordsList,
          competitionId: validatedData.competitionId,
          rank: validatedData.rank,
          deviceInfo: validatedData.deviceInfo as any,
          ipAddress: req.ip,
          playedAt: new Date(),
        },
      });

      res.json({
        success: true,
        score: {
          id: gameScore.id,
          score: gameScore.score,
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

  // Get leaderboard
  router.get("/leaderboard", async (req: Request, res: Response) => {
    try {
      const {
        timeRange = "WEEK",
        classId,
        gameMode = "CLASSIC",
        limit = "20",
      } = req.query;

      // Calculate date filter based on time range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case "TODAY":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "WEEK":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "MONTH":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "ALL_TIME":
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }

      // Get top scores
      const scores = await prisma.snakeGameScore.findMany({
        where: {
          gameMode: gameMode as string,
          playedAt: {
            gte: startDate,
          },
          ...(classId && { classId: classId as string }),
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
        orderBy: {
          score: "desc",
        },
        take: parseInt(limit as string) || 20,
      });

      // Format leaderboard entries
      const leaderboard = scores.map((score, index) => ({
        id: score.id,
        rank: index + 1,
        studentName:
          score.student.preferredName ||
          `${score.student.user.firstName} ${score.student.user.lastName}`,
        studentCode: score.student.studentCode,
        className: score.className,
        score: score.score,
        gameDuration: score.gameDuration,
        playedAt: score.playedAt.toISOString(),
        isCurrentUser: false, // Will be set by the client
      }));

      res.json({
        success: true,
        leaderboard,
        timeRange,
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
      const userId = (req as any).user?.id;

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
      const vocabScores = await prisma.snakeGameScore.findMany({
        where: {
          studentId: student.id,
          gameMode: "VOCABULARY",
        },
        orderBy: {
          playedAt: "desc",
        },
        take: 50, // Last 50 games
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

      res.json({
        success: true,
        progress: {
          totalGames,
          totalScore,
          averageScore: avgScore,
          uniqueWordsLearned: totalWordsLearned,
          recentScores: vocabScores.slice(0, 10).map((score) => ({
            score: score.score,
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

  // Get vocabulary analytics
  router.get("/vocabulary-analytics", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { studentId, timeRange = "WEEK" } = req.query;
      const userId = (req as any).user?.id;

      // If no specific studentId, use the current user
      let targetStudentId: string;
      if (studentId) {
        targetStudentId = studentId as string;
      } else if (userId) {
        const student = await prisma.student.findUnique({
          where: { userId },
        });
        if (!student) {
          return res.status(404).json({
            success: false,
            error: "Student not found",
          });
        }
        targetStudentId = student.id;
      } else {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case "WEEK":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "MONTH":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "ALL_TIME":
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }

      // Get vocabulary game scores
      const vocabScores = await prisma.snakeGameScore.findMany({
        where: {
          studentId: targetStudentId,
          gameMode: "VOCABULARY",
          playedAt: {
            gte: startDate,
          },
        },
        orderBy: {
          playedAt: "desc",
        },
      });

      // Calculate analytics
      const wordsLearned = new Set<string>();
      const wordFrequency = new Map<string, number>();

      vocabScores.forEach((score) => {
        score.wordsList.forEach((word) => {
          wordsLearned.add(word);
          wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
        });
      });

      const totalGames = vocabScores.length;
      const totalScore = vocabScores.reduce((sum, score) => sum + score.score, 0);
      const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

      // Get top words (most frequently encountered)
      const topWords = Array.from(wordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

      // Calculate improvement rate (compare recent vs older performance)
      let improvementRate = 0;
      if (vocabScores.length >= 2) {
        const midPoint = Math.floor(vocabScores.length / 2);
        const recentScores = vocabScores.slice(0, midPoint);
        const olderScores = vocabScores.slice(midPoint);

        const recentAvg =
          recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
        const olderAvg =
          olderScores.reduce((sum, s) => sum + s.score, 0) / olderScores.length;

        improvementRate = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
      }

      // Recent performance (last 10 games)
      const recentScores = vocabScores.slice(0, 10).map((score) => ({
        score: score.score,
        wordsLearned: score.wordsList.length,
        playedAt: score.playedAt.toISOString(),
      }));

      res.json({
        success: true,
        analytics: {
          totalGames,
          totalScore,
          averageScore,
          uniqueWordsLearned: wordsLearned.size,
          recentScores,
          topWords,
          improvementRate,
        },
        timeRange,
      });
    } catch (error) {
      console.error("Error fetching vocabulary analytics:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vocabulary analytics",
      });
    }
  });

  // Register routes
  app.use("/api/snake-game", router);

  console.log("🐍 Snake game routes registered");
}
