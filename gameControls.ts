import type express from "express";
import { z } from "zod";
import {
  GAME_KEYS,
  applicableGamePolicies,
  gameDayKey,
  isGameKey,
  resolveGameAccess,
  type GameAccessDecision,
  type GameKey,
} from "./shared/gameControls";

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

interface GameControlDeps {
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

const policySchema = z.object({
  scope: z.enum(["GLOBAL", "CLASS", "STUDENT"]),
  targetId: z.string().uuid().nullable().optional(),
  gameKey: z.enum(["ALL", ...GAME_KEYS]),
  enabled: z.boolean().default(true),
  blocked: z.boolean().default(false),
  dailyLimitMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  sessionLimitMinutes: z.number().int().min(1).max(360).nullable().optional(),
  cooldownMinutes: z.number().int().min(0).max(1440).default(0),
  allowedDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  allowedStartMinute: z.number().int().min(0).max(1439).nullable().optional(),
  allowedEndMinute: z.number().int().min(0).max(1439).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
}).superRefine((value, context) => {
  if (value.scope === "GLOBAL" && value.targetId) {
    context.addIssue({ code: "custom", path: ["targetId"], message: "must be empty for a global policy" });
  }
  if (value.scope !== "GLOBAL" && !value.targetId) {
    context.addIssue({ code: "custom", path: ["targetId"], message: "is required for this policy scope" });
  }
  const hasStart = value.allowedStartMinute != null;
  const hasEnd = value.allowedEndMinute != null;
  if (hasStart !== hasEnd) {
    context.addIssue({
      code: "custom",
      path: ["allowedStartMinute"],
      message: "start and end times must be set together",
    });
  }
});

const sessionSchema = z.object({
  gameKey: z.enum(GAME_KEYS),
});

function databaseUnavailable(error: any): boolean {
  return error?.code === "P2021" || error?.code === "P2022";
}

async function schoolTimezone(prisma: any): Promise<string> {
  const school = await prisma.schoolProfile.findFirst({ select: { timezone: true } }).catch(() => null);
  return school?.timezone || "UTC";
}

async function userGameContext(prisma: any, userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      studentProfile: { select: { id: true, classId: true } },
    },
  });
}

async function policiesForStudent(prisma: any, student: { id: string; classId: string | null }) {
  const scopeKeys = ["GLOBAL", `STUDENT:${student.id}`];
  if (student.classId) scopeKeys.push(`CLASS:${student.classId}`);
  return prisma.gameControlPolicy.findMany({
    where: { enabled: true, scopeKey: { in: scopeKeys } },
    orderBy: [{ scope: "asc" }, { gameKey: "asc" }],
  });
}

export async function evaluateStudentGameAccess(
  prisma: any,
  userId: string,
  gameKey: GameKey,
  options: { sessionId?: string | null; now?: Date } = {},
): Promise<GameAccessDecision & { exempt: boolean; managed: boolean }> {
  const now = options.now ?? new Date();
  const user = await userGameContext(prisma, userId);
  if (!user || !user.isActive) {
    return {
      ...resolveGameAccess({ policies: [], gameKey, now }),
      allowed: false,
      code: "BLOCKED",
      reason: "This account is not available.",
      exempt: false,
      managed: true,
    };
  }
  if (user.role !== "STUDENT") {
    return {
      ...resolveGameAccess({ policies: [], gameKey, now }),
      exempt: true,
      managed: false,
    };
  }
  if (!user.studentProfile) {
    return {
      ...resolveGameAccess({ policies: [], gameKey, now }),
      allowed: false,
      code: "BLOCKED",
      reason: "This student account is not linked to a student profile.",
      exempt: false,
      managed: true,
    };
  }

  const policies = applicableGamePolicies(
    await policiesForStudent(prisma, user.studentProfile),
    gameKey,
  );
  // Most students have no game policy. Avoid creating play sessions and
  // querying usage history until a teacher/admin actually enables controls.
  // Besides reducing five database reads per page load, this keeps unmanaged
  // games independent from the session-tracking tables.
  if (policies.length === 0) {
    return {
      ...resolveGameAccess({ policies: [], gameKey, now }),
      exempt: false,
      managed: false,
    };
  }

  const timezone = await schoolTimezone(prisma);
  const dayKey = gameDayKey(now, timezone);
  const [dailyRows, session, lastEndedForGame, lastEndedForAllGames] = await Promise.all([
    prisma.gameDailyUsage.findMany({
      where: { userId, dayKey },
      select: { gameKey: true, seconds: true },
    }),
    options.sessionId
      ? prisma.gamePlaySession.findFirst({
          where: { id: options.sessionId, userId, gameKey },
          select: { consumedSeconds: true },
        })
      : prisma.gamePlaySession.findFirst({
          where: { userId, gameKey, status: "ACTIVE" },
          orderBy: { startedAt: "desc" },
          select: { consumedSeconds: true },
        }),
    prisma.gamePlaySession.findFirst({
      where: { userId, gameKey, status: { in: ["ENDED", "LIMIT_REACHED", "REVOKED"] } },
      orderBy: { endedAt: "desc" },
      select: { endedAt: true },
    }),
    prisma.gamePlaySession.findFirst({
      where: { userId, status: { in: ["ENDED", "LIMIT_REACHED", "REVOKED"] } },
      orderBy: { endedAt: "desc" },
      select: { endedAt: true },
    }),
  ]);
  const dailyUsedSeconds = dailyRows
    .filter((row: { gameKey: string }) => row.gameKey === gameKey)
    .reduce((sum: number, row: { seconds: number }) => sum + row.seconds, 0);
  const dailyUsedSecondsForAllGames = dailyRows
    .reduce((sum: number, row: { seconds: number }) => sum + row.seconds, 0);
  const decision = resolveGameAccess({
    policies,
    gameKey,
    now,
    timezone,
    dailyUsedSeconds,
    dailyUsedSecondsForAllGames,
    sessionUsedSeconds: session?.consumedSeconds ?? 0,
    lastSessionEndedAt: lastEndedForGame?.endedAt ?? null,
    lastSessionEndedAtForAllGames: lastEndedForAllGames?.endedAt ?? null,
  });
  return {
    ...decision,
    exempt: false,
    managed: policies.length > 0,
  };
}

