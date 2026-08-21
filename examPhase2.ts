import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { composeQuestionSet, freezeAttempt, dragDropBank, seededShuffle } from "./examBank";
import { analyticsQuestionConfig, analyticsSelectedValues, analyzeDistractorResponses, hasAnalyticsResponse } from "./shared/examAnalytics";
import { scoreExamObjective } from "./shared/examScoring";
import {
  effectiveExamDurationMinutes,
  examAccommodationValidationError,
  examAttemptIsExpired,
} from "./shared/examRules";

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
  canManageExamClass: (jwtUser: JwtPayload, classId: string) => Promise<boolean>;
}

const TEACHER_ROLES = ["ADMIN", "TEACHER"];

// Idempotent escape: decode any previously-escaped entities first so repeated
// edits don't double-escape (&amp;amp; …), then escape once.
function sanitizeHTML(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function registerExamPhase2Routes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger, canManageExamClass } = deps;

  const user = (req: express.Request) => (req as any).user as JwtPayload;
  const isTeacher = (req: express.Request) => TEACHER_ROLES.includes(user(req).role);
  const ipOf = (req: express.Request) => (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
  const uaOf = (req: express.Request) => (req.headers["user-agent"] as string) || null;
  const num = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const MAX_ANSWERS_PER_PAYLOAD = 250;
  const MAX_ANSWER_TEXT_LENGTH = 50000;
  const MAX_SELECTION_LENGTH = 500;
  const MAX_SELECTION_COUNT = 100;
  const MAX_QUESTION_ID_LENGTH = 64;
  const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  const examLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, slow down." },
  });
  const gradingLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

  const teacherGuard: express.RequestHandler = (req, res, next) => {
    if (!isTeacher(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    next();
  };

  // Per-class scoping: a TEACHER may only touch exams of classes they teach
  // (ADMIN passes). `examGuard(param)` reads the exam id from that route param.
  const canManageExam = async (req: express.Request, examId: string): Promise<{ ok: boolean; found: boolean }> => {
    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { classId: true } });
    if (!exam) return { ok: false, found: false };
    return { ok: await canManageExamClass(user(req), exam.classId), found: true };
  };
  const examGuard = (param = "id"): express.RequestHandler => async (req, res, next) => {
    try {
      const { ok, found } = await canManageExam(req, req.params[param]);
      if (!found) { res.status(404).json({ error: "Exam not found" }); return; }
      if (!ok) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      next();
    } catch (err) {
      logger.error("exam guard failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  // Same check, keyed by an attempt id route param.
  const attemptExamGuard = (param = "attemptId"): express.RequestHandler => async (req, res, next) => {
    try {
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params[param] }, select: { examId: true } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      const { ok } = await canManageExam(req, attempt.examId);
      if (!ok) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      next();
    } catch (err) {
      logger.error("attempt guard failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  async function studentForReq(req: express.Request) {
    return prisma.student.findUnique({ where: { userId: user(req).userId } });
  }

  function sanitizeQuestion(q: any) {
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      points: q.points,
      options: q.type === "DRAG_DROP" ? null : q.options ?? null,
      dragText: q.type === "DRAG_DROP" ? String(q.options?.text ?? "") : undefined,
      dragBank: q.type === "DRAG_DROP" ? seededShuffle(dragDropBank(q.options), `dq:${q.id}`) : undefined,
      orderIndex: q.orderIndex,
      sectionId: q.sectionId ?? null,
      groupId: q.groupId ?? null,
      stimulusId: q.stimulusId ?? null,
      partialCredit: q.partialCredit ?? false,
      multipleSelection: Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1,
      passageText: q.passageText ?? null,
      imageUrl: q.imageUrl ?? null,
    };
  }

  function remainingSeconds(attempt: any): number {
    if (!attempt.serverDeadline) return 0;
    if (attempt.state === "PAUSED") {
      const base = new Date(attempt.serverDeadline).getTime() - new Date(attempt.pausedAt || attempt.updatedAt).getTime();
      return Math.max(0, Math.floor(base / 1000));
    }
    return Math.max(0, Math.floor((new Date(attempt.serverDeadline).getTime() - Date.now()) / 1000));
  }
  const isExpired = (attempt: any) => examAttemptIsExpired(attempt);

  function hasCurrentSession(attempt: any, sessionToken: unknown): boolean {
    return typeof sessionToken === "string" && !!attempt.sessionToken && sessionToken === attempt.sessionToken;
  }

  const parseAnswerPayload = (answersInput: unknown) => {
    if (answersInput !== undefined && !Array.isArray(answersInput)) {
      return { ok: false, error: "Answers must be an array", answers: [] as any[] };
    }
    const answers = Array.isArray(answersInput) ? answersInput : [];
    if (answers.length > MAX_ANSWERS_PER_PAYLOAD) return { ok: false, error: "Answer payload is too large", answers: [] as any[] };
    const seenQuestionIds = new Set<string>();
    const parsed: any[] = [];

    const invalidAnswers = answers.some((answer: any) => {
      if (!answer || typeof answer !== "object") return true;
      if (typeof answer.questionId !== "string") return true;
      const questionId = answer.questionId.trim();
      if (!questionId || questionId.length > MAX_QUESTION_ID_LENGTH || seenQuestionIds.has(questionId)) return true;
      seenQuestionIds.add(questionId);

      if (answer.answerText !== null && answer.answerText !== undefined && typeof answer.answerText !== "string") return true;
      if (typeof answer.answerText === "string" && answer.answerText.length > MAX_ANSWER_TEXT_LENGTH) return true;
      if (answer.timeSpentSeconds !== undefined && answer.timeSpentSeconds !== null) {
        const value = num(answer.timeSpentSeconds);
        if (value === null || !Number.isInteger(value) || value < 0 || value > 7 * 24 * 3600) return true;
      }
      if (answer.flaggedForReview !== undefined && answer.flaggedForReview !== null && typeof answer.flaggedForReview !== "boolean") return true;

      const selected = answer.selectedOptions;
      if (selected == null) {
        parsed.push({ questionId, answerText: answer.answerText ?? null, selectedOptions: null, flaggedForReview: !!answer.flaggedForReview, timeSpentSeconds: answer.timeSpentSeconds !== undefined ? num(answer.timeSpentSeconds) : undefined });
        return false;
      }
      if (Array.isArray(selected)) {
        const selectedValues = selected.filter((v) => typeof v === "string");
        if (selectedValues.length !== selected.length || selectedValues.length > MAX_SELECTION_COUNT
          || selectedValues.some((v: string) => v.length > MAX_SELECTION_LENGTH)
          || new Set(selectedValues).size !== selectedValues.length) {
          return true;
        }
        parsed.push({ questionId, answerText: answer.answerText ?? null, selectedOptions: selectedValues, flaggedForReview: !!answer.flaggedForReview, timeSpentSeconds: answer.timeSpentSeconds !== undefined ? num(answer.timeSpentSeconds) : undefined });
        return false;
      }
      if (typeof selected !== "object" || selected === null || Array.isArray(selected) || Object.getPrototypeOf(selected) !== Object.prototype) return true;
      const entries = Object.entries(selected as Record<string, unknown>);
      if (entries.length > MAX_SELECTION_COUNT) return true;
      for (const [k, v] of entries) {
        if (typeof k !== "string" || !k || k.length > 200 || PROTOTYPE_KEYS.has(k)) return true;
        if (typeof v !== "string" || v.length > MAX_SELECTION_LENGTH) return true;
      }
      parsed.push({ questionId, answerText: answer.answerText ?? null, selectedOptions: selected, flaggedForReview: !!answer.flaggedForReview, timeSpentSeconds: answer.timeSpentSeconds !== undefined ? num(answer.timeSpentSeconds) : undefined });
      return false;
    });

    if (invalidAnswers) return { ok: false, error: "Invalid answer payload", answers: [] as any[] };
    return { ok: true, answers: parsed };
  };

  const persistAnswerPayload = async (
    tx: any,
    attempt: any,
    answers: any[],
    reason = "AUTOSAVE",
    includeEvent = true,
    eventIp: string | null = null,
    eventUa: string | null = null,
  ) => {
    const now = new Date();
    if (!answers.length) {
      await tx.examAttempt.update({ where: { id: attempt.id }, data: { lastSavedAt: now } });
      const snap = await tx.examAnswer.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, answerText: true, selectedOptions: true, flaggedForReview: true } });
      await tx.attemptSnapshot.create({ data: { attemptId: attempt.id, reason, answers: snap, questionOrder: attempt.questionOrder ?? undefined, remainingSeconds: remainingSeconds(attempt) } });
      if (includeEvent) await tx.attemptEvent.create({ data: { attemptId: attempt.id, type: reason, actorRole: "STUDENT", ipAddress: eventIp, userAgent: eventUa } }).catch(() => {});
      return { now };
    }
    for (const a of answers) {
      if (!a.questionId) continue;
      await tx.examAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: a.questionId } },
        create: {
          attemptId: attempt.id, questionId: a.questionId,
          answerText: a.answerText ?? null, selectedOptions: a.selectedOptions ?? null,
          flaggedForReview: !!a.flaggedForReview, timeSpentSeconds: a.timeSpentSeconds ?? null,
        },
        update: {
          answerText: a.answerText ?? null, selectedOptions: a.selectedOptions ?? null,
          flaggedForReview: !!a.flaggedForReview,
          timeSpentSeconds: a.timeSpentSeconds !== undefined ? a.timeSpentSeconds : undefined,
        },
      });
    }
    await tx.examAttempt.update({ where: { id: attempt.id }, data: { lastSavedAt: now } });
    const snap = await tx.examAnswer.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, answerText: true, selectedOptions: true, flaggedForReview: true } });
    await tx.attemptSnapshot.create({ data: { attemptId: attempt.id, reason, answers: snap, questionOrder: attempt.questionOrder ?? undefined, remainingSeconds: remainingSeconds(attempt) } });
    if (includeEvent) await tx.attemptEvent.create({ data: { attemptId: attempt.id, type: reason, actorRole: "STUDENT", ipAddress: eventIp, userAgent: eventUa } });
    return { now };
  };

  async function accommodationFor(studentId: string, examId: string) {
    const rows = await prisma.examAccommodation.findMany({ where: { studentId, OR: [{ examId }, { examId: null }] } });
    return rows.find((r: any) => r.examId === examId) || rows.find((r: any) => r.examId === null) || null;
  }

  // seededShuffle is imported from ./examBank so all shuffles share one PRNG.
  // (A local copy previously shadowed the import with a different algorithm,
  // producing inconsistent orders for the same seed.)

  app.put("/api/exams/:id/schedule", authMiddleware, teacherGuard, examGuard(), async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(b, key);
    try {
      const existing = await prisma.exam.findUnique({ where: { id }, select: { accessCodeHash: true, totalMarks: true } });
      if (!existing) { res.status(404).json({ error: "Exam not found" }); return; }
      const availableFrom = b.availableFrom ? new Date(b.availableFrom) : null;
      const availableUntil = b.availableUntil ? new Date(b.availableUntil) : null;
      const resultReleaseAt = b.resultReleaseAt ? new Date(b.resultReleaseAt) : null;
      if ([availableFrom, availableUntil, resultReleaseAt].some((d) => d && Number.isNaN(d.getTime()))) {
        res.status(400).json({ error: "One or more schedule dates are invalid" }); return;
      }
      if (availableFrom && availableUntil && availableUntil <= availableFrom) {
        res.status(400).json({ error: "Available until must be after available from" }); return;
      }
      const attemptLimit = num(b.attemptLimit) ?? 1;
      const gracePeriodMinutes = num(b.gracePeriodMinutes) ?? 0;
      const durationMinutes = num(b.durationMinutes);
      const passMark = num(b.passMark);
      if (!Number.isInteger(attemptLimit) || attemptLimit < 1) { res.status(400).json({ error: "Attempt limit must be a positive integer" }); return; }
      if (!Number.isInteger(gracePeriodMinutes) || gracePeriodMinutes < 0) { res.status(400).json({ error: "Grace period must be a non-negative integer" }); return; }
      if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) { res.status(400).json({ error: "Duration must be a positive integer" }); return; }
      if (passMark !== null && passMark < 0) { res.status(400).json({ error: "Pass mark cannot be negative" }); return; }
      if (passMark !== null && existing.totalMarks != null && passMark > Number(existing.totalMarks)) {
        res.status(400).json({ error: `Pass mark cannot exceed the exam total of ${existing.totalMarks}` }); return;
      }
      if (b.status !== undefined && !["DRAFT", "SCHEDULED", "ACTIVE", "CLOSED", "PUBLISHED"].includes(b.status)) {
        res.status(400).json({ error: "Invalid exam status" }); return;
      }
      if (b.requiresAccessCode && !String(b.accessCode || "").trim() && !existing.accessCodeHash) {
        res.status(400).json({ error: "Set an access code before requiring one" }); return;
      }
      const data: any = {
        ...(has("availableFrom") ? { availableFrom } : {}),
        ...(has("availableUntil") ? { availableUntil } : {}),
        ...(has("resultReleaseAt") ? { resultReleaseAt } : {}),
        ...(has("attemptLimit") ? { attemptLimit } : {}),
        ...(has("gracePeriodMinutes") ? { gracePeriodMinutes } : {}),
        ...(has("allowLateStart") ? { allowLateStart: b.allowLateStart !== false } : {}),
        ...(has("requiresAccessCode") ? { requiresAccessCode: !!b.requiresAccessCode } : {}),
        ...(has("requiresInvigilator") ? { requiresInvigilator: !!b.requiresInvigilator } : {}),
        ...(has("shuffleQuestions") ? { shuffleQuestions: !!b.shuffleQuestions } : {}),
        ...(has("shuffleOptions") ? { shuffleOptions: !!b.shuffleOptions } : {}),
        ...(has("negativeMarking") ? { negativeMarking: !!b.negativeMarking } : {}),
        ...(has("passMark") ? { passMark } : {}),
        ...(has("durationMinutes") && durationMinutes !== null ? { durationMinutes } : {}),
        ...(has("status") ? { status: b.status } : {}),
      };
      if (String(b.accessCode || "").trim()) data.accessCodeHash = await bcrypt.hash(String(b.accessCode).trim(), 10);
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

  app.get("/api/exams/:id/schedule", authMiddleware, teacherGuard, examGuard(), async (req, res) => {
    try {
      const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      const { accessCodeHash, ...safe } = exam;
      res.json({ ...safe, hasAccessCode: !!accessCodeHash });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.get("/api/exams/:id/result-policy", authMiddleware, teacherGuard, examGuard(), async (req, res) => {
    try {
      const policy = await prisma.examResultPolicy.findUnique({ where: { examId: req.params.id } });
      res.json(policy || null);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json(null); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/exams/:id/result-policy", authMiddleware, teacherGuard, examGuard(), async (req, res) => {
    const { id } = req.params; const b = req.body || {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(b, key);
    if (b.releaseMode !== undefined && !["IMMEDIATE", "SCHEDULED", "AFTER_GRADING", "HIDDEN"].includes(b.releaseMode)) {
      res.status(400).json({ error: "Invalid result release mode" }); return;
    }
    const releaseMode = b.releaseMode || "IMMEDIATE";
    const releaseAt = b.releaseAt ? new Date(b.releaseAt) : null;
    if (releaseAt && Number.isNaN(releaseAt.getTime())) { res.status(400).json({ error: "Invalid result release date" }); return; }
    if (releaseMode === "SCHEDULED" && !releaseAt) { res.status(400).json({ error: "A release date is required for scheduled results" }); return; }
    const data = {
      showScore: b.showScore !== false,
      showPassFail: b.showPassFail !== false,
      showCorrectAnswers: !!b.showCorrectAnswers,
      showExplanations: !!b.showExplanations,
      showTeacherFeedback: b.showTeacherFeedback !== false,
      releaseMode,
      releaseAt,
    };
    const updateData = {
      ...(has("showScore") ? { showScore: b.showScore !== false } : {}),
      ...(has("showPassFail") ? { showPassFail: b.showPassFail !== false } : {}),
      ...(has("showCorrectAnswers") ? { showCorrectAnswers: !!b.showCorrectAnswers } : {}),
      ...(has("showExplanations") ? { showExplanations: !!b.showExplanations } : {}),
      ...(has("showTeacherFeedback") ? { showTeacherFeedback: b.showTeacherFeedback !== false } : {}),
      ...(has("releaseMode") ? { releaseMode } : {}),
      ...(has("releaseAt") ? { releaseAt } : {}),
    };
    try {
      const policy = await prisma.examResultPolicy.upsert({
        where: { examId: id }, create: { examId: id, ...data }, update: updateData,
      });
      await createAuditLog(user(req).userId, user(req).email, "UPDATE", "EXAM_RESULT_POLICY", id, `Result policy set to ${data.releaseMode}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(policy);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.get("/api/accommodations", authMiddleware, teacherGuard, async (req, res) => {
    const { studentId, examId } = req.query as Record<string, string>;
    try {
      if (examId) {
        const scope = await canManageExam(req, examId);
        if (!scope.found) { res.status(404).json({ error: "Exam not found" }); return; }
        if (!scope.ok) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      }
      let studentScope: any = {};
      if (user(req).role === "TEACHER" && !examId) {
        const teacher = await prisma.teacher.findUnique({ where: { userId: user(req).userId }, include: { classes: true } });
        studentScope = { student: { classId: { in: (teacher?.classes || []).map((c: any) => c.classId) } } };
      }
      const rows = await prisma.examAccommodation.findMany({
        where: { ...(studentId ? { studentId } : {}), ...(examId ? { examId } : {}), ...studentScope },
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

  async function canManageAccommodationTarget(req: express.Request, studentId: string, examId?: string | null) {
    if (user(req).role === "ADMIN") return true;
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
    if (!student) return false;
    if (!examId) return !!student.classId && canManageExamClass(user(req), student.classId);
    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { classId: true } });
    if (!exam || !(await canManageExamClass(user(req), exam.classId))) return false;
    if (student.classId === exam.classId) return true;
    return !!(await prisma.examAssignment.findUnique({ where: { examId_studentId: { examId, studentId } }, select: { id: true } }));
  }

  app.post("/api/accommodations", authMiddleware, teacherGuard, async (req, res) => {
    const b = req.body || {};
    if (!b.studentId) { res.status(400).json({ error: "studentId is required" }); return; }
    try {
      if (!(await canManageAccommodationTarget(req, b.studentId, b.examId || null))) { res.status(403).json({ error: "Forbidden" }); return; }
      const fields = accommodationFields(b);
      const validationError = examAccommodationValidationError(fields);
      if (validationError) { res.status(400).json({ error: validationError }); return; }
      const row = await prisma.examAccommodation.create({ data: { studentId: b.studentId, examId: b.examId || null, ...fields } });
      await createAuditLog(user(req).userId, user(req).email, "CREATE", "EXAM_ACCOMMODATION", row.id, `Accommodation created for student ${b.studentId}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.status(201).json(row);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.put("/api/accommodations/:id", authMiddleware, teacherGuard, async (req, res) => {
    try {
      const existing = await prisma.examAccommodation.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await canManageAccommodationTarget(req, existing.studentId, existing.examId))) { res.status(403).json({ error: "Forbidden" }); return; }
      const fields = accommodationFields(req.body || {});
      const validationError = examAccommodationValidationError(fields);
      if (validationError) { res.status(400).json({ error: validationError }); return; }
      const row = await prisma.examAccommodation.update({ where: { id: req.params.id }, data: fields });
      await createAuditLog(user(req).userId, user(req).email, "UPDATE", "EXAM_ACCOMMODATION", row.id, `Accommodation updated.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(row);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/accommodations/:id", authMiddleware, teacherGuard, async (req, res) => {
    try {
      const existing = await prisma.examAccommodation.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await canManageAccommodationTarget(req, existing.studentId, existing.examId))) { res.status(403).json({ error: "Forbidden" }); return; }
      await prisma.examAccommodation.delete({ where: { id: req.params.id } });
      await createAuditLog(user(req).userId, user(req).email, "DELETE", "EXAM_ACCOMMODATION", req.params.id, `Accommodation removed.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/exams/:id/assignments", authMiddleware, teacherGuard, examGuard(), async (req, res) => {
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

  app.post("/api/exams/:id/assignments", authMiddleware, teacherGuard, examGuard(), async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    const studentIds: string[] = Array.isArray(b.studentIds) ? b.studentIds : (b.studentId ? [b.studentId] : []);
    if (!studentIds.length) { res.status(400).json({ error: "studentIds required" }); return; }
    try {
      const exam = await prisma.exam.findUnique({ where: { id }, select: { classId: true } });
      const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, classId: true } });
      if (!exam || students.length !== new Set(studentIds).size || students.some((s: any) => s.classId !== exam.classId)) {
        res.status(400).json({ error: "Every assigned student must belong to the exam's class" }); return;
      }
      if (b.accommodationId) {
        const accommodation = await prisma.examAccommodation.findUnique({ where: { id: b.accommodationId } });
        if (!accommodation || studentIds.length !== 1 || accommodation.studentId !== studentIds[0] || (accommodation.examId && accommodation.examId !== id)) {
          res.status(400).json({ error: "Accommodation must belong to the assigned student and this exam" }); return;
        }
      }
      const created = await prisma.$transaction(
        studentIds.map((studentId) => prisma.examAssignment.upsert({
          where: { examId_studentId: { examId: id, studentId } },
          create: { examId: id, studentId, invigilatorId: b.invigilatorId || null, accommodationId: b.accommodationId || null },
          update: {
            ...(Object.prototype.hasOwnProperty.call(b, "invigilatorId") ? { invigilatorId: b.invigilatorId || null } : {}),
            ...(Object.prototype.hasOwnProperty.call(b, "accommodationId") ? { accommodationId: b.accommodationId || null } : {}),
          },
        }))
      );
      await createAuditLog(user(req).userId, user(req).email, "ASSIGN", "EXAM", id, `Assigned ${created.length} student(s) to exam.`, ipOf(req), uaOf(req), "SUCCESS");
      res.status(201).json(created);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.delete("/api/exams/:examId/assignments/:assignmentId", authMiddleware, teacherGuard, examGuard("examId"), async (req, res) => {
    try {
      const assignment = await prisma.examAssignment.findUnique({
        where: { id: req.params.assignmentId },
        select: { examId: true },
      });
      if (!assignment || assignment.examId !== req.params.examId) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }
      await prisma.examAssignment.delete({ where: { id: req.params.assignmentId } });
      await createAuditLog(user(req).userId, user(req).email, "UNASSIGN", "EXAM", req.params.examId, `Removed assignment ${req.params.assignmentId}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });


  app.post("/api/exam2/:examId/start", authMiddleware, examLimiter, async (req, res) => {
    if (isTeacher(req)) { res.status(403).json({ error: "Only students take exams" }); return; }
    const { examId } = req.params;
    const b = req.body || {};
    try {
      const student = await studentForReq(req);
      if (!student) { res.status(403).json({ error: "No student profile" }); return; }
      const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { questions: true } });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      if (!["PUBLISHED", "ACTIVE", "SCHEDULED"].includes(exam.status)) {
        res.status(403).json({ error: exam.status === "CLOSED" ? "This exam is closed" : "This exam is not open" });
        return;
      }

      // If assignments exist for this exam, the student must be assigned.
      const assignment = await prisma.examAssignment.findUnique({ where: { examId_studentId: { examId, studentId: student.id } } }).catch(() => null);
      const anyAssignments = await prisma.examAssignment.count({ where: { examId } }).catch(() => 0);
      if (anyAssignments > 0 && !assignment) { res.status(403).json({ error: "You are not assigned to this exam" }); return; }
      // Without explicit assignments, the exam is scoped to its class roster.
      if (!assignment && exam.classId && student.classId !== exam.classId) {
        res.status(403).json({ error: "This exam is not available to you" });
        return;
      }

      const now = Date.now();
      const from = assignment?.availableFromOverride || exam.availableFrom;
      const until = assignment?.availableUntilOverride || exam.availableUntil;
      if (from && now < new Date(from).getTime()) { res.status(403).json({ error: "Exam not open yet" }); return; }
      if (until && now > new Date(until).getTime() && !exam.allowLateStart) { res.status(403).json({ error: "Exam window has closed" }); return; }

      // Access code check.
      if (exam.requiresAccessCode) {
        if (!exam.accessCodeHash) { res.status(409).json({ error: "This exam's access code is not configured" }); return; }
        const ok = b.accessCode && await bcrypt.compare(String(b.accessCode), exam.accessCodeHash);
        if (!ok) { res.status(403).json({ error: "Invalid access code" }); return; }
      }

      // Resume an in-progress/paused attempt if one exists.
      const existing = await prisma.examAttempt.findFirst({
        where: { studentId: student.id, examId, state: { in: ["IN_PROGRESS", "PAUSED"] } },
        orderBy: { attemptNumber: "desc" },
      });
      if (existing) {
        if (isExpired(existing)) {
          const finalized = await finalizeSubmission(existing.id, true, ipOf(req), uaOf(req));
          return res.status(409).json({ error: "TIME_EXPIRED", autoSubmitted: true, attempt: { id: finalized.id, state: finalized.state } });
        }
        // New device/session takeover: issue a fresh token, log it.
        const sessionToken = crypto.randomUUID();
        // Resuming from PAUSED: push the deadline forward by the paused duration
        // so pausing genuinely freezes the clock (mirrors the invigilator RESUME action).
        let pauseComp: any = {};
        if (existing.state === "PAUSED" && existing.pausedAt && existing.serverDeadline) {
          const extra = Math.max(0, now - new Date(existing.pausedAt).getTime());
          pauseComp = {
            pausedAt: null,
            accumulatedPauseSeconds: (existing.accumulatedPauseSeconds || 0) + Math.floor(extra / 1000),
            serverDeadline: new Date(new Date(existing.serverDeadline).getTime() + extra),
          };
        }
        const resumed = await prisma.$transaction(async (tx: any) => {
          const claimed = await tx.examAttempt.updateMany({
            where: { id: existing.id, state: existing.state, sessionToken: existing.sessionToken, updatedAt: existing.updatedAt },
            data: { sessionToken, state: "IN_PROGRESS", ipAddress: ipOf(req), userAgent: uaOf(req), deviceInfo: b.deviceInfo || undefined, ...pauseComp },
          });
          if (claimed.count !== 1) return null;
          await tx.attemptEvent.create({ data: { attemptId: existing.id, type: "RECONNECT", actorRole: "STUDENT", ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
          return tx.examAttempt.findUnique({ where: { id: existing.id } });
        });
        if (!resumed) {
          res.status(409).json({ error: "SESSION_CONFLICT", message: "The attempt changed while it was being resumed. Try again." });
          return;
        }
        return res.json(await attemptPayload(resumed, exam, student.id));
      }

      const limit = assignment?.attemptLimitOverride ?? exam.attemptLimit ?? 1;

      const sessionToken = crypto.randomUUID();
      const randomSeed = `${student.id}:${examId}:${Date.now()}:${Math.random().toString(36).substring(7)}`;

      // Two concurrent `start` calls can both read the same prior-attempt set,
      // compute the same next attemptNumber, and both insert — exceeding the
      // limit. The (studentId, examId, attemptNumber) unique constraint turns
      // the loser's insert into a P2002; retry so the loser recomputes against
      // fresh state. The limit check re-runs each attempt, so the cap holds.
      let attempt: any = null;
      let lastErr: any = null;
      for (let raceRetry = 0; raceRetry < 3 && !attempt; raceRetry++) {
        try {
          attempt = await prisma.$transaction(async (tx: any) => {
        const priorAttempts = await tx.examAttempt.findMany({ where: { studentId: student.id, examId }, select: { state: true, attemptNumber: true } });
        const used = priorAttempts.filter((a: any) => a.state !== "INVALIDATED").length;
        if (used >= limit) throw Object.assign(new Error("No attempts remaining"), { http: 409 });
        const attemptNumber = priorAttempts.reduce((max: number, a: any) => Math.max(max, a.attemptNumber || 0), 0) + 1;

        const accom = assignment?.accommodationId
          ? await tx.examAccommodation.findUnique({ where: { id: assignment.accommodationId } })
          : await accommodationFor(student.id, examId);
        const baseMin = exam.durationMinutes || 60;
        const effMin = effectiveExamDurationMinutes(baseMin, accom);
        const serverDeadline = new Date(now + effMin * 60000 + (exam.gracePeriodMinutes || 0) * 60000);

        const composed = await composeQuestionSet(tx, examId, randomSeed);
        if (!composed.length) throw Object.assign(new Error("This exam has no questions"), { http: 409 });
        const { questionOrder: order, optionOrder, frozenContent } = freezeAttempt(composed, exam, randomSeed);
        const selectedQuestionIds = order;

        const newAttempt = await tx.examAttempt.create({
          data: {
            studentId: student.id, examId, assignmentId: assignment?.id || null,
            accommodationId: accom?.id || null, attemptNumber,
            state: "IN_PROGRESS", startedAt: new Date(now), serverDeadline,
            effectiveDurationMinutes: effMin, sessionToken, questionOrder: order,
            selectedQuestionIds, optionOrder, randomSeed, frozenContent,
            lastSavedAt: new Date(now), ipAddress: ipOf(req), userAgent: uaOf(req),
            deviceInfo: b.deviceInfo || undefined,
          },
        });
        await tx.attemptEvent.create({ data: { attemptId: newAttempt.id, type: "START", actorRole: "STUDENT", ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
        if (assignment) await tx.examAssignment.update({ where: { id: assignment.id }, data: { status: "STARTED" } }).catch(() => {});
        return newAttempt;
          });
        } catch (err: any) {
          lastErr = err;
          // P2002 = attemptNumber taken by a concurrent start; loop and recompute.
          if (err?.code !== "P2002") throw err;
        }
      }
      if (!attempt) throw lastErr;

      res.status(201).json(await attemptPayload(attempt, exam, student.id));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Exam system not migrated yet" }); return; }
      if (err?.http) { res.status(err.http).json({ error: err.message }); return; }
      logger.error("start attempt failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // TEACHER PREVIEW — render the exam exactly as a student would see it, but
  // read-only: no attempt is created, no scoring, no timer. Correct answers are
  // stripped so the preview matches the student view.
  app.get("/api/exams/:examId/preview", authMiddleware, teacherGuard, examGuard("examId"), async (req, res) => {
    const { examId } = req.params;
    try {
      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      const composed = await composeQuestionSet(prisma, examId, `preview:${examId}`);
      const questions = composed.map((q: any) => {
        let options: { value: string; text: string }[] | null = null;
        if (Array.isArray(q.optionRows) && q.optionRows.length) {
          options = q.optionRows.map((o: any) => ({ value: o.id, text: o.text }));
        } else if (Array.isArray(q.options)) {
          options = (q.options as any[]).map((o, i) => ({
            value: String(typeof o === "object" ? o.value ?? o.text ?? i : o),
            text: String(typeof o === "object" ? o.text ?? o.value : o),
          }));
        }
        return {
          id: q.id, text: q.text, type: q.type,
          points: q.pointsOverride ?? q.defaultPoints ?? q.points ?? 0,
          options,
          multipleSelection: Array.isArray(q.optionRows) && q.optionRows.length
            ? q.optionRows.filter((option: any) => option.isCorrect).length > 1
            : Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1,
          dragText: q.type === "DRAG_DROP" ? String(q.options?.text ?? "") : undefined,
          dragBank: q.type === "DRAG_DROP" ? dragDropBank(q.options) : undefined,
          passageText: q.passageText ?? null, imageUrl: q.imageUrl ?? null,
        };
      });
      res.json({
        exam: { id: exam.id, title: exam.title, status: exam.status, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks },
        questions,
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Exam system not migrated yet" }); return; }
      logger.error("exam preview failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Build the student-facing attempt payload (sanitized questions in frozen order).
  async function attemptPayload(attempt: any, exam: any, studentId: string) {
    let ordered: any[];
    if (Array.isArray(attempt.frozenContent) && attempt.frozenContent.length) {
      // Render from the immutable snapshot taken at start (historic fidelity +
      // shuffled option order). Correct answers are NOT in frozenContent.
      ordered = attempt.frozenContent.map((q: any) => ({
        id: q.id, text: q.text, type: q.type, points: q.points,
        options: Array.isArray(q.options) ? q.options.map((o: any) => ({ value: o.key, text: o.text })) : null,
        dragText: typeof q.dragText === "string" ? q.dragText : undefined,
        dragBank: Array.isArray(q.dragBank) ? q.dragBank : undefined,
        passageText: q.passageText ?? null,
        imageUrl: q.imageUrl ?? null,
        partialCredit: q.partialCredit ?? false,
        multipleSelection: q.multipleSelection ?? false,
      }));
    } else {
      const questions = exam.questions || (await prisma.question.findMany({ where: { examId: exam.id } }));
      const byId: Record<string, any> = {};
      for (const q of questions) byId[q.id] = q;
      const order: string[] = (attempt.questionOrder as string[]) || questions.map((q: any) => q.id);
      ordered = order.map((id) => byId[id]).filter(Boolean).map(sanitizeQuestion);
    }
    const answers = await prisma.examAnswer.findMany({ where: { attemptId: attempt.id } });
    const accommodation = attempt.accommodationId
      ? await prisma.examAccommodation.findUnique({ where: { id: attempt.accommodationId }, select: { additionalBreaks: true } })
      : null;
    return {
      attempt: {
        id: attempt.id, examId: attempt.examId, state: attempt.state,
        attemptNumber: attempt.attemptNumber, lastSavedAt: attempt.lastSavedAt,
        sessionToken: attempt.sessionToken, remainingSeconds: remainingSeconds(attempt),
        canPause: !!accommodation?.additionalBreaks,
        serverTime: new Date().toISOString(),
      },
      exam: {
        id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks,
        settings: {
          audience: exam.settings?.audience || "GED",
          questionTheme: exam.settings?.questionTheme || "ged",
          lockdownBrowser: !!exam.settings?.lockdownBrowser,
          antiCheat: {
            requireFullscreen: !!exam.settings?.antiCheat?.requireFullscreen,
            blockClipboard: !!exam.settings?.antiCheat?.blockClipboard,
            warnOnFocusLoss: exam.settings?.antiCheat?.warnOnFocusLoss !== false,
          },
        },
      },
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
      if (attempt.state === "PAUSED") {
        res.status(409).json({ error: "ATTEMPT_PAUSED", message: "This attempt is paused. Resume it from My Exams." });
        return;
      }
      // PAUSED is handled by the early return above; only a live IN_PROGRESS
      // attempt carries a session to conflict with.
      if (attempt.state === "IN_PROGRESS" && !hasCurrentSession(attempt, req.headers["x-exam-session"])) {
        res.status(409).json({ error: "SESSION_CONFLICT", message: "This attempt is open in another window or device." });
        return;
      }

      // Server-authoritative expiry → auto-submit. Only an in-progress attempt
      // can expire (PAUSED freezes the clock).
      if (attempt.state === "IN_PROGRESS" && isExpired(attempt)) {
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
      if (attempt.state !== "IN_PROGRESS") { res.status(409).json({ error: attempt.state === "PAUSED" ? "ATTEMPT_PAUSED" : "Attempt is not active", state: attempt.state }); return; }

      // Only the holder of the current token may modify an active attempt.
      if (!hasCurrentSession(attempt, b.sessionToken)) {
        res.status(409).json({ error: "SESSION_CONFLICT", message: "This attempt is open in another session." });
        return;
      }

      if (isExpired(attempt)) {
        const finalized = await finalizeSubmission(attempt.id, true, ipOf(req), uaOf(req));
        res.status(409).json({ error: "TIME_EXPIRED", autoSubmitted: true, state: finalized.state });
        return;
      }

      const reason = String(b.reason || "AUTOSAVE").toUpperCase();
      if (!["AUTOSAVE", "NAVIGATE", "PAUSE", "SUBMIT"].includes(reason)) {
        res.status(400).json({ error: "Invalid save reason" }); return;
      }
      const validation = parseAnswerPayload(b.answers);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error || "Invalid answer payload" });
        return;
      }
      const answers = validation.answers;
      const allowedQuestionIds = new Set<string>(
        Array.isArray(attempt.selectedQuestionIds) && attempt.selectedQuestionIds.length
          ? attempt.selectedQuestionIds
          : Array.isArray(attempt.questionOrder) && attempt.questionOrder.length
            ? attempt.questionOrder
            : (await prisma.question.findMany({ where: { examId: attempt.examId }, select: { id: true } })).map((q: any) => q.id),
      );
      if (answers.some((answer) => !answer?.questionId || !allowedQuestionIds.has(answer.questionId))) {
        res.status(400).json({ error: "One or more answers do not belong to this attempt" });
        return;
      }
      let lastSavedAt = new Date();
      await prisma.$transaction(async (tx: any) => {
        const claimed = await tx.examAttempt.updateMany({
          where: { id: attempt.id, state: "IN_PROGRESS", sessionToken: b.sessionToken },
          data: { lastSavedAt },
        });
        if (claimed.count !== 1) throw Object.assign(new Error("Attempt changed during save"), { examTransition: true });
        const saved = await persistAnswerPayload(tx, attempt, answers, reason, true, ipOf(req), uaOf(req));
        lastSavedAt = saved.now;
      });
      res.json({ ok: true, lastSavedAt: lastSavedAt.toISOString(), remainingSeconds: remainingSeconds({ ...attempt }), serverTime: new Date().toISOString() });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Exam system not migrated yet" }); return; }
      if (err?.examTransition) { res.status(409).json({ error: "ATTEMPT_CHANGED", message: "The attempt changed while answers were being saved. Reload the attempt." }); return; }
      logger.error("autosave failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const INTEGRITY_EVENT_TYPES = new Set(["FOCUS_LOST", "FULLSCREEN_EXIT", "COPY_ATTEMPT", "PASTE_ATTEMPT", "CONTEXT_MENU", "PRINT_ATTEMPT", "DEVTOOLS_SHORTCUT"]);
  app.post("/api/attempts/:attemptId/integrity-event", authMiddleware, examLimiter, async (req, res) => {
    const b = req.body || {};
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      if (!student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }
      if (attempt.state !== "IN_PROGRESS") { res.status(409).json({ error: "Attempt is not active" }); return; }
      if (!hasCurrentSession(attempt, b.sessionToken)) { res.status(409).json({ error: "SESSION_CONFLICT" }); return; }
      const type = String(b.type || "").toUpperCase();
      if (!INTEGRITY_EVENT_TYPES.has(type)) { res.status(400).json({ error: "Invalid integrity event" }); return; }
      const detail = String(b.detail || "").slice(0, 300);
      const event = { type, detail: detail || undefined, at: new Date().toISOString() };
      const updated = await prisma.$transaction(async (tx: any) => {
        const claimed = await tx.examAttempt.updateMany({
          where: { id: attempt.id, state: "IN_PROGRESS", sessionToken: b.sessionToken },
          data: { securityWarnings: { increment: 1 } },
        });
        if (claimed.count !== 1) throw Object.assign(new Error("Attempt changed during integrity event"), { examTransition: true });
        const current = await tx.examAttempt.findUnique({ where: { id: attempt.id }, select: { integrityEvents: true } });
        const existing = Array.isArray(current?.integrityEvents) ? current.integrityEvents : [];
        await tx.attemptEvent.create({ data: { attemptId: attempt.id, type, actorRole: "STUDENT", payload: detail ? { detail } : undefined, ipAddress: ipOf(req), userAgent: uaOf(req) } });
        return tx.examAttempt.update({ where: { id: attempt.id }, data: { integrityEvents: [...existing.slice(-99), event] }, select: { securityWarnings: true } });
      });
      res.json({ ok: true, securityWarnings: updated.securityWarnings });
    } catch (err: any) {
      if (err?.examTransition) { res.status(409).json({ error: "ATTEMPT_CHANGED", message: "The attempt is no longer active in this session." }); return; }
      logger.error("integrity event failed", err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // PAUSE — freezes the clock (records remaining time at pause).
  app.post("/api/attempts/:attemptId/pause", authMiddleware, examLimiter, async (req, res) => {
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId }, include: { accommodation: { select: { additionalBreaks: true } } } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      if (!student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }
      if (attempt.state !== "IN_PROGRESS") { res.status(409).json({ error: "Not in progress" }); return; }
      if (!hasCurrentSession(attempt, req.body?.sessionToken)) { res.status(409).json({ error: "SESSION_CONFLICT", message: "This attempt is open in another session." }); return; }
      if (isExpired(attempt)) {
        const finalized = await finalizeSubmission(attempt.id, true, ipOf(req), uaOf(req));
        res.status(409).json({ error: "TIME_EXPIRED", autoSubmitted: true, state: finalized.state });
        return;
      }
      if (!attempt.accommodation?.additionalBreaks) { res.status(403).json({ error: "Only an invigilator can pause this attempt" }); return; }
      const updated = await prisma.$transaction(async (tx: any) => {
        const pausedAt = new Date();
        const claimed = await tx.examAttempt.updateMany({
          where: { id: attempt.id, state: "IN_PROGRESS", sessionToken: req.body?.sessionToken },
          data: { state: "PAUSED", pausedAt, lastSavedAt: pausedAt },
        });
        if (claimed.count !== 1) return null;
        await tx.attemptEvent.create({ data: { attemptId: attempt.id, type: "PAUSE", actorRole: "STUDENT", ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
        return tx.examAttempt.findUnique({ where: { id: attempt.id } });
      });
      if (!updated) { res.status(409).json({ error: "ATTEMPT_CHANGED", message: "The attempt changed before it could be paused." }); return; }
      res.json({ ok: true, state: updated.state, remainingSeconds: remainingSeconds(updated) });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // SUBMIT — transactional auto-scoring (partial credit) → SUBMITTED / PENDING_GRADING.
  app.post("/api/attempts/:attemptId/submit", authMiddleware, examLimiter, async (req, res) => {
    try {
      const student = await studentForReq(req);
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.attemptId } });
      if (!attempt || !student || attempt.studentId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }
      if (attempt.state !== "IN_PROGRESS") { res.status(409).json({ error: attempt.state === "PAUSED" ? "Resume the attempt before submitting" : "Already submitted", state: attempt.state }); return; }
      if (!hasCurrentSession(attempt, req.body?.sessionToken)) { res.status(409).json({ error: "SESSION_CONFLICT", message: "This attempt is open in another session." }); return; }
      const validation = parseAnswerPayload(req.body?.answers);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error || "Invalid answer payload" });
        return;
      }
      const answers = validation.answers;
      if (answers.length) {
        const allowedQuestionIds = new Set<string>(
          Array.isArray(attempt.selectedQuestionIds) && attempt.selectedQuestionIds.length
            ? attempt.selectedQuestionIds
            : Array.isArray(attempt.questionOrder) && attempt.questionOrder.length
              ? attempt.questionOrder
              : (await prisma.question.findMany({ where: { examId: attempt.examId }, select: { id: true } })).map((q: any) => q.id),
        );
        if (answers.some((answer) => !answer?.questionId || !allowedQuestionIds.has(answer.questionId))) {
          res.status(400).json({ error: "One or more answers do not belong to this attempt" });
          return;
        }
      }
      const expired = isExpired(attempt);
      const finalized = await finalizeSubmission(attempt.id, expired, ipOf(req), uaOf(req), answers, req.body?.sessionToken);
      res.json({ ok: true, state: finalized.state, autoSubmitted: expired });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Exam system not migrated yet" }); return; }
      if (err?.examCode === "SESSION_CONFLICT") { res.status(409).json({ error: "SESSION_CONFLICT", message: "This attempt is open in another session." }); return; }
      if (err?.examCode === "ATTEMPT_PAUSED") { res.status(409).json({ error: "ATTEMPT_PAUSED", message: "Resume the attempt before submitting." }); return; }
      logger.error("submit failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Shared submission finalizer. Used by manual submit and auto-submit on expiry.
  async function finalizeSubmission(
    attemptId: string,
    autoSubmitted: boolean,
    ip: string | null,
    ua: string | null,
    finalAnswers: any[] = [],
    expectedSessionToken?: string,
  ) {
    return prisma.$transaction(async (tx: any) => {
      const claimWhere: any = { id: attemptId, state: { in: expectedSessionToken ? ["IN_PROGRESS"] : ["IN_PROGRESS", "PAUSED"] } };
      if (expectedSessionToken) claimWhere.sessionToken = expectedSessionToken;
      const claimed = await tx.examAttempt.updateMany({ where: claimWhere, data: { sessionToken: null } });
      if (claimed.count !== 1) {
        const current = await tx.examAttempt.findUnique({ where: { id: attemptId } });
        if (!current) throw new Error("attempt missing");
        if (expectedSessionToken && current.state === "PAUSED") throw Object.assign(new Error("Attempt is paused"), { examCode: "ATTEMPT_PAUSED" });
        if (expectedSessionToken && current.state === "IN_PROGRESS") throw Object.assign(new Error("Session changed"), { examCode: "SESSION_CONFLICT" });
        return current;
      }
      const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: { include: { questions: true } }, answers: true } });
      if (!attempt) throw new Error("attempt missing");
      if (finalAnswers.length) {
        await persistAnswerPayload(tx, attempt, finalAnswers, "SUBMIT", false);
        attempt.answers = await tx.examAnswer.findMany({ where: { attemptId } });
      }

      // Score over the FROZEN selected set when present (randomized/bank attempts),
      // else the legacy exam-owned questions. This guarantees a student is graded
      // only on the questions they were actually shown.
      const selectedIds: string[] | null = Array.isArray(attempt.selectedQuestionIds) ? attempt.selectedQuestionIds : null;
      let scoringQuestions: any[];
      if (selectedIds && selectedIds.length) {
        scoringQuestions = await tx.question.findMany({ where: { id: { in: selectedIds } }, include: { optionRows: true } });
      } else {
        scoringQuestions = attempt.exam.questions;
      }
      // Score from the immutable snapshot captured at start. This prevents an
      // author edit to an answer key, tolerance, or point value from changing
      // how an already-running attempt is graded.
      const frozenByQ: Record<string, any> = {};
      if (Array.isArray(attempt.frozenContent)) for (const f of attempt.frozenContent) frozenByQ[f.id] = f;
      // Adapt bank questions (QuestionOption rows) into the shape scoreObjective expects.
      const prep = (q: any) => {
        const frozen = frozenByQ[q.id];
        const source = frozen ? {
          ...q,
          type: frozen.type,
          points: frozen.points,
          options: frozen.scoringOptions ?? frozen.options ?? q.options,
          correctAnswer: frozen.correctAnswer,
          correctAnswers: frozen.correctAnswers,
          optionWeights: frozen.optionWeights,
          negativePoints: frozen.negativePoints,
          minScore: frozen.minScore,
          numericTolerance: frozen.numericTolerance,
          caseSensitive: frozen.caseSensitive,
          partialCredit: frozen.partialCredit,
          requiresManualGrading: frozen.requiresManualGrading,
        } : q;
        // Per-question penalties are only active when negative marking is
        // enabled for the exam; previously they applied even when the exam-level
        // switch was off.
        source.negativePoints = attempt.exam.negativeMarking ? source.negativePoints : null;
        const max = source.points ?? source.defaultPoints ?? 0;
        if (!frozen && Array.isArray(source.optionRows) && source.optionRows.length) {
          const correct = source.optionRows.filter((o: any) => o.isCorrect).map((o: any) => o.id);
          const weights: Record<string, number> = {};
          let hasWeights = false;
          for (const o of source.optionRows) if (o.weight != null) { weights[o.id] = o.weight; hasWeights = true; }
          return { ...source, points: max, correctAnswer: correct[0] ?? source.correctAnswer, correctAnswers: correct.length ? correct : source.correctAnswers, optionWeights: hasWeights ? weights : source.optionWeights };
        }
        // Legacy Json options: the player submits the option's *text* (the frozen
        // option key), but basic-creator exams store correctAnswer as the option
        // *index*. Accept either form so MCQs auto-grade correctly.
        if (Array.isArray(source.options) && source.options.length && source.correctAnswer != null && (!Array.isArray(source.correctAnswers) || !source.correctAnswers.length)) {
          const accepted = [String(source.correctAnswer)];
          const idx = Number(source.correctAnswer);
          // Old frozen attempts may still contain an index key. Resolve that
          // index against the canonical database option order, never the
          // shuffled student-facing order.
          const canonicalOptions = Array.isArray(q.options) ? q.options : source.options;
          if (Number.isInteger(idx) && canonicalOptions[idx] != null) {
            const opt = canonicalOptions[idx];
            accepted.push(String(typeof opt === "object" ? (opt.key ?? opt.value ?? opt.text ?? idx) : opt));
          }
          return { ...source, points: max, correctAnswers: accepted };
        }
        return { ...source, points: max };
      };

      const ansByQ: Record<string, any> = {};
      for (const a of attempt.answers) ansByQ[a.questionId] = a;

      let total = 0; let needsManual = false;
      for (const q0 of scoringQuestions) {
        const q = prep(q0);
        const a = ansByQ[q.id];
        const r = scoreExamObjective(q, a || {});
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
      else if (mode === "SCHEDULED") released = !!(policy?.releaseAt && attempt.isCompleted && now >= new Date(policy.releaseAt).getTime());
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
      if (showCorrect || showExpl || showFeedback) {
        // Use the frozen selected set when present (bank/blueprint attempts draw
        // questions that don't belong to this examId), else the exam's own questions.
        const selectedIds: string[] | null = Array.isArray(attempt.selectedQuestionIds) && attempt.selectedQuestionIds.length
          ? attempt.selectedQuestionIds : null;
        const qs = await prisma.question.findMany({
          where: selectedIds ? { id: { in: selectedIds } } : { examId: attempt.examId },
          include: { optionRows: { orderBy: { orderIndex: "asc" } } },
        });
        const orderedQs = selectedIds
          ? selectedIds.map((id) => qs.find((q: any) => q.id === id)).filter(Boolean)
          : qs;
        const frozenByQ: Record<string, any> = {};
        if (Array.isArray(attempt.frozenContent)) {
          for (const frozen of attempt.frozenContent) frozenByQ[frozen.id] = frozen;
        }
        const reviewQs = orderedQs.map((question: any) => {
          const frozen = frozenByQ[question.id];
          if (!frozen) return question;
          return {
            ...question,
            text: frozen.text,
            type: frozen.type,
            points: frozen.points,
            passageText: frozen.passageText ?? null,
            explanation: frozen.explanation ?? question.explanation,
            options: frozen.scoringOptions ?? frozen.options ?? question.options,
            optionRows: [],
            correctAnswer: frozen.correctAnswer,
            correctAnswers: frozen.correctAnswers,
            _canonicalOptions: question.options,
          };
        });
        const ansByQ: Record<string, any> = {};
        for (const a of attempt.answers) ansByQ[a.questionId] = a;
        const optionEntries = (q: any): Array<{ key: string; label: string }> => {
          if (Array.isArray(q.optionRows) && q.optionRows.length) {
            return q.optionRows.map((option: any) => ({ key: String(option.id), label: String(option.text) }));
          }
          if (!Array.isArray(q.options)) return [];
          return q.options.map((option: any, index: number) => ({
            key: String(typeof option === "object" ? option.key ?? option.value ?? option.text ?? index : option),
            label: String(typeof option === "object" ? option.text ?? option.value ?? option.key ?? index : option),
          }));
        };
        const optionLabel = (q: any, value: unknown) => {
          const raw = String(value ?? "");
          const matched = optionEntries(q).find((option) => option.key === raw);
          if (matched) return matched.label;
          const index = Number(raw);
          if (Number.isInteger(index) && Array.isArray(q._canonicalOptions) && q._canonicalOptions[index] != null) {
            const option = q._canonicalOptions[index];
            return String(typeof option === "object" ? option.text ?? option.value ?? index : option);
          }
          return raw;
        };
        const acceptedAnswerValues = (q: any): unknown[] => {
          if (Array.isArray(q.optionRows) && q.optionRows.length) {
            const correctOptionIds = q.optionRows.filter((option: any) => option.isCorrect).map((option: any) => option.id);
            if (correctOptionIds.length) return correctOptionIds;
          }
          return Array.isArray(q.correctAnswers) && q.correctAnswers.length
            ? q.correctAnswers
            : q.correctAnswer == null ? [] : [q.correctAnswer];
        };
        // For legacy MCQs the correct answer is stored as an option *index*; show
        // the option *text* so it matches the student's (text) answer.
        const correctText = (q: any) => {
          if (q.type === "DRAG_DROP") {
            const blanks = q.options && !Array.isArray(q.options) && Array.isArray((q.options as any).blanks) ? (q.options as any).blanks : [];
            return blanks.length ? blanks.map((b: any, i: number) => `${i + 1}. ${b.answer}`).join("   ") : null;
          }
          const accepted = acceptedAnswerValues(q);
          return accepted.length ? accepted.map((answer: unknown) => optionLabel(q, answer)).join(", ") : null;
        };
        const correctAnswers = (q: any) => {
          const accepted = acceptedAnswerValues(q);
          return accepted.map((answer: unknown) => optionLabel(q, answer));
        };
        // Drag-drop answers live in selectedOptions ({ [blankId]: bankKey }),
        // not answerText, so the plain answerText lookup below always showed
        // "—" for these questions even when answered and correctly graded.
        // Render them as numbered "1. word" lines matching the blank order.
        const yourAnswerText = (q: any, ans: any) => {
          if (q.type === "DRAG_DROP") {
            const blanks = q.options && !Array.isArray(q.options) && Array.isArray((q.options as any).blanks) ? (q.options as any).blanks : [];
            const bank = dragDropBank(q.options);
            const bankLabel: Record<string, string> = {};
            for (const item of bank) bankLabel[item.key] = item.label;
            const matches = ans?.selectedOptions && !Array.isArray(ans.selectedOptions) && typeof ans.selectedOptions === "object" ? ans.selectedOptions : {};
            const lines = blanks.map((b: any, i: number) => matches[b.id] != null && bankLabel[matches[b.id]] ? `${i + 1}. ${bankLabel[matches[b.id]]}` : null).filter(Boolean);
            return lines.length ? lines.join("   ") : null;
          }
          if (Array.isArray(ans?.selectedOptions)) {
            const labels = ans.selectedOptions.map((answer: unknown) => optionLabel(q, answer)).filter(Boolean);
            return labels.length ? labels.join(", ") : null;
          }
          return ans?.answerText != null ? optionLabel(q, ans.answerText) : null;
        };
        // A per-blank breakdown for the review screen (which blank the student
        // got right/wrong, their word vs. the correct one) — richer than the
        // one-line yourAnswer/correctAnswer summary, and only meaningful when
        // showCorrect is on (it would otherwise leak the answer key).
        const dragDropRows = (q: any, ans: any) => {
          if (q.type !== "DRAG_DROP" || !showCorrect) return undefined;
          const blanks = q.options && !Array.isArray(q.options) && Array.isArray((q.options as any).blanks) ? (q.options as any).blanks : [];
          if (!blanks.length) return undefined;
          const bank = dragDropBank(q.options);
          const bankLabel: Record<string, string> = {};
          for (const item of bank) bankLabel[item.key] = item.label;
          const matches = ans?.selectedOptions && !Array.isArray(ans.selectedOptions) && typeof ans.selectedOptions === "object" ? ans.selectedOptions : {};
          const norm = (s: string) => String(s || "").trim().toLocaleLowerCase();
          return blanks.map((b: any, i: number) => {
            const yourWord = matches[b.id] != null ? bankLabel[matches[b.id]] : null;
            const isCorrect = !!yourWord && norm(yourWord) === norm(b.answer);
            return { label: `Blank ${i + 1}`, your: yourWord || null, correct: b.answer, isCorrect };
          });
        };
        questions = reviewQs.map((q: any) => ({
          id: q.id, text: q.text, passageText: q.passageText ?? null,
          ...(showCorrect ? { correctAnswer: correctText(q), correctAnswers: correctAnswers(q) } : {}),
          ...(showExpl ? { explanation: q.explanation } : {}),
          yourAnswer: yourAnswerText(q, ansByQ[q.id]),
          dragDropRows: dragDropRows(q, ansByQ[q.id]),
          pointsAwarded: showScore ? ansByQ[q.id]?.pointsAwarded ?? null : undefined,
          feedback: showFeedback ? fbByQ[q.id]?.overallComment ?? null : undefined,
        }));
      }

      res.json({
        released: true, state: attempt.state,
        score: showScore ? attempt.score : undefined,
        totalMarks: showScore
          ? (Array.isArray(attempt.frozenContent) && attempt.frozenContent.length
              ? attempt.frozenContent.reduce((sum: number, q: any) => sum + Number(q.points || 0), 0)
              : attempt.exam.totalMarks)
          : undefined,
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
      const assignmentByExam = new Map(assignments.map((a: any) => [a.examId, a]));
      // Class exams with a scheduling window, plus explicit assignments.
      const classExams = student.classId
        ? await prisma.exam.findMany({
            where: { classId: student.classId, status: { notIn: ["DRAFT", "ARCHIVED", "CLOSED"] } },
            include: { _count: { select: { assignments: true } } },
          })
        : [];
      const seen = new Set<string>();
      const out: any[] = [];
      const consider = [...assignments.map((a: any) => a.exam), ...classExams]
        .filter((e: any) => e && ["PUBLISHED", "ACTIVE", "SCHEDULED"].includes(e.status));
      // Batch all attempts in one query instead of one query per exam.
      const allAttempts = await prisma.examAttempt.findMany({
        where: { studentId: student.id, examId: { in: consider.map((e: any) => e.id) } },
      }).catch(() => []);
      const attemptsByExam: Record<string, any[]> = {};
      for (const a of allAttempts) (attemptsByExam[a.examId] ||= []).push(a);
      for (const e of consider) {
        if (seen.has(e.id)) continue; seen.add(e.id);
        if ((e._count?.assignments || 0) > 0 && !assignedExamIds.has(e.id)) continue;
        const assignment: any = assignmentByExam.get(e.id);
        const availableFrom = assignment?.availableFromOverride || e.availableFrom;
        const availableUntil = assignment?.availableUntilOverride || e.availableUntil;
        const openNow = (!availableFrom || now >= new Date(availableFrom)) && (!availableUntil || now <= new Date(availableUntil) || e.allowLateStart);
        const attempts = attemptsByExam[e.id] || [];
        const attemptsUsed = attempts.filter((a: any) => a.state !== "INVALIDATED").length;
        out.push({
          id: e.id, title: e.title, durationMinutes: e.durationMinutes,
          availableFrom, availableUntil,
          requiresAccessCode: e.requiresAccessCode, assigned: assignedExamIds.has(e.id),
          openNow, attemptLimit: assignment?.attemptLimitOverride ?? e.attemptLimit, attemptsUsed,
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
  registerGradingAndOps({ ...deps, helpers: { user, isTeacher, ipOf, uaOf, num, remainingSeconds, teacherGuard, gradingLimiter, studentForReq, examGuard, attemptExamGuard, canManageExam, finalizeSubmission } });
  // Authoring CRUD (sections, stimuli, groups, rubrics, question structure).
  registerAuthoringRoutes({ ...deps, helpers: { user, ipOf, uaOf, num, teacherGuard, examGuard, canManageExam } });
}

// =============================================================================
// AUTHORING — sections · stimuli · question groups · rubrics · question config
// =============================================================================
function registerAuthoringRoutes(deps: any) {
  const { app, prisma, authMiddleware, createAuditLog, logger, helpers } = deps;
  const { user, ipOf, uaOf, num, teacherGuard, examGuard, canManageExam } = helpers;
  const audit = (req: any, action: string, type: string, id: string | null, desc: string) =>
    createAuditLog(user(req).userId, user(req).email, action, type, id, desc, ipOf(req), uaOf(req), "SUCCESS");
  const degrade = (err: any, res: any, empty: any) => {
    if (err?.code === "P2021" || err?.code === "P2022") { res.json(empty); return true; }
    return false;
  };
  // Guard child entities (section/stimulus/group/rubric) via their parent exam.
  const childExamGuard = (model: string): express.RequestHandler => async (req: any, res: any, next: any) => {
    try {
      const row = await prisma[model].findUnique({ where: { id: req.params.id }, select: { examId: true } });
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const { ok } = await canManageExam(req, row.examId);
      if (!ok) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      req.managedExamId = row.examId;
      next();
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(404).json({ error: "Not found" }); return; }
      logger.error("child exam guard failed", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  const sameExamReferenceError = async (examId: string, refs: {
    sectionId?: unknown;
    groupId?: unknown;
    stimulusId?: unknown;
  }): Promise<string | null> => {
    const checks: Array<Promise<{ label: string; row: any }> | null> = [
      refs.sectionId ? prisma.examSection.findUnique({ where: { id: String(refs.sectionId) }, select: { examId: true } }).then((row: any) => ({ label: "section", row })) : null,
      refs.groupId ? prisma.questionGroup.findUnique({ where: { id: String(refs.groupId) }, select: { examId: true } }).then((row: any) => ({ label: "question group", row })) : null,
      refs.stimulusId ? prisma.stimulus.findUnique({ where: { id: String(refs.stimulusId) }, select: { examId: true } }).then((row: any) => ({ label: "stimulus", row })) : null,
    ];
    const results = await Promise.all(checks.filter(Boolean) as Array<Promise<{ label: string; row: any }>>);
    const invalid = results.find(({ row }) => !row || row.examId !== examId);
    return invalid ? `The selected ${invalid.label} does not belong to this exam` : null;
  };

  const questionBelongsToExam = async (questionId: unknown, examId: string): Promise<boolean> => {
    if (!questionId) return true;
    const question = await prisma.question.findFirst({
      where: {
        id: String(questionId),
        OR: [{ examId }, { examLinks: { some: { examId } } }],
      },
      select: { id: true },
    });
    return !!question;
  };

  // ── Teacher question list (full — includes correct answers + structure) ─────
  app.get("/api/exams/:id/questions", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try {
      const questions = await prisma.question.findMany({ where: { examId: req.params.id }, orderBy: { orderIndex: "asc" } });
      res.json(questions);
    } catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // Update a question's structure (section/group/stimulus/order) + scoring config + content.
  app.patch("/api/questions/:id", authMiddleware, teacherGuard, async (req: any, res: any) => {
    // Exam-owned questions are scoped to the teacher's classes; bank questions
    // (examId null) are subject-scoped by the bank routes.
    let ownerExamId: string;
    try {
      const owner = await prisma.question.findUnique({ where: { id: req.params.id }, select: { examId: true } });
      if (!owner) { res.status(404).json({ error: "Question not found" }); return; }
      if (!owner.examId) { res.status(409).json({ error: "Use the question-bank editor for reusable questions" }); return; }
      ownerExamId = owner.examId;
      const { ok } = await canManageExam(req, ownerExamId);
      if (!ok) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
    } catch (err: any) {
      logger.error("question guard failed", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    const b = req.body || {};
    try {
      const referenceError = await sameExamReferenceError(ownerExamId!, {
        sectionId: b.sectionId,
        groupId: b.groupId,
        stimulusId: b.stimulusId,
      });
      if (referenceError) { res.status(400).json({ error: referenceError }); return; }
    } catch (err) {
      logger.error("question relationship validation failed", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    const data: any = {};
    const passthrough = ["text", "correctAnswer", "explanation"];
    for (const k of passthrough) if (b[k] !== undefined) {
      if (k === "text" || k === "explanation") {
        data[k] = sanitizeHTML(b[k]);
      } else {
        data[k] = b[k];
      }
    }
    if (b.points !== undefined) data.points = num(b.points);
    if (b.orderIndex !== undefined) data.orderIndex = num(b.orderIndex) ?? 0;
    if (b.sectionId !== undefined) data.sectionId = b.sectionId || null;
    if (b.groupId !== undefined) data.groupId = b.groupId || null;
    if (b.stimulusId !== undefined) data.stimulusId = b.stimulusId || null;
    if (b.options !== undefined) data.options = b.options ?? null;
    if (b.correctAnswers !== undefined) data.correctAnswers = b.correctAnswers ?? null;
    if (b.optionWeights !== undefined) data.optionWeights = b.optionWeights ?? null;
    if (b.negativePoints !== undefined) data.negativePoints = num(b.negativePoints);
    if (b.minScore !== undefined) data.minScore = num(b.minScore);
    if (b.numericTolerance !== undefined) {
      const tolerance = num(b.numericTolerance);
      data.numericTolerance = (tolerance !== null && tolerance >= 0) ? tolerance : null;
    }
    if (b.caseSensitive !== undefined) data.caseSensitive = !!b.caseSensitive;
    if (b.partialCredit !== undefined) data.partialCredit = !!b.partialCredit;
    if (b.requiresManualGrading !== undefined) data.requiresManualGrading = !!b.requiresManualGrading;
    try {
      const q = await prisma.question.update({ where: { id: req.params.id }, data });
      await audit(req, "UPDATE", "QUESTION", q.id, `Question config updated.`);
      res.json(q);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Question not found" }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Sections ────────────────────────────────────────────────────────────────
  app.get("/api/exams/:id/sections", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try { res.json(await prisma.examSection.findMany({ where: { examId: req.params.id }, orderBy: { orderIndex: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  const sectionData = (b: any) => ({
    title: b.title || "Untitled section", description: b.description || null, instructions: b.instructions || null,
    orderIndex: num(b.orderIndex) ?? 0, timeLimitMinutes: num(b.timeLimitMinutes),
    shuffleQuestions: !!b.shuffleQuestions, questionsToPick: num(b.questionsToPick),
  });
  app.post("/api/exams/:id/sections", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try { const row = await prisma.examSection.create({ data: { examId: req.params.id, ...sectionData(req.body || {}) } }); await audit(req, "CREATE", "EXAM_SECTION", row.id, `Section '${row.title}' created.`); res.status(201).json(row); }
    catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.put("/api/sections/:id", authMiddleware, teacherGuard, childExamGuard("examSection"), async (req: any, res: any) => {
    try { const row = await prisma.examSection.update({ where: { id: req.params.id }, data: sectionData(req.body || {}) }); await audit(req, "UPDATE", "EXAM_SECTION", row.id, `Section updated.`); res.json(row); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.delete("/api/sections/:id", authMiddleware, teacherGuard, childExamGuard("examSection"), async (req: any, res: any) => {
    try { await prisma.question.updateMany({ where: { sectionId: req.params.id }, data: { sectionId: null } }); await prisma.examSection.delete({ where: { id: req.params.id } }); await audit(req, "DELETE", "EXAM_SECTION", req.params.id, `Section removed.`); res.json({ ok: true }); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Stimuli (passages / media) ───────────────────────────────────────────────
  app.get("/api/exams/:id/stimuli", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try { res.json(await prisma.stimulus.findMany({ where: { examId: req.params.id }, orderBy: { createdAt: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  const STIMULUS_TYPES = ["TEXT", "IMAGE", "AUDIO", "VIDEO", "TABLE", "CHART", "DOCUMENT"];
  const stimulusData = (b: any) => ({
    type: STIMULUS_TYPES.includes(b.type) ? b.type : "TEXT", title: b.title || null,
    content: b.content || null, mediaUrl: b.mediaUrl || null, caption: b.caption || null, data: b.data ?? null,
  });
  app.post("/api/exams/:id/stimuli", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try { const row = await prisma.stimulus.create({ data: { examId: req.params.id, ...stimulusData(req.body || {}) } }); await audit(req, "CREATE", "STIMULUS", row.id, `Stimulus '${row.title || row.type}' created.`); res.status(201).json(row); }
    catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.put("/api/stimuli/:id", authMiddleware, teacherGuard, childExamGuard("stimulus"), async (req: any, res: any) => {
    try { const row = await prisma.stimulus.update({ where: { id: req.params.id }, data: stimulusData(req.body || {}) }); await audit(req, "UPDATE", "STIMULUS", row.id, `Stimulus updated.`); res.json(row); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.delete("/api/stimuli/:id", authMiddleware, teacherGuard, childExamGuard("stimulus"), async (req: any, res: any) => {
    try { await prisma.question.updateMany({ where: { stimulusId: req.params.id }, data: { stimulusId: null } }); await prisma.questionGroup.updateMany({ where: { stimulusId: req.params.id }, data: { stimulusId: null } }); await prisma.stimulus.delete({ where: { id: req.params.id } }); await audit(req, "DELETE", "STIMULUS", req.params.id, `Stimulus removed.`); res.json({ ok: true }); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Question groups (passage-based sets) ─────────────────────────────────────
  app.get("/api/exams/:id/question-groups", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try { res.json(await prisma.questionGroup.findMany({ where: { examId: req.params.id }, include: { stimulus: true }, orderBy: { orderIndex: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  const groupData = (b: any) => ({ sectionId: b.sectionId || null, stimulusId: b.stimulusId || null, title: b.title || null, instructions: b.instructions || null, orderIndex: num(b.orderIndex) ?? 0 });
  app.post("/api/exams/:id/question-groups", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try {
      const referenceError = await sameExamReferenceError(req.params.id, req.body || {});
      if (referenceError) { res.status(400).json({ error: referenceError }); return; }
      const row = await prisma.questionGroup.create({ data: { examId: req.params.id, ...groupData(req.body || {}) } }); await audit(req, "CREATE", "QUESTION_GROUP", row.id, `Question group created.`); res.status(201).json(row);
    }
    catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.put("/api/question-groups/:id", authMiddleware, teacherGuard, childExamGuard("questionGroup"), async (req: any, res: any) => {
    try {
      const referenceError = await sameExamReferenceError(req.managedExamId, req.body || {});
      if (referenceError) { res.status(400).json({ error: referenceError }); return; }
      const row = await prisma.questionGroup.update({ where: { id: req.params.id }, data: groupData(req.body || {}) }); await audit(req, "UPDATE", "QUESTION_GROUP", row.id, `Question group updated.`); res.json(row);
    }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.delete("/api/question-groups/:id", authMiddleware, teacherGuard, childExamGuard("questionGroup"), async (req: any, res: any) => {
    try { await prisma.question.updateMany({ where: { groupId: req.params.id }, data: { groupId: null } }); await prisma.questionGroup.delete({ where: { id: req.params.id } }); await audit(req, "DELETE", "QUESTION_GROUP", req.params.id, `Question group removed.`); res.json({ ok: true }); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Rubrics + criteria ───────────────────────────────────────────────────────
  app.get("/api/exams/:id/rubrics", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    const { questionId } = req.query as Record<string, string>;
    try { res.json(await prisma.gradingRubric.findMany({ where: { examId: req.params.id, ...(questionId ? { questionId } : {}) }, include: { criteria: { orderBy: { orderIndex: "asc" } } }, orderBy: { createdAt: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  // Create rubric with nested criteria; maxScore is summed from criteria.
  app.post("/api/exams/:id/rubrics", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    const b = req.body || {};
    const criteria: any[] = Array.isArray(b.criteria) ? b.criteria : [];
    const maxScore = criteria.reduce((s, c) => s + (num(c.maxScore) || 0), 0);
    try {
      if (!(await questionBelongsToExam(b.questionId, req.params.id))) {
        res.status(400).json({ error: "The selected question does not belong to this exam" }); return;
      }
      const row = await prisma.gradingRubric.create({
        data: {
          examId: req.params.id, questionId: b.questionId || null, title: b.title || "Rubric", description: b.description || null, maxScore,
          criteria: { create: criteria.map((c, i) => ({ label: c.label || `Criterion ${i + 1}`, description: c.description || null, maxScore: num(c.maxScore) || 0, orderIndex: i, levels: c.levels ?? null })) },
        },
        include: { criteria: true },
      });
      await audit(req, "CREATE", "GRADING_RUBRIC", row.id, `Rubric '${row.title}' created.`);
      res.status(201).json(row);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  // Replace rubric + criteria wholesale (transactional).
  app.put("/api/rubrics/:id", authMiddleware, teacherGuard, childExamGuard("gradingRubric"), async (req: any, res: any) => {
    const b = req.body || {};
    const criteria: any[] = Array.isArray(b.criteria) ? b.criteria : [];
    const maxScore = criteria.reduce((s, c) => s + (num(c.maxScore) || 0), 0);
    try {
      if (b.questionId !== undefined && !(await questionBelongsToExam(b.questionId, req.managedExamId))) {
        res.status(400).json({ error: "The selected question does not belong to this exam" }); return;
      }
      const row = await prisma.$transaction(async (tx: any) => {
        await tx.rubricCriterion.deleteMany({ where: { rubricId: req.params.id } });
        return tx.gradingRubric.update({
          where: { id: req.params.id },
          data: {
            title: b.title || "Rubric", description: b.description || null, questionId: b.questionId ?? undefined, maxScore,
            criteria: { create: criteria.map((c, i) => ({ label: c.label || `Criterion ${i + 1}`, description: c.description || null, maxScore: num(c.maxScore) || 0, orderIndex: i, levels: c.levels ?? null })) },
          },
          include: { criteria: true },
        });
      });
      await audit(req, "UPDATE", "GRADING_RUBRIC", row.id, `Rubric updated.`);
      res.json(row);
    } catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.delete("/api/rubrics/:id", authMiddleware, teacherGuard, childExamGuard("gradingRubric"), async (req: any, res: any) => {
    try { await prisma.gradingRubric.delete({ where: { id: req.params.id } }); await audit(req, "DELETE", "GRADING_RUBRIC", req.params.id, `Rubric removed.`); res.json({ ok: true }); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
}

// =============================================================================
// GRADING · RELEASE · ITEM ANALYSIS · INVIGILATOR · PRINT
// =============================================================================
function registerGradingAndOps(deps: any) {
  const { app, prisma, authMiddleware, createAuditLog, logger, helpers } = deps;
  const { user, ipOf, uaOf, num, remainingSeconds, teacherGuard, gradingLimiter, examGuard, attemptExamGuard, canManageExam, finalizeSubmission } = helpers;

  // ── Manual grading queue ─────────────────────────────────────────────────
  app.get("/api/grading/queue", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const { examId, status } = req.query as Record<string, string>;
    try {
      const allowedStatuses = new Set(["PENDING", "IN_REVIEW", "GRADED", "MODERATED", "FINALIZED", "ALL"]);
      if (status && !allowedStatuses.has(status)) { res.status(400).json({ error: "Invalid grading status" }); return; }
      // Teachers only see grading work for exams of classes they teach.
      let attemptScope: any = examId ? { examId } : undefined;
      if (user(req).role === "TEACHER") {
        const teacher = await prisma.teacher.findUnique({ where: { userId: user(req).userId }, include: { classes: true } });
        const classIds = (teacher?.classes || []).map((c: any) => c.classId);
        attemptScope = { ...(examId ? { examId } : {}), exam: { classId: { in: classIds } } };
      }
      const rows = await prisma.manualGrade.findMany({
        where: {
          ...(status === "ALL" ? {} : status ? { status } : { status: { in: ["PENDING", "IN_REVIEW", "GRADED", "MODERATED"] } }),
          ...(attemptScope ? { attempt: attemptScope } : {}),
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
  app.post("/api/grading/:attemptId/:questionId", authMiddleware, teacherGuard, attemptExamGuard(), gradingLimiter, async (req: any, res: any) => {
    const { attemptId, questionId } = req.params; const b = req.body || {};
    try {
      const answer = await prisma.examAnswer.findUnique({ where: { attemptId_questionId: { attemptId, questionId } } });
      if (!answer) { res.status(404).json({ error: "Question is not part of this attempt" }); return; }
      const maxPoints = Number(answer.maxPoints ?? 0);
      const score = num(b.score);
      const scoreOverride = num(b.scoreOverride);
      const secondMarkerScore = num(b.secondMarkerScore);
      if ((score !== null && (!Number.isFinite(score) || score < 0 || score > maxPoints)) ||
          (scoreOverride !== null && (!Number.isFinite(scoreOverride) || scoreOverride < 0 || scoreOverride > maxPoints)) ||
          (secondMarkerScore !== null && (!Number.isFinite(secondMarkerScore) || secondMarkerScore < 0 || secondMarkerScore > maxPoints))) {
        res.status(400).json({ error: `Score must be between 0 and ${maxPoints}` }); return;
      }
      if (b.status !== undefined && !["PENDING", "IN_REVIEW", "GRADED", "MODERATED"].includes(b.status)) {
        res.status(400).json({ error: "Invalid grading status" }); return;
      }
      const existing = await prisma.manualGrade.findFirst({ where: { attemptId, questionId } });
      if (existing?.isFinalized) { res.status(409).json({ error: "Grade is finalized and locked" }); return; }

      const data: any = {
        rubricId: b.rubricId || null,
        criterionScores: b.criterionScores ?? null,
        score,
        inlineFeedback: b.inlineFeedback ?? null,
        overallComment: b.overallComment || null,
        scoreOverride,
        overrideReason: b.overrideReason || null,
        secondMarkerId: b.secondMarkerId || null,
        secondMarkerScore,
        moderationComment: b.moderationComment || null,
        status: b.status || "GRADED",
        graderId: user(req).userId,
      };
      let grade: any;
      if (existing) {
        const updated = await prisma.manualGrade.updateMany({ where: { id: existing.id, isFinalized: false }, data });
        if (updated.count !== 1) { res.status(409).json({ error: "Grade is finalized and locked" }); return; }
        grade = await prisma.manualGrade.findUnique({ where: { id: existing.id } });
      } else {
        grade = await prisma.manualGrade.create({ data: { attemptId, questionId, ...data } });
      }

      await createAuditLog(user(req).userId, user(req).email, "GRADE", "MANUAL_GRADE", grade.id, `Graded Q ${questionId} on attempt ${attemptId} (status ${data.status}).`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(grade);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // Finalize a manual grade → lock + recompute attempt total (transactional).
  app.post("/api/grading/:gradeId/finalize", authMiddleware, teacherGuard, gradingLimiter, async (req: any, res: any) => {
    try {
      // Class scoping: resolve the exam via grade → attempt.
      const gradeRow = await prisma.manualGrade.findUnique({ where: { id: req.params.gradeId }, select: { attempt: { select: { examId: true } } } });
      if (!gradeRow) { res.status(404).json({ error: "not found" }); return; }
      const scope = await canManageExam(req, gradeRow.attempt.examId);
      if (!scope.ok) { res.status(403).json({ error: "Forbidden: not your class" }); return; }
      const result = await prisma.$transaction(async (tx: any) => {
        const grade = await tx.manualGrade.findUnique({ where: { id: req.params.gradeId } });
        if (!grade) throw Object.assign(new Error("not found"), { http: 404 });
        if (grade.isFinalized) throw Object.assign(new Error("already finalized"), { http: 409 });
        if (grade.scoreOverride == null && grade.score == null) throw Object.assign(new Error("Enter a score before finalizing"), { http: 400 });

        const locked = await tx.manualGrade.updateMany({ where: { id: grade.id, isFinalized: false }, data: { status: grade.status } });
        if (locked.count !== 1) throw Object.assign(new Error("already finalized"), { http: 409 });
        const currentGrade = await tx.manualGrade.findUnique({ where: { id: grade.id } });
        if (!currentGrade) throw Object.assign(new Error("not found"), { http: 404 });
        if (currentGrade.scoreOverride == null && currentGrade.score == null) throw Object.assign(new Error("Enter a score before finalizing"), { http: 400 });
        const finalScore = currentGrade.scoreOverride ?? currentGrade.score ?? 0;
        const answer = await tx.examAnswer.findUnique({ where: { attemptId_questionId: { attemptId: currentGrade.attemptId, questionId: currentGrade.questionId } } });
        const maxPoints = Number(answer?.maxPoints ?? 0);
        if (!answer || !Number.isFinite(finalScore) || finalScore < 0 || finalScore > maxPoints) {
          throw Object.assign(new Error(`Score must be between 0 and ${maxPoints}`), { http: 400 });
        }
        await tx.manualGrade.update({ where: { id: currentGrade.id }, data: { isFinalized: true, status: "FINALIZED", finalizedAt: new Date(), finalizedById: user(req).userId } });
        // Write the awarded points onto the answer.
        await tx.examAnswer.updateMany({ where: { attemptId: currentGrade.attemptId, questionId: currentGrade.questionId }, data: { manualScore: finalScore, pointsAwarded: finalScore, gradingState: "GRADED" } });

        // If no more pending manual grades on this attempt → finalize the attempt score.
        const pending = await tx.manualGrade.count({ where: { attemptId: currentGrade.attemptId, isFinalized: false } });
        const attempt = await tx.examAttempt.findUnique({ where: { id: currentGrade.attemptId } });
        if (pending === 0 && attempt) {
          const answers = await tx.examAnswer.findMany({ where: { attemptId: currentGrade.attemptId } });
          const total = answers.reduce((s: number, a: any) => s + (a.pointsAwarded || 0), 0);
          await tx.examAttempt.update({ where: { id: currentGrade.attemptId }, data: { score: Math.max(0, total), state: "FINALIZED", gradingStatus: "COMPLETE", gradedAt: new Date() } });
        }
        return { gradeId: currentGrade.id, attemptFinalized: pending === 0 };
      });
      await createAuditLog(user(req).userId, user(req).email, "FINALIZE", "MANUAL_GRADE", req.params.gradeId, `Finalized grade.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(result);
    } catch (err: any) {
      if (err?.http) { res.status(err.http).json({ error: err.message }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Release results for an exam (bulk) → flips eligible attempts to RELEASED.
  app.post("/api/exams/:id/release", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
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

  app.post("/api/exams/:id/analyze", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    const examId = req.params.id;
    try {
      const questions = await prisma.question.findMany({
        where: { OR: [{ examId }, { examLinks: { some: { examId } } }] },
        include: { optionRows: { orderBy: { orderIndex: "asc" } } },
      });
      const attempts = await prisma.examAttempt.findMany({
        where: { examId, state: { in: ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED", "RELEASED"] } },
        include: { answers: true },
      });
      const activeQuestionIds = questions.map((question: any) => question.id);
      await prisma.questionStatistic.deleteMany({
        where: { examId, ...(activeQuestionIds.length ? { questionId: { notIn: activeQuestionIds } } : {}) },
      });
      // Rank attempts by total score for discrimination (upper/lower 27%).
      const ranked = [...attempts].sort((a, b) => (b.score || 0) - (a.score || 0));
      const groupSize = Math.max(1, Math.floor(ranked.length * 0.27));
      const upper = new Set(ranked.slice(0, groupSize).map((a) => a.id));
      const lower = new Set(ranked.slice(-groupSize).map((a) => a.id));
      const allResponseTimes = attempts.flatMap((attempt: any) => attempt.answers
        .filter((answer: any) => answer.timeSpentSeconds != null)
        .map((answer: any) => Number(answer.timeSpentSeconds))
        .filter(Number.isFinite));
      const globalAvg = allResponseTimes.length
        ? allResponseTimes.reduce((sum: number, seconds: number) => sum + seconds, 0) / allResponseTimes.length
        : 0;

      const stats: any[] = [];
      for (const q of questions) {
        let correct = 0, incorrect = 0, blank = 0, upperC = 0, lowerC = 0, upperN = 0, lowerN = 0, responseCount = 0;
        const times: number[] = []; const scores: number[] = [];
        const incorrectSelections: string[][] = [];
        for (const at of attempts) {
          const assignedIds = Array.isArray(at.selectedQuestionIds) && at.selectedQuestionIds.length
            ? at.selectedQuestionIds
            : Array.isArray(at.questionOrder) && at.questionOrder.length ? at.questionOrder : null;
          if (assignedIds && !assignedIds.includes(q.id)) continue;
          responseCount++;
          if (upper.has(at.id)) upperN++;
          if (lower.has(at.id)) lowerN++;
          const a = at.answers.find((x: any) => x.questionId === q.id);
          if (!a || !hasAnalyticsResponse(a.answerText, a.selectedOptions)) { blank++; continue; }
          if (a.timeSpentSeconds != null) times.push(a.timeSpentSeconds);
          if (a.pointsAwarded != null) scores.push(a.pointsAwarded);
          if (a.isCorrect === true) {
            correct++;
            if (upper.has(at.id)) upperC++;
            if (lower.has(at.id)) lowerC++;
          } else if (a.isCorrect === false) {
            incorrect++;
            incorrectSelections.push(analyticsSelectedValues(a.answerText, a.selectedOptions));
          }
        }
        const analyzedResponses = correct + incorrect + blank;
        const difficulty = analyzedResponses ? correct / analyzedResponses : null; // p-value
        const discrimination = upperN && lowerN ? (upperC / upperN) - (lowerC / lowerN) : null;
        const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const analyticsConfig = analyticsQuestionConfig(q);
        const distractorAnalysis = analyzeDistractorResponses({
          ...analyticsConfig,
          incorrectSelections,
          responseCount,
        });
        const flags: string[] = [];
        if (difficulty != null && difficulty > 0.9) flags.push("TOO_EASY");
        if (difficulty != null && difficulty < 0.2) flags.push("TOO_HARD");
        if (discrimination != null && discrimination < 0.2) flags.push("POOR_DISCRIMINATION");
        if (distractorAnalysis.hasUnusedDistractor) flags.push("UNUSED_DISTRACTOR");
        const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
        if (avgTime != null && globalAvg && avgTime > globalAvg * 1.75) flags.push("SLOW");
        if (analyzedResponses >= 5 && difficulty != null && (difficulty === 0 || difficulty === 1)) flags.push("ABNORMAL_PATTERN");

        const row = {
          questionId: q.id, examId, attempts: responseCount, correctCount: correct, incorrectCount: incorrect, blankCount: blank,
          avgResponseSeconds: avgTime, difficultyIndex: difficulty, discriminationIndex: discrimination,
          distractorRates: distractorAnalysis.distractorRates,
          avgScore, medianScore: median(scores), stdDev: stddev(scores),
          passRate: null, scoreDistribution: null, flags, computedAt: new Date(),
        };
        await prisma.questionStatistic.upsert({
          where: { questionId_examId: { questionId: q.id, examId } },
          create: row,
          update: row,
        });
        stats.push(row);
      }
      await createAuditLog(user(req).userId, user(req).email, "ANALYZE", "EXAM", examId, `Computed item analysis for ${stats.length} questions.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ questions: stats.length, attempts: attempts.length, stats });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.status(503).json({ error: "Run migrations first" }); return; }
      logger.error("analyze failed", err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/exams/:id/analytics", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try {
      const stats = await prisma.questionStatistic.findMany({ where: { examId: req.params.id }, include: { question: true } }).catch(() => []);
      const attempts = await prisma.examAttempt.findMany({ where: { examId: req.params.id, state: { in: ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED", "RELEASED"] } } }).catch(() => []);
      const scores = attempts.map((a: any) => a.score).filter((s: any) => s != null);
      const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
      res.json({
        attempts: attempts.length,
        scoredAttempts: scores.length,
        avgScore: scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null,
        medianScore: median(scores), stdDev: stddev(scores),
        passRate: (exam?.passMark != null && scores.length) ? scores.filter((s: number) => s >= exam.passMark).length / scores.length : null,
        scoreDistribution: scores,
        exam: exam ? { id: exam.id, title: exam.title, totalMarks: exam.totalMarks, passMark: exam.passMark } : null,
        questions: stats,
        flaggedQuestions: stats.filter((s: any) => (s.flags || []).length),
      });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.get("/api/exams/:id/questions/:qid/analytics", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try {
      const stat = await prisma.questionStatistic.findUnique({
        where: { questionId_examId: { questionId: req.params.qid, examId: req.params.id } },
        include: { question: true },
      });
      res.json(stat || null);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Invigilator dashboard (live) ─────────────────────────────────────────
  app.get("/api/exams/:id/invigilator", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    try {
      const examId = req.params.id;
      const assignments = await prisma.examAssignment.findMany({ where: { examId }, include: { student: { include: { user: true } } } }).catch(() => []);
      const attempts = await prisma.examAttempt.findMany({ where: { examId }, include: { student: { include: { user: true } } } }).catch(() => []);
      const byStudent: Record<string, any> = {};
      const activeStates = new Set(["IN_PROGRESS", "PAUSED"]);
      for (const attempt of attempts) {
        const current = byStudent[attempt.studentId];
        const attemptPriority = activeStates.has(attempt.state) ? 1 : 0;
        const currentPriority = current && activeStates.has(current.state) ? 1 : 0;
        if (!current || attemptPriority > currentPriority
          || (attemptPriority === currentPriority && Number(attempt.attemptNumber || 0) > Number(current.attemptNumber || 0))
          || (attemptPriority === currentPriority && Number(attempt.attemptNumber || 0) === Number(current.attemptNumber || 0)
            && new Date(attempt.createdAt).getTime() > new Date(current.createdAt).getTime())) {
          byStudent[attempt.studentId] = attempt;
        }
      }

      const now = Date.now();
      const currentAttempts = Object.values(byStudent) as any[];
      const rows = assignments.length
        ? assignments.map((assignment: any) => ({ student: assignment.student, attempt: byStudent[assignment.studentId] }))
        : currentAttempts.map((attempt: any) => ({ student: attempt.student, attempt }));
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
          remainingSeconds: at?.serverDeadline ? remainingSeconds(at) : null,
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
  app.post("/api/attempts/:attemptId/invigilate", authMiddleware, teacherGuard, attemptExamGuard(), async (req: any, res: any) => {
    const { attemptId } = req.params; const b = req.body || {};
    const action = String(b.action || "").toUpperCase();
    try {
      const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
      let data: any = {};
      let evType = action;
      if (action === "FORCE_SUBMIT") {
        if (["IN_PROGRESS", "PAUSED"].includes(attempt.state)) {
          await finalizeSubmission(attemptId, true, ipOf(req), uaOf(req));
        } else if (!["SUBMITTED", "AUTO_SUBMITTED", "PENDING_GRADING", "FINALIZED", "RELEASED"].includes(attempt.state)) {
          await prisma.examAttempt.update({
            where: { id: attemptId },
            data: { state: "AUTO_SUBMITTED", isCompleted: true, autoSubmitted: true, submittedAt: new Date(), completedAt: new Date(), sessionToken: null },
          });
        }
        await prisma.attemptEvent.create({ data: { attemptId, type: evType, actorId: user(req).userId, actorRole: user(req).role, payload: b, ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
        await createAuditLog(user(req).userId, user(req).email, "INVIGILATE", "EXAM_ATTEMPT", attemptId, `Invigilator action ${action}${b.note ? `: ${b.note}` : ""}.`, ipOf(req), uaOf(req), "SUCCESS");
        res.json({ ok: true, action });
        return;
      }
      switch (action) {
        case "EXTRA_TIME": {
          if (!["IN_PROGRESS", "PAUSED"].includes(attempt.state)) { res.status(409).json({ error: "Extra time can only be added to an active attempt" }); return; }
          const mins = num(b.minutes) || 0;
          if (!Number.isInteger(mins) || mins <= 0 || mins > 1440) { res.status(400).json({ error: "Minutes must be a whole number between 1 and 1440" }); return; }
          const base = attempt.serverDeadline ? new Date(attempt.serverDeadline).getTime() : Date.now();
          data = { serverDeadline: new Date(base + mins * 60000), effectiveDurationMinutes: (attempt.effectiveDurationMinutes || 0) + mins };
          break;
        }
        case "PAUSE":
          if (attempt.state !== "IN_PROGRESS") { res.status(409).json({ error: "Only an in-progress attempt can be paused" }); return; }
          data = { state: "PAUSED", pausedAt: new Date() };
          break;
        case "RESUME": {
          if (attempt.state !== "PAUSED") { res.status(409).json({ error: "Only a paused attempt can be resumed" }); return; }
          // Push the deadline forward by the paused duration.
          let extra = 0;
          if (attempt.pausedAt) extra = Date.now() - new Date(attempt.pausedAt).getTime();
          data = { state: "IN_PROGRESS", pausedAt: null, accumulatedPauseSeconds: (attempt.accumulatedPauseSeconds || 0) + Math.floor(extra / 1000), serverDeadline: attempt.serverDeadline ? new Date(new Date(attempt.serverDeadline).getTime() + extra) : null };
          break;
        }
        case "REOPEN": {
          if (!["SUBMITTED", "AUTO_SUBMITTED", "PENDING_GRADING", "FINALIZED"].includes(attempt.state)) { res.status(409).json({ error: "This attempt cannot be reopened" }); return; }
          const mins = num(b.minutes) ?? 15;
          if (!Number.isInteger(mins) || mins <= 0 || mins > 1440) { res.status(400).json({ error: "Minutes must be a whole number between 1 and 1440" }); return; }
          data = { state: "IN_PROGRESS", isCompleted: false, submittedAt: null, completedAt: null, serverDeadline: new Date(Date.now() + mins * 60000), sessionToken: null };
          break;
        }
        case "INVALIDATE": data = { state: "INVALIDATED", invalidatedAt: new Date(), sessionToken: null }; break;
        case "INCIDENT_NOTE": data = {}; break;
        default: res.status(400).json({ error: "Unknown action" }); return;
      }
      if (action === "REOPEN") {
        await prisma.$transaction(async (tx: any) => {
          const claimed = await tx.examAttempt.updateMany({ where: { id: attemptId, state: attempt.state, updatedAt: attempt.updatedAt }, data: { ...data, score: null, gradingStatus: null, gradedAt: null, releasedAt: null } });
          if (claimed.count !== 1) throw Object.assign(new Error("Attempt changed while applying action"), { http: 409 });
          await tx.examAnswer.updateMany({ where: { attemptId }, data: { isCorrect: null, pointsAwarded: null, autoScore: null, manualScore: null, gradingState: null } });
          await tx.manualGrade.updateMany({
            where: { attemptId },
            data: { status: "PENDING", isFinalized: false, finalizedAt: null, finalizedById: null, score: null, scoreOverride: null, graderId: null },
          });
        });
      } else if (Object.keys(data).length) {
        const claimed = await prisma.examAttempt.updateMany({ where: { id: attemptId, state: attempt.state, updatedAt: attempt.updatedAt }, data });
        if (claimed.count !== 1) { res.status(409).json({ error: "Attempt changed while applying action" }); return; }
      }
      await prisma.attemptEvent.create({ data: { attemptId, type: evType, actorId: user(req).userId, actorRole: user(req).role, payload: b, ipAddress: ipOf(req), userAgent: uaOf(req) } }).catch(() => {});
      await createAuditLog(user(req).userId, user(req).email, "INVIGILATE", "EXAM_ATTEMPT", attemptId, `Invigilator action ${action}${b.note ? `: ${b.note}` : ""}.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true, action });
    } catch (err: any) {
      if (err?.http) { res.status(err.http).json({ error: err.message }); return; }
      logger.error(err); res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Printable export payload ──────────────────────────────────────────────
  // SECURITY: teacher/admin only. `answerKey=1` adds correct answers; never call
  // this from a student context.
  app.get("/api/exams/:id/print", authMiddleware, teacherGuard, examGuard(), async (req: any, res: any) => {
    const withKey = req.query.answerKey === "1" || req.query.answerKey === "true";
    const version = String(req.query.version || "A").toUpperCase();
    try {
      const exam = await prisma.exam.findUnique({
        where: { id: req.params.id },
        include: { sections: { orderBy: { orderIndex: "asc" } }, stimuli: true, questions: true, class: true, subject: true },
      });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      const school = await prisma.schoolProfile.findFirst().catch(() => null);

      let questions = await composeQuestionSet(prisma, req.params.id, `print:${req.params.id}:${version}`);
      // Versioned shuffle (A/B/C) for anti-cheating print sets.
      if (version !== "A") {
        let h = version.charCodeAt(0);
        const rand = () => { h = (Math.imul(1103515245, h) + 12345) & 0x7fffffff; return h / 0x7fffffff; };
        for (let i = questions.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [questions[i], questions[j]] = [questions[j], questions[i]]; }
      }
      const printableOptions = (q: any) => Array.isArray(q.optionRows) && q.optionRows.length
        ? q.optionRows.map((option: any) => ({ key: String(option.id), text: String(option.text) }))
        : Array.isArray(q.options) ? q.options : [];
      const optionLabel = (q: any, answer: unknown) => {
        const raw = String(answer ?? "");
        const options = printableOptions(q);
        const matched = options.find((option: any, index: number) => {
          if (!option || typeof option !== "object") return String(option) === raw;
          return String(option.key ?? option.value ?? option.text ?? index) === raw;
        });
        if (matched != null) return String(typeof matched === "object" ? matched.text ?? matched.value ?? raw : matched);
        const index = Number(raw);
        if (Number.isInteger(index) && options[index] != null) {
          const option = options[index];
          return String(typeof option === "object" ? option.text ?? option.value ?? raw : option);
        }
        return raw;
      };
      const correctValues = (q: any): unknown[] => {
        if (Array.isArray(q.optionRows) && q.optionRows.length) {
          return q.optionRows.filter((option: any) => option.isCorrect).map((option: any) => option.id);
        }
        if (Array.isArray(q.correctAnswers) && q.correctAnswers.length) return q.correctAnswers;
        return q.correctAnswer == null ? [] : [q.correctAnswer];
      };
      // Legacy MCQ stores the correct answer as an option index; show the text.
      const correctText = (q: any) => {
        if (q.type === "DRAG_DROP") {
          const blanks = q.options && !Array.isArray(q.options) && Array.isArray((q.options as any).blanks) ? (q.options as any).blanks : [];
          return blanks.length ? blanks.map((b: any, i: number) => `${i + 1}. ${b.answer}`).join("   ") : null;
        }
        const answers = correctValues(q);
        return answers.length ? answers.map((answer) => optionLabel(q, answer)).join(", ") : null;
      };
      res.json({
        version,
        school: school ? { name: school.name, logoUrl: (school as any).logoUrl ?? null } : null,
        exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks, class: exam.class?.name, subject: exam.subject?.name },
        sections: exam.sections.map((s: any) => ({ id: s.id, title: s.title, instructions: s.instructions })),
        stimuli: exam.stimuli.map((s: any) => ({ id: s.id, type: s.type, title: s.title, content: s.content, mediaUrl: s.mediaUrl })),
        questions: questions.map((q: any, i: number) => ({
          number: i + 1, id: q.id, text: q.text, type: q.type, points: q.pointsOverride ?? q.defaultPoints ?? q.points,
          options: q.type === "DRAG_DROP" ? null : printableOptions(q),
          dragText: q.type === "DRAG_DROP" ? String(q.options?.text ?? "") : undefined,
          dragBank: q.type === "DRAG_DROP" ? seededShuffle(dragDropBank(q.options), `print:${version}:${q.id}`).map((item) => item.label) : undefined,
          stimulusId: q.stimulusId, sectionId: q.sectionId,
          ...(withKey ? { correctAnswer: correctText(q), correctAnswers: correctValues(q).map((answer) => optionLabel(q, answer)) } : {}),
        })),
        answerKey: withKey,
      });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
}
