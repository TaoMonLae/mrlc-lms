import { Router, Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";
import { z } from "zod";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Chess-club style scoring for the leaderboard: a win is worth more than a
// draw, a loss is worth nothing. Simple enough to understand at a glance.
const POINTS = { WIN: 3, DRAW: 1, LOSS: 0 };

// Everyone who isn't a student is treated as "staff" for matchmaking purposes
// (teachers, admins, and every other employee role) — they all draw from one
// school-wide pool, separate from the student/classmate pool.
const STAFF_ROLES = new Set(["ADMIN", "TEACHER", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"]);
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STAFF: "Staff",
  ACCOUNTANT: "Accountant",
  CASE_WORKER: "Case worker",
  LIBRARIAN: "Librarian",
};

type Pool = "STUDENT" | "STAFF";
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

  interface Identity {
    id: string; // User.id — this is what's stored in ChessMatch.whiteId/blackId
    role: string;
    pool: Pool;
    name: string;
    classId: string | null;
    className: string | null;
  }

  // Resolve the logged-in user's identity for matchmaking. Students are
  // grouped by class (mirrors the chat system's rule that students never get
  // an open peer-to-peer channel — a chess move isn't a message, but the
  // feature still stays classmate-scoped for the same reason). Staff/teachers
  // draw from one school-wide pool instead.
  async function requireIdentity(req: Request, res: Response): Promise<Identity | null> {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return null;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: { include: { class: true } } },
    });
    if (!user) {
      res.status(404).json({ success: false, error: "Account not found" });
      return null;
    }
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    if (user.role === "STUDENT") {
      if (!user.studentProfile) {
        res.status(403).json({ success: false, error: "Multiplayer chess isn't available for this account yet" });
        return null;
      }
      return {
        id: user.id,
        role: user.role,
        pool: "STUDENT",
        name,
        classId: user.studentProfile.classId,
        className: user.studentProfile.class?.name ?? null,
      };
    }
    return { id: user.id, role: user.role, pool: "STAFF", name, classId: null, className: null };
  }

  function publicPlayer(u: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null; role: string; studentProfile?: { class: { name: string } | null } | null } | null) {
    if (!u) return null;
    const groupLabel = u.role === "STUDENT" ? (u.studentProfile?.class?.name ?? null) : (ROLE_LABEL[u.role] ?? "Staff");
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      profilePhotoUrl: u.profilePhotoUrl || null,
      groupLabel,
    };
  }

  async function matchWithPlayers(matchId: string) {
    return prisma.chessMatch.findUnique({
      where: { id: matchId },
      include: {
        white: { include: { studentProfile: { include: { class: true } } } },
        black: { include: { studentProfile: { include: { class: true } } } },
      },
    });
  }

  function serializeMatch(match: NonNullable<Awaited<ReturnType<typeof matchWithPlayers>>>, viewerId: string) {
    const myColor: "w" | "b" | null = match.whiteId === viewerId ? "w" : match.blackId === viewerId ? "b" : null;
    return {
      id: match.id,
      status: match.status,
      scope: match.scope,
      fen: match.fen,
      moves: match.moves,
      turnColor: match.turnColor,
      result: match.result,
      resultReason: match.resultReason,
      challengerId: match.challengerId,
      classId: match.classId,
      className: match.className,
      myColor,
      white: publicPlayer(match.white as any),
      black: publicPlayer(match.black as any),
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      lastMoveAt: match.lastMoveAt,
    };
  }

  // ── Opponents you can challenge ─────────────────────────────────────────────
  // Students see classmates; staff/teachers see every other staff member.
  router.get("/opponents", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireIdentity(req, res);
      if (!me) return;

      let candidates: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null; role: string; studentProfile?: { class: { name: string } | null } | null }[];
      let note: string | null = null;

      if (me.pool === "STUDENT") {
        if (!me.classId) {
          return res.json({ success: true, pool: me.pool, groupLabel: null, opponents: [], note: "You're not assigned to a class yet, so there's no one to challenge here." });
        }
        const classmates = await prisma.student.findMany({
          where: { classId: me.classId, userId: { not: null } },
          include: { user: true },
          orderBy: [{ user: { firstName: "asc" } }],
        });
        candidates = classmates
          .filter((c) => c.user && c.userId !== me.id)
          .map((c) => ({ ...(c.user as any), studentProfile: { class: { name: me.className || "" } } }));
      } else {
        const staff = await prisma.user.findMany({
          where: { role: { in: [...STAFF_ROLES] as any }, isActive: true, id: { not: me.id } },
          orderBy: [{ firstName: "asc" }],
        });
        candidates = staff as any;
      }

      const existing = await prisma.chessMatch.findMany({
        where: { status: { in: ["PENDING", "ACTIVE"] }, OR: [{ whiteId: me.id }, { blackId: me.id }] },
      });
      const byOpponent = new Map<string, (typeof existing)[number]>();
      for (const m of existing) {
        const opponentId = m.whiteId === me.id ? m.blackId : m.whiteId;
        byOpponent.set(opponentId, m);
      }

      res.json({
        success: true,
        pool: me.pool,
        groupLabel: me.pool === "STUDENT" ? me.className : "Staff",
        note,
        opponents: candidates.map((c) => {
          const match = byOpponent.get(c.id);
          return {
            ...publicPlayer(c as any),
            activeMatchId: match ? match.id : null,
            activeMatchStatus: match ? match.status : null,
          };
        }),
      });
    } catch (error) {
      console.error("Error listing chess opponents:", error);
      res.status(500).json({ success: false, error: "Failed to load opponents" });
    }
  });

  // ── Challenges (pending invites) ────────────────────────────────────────────
  router.get("/challenges", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireIdentity(req, res);
      if (!me) return;

      const pending = await prisma.chessMatch.findMany({
        where: { status: "PENDING", OR: [{ whiteId: me.id }, { blackId: me.id }] },
        include: { white: { include: { studentProfile: { include: { class: true } } } }, black: { include: { studentProfile: { include: { class: true } } } } },
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

  const challengeSchema = z.object({ opponentId: z.string().min(1) });

  router.post("/challenges", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireIdentity(req, res);
      if (!me) return;
      const { opponentId } = challengeSchema.parse(req.body);

      if (opponentId === me.id) {
        return res.status(400).json({ success: false, error: "You can't challenge yourself" });
      }

      const opponentUser = await prisma.user.findUnique({ where: { id: opponentId }, include: { studentProfile: true } });
      if (!opponentUser || !opponentUser.isActive) {
        return res.status(404).json({ success: false, error: "Person not found" });
      }

      if (me.pool === "STUDENT") {
        if (opponentUser.role !== "STUDENT" || !opponentUser.studentProfile || opponentUser.studentProfile.classId !== me.classId) {
          return res.status(403).json({ success: false, error: "You can only challenge a classmate" });
        }
      } else {
        if (!STAFF_ROLES.has(opponentUser.role)) {
          return res.status(403).json({ success: false, error: "You can only challenge another staff member" });
        }
      }

      const existing = await prisma.chessMatch.findFirst({
        where: {
          status: { in: ["PENDING", "ACTIVE"] },
          OR: [
            { whiteId: me.id, blackId: opponentId },
            { whiteId: opponentId, blackId: me.id },
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
          whiteId: meIsWhite ? me.id : opponentId,
          blackId: meIsWhite ? opponentId : me.id,
          challengerId: me.id,
          scope: me.pool,
          classId: me.pool === "STUDENT" ? me.classId : null,
          className: me.pool === "STUDENT" ? me.className : null,
          status: "PENDING",
          fen: START_FEN,
          moves: [],
          turnColor: "w",
        },
      });

      notify([opponentId], { type: "chess_challenge", matchId: match.id, from: me.name });
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
      const me = await requireIdentity(req, res);
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
      notify([match.challengerId], { type: "chess_accept", matchId: match.id, from: me.name });

      const full = await matchWithPlayers(updated.id);
      res.json({ success: true, match: serializeMatch(full!, me.id) });
    } catch (error) {
      console.error("Error accepting chess challenge:", error);
      res.status(500).json({ success: false, error: "Failed to accept challenge" });
    }
  });

  router.post("/matches/:id/decline", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireIdentity(req, res);
      if (!me) return;
      const match = await prisma.chessMatch.findUnique({ where: { id: req.params.id } });
      if (!match) return res.status(404).json({ success: false, error: "Challenge not found" });
      if (match.whiteId !== me.id && match.blackId !== me.id) return res.status(403).json({ success: false, error: "Not your challenge" });
      if (match.status !== "PENDING") return res.status(409).json({ success: false, error: "This challenge is no longer pending" });

      await prisma.chessMatch.update({
        where: { id: match.id },
        data: { status: "DECLINED", respondedAt: new Date(), resultReason: "DECLINED" },
      });
      notify([match.challengerId], { type: "chess_decline", matchId: match.id, from: me.name });
      res.json({ success: true });
    } catch (error) {
      console.error("Error declining chess challenge:", error);
      res.status(500).json({ success: false, error: "Failed to decline challenge" });
    }
  });

  router.post("/matches/:id/cancel", authMiddleware, async (req: Request, res: Response) => {
    try {
      const me = await requireIdentity(req, res);
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
      const me = await requireIdentity(req, res);
      if (!me) return;
      const matches = await prisma.chessMatch.findMany({
        where: { OR: [{ whiteId: me.id }, { blackId: me.id }], status: { in: ["ACTIVE", "FINISHED"] } },
        include: { white: { include: { studentProfile: { include: { class: true } } } }, black: { include: { studentProfile: { include: { class: true } } } } },
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
      const me = await requireIdentity(req, res);
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
      const me = await requireIdentity(req, res);
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
      notify([opponentId], { type: "chess_move", matchId: match.id });

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
      const me = await requireIdentity(req, res);
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
      notify([opponentId], { type: "chess_resign", matchId: match.id, from: me.name });

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
      const me = await requireIdentity(req, res);
      if (!me) return;

      // Staff play in one school-wide pool (no "class" concept), so the
      // class/all toggle only applies to the student pool.
      const scope = me.pool === "STUDENT" && req.query.scope === "all" ? "all" : "class";
      if (me.pool === "STUDENT" && scope === "class" && !me.classId) {
        return res.json({ success: true, pool: me.pool, scope, groupLabel: me.className, leaderboard: [] });
      }

      const matches = await prisma.chessMatch.findMany({
        where: {
          status: "FINISHED",
          scope: me.pool,
          ...(me.pool === "STUDENT" && scope === "class" ? { classId: me.classId } : {}),
        },
        select: { whiteId: true, blackId: true, result: true },
      });

      const userIds = new Set<string>();
      for (const m of matches) { userIds.add(m.whiteId); userIds.add(m.blackId); }

      type Row = { id: string; wins: number; losses: number; draws: number; games: number; points: number };
      const rows = new Map<string, Row>();
      const bump = (id: string, key: "wins" | "losses" | "draws") => {
        const row = rows.get(id) ?? { id, wins: 0, losses: 0, draws: 0, games: 0, points: 0 };
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

      const users = await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        include: { studentProfile: { include: { class: true } } },
      });
      const byId = new Map(users.map((u) => [u.id, u]));

      const leaderboard = [...rows.values()]
        .map((row) => ({ ...row, ...publicPlayer(byId.get(row.id) as any) }))
        .sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses)
        .map((row, index) => ({ rank: index + 1, ...row }));

      res.json({ success: true, pool: me.pool, scope, groupLabel: me.pool === "STUDENT" ? me.className : "Staff", leaderboard });
    } catch (error) {
      console.error("Error building chess leaderboard:", error);
      res.status(500).json({ success: false, error: "Failed to load leaderboard" });
    }
  });

  app.use("/api/games/chess", router);
  console.log("♞ Chess game routes registered");
}
