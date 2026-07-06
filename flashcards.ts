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
  logger: { error: (...a: any[]) => void };
}

/**
 * Flashcards: teachers build study decks (term/definition cards) and assign
 * them to one or more of their classes; students in an assigned class can
 * browse and study those decks. Mirrors the ownership/assignment pattern
 * already used by Homework, just without a submission/grading step.
 */
export function registerFlashcardRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;

  const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
    u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "";

  async function getTeacherForReq(req: express.Request) {
    const jwtUser = (req as any).user as JwtPayload;
    return prisma.teacher.findUnique({ where: { userId: jwtUser.userId } });
  }
  async function getStudentForReq(req: express.Request) {
    const jwtUser = (req as any).user as JwtPayload;
    return prisma.student.findUnique({ where: { userId: jwtUser.userId } });
  }

  function normalizeCards(raw: any): { term: string; definition: string }[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((c: any) => ({
        term: (c?.term ?? "").toString().trim().slice(0, 500),
        definition: (c?.definition ?? "").toString().trim().slice(0, 2000),
      }))
      .filter((c) => c.term && c.definition);
  }

  const deckSummarySelect = {
    id: true, title: true, description: true, createdAt: true, updatedAt: true,
    subject: { select: { id: true, name: true } },
    teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    _count: { select: { cards: true } },
    classLinks: { select: { classId: true, class: { select: { id: true, name: true } } } },
  };

  // ── Teacher/admin: list decks I own (or all, for ADMIN) ──────────────────────
  app.get("/api/flashcards/decks", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["TEACHER", "ADMIN"].includes(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      let where: any = {};
      if (jwtUser.role === "TEACHER") {
        const teacher = await getTeacherForReq(req);
        if (!teacher) { res.status(404).json({ error: "Teacher profile not found" }); return; }
        where = { teacherId: teacher.id };
      }
      const decks = await prisma.flashcardDeck.findMany({
        where, orderBy: { updatedAt: "desc" }, select: deckSummarySelect,
      });
      res.json(decks.map((d: any) => ({
        id: d.id, title: d.title, description: d.description,
        createdAt: d.createdAt, updatedAt: d.updatedAt,
        subject: d.subject, teacherName: fullName(d.teacher?.user),
        cardCount: d._count.cards,
        classes: d.classLinks.map((l: any) => l.class),
      })));
    } catch (err) {
      logger.error("Error listing flashcard decks:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Student: list decks assigned to my class ─────────────────────────────────
  app.get("/api/flashcards/my-decks", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const student = await getStudentForReq(req);
      if (!student?.classId) { res.json([]); return; }
      const decks = await prisma.flashcardDeck.findMany({
        where: { classLinks: { some: { classId: student.classId } } },
        orderBy: { updatedAt: "desc" },
        select: deckSummarySelect,
      });
      res.json(decks.map((d: any) => ({
        id: d.id, title: d.title, description: d.description,
        updatedAt: d.updatedAt, subject: d.subject, teacherName: fullName(d.teacher?.user),
        cardCount: d._count.cards,
      })));
    } catch (err) {
      logger.error("Error listing assigned flashcard decks:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Shared: deck detail (owner teacher, admin, or a student in an assigned class) ──
  app.get("/api/flashcards/decks/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const deck = await prisma.flashcardDeck.findUnique({
        where: { id: req.params.id },
        include: {
          cards: { orderBy: { order: "asc" } },
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
          classLinks: { select: { classId: true, class: { select: { id: true, name: true } } } },
        },
      });
      if (!deck) { res.status(404).json({ error: "Deck not found" }); return; }

      let allowed = jwtUser.role === "ADMIN" || deck.teacher?.userId === jwtUser.userId;
      if (!allowed && jwtUser.role === "STUDENT") {
        const student = await getStudentForReq(req);
        allowed = !!student?.classId && deck.classLinks.some((l: any) => l.classId === student.classId);
      }
      if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }

      res.json({
        id: deck.id, title: deck.title, description: deck.description,
        subject: deck.subject, teacherName: fullName(deck.teacher?.user),
        classes: deck.classLinks.map((l: any) => l.class),
        cards: deck.cards.map((c: any) => ({ id: c.id, term: c.term, definition: c.definition })),
      });
    } catch (err) {
      logger.error("Error fetching flashcard deck:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher/admin: create a deck ─────────────────────────────────────────────
  app.post("/api/flashcards/decks", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["TEACHER", "ADMIN"].includes(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const title = (req.body?.title ?? "").toString().trim().slice(0, 200);
    const description = (req.body?.description ?? "").toString().trim().slice(0, 1000) || null;
    const subjectId = req.body?.subjectId || null;
    const classIds: string[] = Array.isArray(req.body?.classIds) ? req.body.classIds.filter((c: any) => typeof c === "string") : [];
    const cards = normalizeCards(req.body?.cards);
    if (!title) { res.status(400).json({ error: "Title is required" }); return; }
    if (cards.length === 0) { res.status(400).json({ error: "Add at least one card (term + definition)" }); return; }
    try {
      // A deck belongs to a teacher record. Teachers own their own decks;
      // an admin without a linked teacher profile is attributed via the
      // first assigned class's teacher (same fallback /api/homework uses).
      let teacher = await getTeacherForReq(req);
      if (!teacher && jwtUser.role === "ADMIN" && classIds[0]) {
        const ct = await prisma.classTeacher.findFirst({ where: { classId: classIds[0] }, include: { teacher: true } });
        teacher = ct?.teacher ?? null;
      }
      if (!teacher) { res.status(400).json({ error: "No teacher profile available to own this deck -- assign a class with a teacher, or create it as a teacher account" }); return; }
      const teacherId = teacher.id;

      const deck = await prisma.flashcardDeck.create({
        data: {
          title, description, subjectId, teacherId,
          cards: { create: cards.map((c, i) => ({ term: c.term, definition: c.definition, order: i })) },
          classLinks: { create: classIds.map((classId) => ({ classId })) },
        },
      });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "FLASHCARD_DECK", deck.id,
        `Created flashcard deck "${title}" (${cards.length} cards)`,
        req.ip || null, req.headers["user-agent"] || null,
      );
      res.status(201).json({ id: deck.id });
    } catch (err) {
      logger.error("Error creating flashcard deck:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher/admin: update a deck (replaces cards + class assignments) ───────
  app.put("/api/flashcards/decks/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const existing = await prisma.flashcardDeck.findUnique({
        where: { id: req.params.id },
        include: { teacher: { select: { userId: true } } },
      });
      if (!existing) { res.status(404).json({ error: "Deck not found" }); return; }
      if (jwtUser.role !== "ADMIN" && existing.teacher?.userId !== jwtUser.userId) {
        res.status(403).json({ error: "Forbidden" }); return;
      }

      const title = (req.body?.title ?? "").toString().trim().slice(0, 200);
      const description = (req.body?.description ?? "").toString().trim().slice(0, 1000) || null;
      const subjectId = req.body?.subjectId || null;
      const classIds: string[] = Array.isArray(req.body?.classIds) ? req.body.classIds.filter((c: any) => typeof c === "string") : [];
      const cards = normalizeCards(req.body?.cards);
      if (!title) { res.status(400).json({ error: "Title is required" }); return; }
      if (cards.length === 0) { res.status(400).json({ error: "Add at least one card (term + definition)" }); return; }

      await prisma.$transaction([
        prisma.flashcardCard.deleteMany({ where: { deckId: existing.id } }),
        prisma.flashcardDeckClass.deleteMany({ where: { deckId: existing.id } }),
        prisma.flashcardDeck.update({
          where: { id: existing.id },
          data: {
            title, description, subjectId,
            cards: { create: cards.map((c, i) => ({ term: c.term, definition: c.definition, order: i })) },
            classLinks: { create: classIds.map((classId) => ({ classId })) },
          },
        }),
      ]);

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "UPDATE", "FLASHCARD_DECK", existing.id,
        `Updated flashcard deck "${title}"`,
        req.ip || null, req.headers["user-agent"] || null,
      );
      res.json({ success: true });
    } catch (err) {
      logger.error("Error updating flashcard deck:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher/admin: delete a deck ─────────────────────────────────────────────
  app.delete("/api/flashcards/decks/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const existing = await prisma.flashcardDeck.findUnique({
        where: { id: req.params.id },
        include: { teacher: { select: { userId: true } } },
      });
      if (!existing) { res.status(404).json({ error: "Deck not found" }); return; }
      if (jwtUser.role !== "ADMIN" && existing.teacher?.userId !== jwtUser.userId) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      await prisma.flashcardDeck.delete({ where: { id: existing.id } }); // cards/classLinks cascade
      await createAuditLog(
        jwtUser.userId, jwtUser.email, "DELETE", "FLASHCARD_DECK", existing.id,
        `Deleted flashcard deck "${existing.title}"`,
        req.ip || null, req.headers["user-agent"] || null,
      );
      res.json({ success: true });
    } catch (err) {
      logger.error("Error deleting flashcard deck:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const ATTEMPT_MODES = ["QUIZ", "SPELL", "MATCH"];

  async function studentCanAccessDeck(studentId: string | null | undefined, deckId: string): Promise<boolean> {
    if (!studentId) return false;
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student?.classId) return false;
    const link = await prisma.flashcardDeckClass.findFirst({ where: { deckId, classId: student.classId } });
    return !!link;
  }

  // ── Student: record a completed Quiz/Match/Spelling attempt ─────────────────
  app.post("/api/flashcards/decks/:id/attempts", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Forbidden" }); return; }
    const mode = (req.body?.mode ?? "").toString().toUpperCase();
    const score = Number(req.body?.score);
    const total = Number(req.body?.total);
    const durationMs = req.body?.durationMs != null ? Number(req.body.durationMs) : null;
    if (!ATTEMPT_MODES.includes(mode)) { res.status(400).json({ error: "Invalid mode" }); return; }
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0) {
      res.status(400).json({ error: "Invalid score/total" }); return;
    }
    try {
      const student = await getStudentForReq(req);
      if (!student) { res.status(404).json({ error: "Student profile not found" }); return; }
      const deck = await prisma.flashcardDeck.findUnique({ where: { id: req.params.id } });
      if (!deck) { res.status(404).json({ error: "Deck not found" }); return; }
      const canAccess = await studentCanAccessDeck(student.id, deck.id);
      if (!canAccess) { res.status(403).json({ error: "Forbidden" }); return; }

      const attempt = await prisma.flashcardAttempt.create({
        data: { studentId: student.id, deckId: deck.id, mode, score, total, durationMs },
      });
      res.status(201).json({ id: attempt.id });
    } catch (err) {
      logger.error("Error recording flashcard attempt:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Student: my own attempt history + personal bests for a deck ─────────────
  app.get("/api/flashcards/decks/:id/attempts", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const student = await getStudentForReq(req);
      if (!student) { res.status(404).json({ error: "Student profile not found" }); return; }
      const attempts = await prisma.flashcardAttempt.findMany({
        where: { deckId: req.params.id, studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const bestByMode: Record<string, any> = {};
      for (const a of attempts) {
        const prev = bestByMode[a.mode];
        const better = !prev || a.score / a.total > prev.score / prev.total;
        if (better) bestByMode[a.mode] = a;
      }
      res.json({
        attempts: attempts.map((a: any) => ({ id: a.id, mode: a.mode, score: a.score, total: a.total, durationMs: a.durationMs, createdAt: a.createdAt })),
        bestByMode,
      });
    } catch (err) {
      logger.error("Error fetching flashcard attempts:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Student: my per-card mastery map for a deck ──────────────────────────────
  app.get("/api/flashcards/decks/:id/mastery", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const student = await getStudentForReq(req);
      if (!student) { res.status(404).json({ error: "Student profile not found" }); return; }
      const masteries = await prisma.flashcardCardMastery.findMany({
        where: { studentId: student.id, card: { deckId: req.params.id } },
        select: { cardId: true, status: true },
      });
      const map: Record<string, string> = {};
      for (const m of masteries) map[m.cardId] = m.status;
      res.json(map);
    } catch (err) {
      logger.error("Error fetching flashcard mastery:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Student: mark one card as known / still learning ─────────────────────────
  app.put("/api/flashcards/cards/:cardId/mastery", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Forbidden" }); return; }
    const status = (req.body?.status ?? "").toString().toUpperCase();
    if (!["KNOWN", "LEARNING"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
    try {
      const student = await getStudentForReq(req);
      if (!student) { res.status(404).json({ error: "Student profile not found" }); return; }
      const card = await prisma.flashcardCard.findUnique({ where: { id: req.params.cardId } });
      if (!card) { res.status(404).json({ error: "Card not found" }); return; }
      const canAccess = await studentCanAccessDeck(student.id, card.deckId);
      if (!canAccess) { res.status(403).json({ error: "Forbidden" }); return; }

      await prisma.flashcardCardMastery.upsert({
        where: { studentId_cardId: { studentId: student.id, cardId: card.id } },
        create: { studentId: student.id, cardId: card.id, status },
        update: { status },
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error updating flashcard mastery:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher/admin: per-student engagement for a deck (mastery % + best scores) ──
  app.get("/api/flashcards/decks/:id/progress", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["TEACHER", "ADMIN"].includes(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const deck = await prisma.flashcardDeck.findUnique({
        where: { id: req.params.id },
        include: {
          teacher: { select: { userId: true } },
          cards: { select: { id: true } },
          classLinks: { select: { classId: true } },
        },
      });
      if (!deck) { res.status(404).json({ error: "Deck not found" }); return; }
      if (jwtUser.role !== "ADMIN" && deck.teacher?.userId !== jwtUser.userId) {
        res.status(403).json({ error: "Forbidden" }); return;
      }

      const classIds = deck.classLinks.map((l: any) => l.classId);
      const cardIds = deck.cards.map((c: any) => c.id);
      const totalCards = cardIds.length;

      const students = classIds.length
        ? await prisma.student.findMany({
            where: { classId: { in: classIds } },
            select: { id: true, studentCode: true, user: { select: { firstName: true, lastName: true } } },
          })
        : [];
      const studentIds = students.map((s: any) => s.id);

      const [masteries, attempts] = await Promise.all([
        studentIds.length ? prisma.flashcardCardMastery.findMany({
          where: { studentId: { in: studentIds }, cardId: { in: cardIds }, status: "KNOWN" },
          select: { studentId: true },
        }) : [],
        studentIds.length ? prisma.flashcardAttempt.findMany({
          where: { studentId: { in: studentIds }, deckId: deck.id },
          orderBy: { createdAt: "desc" },
        }) : [],
      ]);

      const knownCountByStudent: Record<string, number> = {};
      for (const m of masteries) knownCountByStudent[m.studentId] = (knownCountByStudent[m.studentId] || 0) + 1;

      const bestByStudentMode: Record<string, Record<string, any>> = {};
      const lastActivityByStudent: Record<string, string> = {};
      for (const a of attempts) {
        if (!lastActivityByStudent[a.studentId]) lastActivityByStudent[a.studentId] = a.createdAt;
        bestByStudentMode[a.studentId] = bestByStudentMode[a.studentId] || {};
        const prev = bestByStudentMode[a.studentId][a.mode];
        if (!prev || a.score / a.total > prev.score / prev.total) bestByStudentMode[a.studentId][a.mode] = a;
      }

      res.json({
        totalCards,
        students: students.map((s: any) => ({
          id: s.id, name: fullName(s.user), studentCode: s.studentCode,
          known: knownCountByStudent[s.id] || 0,
          bestByMode: bestByStudentMode[s.id] || {},
          lastActivity: lastActivityByStudent[s.id] || null,
        })),
      });
    } catch (err) {
      logger.error("Error fetching flashcard deck progress:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
