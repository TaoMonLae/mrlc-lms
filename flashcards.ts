import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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

const FLASHCARD_IMAGE_DIR = process.env.FLASHCARD_IMAGE_DIR || path.join(process.cwd(), "data", "flashcards");
fs.mkdirSync(FLASHCARD_IMAGE_DIR, { recursive: true });

const flashcardImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, FLASHCARD_IMAGE_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith("image/") && allowed.has(ext)) cb(null, true);
    else cb(new Error("Only PNG, JPG, WEBP, and GIF image files are allowed") as any);
  },
});

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

  function normalizeCards(raw: any): { id?: string; term: string; definition: string; imageUrl: string | null }[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((c: any) => ({
        id: typeof c?.id === "string" && c.id.trim() ? c.id.trim() : undefined,
        term: (c?.term ?? "").toString().trim().slice(0, 500),
        definition: (c?.definition ?? "").toString().trim().slice(0, 2000),
        imageUrl: c?.imageUrl ? c.imageUrl.toString().trim().slice(0, 500) : null,
      }))
      .filter((c) => c.term && c.definition);
  }

  // Best-effort cleanup of image files that are actually going away (deck
  // update replaces all cards, deck delete removes them all) -- mirrors the
  // social post image cleanup elsewhere in the app. `keepUrls` lets an update
  // that re-submits the same imageUrl for an edited card avoid deleting a
  // file the new row still points at. Never blocks the request.
  async function deleteCardImages(deckId: string, keepUrls: Set<string> = new Set()) {
    try {
      const cards = await prisma.flashcardCard.findMany({ where: { deckId, imageUrl: { not: null } }, select: { imageUrl: true } });
      for (const c of cards) {
        if (!c.imageUrl || keepUrls.has(c.imageUrl)) continue;
        try {
          const fp = path.join(FLASHCARD_IMAGE_DIR, path.basename(c.imageUrl));
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  const deckSummarySelect = {
    id: true, title: true, description: true, shared: true, createdAt: true, updatedAt: true,
    subject: { select: { id: true, name: true } },
    teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    _count: { select: { cards: true } },
    classLinks: { select: { classId: true, class: { select: { id: true, name: true } } } },
  };

  // A deck must be owned by a Teacher record for class assignment, but an
  // administrator can create it without being that teacher. Use the immutable
  // creation audit entry as the displayed author so ownership never mislabels
  // an admin-authored Community deck as another teacher's work.
  async function getDeckAuthorNames(deckIds: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (!deckIds.length) return names;
    try {
      const logs = await prisma.auditLog.findMany({
        where: { entityType: "FLASHCARD_DECK", action: "CREATE", entityId: { in: deckIds } },
        orderBy: { createdAt: "asc" },
        select: { entityId: true, userId: true },
      });
      const authorIdByDeck = new Map<string, string>();
      for (const log of logs) {
        if (log.entityId && log.userId && !authorIdByDeck.has(log.entityId)) authorIdByDeck.set(log.entityId, log.userId);
      }
      const authorIds = Array.from(new Set(authorIdByDeck.values()));
      if (!authorIds.length) return names;
      const users = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const userNames = new Map<string, string>(users.map((u: any) => [u.id, fullName(u)]));
      for (const [deckId, userId] of authorIdByDeck) {
        const name = userNames.get(userId);
        if (name) names.set(deckId, name);
      }
    } catch {
      // Older installations may not retain audit data; callers fall back to owner.
    }
    return names;
  }

  async function validateTeacherClassAccess(jwtUser: JwtPayload, teacherId: string, classIds: string[]): Promise<boolean> {
    if (jwtUser.role === "ADMIN" || classIds.length === 0) return true;
    const allowed = await prisma.classTeacher.findMany({
      where: { teacherId, classId: { in: classIds } },
      select: { classId: true },
    });
    return new Set(allowed.map((c: any) => c.classId)).size === new Set(classIds).size;
  }

  function isBetterAttempt(candidate: any, previous: any): boolean {
    if (!previous) return true;
    const candidatePct = candidate.score / candidate.total;
    const previousPct = previous.score / previous.total;
    if (candidatePct !== previousPct) return candidatePct > previousPct;
    if (candidate.durationMs == null && previous.durationMs == null) return candidate.createdAt > previous.createdAt;
    if (candidate.durationMs == null) return false;
    if (previous.durationMs == null) return true;
    if (candidate.durationMs !== previous.durationMs) return candidate.durationMs < previous.durationMs;
    return candidate.createdAt > previous.createdAt;
  }

  // ── Image upload for card faces ─────────────────────────────────────────────
  app.use("/uploads/flashcards", express.static(FLASHCARD_IMAGE_DIR, { maxAge: process.env.NODE_ENV === "production" ? "30d" : 0 }));

  app.post(
    "/api/flashcards/image-upload",
    authMiddleware,
    (req, res, next) => {
      const jwtUser = (req as any).user as JwtPayload;
      if (!["TEACHER", "ADMIN"].includes(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
      next();
    },
    (req, res, next) => {
      flashcardImageUpload.single("file")(req, res, (err: any) => {
        if (!err) return next();
        const msg = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" ? "Image must be 8 MB or smaller" : err.message || "Upload failed";
        res.status(400).json({ error: msg });
      });
    },
    (req, res) => {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }
      res.status(201).json({ url: `/uploads/flashcards/${file.filename}` });
    },
  );

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
      const authorNames = await getDeckAuthorNames(decks.map((d: any) => d.id));
      res.json(decks.map((d: any) => ({
        id: d.id, title: d.title, description: d.description, shared: d.shared,
        createdAt: d.createdAt, updatedAt: d.updatedAt,
        subject: d.subject, teacherName: fullName(d.teacher?.user), authorName: authorNames.get(d.id) || fullName(d.teacher?.user),
        cardCount: d._count.cards,
        classes: d.classLinks.map((l: any) => l.class),
      })));
    } catch (err) {
      logger.error("Error listing flashcard decks:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Teacher/admin: browse decks other teachers have shared ──────────────────
  app.get("/api/flashcards/community", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["TEACHER", "ADMIN"].includes(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const myTeacher = await getTeacherForReq(req);
      const decks = await prisma.flashcardDeck.findMany({
        where: { shared: true, ...(myTeacher ? { teacherId: { not: myTeacher.id } } : {}) },
        orderBy: { updatedAt: "desc" },
        select: deckSummarySelect,
      });
      const authorNames = await getDeckAuthorNames(decks.map((d: any) => d.id));
      res.json(decks.map((d: any) => ({
        id: d.id, title: d.title, description: d.description,
        updatedAt: d.updatedAt, subject: d.subject, teacherName: fullName(d.teacher?.user), authorName: authorNames.get(d.id) || fullName(d.teacher?.user),
        cardCount: d._count.cards,
      })));
    } catch (err) {
      logger.error("Error listing community flashcard decks:", err);
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
      const authorNames = await getDeckAuthorNames(decks.map((d: any) => d.id));
      res.json(decks.map((d: any) => ({
        id: d.id, title: d.title, description: d.description,
        updatedAt: d.updatedAt, subject: d.subject, teacherName: fullName(d.teacher?.user), authorName: authorNames.get(d.id) || fullName(d.teacher?.user),
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
      // A shared deck can be previewed by any other teacher browsing the
      // Community tab, so they can see what's inside before cloning it.
      if (!allowed && jwtUser.role === "TEACHER" && deck.shared) allowed = true;
      if (!allowed && jwtUser.role === "STUDENT") {
        const student = await getStudentForReq(req);
        allowed = !!student?.classId && deck.classLinks.some((l: any) => l.classId === student.classId);
      }
      if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }

      const authorNames = await getDeckAuthorNames([deck.id]);
      res.json({
        id: deck.id, title: deck.title, description: deck.description, shared: deck.shared,
        subject: deck.subject, teacherName: fullName(deck.teacher?.user), authorName: authorNames.get(deck.id) || fullName(deck.teacher?.user),
        classes: deck.classLinks.map((l: any) => l.class),
        cards: deck.cards.map((c: any) => ({ id: c.id, term: c.term, definition: c.definition, imageUrl: c.imageUrl ?? null })),
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
    const shared = Boolean(req.body?.shared);
    const classIds: string[] = Array.from(new Set(Array.isArray(req.body?.classIds) ? req.body.classIds.filter((c: any) => typeof c === "string") : []));
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
      const canUseClasses = await validateTeacherClassAccess(jwtUser, teacherId, classIds);
      if (!canUseClasses) { res.status(403).json({ error: "You can only assign decks to your own classes" }); return; }

      const deck = await prisma.flashcardDeck.create({
        data: {
          title, description, subjectId, teacherId, shared,
          cards: { create: cards.map((c, i) => ({ term: c.term, definition: c.definition, imageUrl: c.imageUrl, order: i })) },
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
        include: { teacher: { select: { userId: true } }, cards: { select: { id: true, imageUrl: true } } },
      });
      if (!existing) { res.status(404).json({ error: "Deck not found" }); return; }
      if (jwtUser.role !== "ADMIN" && existing.teacher?.userId !== jwtUser.userId) {
        res.status(403).json({ error: "Forbidden" }); return;
      }

      const title = (req.body?.title ?? "").toString().trim().slice(0, 200);
      const description = (req.body?.description ?? "").toString().trim().slice(0, 1000) || null;
      const subjectId = req.body?.subjectId || null;
      const shared = Boolean(req.body?.shared);
      const classIds: string[] = Array.from(new Set(Array.isArray(req.body?.classIds) ? req.body.classIds.filter((c: any) => typeof c === "string") : []));
      const cards = normalizeCards(req.body?.cards);
      if (!title) { res.status(400).json({ error: "Title is required" }); return; }
      if (cards.length === 0) { res.status(400).json({ error: "Add at least one card (term + definition)" }); return; }
      const canUseClasses = await validateTeacherClassAccess(jwtUser, existing.teacherId, classIds);
      if (!canUseClasses) { res.status(403).json({ error: "You can only assign decks to your own classes" }); return; }

      const existingCardIds = new Set(existing.cards.map((c: any) => c.id));
      const incomingIds = cards.map((c) => c.id).filter((cardId): cardId is string => !!cardId);
      const invalidIds = incomingIds.filter((cardId) => !existingCardIds.has(cardId));
      if (invalidIds.length > 0) { res.status(400).json({ error: "One or more cards do not belong to this deck" }); return; }

      const keepImageUrls = new Set(cards.map((c) => c.imageUrl).filter((u): u is string => !!u));
      await deleteCardImages(existing.id, keepImageUrls);

      await prisma.$transaction(async (tx: any) => {
        await tx.flashcardCard.deleteMany({
          where: { deckId: existing.id, ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}) },
        });
        await tx.flashcardDeckClass.deleteMany({ where: { deckId: existing.id } });
        await tx.flashcardDeck.update({
          where: { id: existing.id },
          data: {
            title, description, subjectId, shared,
            classLinks: { create: classIds.map((classId) => ({ classId })) },
          },
        });
        for (const [i, c] of cards.entries()) {
          if (c.id) {
            await tx.flashcardCard.update({
              where: { id: c.id },
              data: { term: c.term, definition: c.definition, imageUrl: c.imageUrl, order: i },
            });
          } else {
            await tx.flashcardCard.create({
              data: { deckId: existing.id, term: c.term, definition: c.definition, imageUrl: c.imageUrl, order: i },
            });
          }
        }
      });

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
      await deleteCardImages(existing.id);
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
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0 || score > total) {
      res.status(400).json({ error: "Invalid score/total" }); return;
    }
    if (durationMs != null && (!Number.isFinite(durationMs) || durationMs < 0)) {
      res.status(400).json({ error: "Invalid duration" }); return;
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
      const deck = await prisma.flashcardDeck.findUnique({ where: { id: req.params.id } });
      if (!deck) { res.status(404).json({ error: "Deck not found" }); return; }
      const canAccess = await studentCanAccessDeck(student.id, deck.id);
      if (!canAccess) { res.status(403).json({ error: "Forbidden" }); return; }
      const attempts = await prisma.flashcardAttempt.findMany({
        where: { deckId: deck.id, studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const bestByMode: Record<string, any> = {};
      for (const a of attempts) {
        const prev = bestByMode[a.mode];
        if (isBetterAttempt(a, prev)) bestByMode[a.mode] = a;
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
      const deck = await prisma.flashcardDeck.findUnique({ where: { id: req.params.id } });
      if (!deck) { res.status(404).json({ error: "Deck not found" }); return; }
      const canAccess = await studentCanAccessDeck(student.id, deck.id);
      if (!canAccess) { res.status(403).json({ error: "Forbidden" }); return; }
      const masteries = await prisma.flashcardCardMastery.findMany({
        where: { studentId: student.id, card: { deckId: deck.id } },
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
      const lastActivityByStudent: Record<string, any> = {};
      for (const a of attempts) {
        if (!lastActivityByStudent[a.studentId]) lastActivityByStudent[a.studentId] = a.createdAt;
        bestByStudentMode[a.studentId] = bestByStudentMode[a.studentId] || {};
        const prev = bestByStudentMode[a.studentId][a.mode];
        if (isBetterAttempt(a, prev)) bestByStudentMode[a.studentId][a.mode] = a;
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

  // ── Teacher/admin: clone a deck into my own library ──────────────────────────
  // Works on any deck that's shared (Community tab), or one you already own
  // (e.g. to reuse it for a different class without disturbing the original's
  // assignments). The clone always starts private and unassigned.
  app.post("/api/flashcards/decks/:id/clone", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!["TEACHER", "ADMIN"].includes(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const source = await prisma.flashcardDeck.findUnique({
        where: { id: req.params.id },
        include: { cards: { orderBy: { order: "asc" } }, teacher: { select: { userId: true } } },
      });
      if (!source) { res.status(404).json({ error: "Deck not found" }); return; }
      const isOwner = source.teacher?.userId === jwtUser.userId;
      if (!source.shared && !isOwner && jwtUser.role !== "ADMIN") { res.status(403).json({ error: "Forbidden" }); return; }

      const teacher = await getTeacherForReq(req);
      if (!teacher) { res.status(400).json({ error: "Only a teacher account can clone a deck into its own library" }); return; }

      // Duplicate each card's image file on disk (rather than pointing the
      // clone at the source's file) so deleting either deck later can't
      // orphan or break the other's images.
      const cloneImageUrl = (url: string | null): string | null => {
        if (!url) return null;
        try {
          const srcPath = path.join(FLASHCARD_IMAGE_DIR, path.basename(url));
          if (!fs.existsSync(srcPath)) return null;
          const ext = path.extname(srcPath) || ".jpg";
          const destName = `${crypto.randomUUID()}${ext}`;
          fs.copyFileSync(srcPath, path.join(FLASHCARD_IMAGE_DIR, destName));
          return `/uploads/flashcards/${destName}`;
        } catch {
          return null;
        }
      };

      const clone = await prisma.flashcardDeck.create({
        data: {
          title: `${source.title} (Copy)`,
          description: source.description,
          subjectId: source.subjectId,
          teacherId: teacher.id,
          shared: false,
          cards: {
            create: source.cards.map((c: any, i: number) => ({ term: c.term, definition: c.definition, imageUrl: cloneImageUrl(c.imageUrl), order: i })),
          },
        },
      });

      await createAuditLog(
        jwtUser.userId, jwtUser.email, "CREATE", "FLASHCARD_DECK", clone.id,
        `Cloned flashcard deck "${source.title}" from another teacher`,
        req.ip || null, req.headers["user-agent"] || null,
      );
      res.status(201).json({ id: clone.id });
    } catch (err) {
      logger.error("Error cloning flashcard deck:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
