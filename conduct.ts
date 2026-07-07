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

const CONDUCT_ROLES = ["ADMIN", "TEACHER", "CASE_WORKER", "STAFF"];

/**
 * Conduct / discipline tracking, phase 1: a catalog of the school's own
 * numbered rules (seeded from the School Rules & Regulations / Hostel
 * Guidelines handbook) plus logged violations against a student, so counts
 * per student/per rule can be surfaced to support the handbook's own
 * Minor -> Moderate -> Serious escalation framework (Article 8). Guardian
 * notices, printable documents, and case-linking are later phases -- this
 * intentionally only covers "log it" and "count it".
 */
export function registerConductRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, createAuditLog, logger } = deps;

  const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
    `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "Unknown";

  const canManageConduct = (role: string) => CONDUCT_ROLES.includes(role);

  // ── Rule catalog ───────────────────────────────────────────────────────────
  app.get("/api/conduct/rules", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageConduct(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const rules = await prisma.conductRule.findMany({
        where: { active: true },
        orderBy: [{ articleOrder: "asc" }, { code: "asc" }],
      });
      res.json(rules);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error listing conduct rules:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Log a violation ──────────────────────────────────────────────────────────
  app.post("/api/conduct/violations", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageConduct(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { studentId, ruleId, note, occurredAt } = req.body || {};
    if (!studentId || !ruleId) { res.status(400).json({ error: "studentId and ruleId are required" }); return; }
    try {
      const [student, rule] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId } }),
        prisma.conductRule.findUnique({ where: { id: ruleId } }),
      ]);
      if (!student) { res.status(404).json({ error: "Student not found" }); return; }
      if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }

      let occurred: Date | undefined;
      if (occurredAt) {
        const d = new Date(occurredAt);
        if (!isNaN(d.getTime())) occurred = d;
      }

      const violation = await prisma.ruleViolation.create({
        data: {
          studentId,
          ruleId,
          severity: rule.severity, // snapshot -- later rule edits don't rewrite history
          note: note ? String(note).trim().slice(0, 2000) || null : null,
          ...(occurred ? { occurredAt: occurred } : {}),
          reportedById: jwtUser.userId,
          reportedByName: jwtUser.email,
        },
        include: { rule: true },
      });

      // How many times has this student broken this specific rule (incl. this one)?
      const ruleCount = await prisma.ruleViolation.count({ where: { studentId, ruleId } });
      // And how many total violations at each severity tier, for the bigger picture.
      const [minorCount, moderateCount, seriousCount] = await Promise.all([
        prisma.ruleViolation.count({ where: { studentId, severity: "MINOR" } }),
        prisma.ruleViolation.count({ where: { studentId, severity: "MODERATE" } }),
        prisma.ruleViolation.count({ where: { studentId, severity: "SERIOUS" } }),
      ]);

      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "RULE_VIOLATION", violation.id,
        `${fullName(student)} (${student.studentCode}) marked for breaking rule ${rule.code} — ${rule.title}.`,
        req.ip, req.headers["user-agent"] || null, rule.severity === "SERIOUS" ? "WARNING" : "INFO");

      res.status(201).json({
        ...violation,
        ruleViolationCount: ruleCount,
        studentTotals: { minor: minorCount, moderate: moderateCount, serious: seriousCount },
      });
    } catch (err: any) {
      logger.error("Error logging rule violation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── List violations (with filters) ──────────────────────────────────────────
  app.get("/api/conduct/violations", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageConduct(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { studentId, ruleId, severity, from, to } = req.query as Record<string, string | undefined>;
    try {
      const where: any = {
        ...(studentId ? { studentId } : {}),
        ...(ruleId ? { ruleId } : {}),
        ...(severity && severity !== "all" ? { severity } : {}),
      };
      if (from || to) {
        where.occurredAt = {};
        if (from) { const d = new Date(from); if (!isNaN(d.getTime())) where.occurredAt.gte = d; }
        if (to) { const d = new Date(to); if (!isNaN(d.getTime())) where.occurredAt.lte = d; }
      }
      const violations = await prisma.ruleViolation.findMany({
        where,
        include: {
          rule: true,
          student: { include: { user: true, class: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 500,
      });
      res.json(violations.map((v: any) => ({
        id: v.id,
        studentId: v.studentId,
        studentName: fullName(v.student?.user),
        studentCode: v.student?.studentCode,
        className: v.student?.class?.name || null,
        ruleId: v.ruleId,
        ruleCode: v.rule?.code,
        ruleTitle: v.rule?.title,
        article: v.rule?.article,
        severity: v.severity,
        note: v.note,
        occurredAt: v.occurredAt,
        reportedByName: v.reportedByName,
        reportedById: v.reportedById,
      })));
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") { res.json([]); return; }
      logger.error("Error listing rule violations:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Per-student summary (counts by rule + severity) ─────────────────────────
  app.get("/api/conduct/students/:studentId/summary", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { studentId } = req.params;
    // Admin/teacher/case worker/staff can look up any student; a student may
    // look up their own summary (read-only transparency, no rule catalog
    // details needed for that path).
    if (!canManageConduct(jwtUser.role)) {
      if (jwtUser.role !== "STUDENT") { res.status(403).json({ error: "Forbidden" }); return; }
      const self = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
      if (!self || self.id !== studentId) { res.status(403).json({ error: "Forbidden" }); return; }
    }
    try {
      const violations = await prisma.ruleViolation.findMany({
        where: { studentId },
        include: { rule: true },
        orderBy: { occurredAt: "desc" },
      });
      const bySeverity = { MINOR: 0, MODERATE: 0, SERIOUS: 0 } as Record<string, number>;
      const byRule = new Map<string, { ruleId: string; code: string; title: string; severity: string; count: number; lastOccurredAt: Date }>();
      for (const v of violations) {
        bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
        const key = v.ruleId;
        const existing = byRule.get(key);
        if (existing) existing.count += 1;
        else byRule.set(key, { ruleId: v.ruleId, code: v.rule?.code, title: v.rule?.title, severity: v.severity, count: 1, lastOccurredAt: v.occurredAt });
      }
      res.json({
        total: violations.length,
        bySeverity,
        byRule: Array.from(byRule.values()).sort((a, b) => b.count - a.count),
        recent: violations.slice(0, 10).map((v: any) => ({
          id: v.id, ruleCode: v.rule?.code, ruleTitle: v.rule?.title,
          severity: v.severity, note: v.note, occurredAt: v.occurredAt, reportedByName: v.reportedByName,
        })),
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") {
        res.json({ total: 0, bySeverity: { MINOR: 0, MODERATE: 0, SERIOUS: 0 }, byRule: [], recent: [] });
        return;
      }
      logger.error("Error building conduct summary:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Undo a mistaken entry ────────────────────────────────────────────────────
  app.delete("/api/conduct/violations/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageConduct(jwtUser.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    try {
      const existing = await prisma.ruleViolation.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: "Violation record not found" }); return; }
      // Admins can remove any entry; everyone else can only remove their own
      // (fixing their own mis-click), mirroring the Documents ownership pattern.
      if (jwtUser.role !== "ADMIN" && existing.reportedById !== jwtUser.userId) {
        res.status(403).json({ error: "You can only remove violations you reported yourself" });
        return;
      }
      await prisma.ruleViolation.delete({ where: { id: req.params.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "RULE_VIOLATION", existing.id,
        `Rule violation record removed.`, req.ip, req.headers["user-agent"] || null, "INFO");
      res.json({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Violation record not found" }); return; }
      logger.error("Error deleting rule violation:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
