import { Router, Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Every role gets one shared, whole-school leaderboard — there's no
// class/staff split like Chess or Snake use, since Pac-Man is a single-player
// arcade game and the person asked for one board everyone shows up on.
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STAFF: "Staff",
  ACCOUNTANT: "Accountant",
  CASE_WORKER: "Case worker",
  LIBRARIAN: "Librarian",
  STUDENT: "Student",
};

const GAME_MODES = ["CLASSIC", "TIME_ATTACK", "SURVIVAL", "PRACTICE"] as const;

export function registerPacmanGameRoutes({
  app,
  prisma,
  authMiddleware,
  gameAccessMiddleware,
}: {
  app: any;
  prisma: PrismaClient;
  authMiddleware: (req: Request, res: Response, next: (err?: unknown) => void) => void;
  gameAccessMiddleware?: (req: Request, res: Response, next: (err?: unknown) => void) => void;
}) {
  const router = Router();
  const gameGuard = gameAccessMiddleware ?? ((_req: Request, _res: Response, next: (err?: unknown) => void) => next());

  function publicPlayer(u: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    role: string;
    studentProfile?: { class: { name: string } | null } | null;
  }) {
    const groupLabel = u.role === "STUDENT" ? (u.studentProfile?.class?.name ?? "Student") : (ROLE_LABEL[u.role] ?? "Staff");
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      profilePhotoUrl: u.profilePhotoUrl || null,
      groupLabel,
    };
  }

  // ── Save a completed run ─────────────────────────────────────────────────────
  const scoreSchema = z.object({
    score: z.number().int().min(0),
    level: z.number().int().min(1).default(1),
    gameMode: z.enum(GAME_MODES).default("CLASSIC"),
    deviceInfo: z
      .object({
        userAgent: z.string().optional(),
        screen: z.object({ width: z.number().optional(), height: z.number().optional() }).optional(),
      })
      .optional(),
  });

  router.post("/scores", authMiddleware, gameGuard, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Authentication required" });
        return;
      }

      const parsed = scoreSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: "Invalid score data", details: parsed.error.issues });
        return;
      }
      const data = parsed.data;

      const existingBest = await prisma.pacmanGameScore.findFirst({
        where: { userId, gameMode: data.gameMode },
        orderBy: { score: "desc" },
        select: { score: true },
      });
      const isNewHighScore = !existingBest || data.score > existingBest.score;

      const saved = await prisma.pacmanGameScore.create({
        data: {
          userId,
          score: data.score,
          level: data.level,
          gameMode: data.gameMode,
          highScore: isNewHighScore,
          deviceInfo: data.deviceInfo as any,
          ipAddress: req.ip,
          playedAt: new Date(),
        },
      });

      res.json({
        success: true,
        score: { id: saved.id, score: saved.score, level: saved.level, highScore: saved.highScore, isNewHighScore },
      });
    } catch (error) {
      console.error("Error saving Pac-Man score:", error);
      res.status(500).json({ success: false, error: "Failed to save score" });
    }
  });

  // ── School-wide leaderboard ──────────────────────────────────────────────────
  // Shows every player's personal best (not every individual run), so the
  // board reflects distinct players rather than one person's repeated plays.
  router.get("/leaderboard", authMiddleware, gameGuard, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const gameMode = GAME_MODES.includes(req.query.gameMode as any) ? (req.query.gameMode as string) : "CLASSIC";
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

      // Pull a generous window of recent top runs, then keep only each
      // player's best one. A per-user groupBy would need a second query per
      // player to fetch level/date/profile anyway, so this stays a single
      // round trip for the school-sized data volumes this game sees.
      const runs = await prisma.pacmanGameScore.findMany({
        where: { gameMode },
        orderBy: { score: "desc" },
        take: 500,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              role: true,
              isActive: true,
              studentProfile: { include: { class: true } },
            },
          },
        },
      });

      const bestPerUser = new Map<string, (typeof runs)[number]>();
      for (const run of runs) {
        if (!run.user.isActive) continue;
        if (!bestPerUser.has(run.userId)) bestPerUser.set(run.userId, run);
      }

      const ranked = [...bestPerUser.values()].sort((a, b) => b.score - a.score);

      const leaderboard = ranked.slice(0, limit).map((run, index) => ({
        rank: index + 1,
        ...publicPlayer(run.user as any),
        score: run.score,
        level: run.level,
        gameMode: run.gameMode,
        playedAt: run.playedAt.toISOString(),
        isCurrentUser: run.userId === userId,
      }));

      // If the requesting player has a best run but it fell outside the
      // returned slice, surface their own rank/score separately so the modal
      // can still say "you're #47" instead of just omitting them silently.
      let you: { rank: number; score: number } | null = null;
      if (userId) {
        const myIndex = ranked.findIndex((run) => run.userId === userId);
        if (myIndex >= 0) {
          you = { rank: myIndex + 1, score: ranked[myIndex].score };
        }
      }

      res.json({ success: true, gameMode, leaderboard, you, total: ranked.length });
    } catch (error) {
      console.error("Error building Pac-Man leaderboard:", error);
      res.status(500).json({ success: false, error: "Failed to load leaderboard" });
    }
  });

  app.use("/api/games/pacman", router);
  console.log("👻 Pac-Man game routes registered");
}
