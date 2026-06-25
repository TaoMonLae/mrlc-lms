/**
 * Phase 3 — Reusable Question Bank, topics, exam-question linking, randomized
 * blueprint selection and exam cloning.
 *
 * Registered from server.ts inside startServer() (before the SPA catch-all).
 *
 * Authorization model:
 *  - ADMIN: full access.
 *  - TEACHER: create/edit/approve questions only for their assigned subjects.
 *  - STUDENT: no access to any bank endpoint (none are mounted for students).
 *  - Only APPROVED questions may be added to a PUBLISHED/ACTIVE exam.
 *  - Only ADMIN may archive or restore an APPROVED question.
 *
 * Compatibility: exams without ExamQuestion links or blueprint rules keep using
 * their legacy exam-owned Question rows unchanged. Randomized selection freezes
 * the chosen set + order onto the attempt so historic attempts never change.
 */
import express from "express";

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

const ACTIVE_EXAM_STATUSES = ["PUBLISHED", "ACTIVE", "SCHEDULED"];

// ── seeded RNG (mulberry32 over a hashed string seed) ──────────────────────────
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr]; const rnd = seededRng(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Compose the question set for an attempt from FIXED links + RANDOM blueprint
 * rules (falling back to legacy exam-owned questions). Excludes RETIRED/ARCHIVED,
 * never repeats a question, and is reproducible for a given seed.
 * Returns ordered question objects (full DB rows).
 */
export async function composeQuestionSet(prisma: any, examId: string, seed: string): Promise<any[]> {
  const fixedLinks: any[] = await prisma.examQuestion
    .findMany({ where: { examId }, include: { question: { include: { optionRows: { orderBy: { orderIndex: "asc" } } } } }, orderBy: { displayOrder: "asc" } })
    .catch(() => [] as any[]);
  const rules: any[] = await prisma.examBlueprintRule.findMany({ where: { examId } }).catch(() => [] as any[]);

  // No bank composition configured → legacy path (exam-owned questions).
  if (!fixedLinks.length && !rules.length) {
    return prisma.question.findMany({ where: { examId }, orderBy: { orderIndex: "asc" } });
  }

  const chosen: any[] = [];
  const used = new Set<string>();
  const usable = (q: any) => q && !["RETIRED", "ARCHIVED"].includes(q.status);

  for (const link of fixedLinks) {
    if (link.question && usable(link.question) && !used.has(link.question.id)) {
      used.add(link.question.id);
      chosen.push({ ...link.question, pointsOverride: link.pointsOverride, displayOrder: link.displayOrder, sectionId: link.sectionId ?? link.question.sectionId });
    }
  }

  // RANDOM rules — seeded, deduped, only APPROVED & not retired/archived.
  let ruleIdx = 0;
  for (const r of rules) {
    const candidates: any[] = await prisma.question.findMany({
      where: {
        status: "APPROVED",
        ...(r.subjectId ? { subjectId: r.subjectId } : {}),
        ...(r.topicId ? { topicId: r.topicId } : {}),
        ...(r.difficulty ? { difficulty: r.difficulty } : {}),
        ...(r.type ? { type: r.type } : {}),
        NOT: { id: { in: Array.from(used) } },
      },
      include: { optionRows: { orderBy: { orderIndex: "asc" } } },
    }).catch(() => [] as any[]);
    const shuffled: any[] = seededShuffle(candidates, `${seed}:rule${ruleIdx++}`);
    for (const q of shuffled.slice(0, r.count)) {
      if (used.has(q.id)) continue;
      used.add(q.id);
      chosen.push({ ...q, pointsOverride: r.pointsEach ?? null, sectionId: r.sectionId ?? q.sectionId });
    }
  }
  return chosen;
}

/**
 * Freeze the per-attempt content: question order (optionally shuffled), per-
 * question option order (optionally shuffled), and a content snapshot so the
 * exact text/options shown survive later edits to the bank.
 */
export function freezeAttempt(questions: any[], exam: any, seed: string) {
  let order = questions.map((q) => q.id);
  if (exam.shuffleQuestions) order = seededShuffle(order, `${seed}:q`);

  const optionOrder: Record<string, string[]> = {};
  const frozenContent: any[] = [];
  const byId: Record<string, any> = {};
  for (const q of questions) byId[q.id] = q;

  for (const qid of order) {
    const q = byId[qid];
    if (!q) continue;
    // Normalize options to [{key, text}] from either QuestionOption rows or legacy Json.
    let opts: { key: string; text: string; correct?: boolean; weight?: number | null }[] = [];
    if (Array.isArray(q.optionRows) && q.optionRows.length) {
      opts = q.optionRows.map((o: any) => ({ key: o.id, text: o.text, correct: o.isCorrect, weight: o.weight }));
    } else if (Array.isArray(q.options)) {
      opts = (q.options as any[]).map((o, i) => ({ key: String(typeof o === "object" ? o.value ?? o.text ?? i : o), text: String(typeof o === "object" ? o.text ?? o.value : o) }));
    }
    if (exam.shuffleOptions && opts.length) opts = seededShuffle(opts, `${seed}:opt:${qid}`);
    optionOrder[qid] = opts.map((o) => o.key);
    frozenContent.push({
      id: q.id, text: q.text, type: q.type,
      points: q.pointsOverride ?? q.defaultPoints ?? q.points ?? 0,
      // Student-facing: strip correctness here; correctness stays server-side.
      options: opts.map((o) => ({ key: o.key, text: o.text })),
    });
  }
  return { questionOrder: order, optionOrder, frozenContent };
}

export function registerExamBankRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;
  const user = (req: express.Request) => (req as any).user as JwtPayload;
  const isAdmin = (req: express.Request) => user(req).role === "ADMIN";
  const isTeacher = (req: express.Request) => ["ADMIN", "TEACHER"].includes(user(req).role);
  const ipOf = (req: express.Request) => (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
  const uaOf = (req: express.Request) => (req.headers["user-agent"] as string) || null;
  const num = (v: any): number | null => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
  const audit = (req: express.Request, action: string, type: string, id: string | null, desc: string) =>
    createAuditLog(user(req).userId, user(req).email, action, type, id, desc, ipOf(req), uaOf(req), "SUCCESS");
  const degrade = (err: any, res: any, empty: any) => { if (err?.code === "P2021" || err?.code === "P2022") { res.json(empty); return true; } return false; };

  const teacherGuard: express.RequestHandler = (req, res, next) => { if (!isTeacher(req)) { res.status(403).json({ error: "Forbidden" }); return; } next(); };
  const adminGuard: express.RequestHandler = (req, res, next) => { if (!isAdmin(req)) { res.status(403).json({ error: "Admin only" }); return; } next(); };

  // Subjects a teacher may author for (ADMIN → null = unrestricted).
  async function allowedSubjectIds(req: express.Request): Promise<string[] | null> {
    if (isAdmin(req)) return null;
    const teacher = await prisma.teacher.findUnique({ where: { userId: user(req).userId } }).catch(() => null);
    if (!teacher) return [];
    const links = await prisma.subjectTeacher.findMany({ where: { teacherId: teacher.id } }).catch(() => []);
    return links.map((l: any) => l.subjectId);
  }
  async function canEditSubject(req: express.Request, subjectId: string | null | undefined): Promise<boolean> {
    const ids = await allowedSubjectIds(req);
    if (ids === null) return true;
    if (!subjectId) return true; // ungrouped questions editable by any teacher
    return ids.includes(subjectId);
  }

  // ── Topics ──────────────────────────────────────────────────────────────────
  app.get("/api/question-topics", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const { subjectId } = req.query as Record<string, string>;
    try { res.json(await prisma.questionTopic.findMany({ where: { ...(subjectId ? { subjectId } : {}) }, orderBy: { name: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.post("/api/question-topics", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const b = req.body || {};
    if (!b.name) { res.status(400).json({ error: "name required" }); return; }
    if (b.parentId && b.parentId === b.id) { res.status(400).json({ error: "topic cannot be its own parent" }); return; }
    try { const row = await prisma.questionTopic.create({ data: { name: b.name, code: b.code || null, subjectId: b.subjectId || null, parentId: b.parentId || null } }); await audit(req, "CREATE", "QUESTION_TOPIC", row.id, `Topic '${row.name}' created.`); res.status(201).json(row); }
    catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.put("/api/question-topics/:id", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const b = req.body || {};
    if (b.parentId === req.params.id) { res.status(400).json({ error: "topic cannot be its own parent" }); return; }
    try { const row = await prisma.questionTopic.update({ where: { id: req.params.id }, data: { name: b.name, code: b.code ?? undefined, subjectId: b.subjectId ?? undefined, parentId: b.parentId ?? undefined } }); await audit(req, "UPDATE", "QUESTION_TOPIC", row.id, `Topic updated.`); res.json(row); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.delete("/api/question-topics/:id", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try { await prisma.question.updateMany({ where: { topicId: req.params.id }, data: { topicId: null } }); await prisma.questionTopic.delete({ where: { id: req.params.id } }); await audit(req, "DELETE", "QUESTION_TOPIC", req.params.id, `Topic removed.`); res.json({ ok: true }); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Banks (optional grouping) ─────────────────────────────────────────────────
  app.get("/api/question-banks", authMiddleware, teacherGuard, async (_req: any, res: any) => {
    try { res.json(await prisma.questionBank.findMany({ orderBy: { name: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.post("/api/question-banks", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const b = req.body || {};
    try { const row = await prisma.questionBank.create({ data: { name: b.name || "Question Bank", subjectId: b.subjectId || null, description: b.description || null, createdById: user(req).userId } }); await audit(req, "CREATE", "QUESTION_BANK", row.id, `Bank '${row.name}' created.`); res.status(201).json(row); }
    catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Question bank: list + detail ──────────────────────────────────────────────
  app.get("/api/question-bank", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const { subjectId, topicId, difficulty, status, type, q, bankId, page } = req.query as Record<string, string>;
    const take = 50; const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    try {
      const where: any = {
        // bank questions only (legacy exam-owned still listed if they have no exam? no — restrict to bank-capable)
        ...(subjectId ? { subjectId } : {}),
        ...(topicId ? { topicId } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(status ? { status } : { status: { not: "ARCHIVED" } }),
        ...(type ? { type } : {}),
        ...(bankId ? { bankId } : {}),
        ...(q ? { text: { contains: q, mode: "insensitive" } } : {}),
      };
      // Teachers see only their subjects' questions (+ ungrouped).
      const ids = await allowedSubjectIds(req);
      if (ids !== null) where.OR = [{ subjectId: { in: ids } }, { subjectId: null }];
      const [items, total] = await Promise.all([
        prisma.question.findMany({ where, include: { topic: true, optionRows: true }, orderBy: { updatedAt: "desc" }, take, skip }),
        prisma.question.count({ where }),
      ]);
      res.json({ items, total, page: Number(page) || 1, pageSize: take });
    } catch (err: any) { if (degrade(err, res, { items: [], total: 0 })) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.get("/api/question-bank/:id", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const item = await prisma.question.findUnique({ where: { id: req.params.id }, include: { topic: true, optionRows: { orderBy: { orderIndex: "asc" } } } });
      if (!item) { res.status(404).json({ error: "Not found" }); return; }
      res.json(item);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Create / update question (+options) ───────────────────────────────────────
  const DIFFICULTY = ["EASY", "MEDIUM", "HARD"];
  app.post("/api/question-bank", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const b = req.body || {};
    if (!b.text || !b.type) { res.status(400).json({ error: "text and type are required" }); return; }
    if (!(await canEditSubject(req, b.subjectId))) { res.status(403).json({ error: "Not your subject" }); return; }
    const options: any[] = Array.isArray(b.options) ? b.options : [];
    try {
      const row = await prisma.question.create({
        data: {
          text: b.text, type: b.type, points: num(b.defaultPoints) ?? 1,
          subjectId: b.subjectId || null, topicId: b.topicId || null, subtopic: b.subtopic || null,
          bankId: b.bankId || null, difficulty: DIFFICULTY.includes(b.difficulty) ? b.difficulty : null,
          defaultPoints: num(b.defaultPoints), estimatedTimeSeconds: num(b.estimatedTimeSeconds),
          explanation: b.explanation || null, status: "DRAFT", version: 1,
          tags: Array.isArray(b.tags) ? b.tags : [], language: b.language || null,
          correctAnswer: b.correctAnswer || null, correctAnswers: b.correctAnswers ?? null,
          partialCredit: !!b.partialCredit, caseSensitive: !!b.caseSensitive,
          requiresManualGrading: !!b.requiresManualGrading, numericTolerance: num(b.numericTolerance),
          createdById: user(req).userId,
          // examId stays null → this is a reusable bank question.
          optionRows: { create: options.map((o, i) => ({ text: o.text || "", isCorrect: !!o.isCorrect, weight: num(o.weight), orderIndex: i })) },
        },
        include: { optionRows: true },
      });
      await audit(req, "CREATE", "BANK_QUESTION", row.id, `Question created (DRAFT).`);
      res.status(201).json(row);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.put("/api/question-bank/:id", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const b = req.body || {};
    try {
      const existing = await prisma.question.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await canEditSubject(req, existing.subjectId))) { res.status(403).json({ error: "Not your subject" }); return; }
      if (existing.status === "ARCHIVED" && !isAdmin(req)) { res.status(409).json({ error: "Archived — restore first (admin)" }); return; }

      const data: any = {};
      for (const k of ["text", "explanation", "subtopic", "language", "correctAnswer"]) if (b[k] !== undefined) data[k] = b[k] || null;
      if (b.type !== undefined) data.type = b.type;
      if (b.subjectId !== undefined) data.subjectId = b.subjectId || null;
      if (b.topicId !== undefined) data.topicId = b.topicId || null;
      if (b.bankId !== undefined) data.bankId = b.bankId || null;
      if (b.difficulty !== undefined) data.difficulty = DIFFICULTY.includes(b.difficulty) ? b.difficulty : null;
      if (b.defaultPoints !== undefined) { data.defaultPoints = num(b.defaultPoints); data.points = num(b.defaultPoints) ?? existing.points; }
      if (b.estimatedTimeSeconds !== undefined) data.estimatedTimeSeconds = num(b.estimatedTimeSeconds);
      if (b.tags !== undefined) data.tags = Array.isArray(b.tags) ? b.tags : [];
      if (b.correctAnswers !== undefined) data.correctAnswers = b.correctAnswers ?? null;
      if (b.partialCredit !== undefined) data.partialCredit = !!b.partialCredit;
      if (b.caseSensitive !== undefined) data.caseSensitive = !!b.caseSensitive;
      if (b.requiresManualGrading !== undefined) data.requiresManualGrading = !!b.requiresManualGrading;
      if (b.numericTolerance !== undefined) data.numericTolerance = num(b.numericTolerance);
      // Editing an APPROVED question sends it back to review and bumps the version.
      if (existing.status === "APPROVED" && (b.text !== undefined || b.options !== undefined || b.correctAnswer !== undefined)) {
        data.status = "UNDER_REVIEW"; data.version = (existing.version || 1) + 1; data.approvedAt = null;
      }

      const row = await prisma.$transaction(async (tx: any) => {
        if (Array.isArray(b.options)) {
          await tx.questionOption.deleteMany({ where: { questionId: req.params.id } });
          for (let i = 0; i < b.options.length; i++) {
            const o = b.options[i];
            await tx.questionOption.create({ data: { questionId: req.params.id, text: o.text || "", isCorrect: !!o.isCorrect, weight: num(o.weight), orderIndex: i } });
          }
        }
        return tx.question.update({ where: { id: req.params.id }, data, include: { optionRows: { orderBy: { orderIndex: "asc" } } } });
      });
      await audit(req, "UPDATE", "BANK_QUESTION", row.id, `Question updated (v${row.version}, status ${row.status}).`);
      res.json(row);
    } catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Approve / archive / restore ───────────────────────────────────────────────
  app.post("/api/question-bank/:id/approve", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const q = await prisma.question.findUnique({ where: { id: req.params.id } });
      if (!q) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await canEditSubject(req, q.subjectId))) { res.status(403).json({ error: "Not your subject" }); return; }
      const row = await prisma.question.update({ where: { id: req.params.id }, data: { status: "APPROVED", approvedAt: new Date(), reviewedById: user(req).userId } });
      await audit(req, "APPROVE", "BANK_QUESTION", row.id, `Question approved.`);
      res.json(row);
    } catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.post("/api/question-bank/:id/archive", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const q = await prisma.question.findUnique({ where: { id: req.params.id } });
      if (!q) { res.status(404).json({ error: "Not found" }); return; }
      // Only ADMIN may archive an APPROVED question.
      if (q.status === "APPROVED" && !isAdmin(req)) { res.status(403).json({ error: "Only admin may archive an approved question" }); return; }
      if (!(await canEditSubject(req, q.subjectId))) { res.status(403).json({ error: "Not your subject" }); return; }
      const row = await prisma.question.update({ where: { id: req.params.id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      await audit(req, "ARCHIVE", "BANK_QUESTION", row.id, `Question archived.`, );
      res.json(row);
    } catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.post("/api/question-bank/:id/restore", authMiddleware, adminGuard, async (req: any, res: any) => {
    try {
      const row = await prisma.question.update({ where: { id: req.params.id }, data: { status: "APPROVED", archivedAt: null, approvedAt: new Date(), reviewedById: user(req).userId } });
      await audit(req, "RESTORE", "BANK_QUESTION", row.id, `Question restored to APPROVED.`);
      res.json(row);
    } catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Exam ↔ bank linking ───────────────────────────────────────────────────────
  app.get("/api/exams/:id/bank-questions", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try { res.json(await prisma.examQuestion.findMany({ where: { examId: req.params.id }, include: { question: { include: { optionRows: true } } }, orderBy: { displayOrder: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.post("/api/exams/:id/questions", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const { id } = req.params; const b = req.body || {};
    const questionIds: string[] = Array.isArray(b.questionIds) ? b.questionIds : (b.questionId ? [b.questionId] : []);
    if (!questionIds.length) { res.status(400).json({ error: "questionIds required" }); return; }
    try {
      const exam = await prisma.exam.findUnique({ where: { id } });
      if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
      const requireApproved = ACTIVE_EXAM_STATUSES.includes(exam.status);
      const qs = await prisma.question.findMany({ where: { id: { in: questionIds } } });
      for (const q of qs) {
        if (["RETIRED", "ARCHIVED"].includes(q.status)) { res.status(409).json({ error: `Question ${q.id} is ${q.status}` }); return; }
        if (requireApproved && q.status !== "APPROVED") { res.status(409).json({ error: "Only APPROVED questions may be added to a published exam" }); return; }
      }
      const base = await prisma.examQuestion.count({ where: { examId: id } });
      const created = await prisma.$transaction(qs.map((q: any, i: number) => prisma.examQuestion.upsert({
        where: { examId_questionId: { examId: id, questionId: q.id } },
        create: { examId: id, questionId: q.id, sectionId: b.sectionId || null, displayOrder: base + i, sourceType: "FIXED", pointsOverride: num(b.pointsOverride) },
        update: { sectionId: b.sectionId ?? undefined },
      })));
      await audit(req, "ADD_QUESTION", "EXAM", id, `Added ${created.length} bank question(s) to exam.`);
      res.status(201).json(created);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.delete("/api/exam-questions/:id", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try { const row = await prisma.examQuestion.delete({ where: { id: req.params.id } }); await audit(req, "REMOVE_QUESTION", "EXAM", row.examId, `Removed question link ${req.params.id}.`); res.json({ ok: true }); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  app.put("/api/exams/:id/questions/reorder", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const order: { id: string; displayOrder: number }[] = Array.isArray(req.body?.order) ? req.body.order : [];
    try {
      await prisma.$transaction(order.map((o) => prisma.examQuestion.update({ where: { id: o.id }, data: { displayOrder: Number(o.displayOrder) || 0 } })));
      await audit(req, "REORDER", "EXAM", req.params.id, `Reordered ${order.length} questions.`);
      res.json({ ok: true });
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Blueprint (random-selection) rules ────────────────────────────────────────
  app.get("/api/exams/:id/blueprint", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try { res.json(await prisma.examBlueprintRule.findMany({ where: { examId: req.params.id }, orderBy: { createdAt: "asc" } })); }
    catch (err: any) { if (degrade(err, res, [])) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.post("/api/exams/:id/blueprint", authMiddleware, teacherGuard, async (req: any, res: any) => {
    const b = req.body || {};
    try {
      const row = await prisma.examBlueprintRule.create({ data: { examId: req.params.id, sectionId: b.sectionId || null, subjectId: b.subjectId || null, topicId: b.topicId || null, difficulty: DIFFICULTY.includes(b.difficulty) ? b.difficulty : null, type: b.type || null, count: num(b.count) ?? 1, pointsEach: num(b.pointsEach) } });
      await audit(req, "BLUEPRINT_CHANGE", "EXAM", req.params.id, `Blueprint rule added (count ${row.count}).`);
      res.status(201).json(row);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
  app.delete("/api/blueprint-rules/:id", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try { const row = await prisma.examBlueprintRule.delete({ where: { id: req.params.id } }); await audit(req, "BLUEPRINT_CHANGE", "EXAM", row.examId, `Blueprint rule removed.`); res.json({ ok: true }); }
    catch (err: any) { if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; } logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // Preview a generated set (does NOT persist; uses a throwaway seed).
  app.get("/api/exams/:id/blueprint/preview", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const set = await composeQuestionSet(prisma, req.params.id, `preview:${Date.now()}`);
      res.json({ count: set.length, questions: set.map((q: any) => ({ id: q.id, text: q.text, type: q.type, difficulty: q.difficulty, points: q.pointsOverride ?? q.defaultPoints ?? q.points, source: q.sourceType || "RANDOM" })) });
    } catch (err: any) { if (degrade(err, res, { count: 0, questions: [] })) return; logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });

  // ── Clone exam ────────────────────────────────────────────────────────────────
  // Copies metadata, sections, FIXED question links and blueprint rules into a new
  // DRAFT exam. Never copies attempts/answers/results.
  app.post("/api/exams/:id/clone", authMiddleware, teacherGuard, async (req: any, res: any) => {
    try {
      const src = await prisma.exam.findUnique({ where: { id: req.params.id }, include: { sections: true, examQuestions: true, blueprintRules: true } });
      if (!src) { res.status(404).json({ error: "Exam not found" }); return; }
      const newExam = await prisma.$transaction(async (tx: any) => {
        const exam = await tx.exam.create({ data: {
          title: `${src.title} (Copy)`, type: src.type, status: "DRAFT", date: src.date,
          durationMinutes: src.durationMinutes, totalMarks: src.totalMarks, settings: src.settings ?? undefined,
          classId: src.classId, subjectId: src.subjectId, passMark: src.passMark,
          shuffleQuestions: src.shuffleQuestions, shuffleOptions: src.shuffleOptions, negativeMarking: src.negativeMarking,
          attemptLimit: src.attemptLimit, gracePeriodMinutes: src.gracePeriodMinutes, allowLateStart: src.allowLateStart,
          requiresAccessCode: false, requiresInvigilator: src.requiresInvigilator, clonedFromId: src.id,
        }});
        // Sections (remap old→new id for links).
        const sectionMap: Record<string, string> = {};
        for (const s of src.sections) {
          const ns = await tx.examSection.create({ data: { examId: exam.id, title: s.title, description: s.description, instructions: s.instructions, orderIndex: s.orderIndex, timeLimitMinutes: s.timeLimitMinutes, shuffleQuestions: s.shuffleQuestions, questionsToPick: s.questionsToPick } });
          sectionMap[s.id] = ns.id;
        }
        // FIXED question links.
        for (const eq of src.examQuestions) {
          await tx.examQuestion.create({ data: { examId: exam.id, questionId: eq.questionId, sectionId: eq.sectionId ? sectionMap[eq.sectionId] || null : null, pointsOverride: eq.pointsOverride, displayOrder: eq.displayOrder, required: eq.required, sourceType: eq.sourceType } });
        }
        // Blueprint rules.
        for (const r of src.blueprintRules) {
          await tx.examBlueprintRule.create({ data: { examId: exam.id, sectionId: r.sectionId ? sectionMap[r.sectionId] || null : null, subjectId: r.subjectId, topicId: r.topicId, difficulty: r.difficulty, type: r.type, count: r.count, pointsEach: r.pointsEach } });
        }
        return exam;
      });
      await audit(req, "CLONE", "EXAM", newExam.id, `Cloned from exam ${src.id}.`);
      res.status(201).json(newExam);
    } catch (err) { logger.error(err); res.status(500).json({ error: "Internal Server Error" }); }
  });
}