export function createGameAccessMiddleware(
  prisma: any,
  gameKey: GameKey,
  options: { requireActiveSession?: boolean } = {},
): express.RequestHandler {
  return async (req, res, next) => {
    const jwtUser = (req as any).user as JwtPayload | undefined;
    if (!jwtUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    try {
      const initialAccess = await evaluateStudentGameAccess(prisma, jwtUser.userId, gameKey);
      if (initialAccess.exempt || !initialAccess.managed) {
        next();
        return;
      }
      let sessionId: string | null = null;
      if (options.requireActiveSession) {
        const session = await prisma.gamePlaySession.findFirst({
          where: {
            userId: jwtUser.userId,
            gameKey,
            status: "ACTIVE",
            lastHeartbeatAt: { gte: new Date(Date.now() - 60_000) },
          },
          orderBy: { startedAt: "desc" },
          select: { id: true },
        });
        if (!session) {
          res.status(403).json({
            error: "Open the game from the LMS to start a controlled play session.",
            code: "CONTROLLED_SESSION_REQUIRED",
          });
          return;
        }
        sessionId = session.id;
      }
      const access = sessionId
        ? await evaluateStudentGameAccess(prisma, jwtUser.userId, gameKey, { sessionId })
        : initialAccess;
      if (!access.allowed) {
        res.status(403).json({
          error: access.reason || "Game access is restricted",
          code: access.code,
          access,
        });
        return;
      }
      next();
    } catch (error) {
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Game controls are not ready. Ask an administrator to run database migrations." });
        return;
      }
      next(error);
    }
  };
}

async function teacherClassIds(prisma: any, userId: string): Promise<string[]> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { classes: { select: { classId: true } } },
  });
  return teacher?.classes.map((row: { classId: string }) => row.classId) ?? [];
}

async function canManageTarget(
  prisma: any,
  jwtUser: JwtPayload,
  scope: "GLOBAL" | "CLASS" | "STUDENT",
  targetId?: string | null,
): Promise<{ allowed: boolean; classId: string | null; studentId: string | null; scopeKey: string }> {
  if (scope === "GLOBAL") {
    return {
      allowed: jwtUser.role === "ADMIN",
      classId: null,
      studentId: null,
      scopeKey: "GLOBAL",
    };
  }

  const managedClassIds = jwtUser.role === "ADMIN" ? null : await teacherClassIds(prisma, jwtUser.userId);
  if (scope === "CLASS") {
    const targetClass = targetId
      ? await prisma.class.findUnique({ where: { id: targetId }, select: { id: true } })
      : null;
    return {
      allowed: Boolean(targetClass && (jwtUser.role === "ADMIN" || managedClassIds?.includes(targetClass.id))),
      classId: targetClass?.id ?? null,
      studentId: null,
      scopeKey: `CLASS:${targetId || "INVALID"}`,
    };
  }

  const student = targetId
    ? await prisma.student.findUnique({ where: { id: targetId }, select: { id: true, classId: true } })
    : null;
  return {
    allowed: Boolean(
      student
      && (jwtUser.role === "ADMIN" || (student.classId && managedClassIds?.includes(student.classId))),
    ),
    classId: null,
    studentId: student?.id ?? null,
    scopeKey: `STUDENT:${targetId || "INVALID"}`,
  };
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown, res: express.Response): T | null {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  res.status(400).json({
    error: `${issue?.path.join(".") || "body"}: ${issue?.message || "invalid"}`,
  });
  return null;
}

