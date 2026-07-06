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
}
