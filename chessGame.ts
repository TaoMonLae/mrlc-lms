import { Router, Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";
import { z } from "zod";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Chess-club style scoring for the leaderboard: a win is worth more than a
// draw, a loss is worth nothing. Simple enough for students to understand at
// a glance.
const POINTS = { WIN: 3, DRAW: 1, LOSS: 0 };

type ChatNotify = (userIds: string[], payload: any) => void;

export function registerChessGameRoutes({
  app,
  prisma,
  authMiddleware,
  chatNotify,
}: {
  app: any;
  prisma: PrismaClient;
  authMiddleware: (req: Request, res: Response, next: (err?: unknown) => void) => void;
  // Pushes a Server-Sent Event to every open tab of the given user(s), reusing
  // the same real-time channel the chat feature already streams over. If not
  // supplied (e.g. during isolated testing) notifications are just skipped —
  // the frontend still works fine via polling.
  chatNotify?: ChatNotify;
}) {
  const router = Router();
  const notify: ChatNotify = chatNotify ?? (() => {});

  // Resolve the logged-in user's Student record. Chess multiplayer is a
  // student-to-student feature (mirrors the chat system's rule that students
  // never get a direct peer-to-peer channel — a game move isn't a message,
  // but we still keep the whole feature student-scoped and classmate-only).
  async function requireStudent(req: Request, res: Response): Promise<{ id: string; classId: string | null; className: string | null; userId: string; name: string } | null> {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return null;
    }
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { class: true, user: true },
    });
    if (!student) {
      res.status(403).json({ success: false, error: "Multiplayer chess is available to students only" });
      return null;
    }
    return {
      id: student.id,
      classId: student.classId,
      className: student.class?.name ?? null,
      userId: student.userId!,
      name: student.user ? `${student.user.firstName} ${student.user.lastName}`.trim() : student.preferredName || "Student",
    };
  }

  function publicStudent(s: { id: string; preferredName: string | null; profilePhotoUrl: string | null; user: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null } | null; class?: { name: string } | null } | null) {
    if (!s) return null;
    return {
      studentId: s.id,
      userId: s.user?.id ?? null,
      name: s.user ? `${s.user.firstName} ${s.user.lastName}`.trim() : s.preferredName || "Student",
      profilePhotoUrl: s.user?.profilePhotoUrl || s.profilePhotoUrl || null,
      className: s.class?.name ?? null,
    };
  }

  async function matchWithPlayers(matchId: string) {
    return prisma.chessMatch.findUnique({
      where: { id: matchId },
      include: {
        white: { include: { user: true, class: true } },
        black: { include: { user: true, class: true } },
      },
    });
  }

  function serializeMatch(match: NonNullable<Awaited<ReturnType<typeof matchWithPlayers>>>, viewerStudentId: string) {
    const myColor: "w" | "b" | null = match.whiteId === viewerStudentId ? "w" : match.blackId === viewerStudentId ? "b" : null;
    return {
      id: match.id,
      status: match.status,
      fen: match.fen,
      moves: match.moves,
      turnColor: match.turnColor,
      result: match.result,
      resultReason: match.resultReason,
      challengerId: match.challengerId,
      classId: match.classId,
      className: match.className,
      myColor,
      white: publicStudent(match.white as any),
      black: publicStudent(match.black as any),
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      lastMoveAt: match.lastMoveAt,
    };
  }

  // ── Classmates you can challenge ────────────────────────────────────────────
  router.get("/classmates", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      if (!me.classId) {
        return res.json({ success: true, classmates: [], className: null, note: "You're not assigned to a class yet, so there's no one to challenge here." });
      }

      const classmates = await prisma.student.findMany({
        where: { classId: me.classId, id: { not: me.id } },
        include: { user: true, class: true },
        orderBy: [{ user: { firstName: "asc" } }],
      });

      // Existing challenges/games between me and each classmate, so the UI can
      // show "Pending" / "Resume" instead of letting a duplicate be sent.
      const existing = await prisma.chessMatch.findMany({
        where: {
          status: { in: ["PENDING", "ACTIVE"] },
          OR: [{ whiteId: me.id }, { blackId: me.id }],
        },
      });
      const byOpponent = new Map<string, (typeof existing)[number]>();
      for (const m of existing) {
        const opponentId = m.whiteId === me.id ? m.blackId : m.whiteId;
        byOpponent.set(opponentId, m);
      }

      res.json({
        success: true,
        className: me.className,
        classmates: classmates
          .filter((c) => c.userId)
          .map((c) => {
            const match = byOpponent.get(c.id);
            return {
              ...publicStudent(c as any),
              activeMatchId: match ? match.id : null,
              activeMatchStatus: match ? match.status : null,
              isChallenger: match ? match.challengerId === me.id : null,
            };
          }),
      });
    } catch (error) {
      console.error("Error listing chess classmates:", error);
      res.status(500).json({ success: false, error: "Failed to load classmates" });
    }
  });

  // ── Challenges (pending invites) ────────────────────────────────────────────
  router.get("/challenges", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;

      const pending = await prisma.chessMatch.findMany({
        where: { status: "PENDING", OR: [{ whiteId: me.id }, { blackId: me.id }] },
        include: { white: { include: { user: true, class: true } }, black: { include: { user: true, class: true } } },
        orderBy: { createdAt: "desc" },
      });

      const incoming = pending.filter((m) => m.challengerId !== me.id).map((m) => serializeMatch(m as any, me.id));
      const outgoing = pending.filter((m) => m.challengerId === me.id).map((m) => serializeMatch(m as any, me.id));

      res.json({ success: true, incoming, outgoing });
    } catch (error) {
      console.error("Error listing chess challenges:", error);
      res.status(500).json({ success: false, error: "Failed to load challenges" });
    }
  });

  const challengeSchema = z.object({ opponentStudentId: z.string().min(1) });

  router.post("/challenges", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const { opponentStudentId } = challengeSchema.parse(req.body);

      if (opponentStudentId === me.id) {
        return res.status(400).json({ success: false, error: "You can't challenge yourself" });
      }

      const opponent = await prisma.student.findUnique({ where: { id: opponentStudentId }, include: { user: true } });
      if (!opponent || !opponent.userId) {
        return res.status(404).json({ success: false, error: "Student not found" });
      }
      if (!me.classId || opponent.classId !== me.classId) {
        return res.status(403).json({ success: false, error: "You can only challenge a classmate" });
      }

      const existing = await prisma.chessMatch.findFirst({
        where: {
          status: { in: ["PENDING", "ACTIVE"] },
          OR: [
            { whiteId: me.id, blackId: opponentStudentId },
            { whiteId: opponentStudentId, blackId: me.id },
          ],
        },
      });
      if (existing) {
        return res.status(409).json({ success: false, error: "There's already a game or pending challenge between you two", matchId: existing.id });
      }

      // Coin flip for colour so it's fair regardless of who sends the invite.
      const meIsWhite = Math.random() < 0.5;
      const match = await prisma.chessMatch.create({
        data: {
          whiteId: meIsWhite ? me.id : opponentStudentId,
          blackId: meIsWhite ? opponentStudentId : me.id,
          challengerId: me.id,
          classId: me.classId,
          className: me.className,
          status: "PENDING",
          fen: START_FEN,
          moves: [],
          turnColor: "w",
        },
      });

      notify([opponent.userId], { type: "chess_challenge", matchId: match.id, from: me.name });
      const full = await matchWithPlayers(match.id);
      res.json({ success: true, match: serializeMatch(full!, me.id) });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: "Invalid request", details: error.issues });
      console.error("Error creating chess challenge:", error);
      res.status(500).json({ success: false, error: "Failed to send challenge" });
    }
  });

  router.post("/matches/:id/accept", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const match = await prisma.chessMatch.findUnique({ where: { id: req.params.id } });
      if (!match) return res.status(404).json({ success: false, error: "Challenge not found" });
      if (match.whiteId !== me.id && match.blackId !== me.id) return res.status(403).json({ success: false, error: "Not your challenge" });
      if (match.challengerId === me.id) return res.status(400).json({ success: false, error: "You can't accept your own challenge" });
      if (match.status !== "PENDING") return res.status(409).json({ success: false, error: "This challenge is no longer pending" });

      const updated = await prisma.chessMatch.update({
        where: { id: match.id },
        data: { status: "ACTIVE", respondedAt: new Date(), startedAt: new Date() },
      });
      const opponentId = match.challengerId;
      const opponent = await prisma.student.findUnique({ where: { id: opponentId } });
      if (opponent?.userId) notify([opponent.userId], { type: "chess_accept", matchId: match.id, from: me.name });

      const full = await matchWithPlayers(updated.id);
      res.json({ success: true, match: serializeMatch(full!, me.id) });
    } catch (error) {
      console.error("Error accepting chess challenge:", error);
      res.status(500).json({ success: false, error: "Failed to accept challenge" });
    }
  });

  router.post("/matches/:id/decline", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const match = await prisma.chessMatch.findUnique({ where: { id: req.params.id } });
      if (!match) return res.status(404).json({ success: false, error: "Challenge not found" });
      if (match.whiteId !== me.id && match.blackId !== me.id) return res.status(403).json({ success: false, error: "Not your challenge" });
      if (match.status !== "PENDING") return res.status(409).json({ success: false, error: "This challenge is no longer pending" });

      await prisma.chessMatch.update({
        where: { id: match.id },
        data: { status: "DECLINED", respondedAt: new Date(), resultReason: "DECLINED" },
      });
      const challenger = await prisma.student.findUnique({ where: { id: match.challengerId } });
      if (challenger?.userId) notify([challenger.userId], { type: "chess_decline", matchId: match.id, from: me.name });
      res.json({ success: true });
    } catch (error) {
      console.error("Error declining chess challenge:", error);
      res.status(500).json({ success: false, error: "Failed to decline challenge" });
    }
  });

  router.post("/matches/:id/cancel", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const match = await prisma.chessMatch.findUnique({ where: { id: req.params.id } });
      if (!match) return res.status(404).json({ success: false, error: "Challenge not found" });
      if (match.challengerId !== me.id) return res.status(403).json({ success: false, error: "Only the sender can cancel this challenge" });
      if (match.status !== "PENDING") return res.status(409).json({ success: false, error: "This challenge is no longer pending" });

      await prisma.chessMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", respondedAt: new Date() } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling chess challenge:", error);
      res.status(500).json({ success: false, error: "Failed to cancel challenge" });
    }
  });

  // ── Match state & list ──────────────────────────────────────────────────────
  router.get("/matches", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const matches = await prisma.chessMatch.findMany({
        where: { OR: [{ whiteId: me.id }, { blackId: me.id }], status: { in: ["ACTIVE", "FINISHED"] } },
        include: { white: { include: { user: true, class: true } }, black: { include: { user: true, class: true } } },
        orderBy: { updatedAt: "desc" },
        take: 30,
      });
      res.json({
        success: true,
        active: matches.filter((m) => m.status === "ACTIVE").map((m) => serializeMatch(m as any, me.id)),
        recent: matches.filter((m) => m.status === "FINISHED").slice(0, 10).map((m) => serializeMatch(m as any, me.id)),
      });
    } catch (error) {
      console.error("Error listing chess matches:", error);
      res.status(500).json({ success: false, error: "Failed to load games" });
    }
  });

  router.get("/matches/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const match = await matchWithPlayers(req.params.id);
      if (!match) return res.status(404).json({ success: false, error: "Game not found" });
      if (match.whiteId !== me.id && match.blackId !== me.id) return res.status(403).json({ success: false, error: "Not your game" });
      res.json({ success: true, match: serializeMatch(match, me.id) });
    } catch (error) {
      console.error("Error loading chess match:", error);
      res.status(500).json({ success: false, error: "Failed to load game" });
    }
  });

  const moveSchema = z.object({
    from: z.string().min(2).max(2),
    to: z.string().min(2).max(2),
    promotion: z.enum(["q", "r", "b", "n"]).optional(),
  });

  router.post("/matches/:id/move", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const { from, to, promotion } = moveSchema.parse(req.body);

      const match = await prisma.chessMatch.findUnique({ where: { id: req.params.id } });
      if (!match) return res.status(404).json({ success: false, error: "Game not found" });
      if (match.status !== "ACTIVE") return res.status(409).json({ success: false, error: "This game isn't active" });

      const myColor = match.whiteId === me.id ? "w" : match.blackId === me.id ? "b" : null;
      if (!myColor) return res.status(403).json({ success: false, error: "Not your game" });
      if (match.turnColor !== myColor) return res.status(409).json({ success: false, error: "It's not your turn" });

      const chess = new Chess(match.fen);
      let moveResult;
      try {
        moveResult = chess.move({ from: from as any, to: to as any, promotion });
      } catch {
        moveResult = null;
      }
      if (!moveResult) return res.status(400).json({ success: false, error: "Illegal move" });

      const data: any = {
        fen: chess.fen(),
        moves: [...match.moves, moveResult.san],
        turnColor: chess.turn(),
        lastMoveAt: new Date(),
      };

      if (chess.isGameOver()) {
        data.status = "FINISHED";
        data.endedAt = new Date();
        if (chess.isCheckmate()) {
          data.result = myColor === "w" ? "WHITE_WINS" : "BLACK_WINS";
          data.resultReason = "CHECKMATE";
        } else if (chess.isStalemate()) {
          data.result = "DRAW";
          data.resultReason = "STALEMATE";
        } else if (chess.isThreefoldRepetition()) {
          data.result = "DRAW";
          data.resultReason = "REPETITION";
        } else if (chess.isInsufficientMaterial()) {
          data.result = "DRAW";
          data.resultReason = "INSUFFICIENT_MATERIAL";
        } else {
          data.result = "DRAW";
          data.resultReason = "FIFTY_MOVE";
        }
      }

      const updated = await prisma.chessMatch.update({ where: { id: match.id }, data });

      const opponentId = myColor === "w" ? match.blackId : match.whiteId;
      const opponent = await prisma.student.findUnique({ where: { id: opponentId } });
      if (opponent?.userId) notify([opponent.userId], { type: "chess_move", matchId: match.id });

      const full = await matchWithPlayers(updated.id);
      res.json({ success: true, match: serializeMatch(full!, me.id) });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: "Invalid move" });
      console.error("Error making chess move:", error);
      res.status(500).json({ success: false, error: "Failed to make move" });
    }
  });

  router.post("/matches/:id/resign", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const match = await prisma.chessMatch.findUnique({ where: { id: req.params.id } });
      if (!match) return res.status(404).json({ success: false, error: "Game not found" });
      const myColor = match.whiteId === me.id ? "w" : match.blackId === me.id ? "b" : null;
      if (!myColor) return res.status(403).json({ success: false, error: "Not your game" });
      if (match.status !== "ACTIVE") return res.status(409).json({ success: false, error: "This game isn't active" });

      const updated = await prisma.chessMatch.update({
        where: { id: match.id },
        data: {
          status: "FINISHED",
          endedAt: new Date(),
          result: myColor === "w" ? "BLACK_WINS" : "WHITE_WINS",
          resultReason: "RESIGNATION",
        },
      });

      const opponentId = myColor === "w" ? match.blackId : match.whiteId;
      const opponent = await prisma.student.findUnique({ where: { id: opponentId } });
      if (opponent?.userId) notify([opponent.userId], { type: "chess_resign", matchId: match.id, from: me.name });

      const full = await matchWithPlayers(updated.id);
      res.json({ success: true, match: serializeMatch(full!, me.id) });
    } catch (error) {
      console.error("Error resigning chess match:", error);
      res.status(500).json({ success: false, error: "Failed to resign" });
    }
  });

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  router.get("/leaderboard", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireStudent(req, res);
      if (!me) return;
      const scope = req.query.scope === "all" ? "all" : "class";
      if (scope === "class" && !me.classId) {
        return res.json({ success: true, scope, className: me.className, leaderboard: [] });
      }

      const matches = await prisma.chessMatch.findMany({
        where: {
          status: "FINISHED",
          ...(scope === "class" ? { classId: me.classId } : {}),
        },
        select: { whiteId: true, blackId: true, result: true },
      });

      const studentIds = new Set<string>();
      for (const m of matches) { studentIds.add(m.whiteId); studentIds.add(m.blackId); }

      type Row = { studentId: string; wins: number; losses: number; draws: number; games: number; points: number };
      const rows = new Map<string, Row>();
      const bump = (id: string, key: "wins" | "losses" | "draws") => {
        const row = rows.get(id) ?? { studentId: id, wins: 0, losses: 0, draws: 0, games: 0, points: 0 };
        row[key]++;
        row.games++;
        row.points = row.wins * POINTS.WIN + row.draws * POINTS.DRAW;
        rows.set(id, row);
      };
      for (const m of matches) {
        if (m.result === "WHITE_WINS") { bump(m.whiteId, "wins"); bump(m.blackId, "losses"); }
        else if (m.result === "BLACK_WINS") { bump(m.blackId, "wins"); bump(m.whiteId, "losses"); }
        else { bump(m.whiteId, "draws"); bump(m.blackId, "draws"); }
      }

      const students = await prisma.student.findMany({
        where: { id: { in: [...studentIds] } },
        include: { user: true, class: true },
      });
      const byId = new Map(students.map((s) => [s.id, s]));

      const leaderboard = [...rows.values()]
        .map((row) => ({ ...row, ...publicStudent(byId.get(row.studentId) as any) }))
        .sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses)
        .map((row, index) => ({ rank: index + 1, ...row }));

      res.json({ success: true, scope, className: me.className, leaderboard });
    } catch (error) {
      console.error("Error building chess leaderboard:", error);
      res.status(500).json({ success: false, error: "Failed to load leaderboard" });
    }
  });

  app.use("/api/games/chess", router);
  console.log("♞ Chess game routes registered");
}