export function registerGameControlRoutes(deps: GameControlDeps) {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;
  const managerOnly: express.RequestHandler = (req, res, next) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["ADMIN", "TEACHER"].includes(jwtUser.role)) {
      res.status(403).json({ error: "Only administrators and teachers can manage game controls" });
      return;
    }
    next();
  };

  app.get("/api/game-controls/access", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const gameKey = String(req.query.gameKey || "");
    if (!isGameKey(gameKey)) {
      res.status(400).json({ error: "Unknown game" });
      return;
    }
    try {
      res.json(await evaluateStudentGameAccess(prisma, jwtUser.userId, gameKey));
    } catch (error) {
      logger.error("Error evaluating game access:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Game controls are not ready. Run database migrations and restart the server." });
        return;
      }
      res.status(500).json({ error: "Unable to check game access" });
    }
  });

  app.post("/api/game-controls/sessions/start", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const body = parseBody(sessionSchema, req.body, res);
    if (!body) return;
    try {
      const initialAccess = await evaluateStudentGameAccess(prisma, jwtUser.userId, body.gameKey);
      if (initialAccess.exempt || !initialAccess.managed) {
        res.json({
          sessionId: null,
          access: initialAccess,
        });
        return;
      }

      const now = new Date();
      const reusable = await prisma.gamePlaySession.findFirst({
        where: {
          userId: jwtUser.userId,
          gameKey: body.gameKey,
          status: "ACTIVE",
          lastHeartbeatAt: { gte: new Date(now.getTime() - 90_000) },
        },
        orderBy: { startedAt: "desc" },
      });
      if (reusable) {
        const access = await evaluateStudentGameAccess(prisma, jwtUser.userId, body.gameKey, {
          sessionId: reusable.id,
          now,
        });
        if (!access.allowed) {
          await prisma.gamePlaySession.update({
            where: { id: reusable.id },
            data: { status: "LIMIT_REACHED", endedAt: now },
          });
          res.status(403).json({ error: access.reason, code: access.code, access });
          return;
        }
        res.json({ sessionId: reusable.id, access });
        return;
      }

      const activeSessions = await prisma.gamePlaySession.findMany({
        where: { userId: jwtUser.userId, status: "ACTIVE" },
        select: { id: true, lastHeartbeatAt: true },
      });
      for (const session of activeSessions) {
        await prisma.gamePlaySession.update({
          where: { id: session.id },
          data: { status: "ENDED", endedAt: session.lastHeartbeatAt },
        });
      }

      const access = await evaluateStudentGameAccess(prisma, jwtUser.userId, body.gameKey, { now });
      if (!access.allowed) {
        res.status(403).json({ error: access.reason, code: access.code, access });
        return;
      }
      const session = await prisma.gamePlaySession.create({
        data: { userId: jwtUser.userId, gameKey: body.gameKey, startedAt: now, lastHeartbeatAt: now },
      });
      res.status(201).json({ sessionId: session.id, access });
    } catch (error) {
      logger.error("Error starting controlled game session:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Game controls are not ready. Run database migrations and restart the server." });
        return;
      }
      res.status(500).json({ error: "Unable to start the game session" });
    }
  });

  app.post("/api/game-controls/sessions/:id/heartbeat", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const now = new Date();
      const session = await prisma.gamePlaySession.findFirst({
        where: { id: req.params.id, userId: jwtUser.userId, status: "ACTIVE" },
      });
      if (!session || !isGameKey(session.gameKey)) {
        res.status(409).json({ error: "This game session is no longer active", code: "SESSION_ENDED" });
        return;
      }
      const elapsedSeconds = Math.max(
        0,
        Math.min(90, Math.floor((now.getTime() - session.lastHeartbeatAt.getTime()) / 1000)),
      );
      if (elapsedSeconds > 0) {
        const timezone = await schoolTimezone(prisma);
        const dayKey = gameDayKey(now, timezone);
        await prisma.$transaction(async (tx: any) => {
          const updated = await tx.gamePlaySession.updateMany({
            where: {
              id: session.id,
              userId: jwtUser.userId,
              status: "ACTIVE",
              lastHeartbeatAt: session.lastHeartbeatAt,
            },
            data: {
              lastHeartbeatAt: now,
              consumedSeconds: { increment: elapsedSeconds },
            },
          });
          if (updated.count === 0) return null;
          await tx.gameDailyUsage.upsert({
            where: {
              userId_gameKey_dayKey: {
                userId: jwtUser.userId,
                gameKey: session.gameKey,
                dayKey,
              },
            },
            create: {
              userId: jwtUser.userId,
              gameKey: session.gameKey,
              dayKey,
              seconds: elapsedSeconds,
            },
            update: { seconds: { increment: elapsedSeconds } },
          });
          return session.consumedSeconds + elapsedSeconds;
        });
      }

      const access = await evaluateStudentGameAccess(prisma, jwtUser.userId, session.gameKey, {
        sessionId: session.id,
        now,
      });
      if (!access.allowed) {
        await prisma.gamePlaySession.updateMany({
          where: { id: session.id, status: "ACTIVE" },
          data: { status: "LIMIT_REACHED", endedAt: now },
        });
        res.status(403).json({ error: access.reason, code: access.code, access });
        return;
      }
      res.json({ access });
    } catch (error) {
      logger.error("Error recording game heartbeat:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Game controls are not ready. Run database migrations and restart the server." });
        return;
      }
      res.status(500).json({ error: "Unable to verify game time" });
    }
  });

  app.post("/api/game-controls/sessions/:id/end", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const now = new Date();
      const session = await prisma.gamePlaySession.findFirst({
        where: { id: req.params.id, userId: jwtUser.userId, status: "ACTIVE" },
      });
      if (session && isGameKey(session.gameKey)) {
        const elapsedSeconds = Math.max(
          0,
          Math.min(90, Math.floor((now.getTime() - session.lastHeartbeatAt.getTime()) / 1000)),
        );
        const timezone = await schoolTimezone(prisma);
        const dayKey = gameDayKey(now, timezone);
        const endedCount = await prisma.$transaction(async (tx: any) => {
          const ended = await tx.gamePlaySession.updateMany({
            where: {
              id: session.id,
              userId: jwtUser.userId,
              status: "ACTIVE",
              lastHeartbeatAt: session.lastHeartbeatAt,
            },
            data: {
              status: "ENDED",
              endedAt: now,
              lastHeartbeatAt: now,
              consumedSeconds: { increment: elapsedSeconds },
            },
          });
          if (ended.count > 0 && elapsedSeconds > 0) {
            await tx.gameDailyUsage.upsert({
              where: {
                userId_gameKey_dayKey: {
                  userId: jwtUser.userId,
                  gameKey: session.gameKey,
                  dayKey,
                },
              },
              create: {
                userId: jwtUser.userId,
                gameKey: session.gameKey,
                dayKey,
                seconds: elapsedSeconds,
              },
              update: { seconds: { increment: elapsedSeconds } },
            });
          }
          return ended.count;
        });
        if (endedCount === 0) {
          await prisma.gamePlaySession.updateMany({
            where: { id: session.id, userId: jwtUser.userId, status: "ACTIVE" },
            data: { status: "ENDED", endedAt: now },
          });
        }
      }
      res.json({ success: true });
    } catch (error) {
      logger.error("Error ending game session:", error);
      res.status(500).json({ error: "Unable to end the game session" });
    }
  });

  app.get("/api/game-controls/manage", authMiddleware, managerOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const managedClassIds = jwtUser.role === "ADMIN" ? null : await teacherClassIds(prisma, jwtUser.userId);
      const classes = await prisma.class.findMany({
        where: managedClassIds ? { id: { in: managedClassIds } } : {},
        select: {
          id: true,
          name: true,
          level: true,
          students: {
            where: { user: { isActive: true } },
            select: {
              id: true,
              studentCode: true,
              user: { select: { firstName: true, lastName: true } },
            },
            orderBy: { studentCode: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });
      const studentIds = classes.flatMap((row: { students: Array<{ id: string }> }) => row.students.map((student) => student.id));
      const policies = await prisma.gameControlPolicy.findMany({
        where: jwtUser.role === "ADMIN"
          ? {}
          : {
              OR: [
                { scope: "GLOBAL" },
                { classId: { in: managedClassIds || [] } },
                { studentId: { in: studentIds } },
              ],
            },
        include: {
          class: { select: { id: true, name: true } },
          student: {
            select: {
              id: true,
              studentCode: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          createdBy: { select: { firstName: true, lastName: true, role: true } },
          updatedBy: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: [{ scope: "asc" }, { gameKey: "asc" }],
      });
      res.json({
        role: jwtUser.role,
        gameKeys: GAME_KEYS,
        classes,
        policies,
      });
    } catch (error) {
      logger.error("Error loading game control manager:", error);
      if (databaseUnavailable(error)) {
        res.status(503).json({ error: "Game controls are not ready. Run database migrations and restart the server." });
        return;
      }
      res.status(500).json({ error: "Unable to load game controls" });
    }
  });

  app.post("/api/game-controls/policies", authMiddleware, managerOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const body = parseBody(policySchema, req.body, res);
    if (!body) return;
    try {
      const target = await canManageTarget(prisma, jwtUser, body.scope, body.targetId);
      if (!target.allowed) {
        res.status(403).json({ error: "You can only manage game controls for your assigned classes and students" });
        return;
      }
      const existing = await prisma.gameControlPolicy.findUnique({
        where: { scopeKey_gameKey: { scopeKey: target.scopeKey, gameKey: body.gameKey } },
      });
      if (jwtUser.role === "TEACHER" && existing?.managedByRole === "ADMIN") {
        res.status(403).json({ error: "This policy is locked by an administrator" });
        return;
      }
      const data = {
        scope: body.scope,
        scopeKey: target.scopeKey,
        gameKey: body.gameKey,
        enabled: body.enabled,
        blocked: body.blocked,
        dailyLimitMinutes: body.dailyLimitMinutes ?? null,
        sessionLimitMinutes: body.sessionLimitMinutes ?? null,
        cooldownMinutes: body.cooldownMinutes,
        allowedDays: [...new Set(body.allowedDays)].sort(),
        allowedStartMinute: body.allowedStartMinute ?? null,
        allowedEndMinute: body.allowedEndMinute ?? null,
        note: body.note || null,
        managedByRole: jwtUser.role,
        classId: target.classId,
        studentId: target.studentId,
        updatedById: jwtUser.userId,
      };
      const policy = existing
        ? await prisma.gameControlPolicy.update({ where: { id: existing.id }, data })
        : await prisma.gameControlPolicy.create({
            data: { ...data, createdById: jwtUser.userId },
          });
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        existing ? "UPDATE" : "CREATE",
        "GAME_CONTROL_POLICY",
        policy.id,
        `${body.scope} ${body.gameKey} game control ${existing ? "updated" : "created"}.`,
        req.ip || null,
        req.headers["user-agent"] || null,
        "INFO",
      );
      res.status(existing ? 200 : 201).json(policy);
    } catch (error) {
      logger.error("Error saving game control policy:", error);
      res.status(500).json({ error: "Unable to save game controls" });
    }
  });

  app.delete("/api/game-controls/policies/:id", authMiddleware, managerOnly, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const policy = await prisma.gameControlPolicy.findUnique({ where: { id: req.params.id } });
      if (!policy) {
        res.status(404).json({ error: "Policy not found" });
        return;
      }
      const targetId = policy.scope === "CLASS" ? policy.classId : policy.scope === "STUDENT" ? policy.studentId : null;
      const target = await canManageTarget(prisma, jwtUser, policy.scope, targetId);
      if (!target.allowed || (jwtUser.role === "TEACHER" && policy.managedByRole === "ADMIN")) {
        res.status(403).json({ error: "This policy can only be removed by an administrator" });
        return;
      }
      await prisma.gameControlPolicy.delete({ where: { id: policy.id } });
      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "GAME_CONTROL_POLICY",
        policy.id,
        `${policy.scope} ${policy.gameKey} game control removed.`,
        req.ip || null,
        req.headers["user-agent"] || null,
        "WARNING",
      );
      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting game control policy:", error);
      res.status(500).json({ error: "Unable to remove game controls" });
    }
  });

  return {
    accessMiddleware: (gameKey: GameKey, requireActiveSession = false) =>
      createGameAccessMiddleware(prisma, gameKey, { requireActiveSession }),
  };
}
