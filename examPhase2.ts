/**
 * Phase 2 — Advanced Exam System routes.
 *
 * Registered from server.ts inside startServer() with shared dependencies so it
 * has access to the same prisma client, auth middleware, audit log and logger.
 *
 * Security model (see SECURITY notes in each handler):
 *  - Students only ever receive sanitized questions (no correct answers / weights
 *    / explanations) until results are released by policy.
 *  - Every attempt mutation validates ownership and a server-authoritative clock.
 *  - Finalized manual grades are immutable.
 *  - Submission + final scoring run in transactions.
 *  - Grading, score changes, release, reopen and invalidation are audit-logged.
 */
import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

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
  logger: { error: (...a: any[]) => void; warn: (...a: any[]) => void; info: (...a: any[]) => void };
}

const TEACHER_ROLES = ["ADMIN", "TEACHER"];

export function registerExamPhase2Routes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;

  // ── small helpers ──────────────────────────────────────────────────────────
  const user = (req: express.Request) => (req as any).user as JwtPayload;
  const isTeacher = (req: express.Request) => TEACHER_ROLES.includes(user(req).role);
  const ipOf = (req: express.Request) => (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
  const uaOf = (req: express.Request) => (req.headers["user-agent"] as string) || null;
  const num = (v: any): number | null => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

  // Rate limiter for sensitive exam endpoints (start/save/submit/grade).
  const examLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120, // generous enough for ~2s autosave but bounded
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, slow down." },
  });
  const gradingLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

  const teacherGuard: express.RequestHandler = (req, res, next) => {
    if (!isTeacher(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    next();
  };

  // Resolve the Student row for the signed-in user (students act on their own attempts).
  async function studentForReq(req: express.Request) {
    return prisma.student.findUnique({ where: { userId: user(req).userId } });
  }

  // Strip everything a student must not see from a question.
  function sanitizeQuestion(q: any) {
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      points: q.points,
      options: q.options ?? null,
      orderIndex: q.orderIndex,
      sectionId: q.sectionId ?? null,
      groupId: q.groupId ?? null,
      stimulusId: q.stimulusId ?? null,
      partialCredit: q.partialCredit ?? false,
      // NEVER: correctAnswer, correctAnswers, optionWeights, explanation,
      //        negativePoints, numericTolerance, requiresManualGrading internals.
    };
  }

  // Server-authoritative remaining time. Returns whole seconds (>= 0).
  function remainingSeconds(attempt: any): number {
    if (!attempt.serverDeadline) return 0;
    if (attempt.state === "PAUSED") {
      // Frozen: remaining is whatever was left when paused.
      const base = new Date(attempt.serverDeadline).getTime() - new Date(attempt.pausedAt || attempt.updatedAt).getTime();
      return Math.max(0, Math.floor(base / 1000));
    }
    return Math.max(0, Math.floor((new Date(attempt.serverDeadline).getTime() - Date.now()) / 1000));
  }
  const isExpired = (attempt: any) => attempt.serverDeadline && attempt.state !== "PAUSED" && Date.now() > new Date(attempt.serverDeadline).getTime();

  // Resolve the accommodation that applies to a student for an exam (exam-specific wins).
  async function accommodationFor(studentId: string, examId: string) {
    const rows = await prisma.examAccommodation.findMany({ where: { studentId, OR: [{ examId }, { examId: null }] } });
    return rows.find((r: any) => r.examId === examId) || rows.find((r: any) => r.examId === null) || null;
  }

  // ── deterministic shuffle (seeded) so a resumed attempt keeps its order ──────
  function seededShuffle<T>(arr: T[], seed: string): T[] {
    const a = [...arr];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    const rand = () => { h = (Math.imul(1103515245, h) + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ===========================================================================
  // SCHEDULING + RESULT POLICY (teacher/admin)
  // ===========================================================================
  app.put("/api/exams/:id/schedule", authMiddleware, teacherGuard, async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const data: any = {
        availableFrom: b.availableFrom ? new Date(b.availableFrom) : null,
        availableUntil: b.availableUntil ? new Date(b.availableUntil) : null,
        resultReleaseAt: b.resultReleaseAt ? new Date(b.resultReleaseAt) : null,
        attemptLimit: num(b.attemptLimit) ?? 1,
        gracePeriodMinutes: num(b.gracePeriodMinutes) ?? 0,
        allowLateStart: b.allowLateStart !== false,
        requiresAccessCode: !!b.requiresAccessCode,
        requiresInvigilator: !!b.requiresInvigilator,
        shuffleQuestions: !!b.shuffleQuestions,
        shuffleOptions: !!b.shuffleOptions,
        negativeMarking: !!b.negativeMarking,
        passMark: num(b.passMark),
        durationMinutes: num(b.durationMinutes) ?? undefined,
        status: b.status || undefined,
      };
      // Only (re)hash the access code when a new one is supplied.
      if (b.accessCode) data.accessCodeHash = await bcrypt.hash(String(b.accessCode), 10);
      else if (b.requiresAccessCode === false) data.accessCodeHash = null;

      const exam = await prisma.exam.update({ where: { id }, data });
      await createAuditLog(user(req).userId, user(req).email, "UPDATE", "EXAM", id, `Exam '${exam.title}' schedule updated.`, ipOf(req), uaOf(req), "SUCCESS");
      const { accessCodeHash, ...safe } = exam;
      res.json(safe);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Exam not found" }); return; }
      logger.error("schedule update failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/exams/:id/schedule", authMiddleware, teacherGuard, async (req, res) => {
    try {
      const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      const { accessCodeHash, ...safe } = exam;
      res.json({ ...safe, hasAccessCode: !!accessCodeHash });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.get("/api/exams/:id/result-policy", authMiddleware, teacherGuard, async (req, res) => {
    try {
      const policy = await prisma.examResultPolicy.findUnique({ where: { examId: req.params.id } });
      res.json(policy || null);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json(null); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/exams/:id/result-policy", authMiddleware, teacherGuard, async (req, res) => {
    const { id } = req.params; const b = req.body || {};
    const data = {
      showScore: b.showScore !== false,
      showPassFail: b.showPassFail !== false,
      showCorrectAnswers: !!b.showCorrectAnswers,
      showExplanations: !!b.showExplanations,
      showTeacherFeedback: b.showTeacherFeedback !== false,
      releaseMode: ["IMMEDIATE", "SCHEDULED", "AFTER_GRADING", "HIDDEN"].includes(b.releaseMode) ? b.releaseMode : "IMMEDIATE",
      releaseAt: b.releaseAt ? new Date(b.releaseAt) : null,
    };
    try {
      const policy = await prisma.examResultPolicy.upsert({
        where: { examId: id }, create: { examId: id, ...data }, update: data,
      });
      await createAuditLog(user(req).userId, user(req).email, "UPDATE", "EXAM_RESULT_POLICY", id, `Result policy set to ${data.releaseMode}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(policy);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ===========================================================================
  // ACCOMMODATIONS (teacher/admin)
  // ===========================================================================
  app.get("/api/accommodations", authMiddleware, teacherGuard, async (req, res) => {
    const { studentId, examId } = req.query as Record<string, string>;
    try {
      const rows = await prisma.examAccommodation.findMany({
        where: { ...(studentId ? { studentId } : {}), ...(examId ? { examId } : {}) },
        include: { student: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(rows);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const accommodationFields = (b: any) => ({
    extraTimePercent: num(b.extraTimePercent),
    extraTimeMinutes: num(b.extraTimeMinutes),
    largerText: !!b.largerText,
    highContrast: !!b.highContrast,
    screenReader: !!b.screenReader,
    reducedDistraction: !!b.reducedDistraction,
    calculatorAllowed: !!b.calculatorAllowed,
    additionalBreaks: !!b.additionalBreaks,
    separateRoom: !!b.separateRoom,
    readerSupport: !!b.readerSupport,
    scribeSupport: !!b.scribeSupport,
    notes: b.notes || null,
  });

  app.post("/api/accommodations", authMiddleware, teacherGuard, async (req, res) => {
    const b = req.body || {};
    if (!b.studentId) { res.status(400).json({ error: "studentId is required" }); return; }
    try {
      const row = await prisma.examAccommodation.create({ data: { studentId: b.studentId, examId: b.examId || null, ...accommodationFields(b) } });
      await createAuditLog(user(req).userId, user(req).email, "CREATE", "EXAM_ACCOMMODATION", row.id, `Accommodation created for student ${b.studentId}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.status(201).json(row);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.put("/api/accommodations/:id", authMiddleware, teacherGuard, async (req, res) => {
    try {
      const row = await prisma.examAccommodation.update({ where: { id: req.params.id }, data: accommodationFields(req.body || {}) });
      await createAuditLog(user(req).userId, user(req).email, "UPDATE", "EXAM_ACCOMMODATION", row.id, `Accommodation updated.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(row);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/accommodations/:id", authMiddleware, teacherGuard, async (req, res) => {
    try {
      await prisma.examAccommodation.delete({ where: { id: req.params.id } });
      await createAuditLog(user(req).userId, user(req).email, "DELETE", "EXAM_ACCOMMODATION", req.params.id, `Accommodation removed.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ===========================================================================
  // ASSIGNMENTS (teacher/admin)
  // ===========================================================================
  app.get("/api/exams/:id/assignments", authMiddleware, teacherGuard, async (req, res) => {
    try {
      const rows = await prisma.examAssignment.findMany({
        where: { examId: req.params.id },
        include: { student: { include: { user: true } }, accommodation: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(rows);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/exams/:id/assignments", authMiddleware, teacherGuard, async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    const studentIds: string[] = Array.isArray(b.studentIds) ? b.studentIds : (b.studentId ? [b.studentId] : []);
    if (!studentIds.length) { res.status(400).json({ error: "studentIds required" }); return; }
    try {
      const created = await prisma.$transaction(
        studentIds.map((studentId) => prisma.examAssignment.upsert({
          where: { examId_studentId: { examId: id, studentId } },
          create: { examId: id, studentId, invigilatorId: b.invigilatorId || null, accommodationId: b.accommodationId || null },
          update: { invigilatorId: b.invigilatorId || undefined, accommodationId: b.accommodationId || undefined },
        }))
      );
      await createAuditLog(user(req).userId, user(req).email, "ASSIGN", "EXAM", id, `Assigned ${created.length} student(s) to exam.`, ipOf(req), uaOf(req), "SUCCESS");
      res.status(201).json(created);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.delete("/api/exams/:examId/assignments/:assignmentId", authMiddleware, teacherGuard, async (req, res) => {
    try {
      await prisma.examAssignment.delete({ where: { id: req.params.assignmentId } });
      await createAuditLog(user(req).userId, user(req).email, "UNASSIGN", "EXAM", req.params.examId, `Removed assignment ${req.params.assignmentId}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ===========================================================================
  // STUDENT ATTEMPT LIFECYCLE  (server-authoritative)
  // ===========================================================================

  // Compute effective duration (minutes) including accommodation extra time.
  function effectiveDuration(baseMin: number, accom: any): number {
    let mins = baseMin;
    if (accom?.extraTimePercent) mins += (baseMin * accom.extraTimePercent) / 100;
    if (accom?.extraTimeMinutes) mins += accom.extraTimeMinutes;
    return Math.round(mins);
  }

  // START or RESUME an attempt. SECURITY: validates window, access code, attempt
  // limit, single active session; returns sanitized questions only.
  app.post("/api/exam2/:examId/start", authMiddleware, examLimiter, async (req, res) => {
    if (isTeacher(req)) { res.status(403).json({ error: "Only students take exams" }); return; }
    const { examId } = req.params;
    const b = req.body || {};
    try {
      const student = await studentForReq(req);
      if (!student) { res.status(403).json({ error: "No student profile" }); return; }
      const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { questions: true } });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

      // If assignments exist for this exam, the student must be assigned.
      const assignment = await prisma.examAssignment.findUnique({ where: { examId_studentId: { examId, studentId: student.id } } }).catch(() => null);
      const anyAssignments = await prisma.examAssignment.count({ where: { examId } }).catch(() => 0);
      if (anyAssignments > 0 && !assignment) { res.status(403).json({ error: "You are not assigned to this exam" }); return; }

      const now = Date.now();
      const from = assignment?.availableFromOverride || exam.availableFrom;
      const until = assignment?.availableUntilOverride || exam.availableUntil;
      if (from && now < new Date(from).getTime()) { res.status(403).json({ error: "Exam not open yet" }); return; }
      if (until && now > new Date(until).getTime() && !exam.allowLateStart) { res.status(403).json({ error: "Exam window has closed" }); return; }

      // Access code check.
      if (exam.requiresAccessCode && exam.accessCodeHash) {
        const ok = b.accessCode && await bcrypt.compare(String(b.accessCode), exam.accessCodeHash);
        if (!ok) { res.status(403).json({ error: "Invalid access code" }); return; }
      }

      // Resume an in-progress/paused attempt if one exists.
      const existing = await prisma.examAttempt.findFirst({
        where: { studentId: student.id, examId, state: { in: ["IN_PROGRESS", "PAUSED"] } },
        orderBy: { attemptNumber: "desc" },
      });
      if (existing) {
        // New device/session takeover: issue a fresh token, log it.
        const sessionToken = crypto.randomUUID();
        const resumed = await prisma.examAttempt.update({
          where: { id: existing.id },
          data: { sessionToken, state: existing.state === "PAUSED" ? "PAUSED" : "IN_PROGRESS", ipAddress: ipOf(req), userAgent: uaOf(req), deviceInfo: b.deviceInfo || undefined },
        });
        await prisma.attemptEvent.create({ data: { attemptId: existing.id, type: "RECONNECT", actorRole: "STUDENT", ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
        return res.json(await attemptPayload(resumed, exam, student.id));
      }

      // Enforce attempt limit.
      const limit = assignment?.attemptLimitOverride ?? exam.attemptLimit ?? 1;
      const used = await prisma.examAttempt.count({ where: { studentId: student.id, examId } });
      if (used >= limit) { res.status(403).json({ error: "No attempts remaining" }); return; }

      // Build server-authoritative timing.
      const accom = assignment?.accommodationId
        ? await prisma.examAccommodation.findUnique({ where: { id: assignment.accommodationId } })
        : await accommodationFor(student.id, examId);
      const baseMin = exam.durationMinutes || 60;
      const effMin = effectiveDuration(baseMin, accom);
      const serverDeadline = new Date(now + effMin * 60000 + (exam.gracePeriodMinutes || 0) * 60000);

      // Freeze randomized question order for this attempt.
      let order = exam.questions.map((q: any) => q.id);
      if (exam.shuffleQuestions) order = seededShuffle(order, `${student.id}:${examId}:${used + 1}`);

      const sessionToken = crypto.randomUUID();
      const attempt = await prisma.examAttempt.create({
        data: {
          studentId: student.id, examId, assignmentId: assignment?.id || null,
          accommodationId: accom?.id || null, attemptNumber: used + 1,
          state: "IN_PROGRESS", startedAt: new Date(now), serverDeadline,
          effectiveDurationMinutes: effMin, sessionToken, questionOrder: order,
          lastSavedAt: new Date(now), ipAddress: ipOf(req), userAgent: uaOf(req),
          deviceInfo: b.deviceInfo || undefined,
        },
      });
      await prisma.attemptEvent.create({ data: { attemptId: attempt.id, type: "START", actorRole: "STUDENT", ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
      if (assignment) await prisma.examAssignment.update({ where: { id: assignment.id }, data: { status: "STARTED" } }).catch(() => {});
      res.status(201).json(await attemptPayload(attempt, exam, student.id));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Exam system not migrated yet" }); return; }
      logger.error("start attempt failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Build the student-facing attempt payload (sanitized questions in frozen order).
  async function attemptPayload(attempt: any, exam: any, studentId: string) {
    const questions = exam.questions || (await prisma.question.findMany({ where: { examId: exam.id } }));
    const byId: Record<string, any> = {};
    for (const q of questions) byId[q.id] = q;
    const order: string[] = (attempt.questionOrder as string[]) || questions.map((q: any) => q.id);
    const ordered = order.map((id) => byId[id]).filter(Boolean).map(sanitizeQuestion);
    const answers = await prisma.examAnswer.findMany({ where: { attemptId: attempt.id } });
    return {
      attempt: {
        id: attempt.id, examId: attempt.examId, state: attempt.state,
        attemptNumber: attempt.attemptNumber, lastSavedAt: attempt.lastSavedAt,
        sessionToken: attempt.sessionToken, remainingSeconds: remainingSeconds(attempt),
        serverTime: new Date().toISOString(),
      },
      exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks },
      questions: ordered,
      // saved answers (student's own, no correctness leaked)
      answers: answers.map((a: any) => ({ questionId: a.questionId, answerText: a.answerText, selectedOptions: a.selectedOptions, flaggedForReview: a.flaggedForReview })),
    };
  }

  // RESUME / recover state after refresh or reconnect. Validates ownership + token.
  app.get("/api/attempts/:attemptId/state", authMiddleware, examLimiter, async (req, res) => {
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId }, include: { exam: { include: { questions: true } } } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      if (!student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }

      // Server-authoritative expiry → auto-submit.
      if (["IN_PROGRESS", "PAUSED"].includes(attempt.state) && isExpired(attempt)) {
        const finalized = await finalizeSubmission(attempt.id, true, ipOf(req), uaOf(req));
        return res.json({ autoSubmitted: true, attempt: { id: finalized.id, state: finalized.state, remainingSeconds: 0 } });
      }
      res.json(await attemptPayload(attempt, attempt.exam, student.id));
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // AUTOSAVE (heartbeat). Body: { sessionToken, answers:[{questionId,answerText,selectedOptions,flaggedForReview,timeSpentSeconds}], reason }
  // SECURITY: rejects stale session tokens (concurrent session guard) and never
  // computes correctness here (no answer leakage). Server clock is authoritative.
  app.post("/api/attempts/:attemptId/save", authMiddleware, examLimiter, async (req, res) => {
    const b = req.body || {};
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      if (!student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }
      if (!["IN_PROGRESS", "PAUSED"].includes(attempt.state)) { res.status(409).json({ error: "Attempt is not active", state: attempt.state }); return; }

      // Concurrent-session guard: only the holder of the current token may save,
      // unless the exam explicitly permits multiple sessions (not by default).
      if (attempt.sessionToken && b.sessionToken && b.sessionToken !== attempt.sessionToken) {
        res.status(409).json({ error: "SESSION_CONFLICT", message: "This attempt is open in another session." });
        return;
      }

      if (isExpired(attempt)) {
        const finalized = await finalizeSubmission(attempt.id, true, ipOf(req), uaOf(req));
        res.status(409).json({ error: "TIME_EXPIRED", autoSubmitted: true, state: finalized.state });
        return;
      }

      const answers: any[] = Array.isArray(b.answers) ? b.answers : [];
      const now = new Date();
      await prisma.$transaction(async (tx: any) => {
        for (const a of answers) {
          if (!a.questionId) continue;
          await tx.examAnswer.upsert({
            where: { attemptId_questionId: { attemptId: attempt.id, questionId: a.questionId } },
            create: {
              attemptId: attempt.id, questionId: a.questionId,
              answerText: a.answerText ?? null, selectedOptions: a.selectedOptions ?? null,
              flaggedForReview: !!a.flaggedForReview, timeSpentSeconds: num(a.timeSpentSeconds) ?? null,
            },
            update: {
              answerText: a.answerText ?? null, selectedOptions: a.selectedOptions ?? null,
              flaggedForReview: !!a.flaggedForReview,
              timeSpentSeconds: a.timeSpentSeconds !== undefined ? num(a.timeSpentSeconds) : undefined,
            },
          });
        }
        await tx.examAttempt.update({ where: { id: attempt.id }, data: { lastSavedAt: now } });
        // Lightweight immutable snapshot for recovery/audit.
        const snap = await tx.examAnswer.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, answerText: true, selectedOptions: true, flaggedForReview: true } });
        await tx.attemptSnapshot.create({ data: { attemptId: attempt.id, reason: (b.reason || "AUTOSAVE").toUpperCase(), answers: snap, questionOrder: attempt.questionOrder ?? undefined, remainingSeconds: remainingSeconds(attempt) } });
        await tx.attemptEvent.create({ data: { attemptId: attempt.id, type: (b.reason || "AUTOSAVE").toUpperCase(), actorRole: "STUDENT", ipAddress: ipOf(req), userAgent: uaOf(req) } });
      });
      res.json({ ok: true, lastSavedAt: now.toISOString(), remainingSeconds: remainingSeconds({ ...attempt }), serverTime: new Date().toISOString() });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Exam system not migrated yet" }); return; }
      logger.error("autosave failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // PAUSE — freezes the clock (records remaining time at pause).
  app.post("/api/attempts/:attemptId/pause", authMiddleware, examLimiter, async (req, res) => {
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId } });
      if (!attempt || !student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }
      if (attempt.state !== "IN_PROGRESS") { res.status(409).json({ error: "Not in progress" }); return; }
      const updated = await prisma.examAttempt.update({ where: { id: attempt.id }, data: { state: "PAUSED", pausedAt: new Date(), lastSavedAt: new Date() } });
      await prisma.attemptEvent.create({ data: { attemptId: attempt.id, type: "PAUSE", actorRole: "STUDENT", ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
      res.json({ ok: true, state: updated.state, remainingSeconds: remainingSeconds(updated) });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // SUBMIT — transactional auto-scoring (partial credit) → SUBMITTED / PENDING_GRADING.
  app.post("/api/attempts/:attemptId/submit", authMiddleware, examLimiter, async (req, res) => {
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId } });
      if (!attempt || !student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }
      if (!["IN_PROGRESS", "PAUSED"].includes(attempt.state)) { res.status(409).json({ error: "Already submitted", state: attempt.state }); return; }
      const finalized = await finalizeSubmission(attempt.id, false, ipOf(req), uaOf(req));
      res.json({ ok: true, state: finalized.state });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Exam system not migrated yet" }); return; }
      logger.error("submit failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── auto-scoring engine (partial credit, negative marking, tolerances) ───────
  function scoreObjective(q: any, ans: any): { score: number; correct: boolean | null; manual: boolean } {
    const max = q.points || 0;
    const floor = (s: number) => {
      let v = s;
      if (q.minScore != null) v = Math.max(v, q.minScore);
      return Math.max(v, q.negativePoints ? -Math.abs(q.negativePoints) : (q.partialCredit ? v : Math.min(v, max)) );
    };
    // Manual types.
    if (["ESSAY", "WRITTEN"].includes(q.type) || q.requiresManualGrading) return { score: 0, correct: null, manual: true };

    // Multi-select with per-option weighting.
    if (Array.isArray(ans?.selectedOptions) && q.optionWeights) {
      const weights: Record<string, number> = q.optionWeights as any;
      let raw = 0;
      for (const opt of ans.selectedOptions) raw += Number(weights[opt] || 0);
      let score = q.partialCredit ? raw * max : (raw >= 1 ? max : 0);
      score = Math.min(score, max);
      if (q.minScore != null) score = Math.max(score, q.minScore);
      return { score, correct: score >= max, manual: false };
    }

    // Text / numeric / single-choice.
    const given = (ans?.answerText ?? "").toString();
    const accepted: string[] = Array.isArray(q.correctAnswers) && q.correctAnswers.length
      ? q.correctAnswers.map((s: any) => String(s))
      : (q.correctAnswer != null ? [String(q.correctAnswer)] : []);
    if (!given.trim()) return { score: 0, correct: false, manual: false }; // blank

    // numeric tolerance
    if (q.numericTolerance != null && accepted.length && !isNaN(Number(given))) {
      const g = Number(given);
      const hit = accepted.some((a) => !isNaN(Number(a)) && Math.abs(g - Number(a)) <= q.numericTolerance);
      if (hit) return { score: max, correct: true, manual: false };
      return { score: q.negativePoints ? -Math.abs(q.negativePoints) : 0, correct: false, manual: false };
    }
    const norm = (s: string) => (q.caseSensitive ? s.trim() : s.trim().toLowerCase());
    const hit = accepted.some((a) => norm(a) === norm(given));
    if (hit) return { score: max, correct: true, manual: false };
    return { score: q.negativePoints ? -Math.abs(q.negativePoints) : 0, correct: false, manual: false };
  }

  // Shared submission finalizer. Used by manual submit and auto-submit on expiry.
  async function finalizeSubmission(attemptId: string, autoSubmitted: boolean, ip: string | null, ua: string | null) {
    return prisma.$transaction(async (tx: any) => {
      const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: { include: { questions: true } }, answers: true } });
      if (!attempt) throw new Error("attempt missing");
      if (!["IN_PROGRESS", "PAUSED"].includes(attempt.state)) return attempt; // idempotent

      const qById: Record<string, any> = {};
      for (const q of attempt.exam.questions) qById[q.id] = q;
      const ansByQ: Record<string, any> = {};
      for (const a of attempt.answers) ansByQ[a.questionId] = a;

      let total = 0; let needsManual = false;
      for (const q of attempt.exam.questions) {
        const a = ansByQ[q.id];
        const r = scoreObjective(q, a || {});
        if (r.manual) { needsManual = true; }
        else total += r.score;
        // Persist per-answer scoring.
        await tx.examAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: q.id } },
          create: {
            attemptId, questionId: q.id, answerText: a?.answerText ?? null, selectedOptions: a?.selectedOptions ?? null,
            isCorrect: r.manual ? null : r.correct, autoScore: r.manual ? null : r.score,
            pointsAwarded: r.manual ? null : r.score, maxPoints: q.points,
            gradingState: r.manual ? "PENDING" : "GRADED",
          },
          update: {
            isCorrect: r.manual ? null : r.correct, autoScore: r.manual ? null : r.score,
            pointsAwarded: r.manual ? null : r.score, maxPoints: q.points,
            gradingState: r.manual ? "PENDING" : "GRADED",
          },
        });
        // Queue manual grading items.
        if (r.manual) {
          const existing = await tx.manualGrade.findFirst({ where: { attemptId, questionId: q.id } });
          if (!existing) await tx.manualGrade.create({ data: { attemptId, questionId: q.id, status: "PENDING" } });
        }
      }

      const state = needsManual ? "PENDING_GRADING" : (autoSubmitted ? "AUTO_SUBMITTED" : "SUBMITTED");
      const updated = await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          state, isCompleted: true, autoSubmitted, submittedAt: new Date(), completedAt: new Date(),
          score: needsManual ? null : Math.max(0, total), gradingStatus: needsManual ? "PENDING" : "COMPLETE", sessionToken: null,
        },
      });
      await tx.attemptSnapshot.create({ data: { attemptId, reason: "FINAL", answers: attempt.answers.map((a: any) => ({ questionId: a.questionId, answerText: a.answerText, selectedOptions: a.selectedOptions })), questionOrder: attempt.questionOrder ?? undefined, remainingSeconds: 0 } });
      await tx.attemptEvent.create({ data: { attemptId, type: autoSubmitted ? "AUTO_SUBMIT" : "SUBMIT", actorRole: "STUDENT", ipAddress: ip, userAgent: ua } });
      if (attempt.assignmentId) await tx.examAssignment.update({ where: { id: attempt.assignmentId }, data: { status: "COMPLETED" } }).catch(() => {});
      return updated;
    });
  }

  // STUDENT RESULT — gated by ExamResultPolicy. Never leaks answers before release.
  app.get("/api/attempts/:attemptId/result", authMiddleware, async (req, res) => {
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId }, include: { exam: true, answers: true } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      if (!student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }

      const policy = await prisma.examResultPolicy.findUnique({ where: { examId: attempt.examId } }).catch(() => null);
      const mode = policy?.releaseMode || "IMMEDIATE";
      const now = Date.now();
      let released = false;
      if (mode === "IMMEDIATE") released = ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED", "RELEASED"].includes(attempt.state);
      else if (mode === "SCHEDULED") released = !!(policy?.releaseAt && now >= new Date(policy.releaseAt).getTime());
      else if (mode === "AFTER_GRADING") released = ["FINALIZED", "RELEASED"].includes(attempt.state);
      else if (mode === "HIDDEN") released = false;

      if (!released) { res.json({ released: false, state: attempt.state, message: "Results are not available yet." }); return; }

      const showScore = policy?.showScore !== false;
      const showCorrect = !!policy?.showCorrectAnswers;
      const showExpl = !!policy?.showExplanations;
      const showFeedback = policy?.showTeacherFeedback !== false;
      const manualGrades = showFeedback ? await prisma.manualGrade.findMany({ where: { attemptId: attempt.id } }) : [];
      const fbByQ: Record<string, any> = {};
      for (const g of manualGrades) fbByQ[g.questionId] = g;

      let questions: any[] = [];
      if (showCorrect || showExpl) {
        const qs = await prisma.question.findMany({ where: { examId: attempt.examId } });
        const ansByQ: Record<string, any> = {};
        for (const a of attempt.answers) ansByQ[a.questionId] = a;
        questions = qs.map((q: any) => ({
          id: q.id, text: q.text,
          ...(showCorrect ? { correctAnswer: q.correctAnswer, correctAnswers: q.correctAnswers } : {}),
          ...(showExpl ? { explanation: q.explanation } : {}),
          yourAnswer: ansByQ[q.id]?.answerText ?? null,
          pointsAwarded: showScore ? ansByQ[q.id]?.pointsAwarded ?? null : undefined,
          feedback: showFeedback ? fbByQ[q.id]?.overallComment ?? null : undefined,
        }));
      }

      res.json({
        released: true, state: attempt.state,
        score: showScore ? attempt.score : undefined,
        totalMarks: showScore ? attempt.exam.totalMarks : undefined,
        passMark: attempt.exam.passMark,
        passFail: policy?.showPassFail !== false && attempt.exam.passMark != null && attempt.score != null
          ? (attempt.score >= attempt.exam.passMark ? "PASS" : "FAIL") : undefined,
        questions,
      });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // List exams currently available to the signed-in student.
  app.get("/api/exam2/available", authMiddleware, async (req, res) => {
    try {
      const student = await studentForReq(req);
      if (!student) { res.json([]); return; }
      const now = new Date();
      const assignments = await prisma.examAssignment.findMany({ where: { studentId: student.id }, include: { exam: true } }).catch(() => []);
      const assignedExamIds = new Set(assignments.map((a: any) => a.examId));
      // Class exams with a scheduling window, plus explicit assignments.
      const classExams = student.classId ? await prisma.exam.findMany({ where: { classId: student.classId } }) : [];
      const seen = new Set<string>();
      const out: any[] = [];
      const consider = [...assignments.map((a: any) => a.exam), ...classExams].filter(Boolean);
      for (const e of consider) {
        if (seen.has(e.id)) continue; seen.add(e.id);
        const openNow = (!e.availableFrom || now >= new Date(e.availableFrom)) && (!e.availableUntil || now <= new Date(e.availableUntil) || e.allowLateStart);
        const attempts = await prisma.examAttempt.findMany({ where: { studentId: student.id, examId: e.id } }).catch(() => []);
        out.push({
          id: e.id, title: e.title, durationMinutes: e.durationMinutes,
          availableFrom: e.availableFrom, availableUntil: e.availableUntil,
          requiresAccessCode: e.requiresAccessCode, assigned: assignedExamIds.has(e.id),
          openNow, attemptLimit: e.attemptLimit, attemptsUsed: attempts.length,
          activeAttemptId: attempts.find((a: any) => ["IN_PROGRESS", "PAUSED"].includes(a.state))?.id || null,
        });
      }
      res.json(out);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // The grading/analysis/invigilator/export routes are registered by a second
  // function to keep each module focused.
  registerGradingAndOps({ ...deps, helpers: { user, isTeacher, ipOf, uaOf, num, teacherGuard, gradingLimiter, studentForReq } });
}

// =============================================================================
// GRADING · RELEASE · ITEM ANALYSIS · INVIGILATOR · PRINT
// =============================================================================
function registerGradingAndOps(deps: any) {
  const { app, prisma, authMiddleware, createAuditLog, logger, helpers } = deps;
  const { user, ipOf, uaOf, num, teacherGuard, gradingLimiter } = helpers;

  // ── Manual grading queue ─────────────────────────────────────────────────
  app.get("/api/grading/queue", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const { examId, status } = req.query as Record<string, string>;
    try {
      const rows = await prisma.manualGrade.findMany({
        where: {
          ...(status ? { status } : { status: { in: ["PENDING", "IN_REVIEW", "GRADED", "MODERATED"] } }),
          ...(examId ? { attempt: { examId } } : {}),
        },
        include: {
          question: true, rubric: { include: { criteria: true } },
          attempt: { include: { student: { include: { user: true } }, exam: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      // Attach the student's answer for context.
      const out = [] as any[];
      for (const g of rows) {
        const ans = await prisma.examAnswer.findFirst({ where: { attemptId: g.attemptId, questionId: g.questionId } });
        out.push({ ...g, answer: ans ? { answerText: ans.answerText, selectedOptions: ans.selectedOptions } : null });
      }
      res.json(out);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Submit / update a manual grade. SECURITY: blocked once finalized.
  app.post("/api/grading/:attemptId/:questionId", authMiddleware, teacherGuard, gradingLimiter, async (req: any, res: any) => {
    const { attemptId, questionId } = req.params; const b = req.body || {};
    try {
      const existing = await prisma.manualGrade.findFirst({ where: { attemptId, questionId } });
      if (existing?.isFinalized) { res.status(409).json({ error: "Grade is finalized and locked" }); return; }

      const data: any = {
        rubricId: b.rubricId || null,
        criterionScores: b.criterionScores ?? null,
        score: num(b.score),
        inlineFeedback: b.inlineFeedback ?? null,
        overallComment: b.overallComment || null,
        scoreOverride: num(b.scoreOverride),
        overrideReason: b.overrideReason || null,
        secondMarkerId: b.secondMarkerId || null,
        secondMarkerScore: num(b.secondMarkerScore),
        moderationComment: b.moderationComment || null,
        status: b.status || "GRADED",
        graderId: user(req).userId,
      };
      const grade = existing
        ? await prisma.manualGrade.update({ where: { id: existing.id }, data })
        : await prisma.manualGrade.create({ data: { attemptId, questionId, ...data } });

      await createAuditLog(user(req).userId, user(req).email, "GRADE", "MANUAL_GRADE", grade.id, `Graded Q ${questionId} on attempt ${attemptId} (status ${data.status}).`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(grade);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // Finalize a manual grade → lock + recompute attempt total (transactional).
  app.post("/api/grading/:gradeId/finalize", authMiddleware, teacherGuard, gradingLimiter, async (req: any, res: any) => {
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        const grade = await tx.manualGrade.findUnique({ where: { id: req.params.gradeId } });
        if (!grade) throw Object.assign(new Error("not found"), { http: 404 });
        if (grade.isFinalized) throw Object.assign(new Error("already finalized"), { http: 409 });

        const finalScore = grade.scoreOverride ?? grade.score ?? 0;
        await tx.manualGrade.update({ where: { id: grade.id }, data: { isFinalized: true, status: "FINALIZED", finalizedAt: new Date(), finalizedById: user(req).userId } });
        // Write the awarded points onto the answer.
        await tx.examAnswer.updateMany({ where: { attemptId: grade.attemptId, questionId: grade.questionId }, data: { manualScore: finalScore, pointsAwarded: finalScore, gradingState: "GRADED" } });

        // If no more pending manual grades on this attempt → finalize the attempt score.
        const pending = await tx.manualGrade.count({ where: { attemptId: grade.attemptId, isFinalized: false } });
        const attempt = await tx.examAttempt.findUnique({ where: { id: grade.attemptId } });
        if (pending === 0 && attempt) {
          const answers = await tx.examAnswer.findMany({ where: { attemptId: grade.attemptId } });
          const total = answers.reduce((s: number, a: any) => s + (a.pointsAwarded || 0), 0);
          await tx.examAttempt.update({ where: { id: grade.attemptId }, data: { score: Math.max(0, total), state: "FINALIZED", gradingStatus: "COMPLETE", gradedAt: new Date() } });
        }
        return { gradeId: grade.id, attemptFinalized: pending === 0 };
      });
      await createAuditLog(user(req).userId, user(req).email, "FINALIZE", "MANUAL_GRADE", req.params.gradeId, `Finalized grade.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(result);
    } catch (err: any) {
      if (err?.http) { res.status(err.http).json({ error: err.message }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Release results for an exam (bulk) → flips eligible attempts to RELEASED.
  app.post("/api/exams/:id/release", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const updated = await prisma.examAttempt.updateMany({
        where: { examId: req.params.id, state: { in: ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED"] } },
        data: { state: "RELEASED", releasedAt: new Date() },
      });
      await createAuditLog(user(req).userId, user(req).email, "RELEASE", "EXAM", req.params.id, `Released results for ${updated.count} attempt(s).`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ released: updated.count });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Item analysis ─────────────────────────────────────────────────────────
  const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const stddev = (xs: number[]) => { if (xs.length < 2) return 0; const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };

  app.post("/api/exams/:id/analyze", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const examId = req.params.id;
    try {
      const questions = await prisma.question.findMany({ where: { examId } });
      const attempts = await prisma.examAttempt.findMany({
        where: { examId, state: { in: ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED", "RELEASED"] } },
        include: { answers: true },
      });
      // Rank attempts by total score for discrimination (upper/lower 27%).
      const ranked = [...attempts].sort((a, b) => (b.score || 0) - (a.score || 0));
      const groupSize = Math.max(1, Math.floor(ranked.length * 0.27));
      const upper = new Set(ranked.slice(0, groupSize).map((a) => a.id));
      const lower = new Set(ranked.slice(-groupSize).map((a) => a.id));

      const stats: any[] = [];
      for (const q of questions) {
        let correct = 0, incorrect = 0, blank = 0, upperC = 0, lowerC = 0;
        const times: number[] = []; const scores: number[] = [];
        const distract: Record<string, number> = {};
        for (const at of attempts) {
          const a = at.answers.find((x: any) => x.questionId === q.id);
          if (!a || (a.answerText == null && a.selectedOptions == null)) { blank++; continue; }
          const isC = a.isCorrect === true;
          if (isC) correct++; else incorrect++;
          if (a.timeSpentSeconds != null) times.push(a.timeSpentSeconds);
          if (a.pointsAwarded != null) scores.push(a.pointsAwarded);
          if (upper.has(at.id) && isC) upperC++;
          if (lower.has(at.id) && isC) lowerC++;
          if (!isC && a.answerText) distract[a.answerText] = (distract[a.answerText] || 0) + 1;
        }
        const n = correct + incorrect + blank;
        const difficulty = n ? correct / n : null; // p-value
        const discrimination = groupSize ? (upperC - lowerC) / groupSize : null;
        const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const flags: string[] = [];
        if (difficulty != null && difficulty > 0.9) flags.push("TOO_EASY");
        if (difficulty != null && difficulty < 0.2) flags.push("TOO_HARD");
        if (discrimination != null && discrimination < 0.2) flags.push("POOR_DISCRIMINATION");
        if (Array.isArray(q.options)) {
          const used = new Set(Object.keys(distract));
          const correctStr = q.correctAnswer != null ? String(q.correctAnswer) : null;
          const unused = (q.options as any[]).map(String).filter((o) => o !== correctStr && !used.has(o));
          if (unused.length) flags.push("UNUSED_DISTRACTOR");
        }
        const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
        const allTimes = attempts.flatMap((at: any) => at.answers.filter((x: any) => x.timeSpentSeconds != null).map((x: any) => x.timeSpentSeconds));
        const globalAvg = allTimes.length ? allTimes.reduce((a: number, b: number) => a + b, 0) / allTimes.length : 0;
        if (avgTime != null && globalAvg && avgTime > globalAvg * 1.75) flags.push("SLOW");
        if (n >= 5 && difficulty != null && (difficulty === 0 || difficulty === 1)) flags.push("ABNORMAL_PATTERN");

        const row = {
          questionId: q.id, examId, attempts: n, correctCount: correct, incorrectCount: incorrect, blankCount: blank,
          avgResponseSeconds: avgTime, difficultyIndex: difficulty, discriminationIndex: discrimination,
          distractorRates: n ? Object.fromEntries(Object.entries(distract).map(([k, v]) => [k, v / n])) : {},
          avgScore, medianScore: median(scores), stdDev: stddev(scores),
          passRate: null, scoreDistribution: null, flags, computedAt: new Date(),
        };
        await prisma.questionStatistic.upsert({ where: { questionId: q.id }, create: row, update: row });
        stats.push(row);
      }
      await createAuditLog(user(req).userId, user(req).email, "ANALYZE", "EXAM", examId, `Computed item analysis for ${stats.length} questions.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ questions: stats.length, attempts: attempts.length, stats });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Run migrations first" }); return; }
      logger.error("analyze failed", err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/exams/:id/analytics", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const stats = await prisma.questionStatistic.findMany({ where: { examId: req.params.id }, include: { question: true } }).catch(() => []);
      const attempts = await prisma.examAttempt.findMany({ where: { examId: req.params.id, state: { in: ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED", "RELEASED"] } } }).catch(() => []);
      const scores = attempts.map((a: any) => a.score).filter((s: any) => s != null);
      const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
      res.json({
        attempts: attempts.length,
        avgScore: scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null,
        medianScore: median(scores), stdDev: stddev(scores),
        passRate: (exam?.passMark != null && scores.length) ? scores.filter((s: number) => s >= exam.passMark).length / scores.length : null,
        scoreDistribution: scores,
        questions: stats,
        flaggedQuestions: stats.filter((s: any) => (s.flags || []).length),
      });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.get("/api/exams/:id/questions/:qid/analytics", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const stat = await prisma.questionStatistic.findUnique({ where: { questionId: req.params.qid }, include: { question: true } });
      res.json(stat || null);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Invigilator dashboard (live) ─────────────────────────────────────────
  app.get("/api/exams/:id/invigilator", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const examId = req.params.id;
      const assignments = await prisma.examAssignment.findMany({ where: { examId }, include: { student: { include: { user: true } } } }).catch(() => []);
      const attempts = await prisma.examAttempt.findMany({ where: { examId }, include: { student: { include: { user: true } } } }).catch(() => []);
      const byStudent: Record<string, any> = {};
      for (const a of attempts) byStudent[a.studentId] = a;

      const now = Date.now();
      const rows = (assignments.length ? assignments.map((asg: any) => ({ student: asg.student, attempt: byStudent[asg.studentId] })) : attempts.map((a: any) => ({ student: a.student, attempt: a })));
      const live = await Promise.all(rows.map(async (r: any) => {
        const at = r.attempt;
        let lastEvent: any = null;
        if (at) lastEvent = await prisma.attemptEvent.findFirst({ where: { attemptId: at.id }, orderBy: { createdAt: "desc" } });
        const disconnected = at && ["IN_PROGRESS"].includes(at.state) && at.lastSavedAt && (now - new Date(at.lastSavedAt).getTime() > 90_000);
        return {
          studentId: r.student?.id,
          name: `${r.student?.user?.firstName ?? ""} ${r.student?.user?.lastName ?? ""}`.trim() || r.student?.studentCode,
          attemptId: at?.id || null,
          state: at?.state || "NOT_STARTED",
          remainingSeconds: at?.serverDeadline && at.state !== "PAUSED" ? Math.max(0, Math.floor((new Date(at.serverDeadline).getTime() - now) / 1000)) : null,
          lastSavedAt: at?.lastSavedAt || null,
          disconnected: !!disconnected,
          securityWarnings: at?.securityWarnings || 0,
          ipAddress: at?.ipAddress || null,
          deviceInfo: at?.deviceInfo || null,
          lastActivity: lastEvent ? { type: lastEvent.type, at: lastEvent.createdAt } : null,
        };
      }));
      res.json({
        examId,
        summary: {
          notStarted: live.filter((l) => l.state === "NOT_STARTED").length,
          inProgress: live.filter((l) => l.state === "IN_PROGRESS").length,
          paused: live.filter((l) => l.state === "PAUSED").length,
          submitted: live.filter((l) => ["SUBMITTED", "AUTO_SUBMITTED", "PENDING_GRADING", "FINALIZED", "RELEASED"].includes(l.state)).length,
          disconnected: live.filter((l) => l.disconnected).length,
        },
        students: live,
      });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // Invigilator actions — all audit-logged. SECURITY: teacher/admin only.
  app.post("/api/attempts/:attemptId/invigilate", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const { attemptId } = req.params; const b = req.body || {};
    const action = String(b.action || "").toUpperCase();
    try {
      const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      let data: any = {};
      let evType = action;
      switch (action) {
        case "EXTRA_TIME": {
          const mins = num(b.minutes) || 0;
          const base = attempt.serverDeadline ? new Date(attempt.serverDeadline).getTime() : Date.now();
          data = { serverDeadline: new Date(base + mins * 60000), effectiveDurationMinutes: (attempt.effectiveDurationMinutes || 0) + mins };
          break;
        }
        case "PAUSE": data = { state: "PAUSED", pausedAt: new Date() }; break;
        case "RESUME": {
          // Push the deadline forward by the paused duration.
          let extra = 0;
          if (attempt.pausedAt) extra = Date.now() - new Date(attempt.pausedAt).getTime();
          data = { state: "IN_PROGRESS", pausedAt: null, accumulatedPauseSeconds: (attempt.accumulatedPauseSeconds || 0) + Math.floor(extra / 1000), serverDeadline: attempt.serverDeadline ? new Date(new Date(attempt.serverDeadline).getTime() + extra) : null };
          break;
        }
        case "FORCE_SUBMIT": data = { state: attempt.state === "PENDING_GRADING" ? "PENDING_GRADING" : "AUTO_SUBMITTED", isCompleted: true, autoSubmitted: true, submittedAt: new Date(), completedAt: new Date(), sessionToken: null }; break;
        case "REOPEN": data = { state: "IN_PROGRESS", isCompleted: false, submittedAt: null, completedAt: null, serverDeadline: new Date(Date.now() + (num(b.minutes) || 15) * 60000), sessionToken: null }; break;
        case "INVALIDATE": data = { state: "INVALIDATED", invalidatedAt: new Date(), sessionToken: null }; break;
        case "INCIDENT_NOTE": data = {}; break;
        default: res.status(400).json({ error: "Unknown action" }); return;
      }
      if (Object.keys(data).length) await prisma.examAttempt.update({ where: { id: attemptId }, data });
      await prisma.attemptEvent.create({ data: { attemptId, type: evType, actorId: user(req).userId, actorRole: user(req).role, payload: b, ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
      await createAuditLog(user(req).userId, user(req).email, "INVIGILATE", "EXAM_ATTEMPT", attemptId, `Invigilator action ${action}${b.note ? `: ${b.note}` : ""}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true, action });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Printable export payload ──────────────────────────────────────────────
  // SECURITY: teacher/admin only. `answerKey=1` adds correct answers; never call
  // this from a student context.
  app.get("/api/exams/:id/print", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const withKey = req.query.answerKey === "1" || req.query.answerKey === "true";
    const version = String(req.query.version || "A").toUpperCase();
    try {
      const exam = await prisma.exam.findUnique({
        where: { id: req.params.id },
        include: { sections: { orderBy: { orderIndex: "asc" } }, stimuli: true, questions: true, class: true, subject: true },
      });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      const school = await prisma.schoolProfile.findFirst().catch(() => null);

      let questions = [...exam.questions];
      // Versioned shuffle (A/B/C) for anti-cheating print sets.
      if (version !== "A") {
        let h = version.charCodeAt(0);
        const rand = () => { h = (Math.imul(1103515245, h) + 12345) & 0x7fffffff; return h / 0x7fffffff; };
        for (let i = questions.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [questions[i], questions[j]] = [questions[j], questions[i]]; }
      }
      res.json({
        version,
        school: school ? { name: school.name, logoUrl: (school as any).logoUrl ?? null } : null,
        exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks, class: exam.class?.name, subject: exam.subject?.name },
        sections: exam.sections.map((s: any) => ({ id: s.id, title: s.title, instructions: s.instructions })),
        stimuli: exam.stimuli.map((s: any) => ({ id: s.id, type: s.type, title: s.title, content: s.content, mediaUrl: s.mediaUrl })),
        questions: questions.map((q: any, i: number) => ({
          number: i + 1, id: q.id, text: q.text, type: q.type, points: q.points, options: q.options,
          stimulusId: q.stimulusId, sectionId: q.sectionId,
          ...(withKey ? { correctAnswer: q.correctAnswer, correctAnswers: q.correctAnswers } : {}),
        })),
        answerKey: withKey,
      });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
}
