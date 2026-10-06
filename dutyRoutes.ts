// Extracted from server.ts. Route order is preserved: registerDutyRoutes is called where these routes used to be registered.
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { dutyDateIsWithinRoster } from "./shared/cookingDutyBoard";
import type { JwtPayload, authMiddleware, createAuditLog, logger, schemas, validate } from "./server";

export type DutyRoutesContext = {
  authMiddleware: typeof authMiddleware;
  createAuditLog: typeof createAuditLog;
  logger: typeof logger;
  prisma: PrismaClient;
  schemas: typeof schemas;
  validate: typeof validate;
};

export function registerDutyRoutes(app: Express, ctx: DutyRoutesContext) {
  const { authMiddleware, createAuditLog, logger, prisma, schemas, validate } = ctx;

  // ── Student Duty System API ──────────────────────────────────────────────────
  // Permission helpers
  const dutyCanManage = (role: string) => role === "ADMIN" || role === "STAFF";
  const dutyCanView = (role: string) => ["ADMIN", "STAFF", "TEACHER"].includes(role);

  // ---- Duty Definitions ----
  app.get("/api/duty-definitions", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role) && jwtUser.role !== "STUDENT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { type, isActive } = req.query;
      const where: any = {};
      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive === "true";

      const definitions = await prisma.dutyDefinition.findMany({
        where,
        orderBy: { name: "asc" },
        include: { _count: { select: { assignments: true } } },
      });
      res.json(definitions);
    } catch (error) {
      logger.error("Error fetching duty definitions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/duty-definitions", authMiddleware, validate(schemas.dutyDefinitionCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const count = await prisma.dutyDefinition.count();
      const code = `DUTY-${String(count + 1).padStart(3, "0")}`;

      const definition = await prisma.dutyDefinition.create({
        data: {
          ...req.body,
          code,
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DUTY_DEFINITION",
        definition.id,
        `Created duty definition: ${definition.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(definition);
    } catch (error) {
      logger.error("Error creating duty definition:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/duty-definitions/:id", authMiddleware, validate(schemas.dutyDefinitionUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const definition = await prisma.dutyDefinition.update({
        where: { id: req.params.id },
        data: req.body,
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DUTY_DEFINITION",
        definition.id,
        `Updated duty definition: ${definition.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(definition);
    } catch (error) {
      logger.error("Error updating duty definition:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/duty-definitions/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const assignmentCount = await prisma.dutyAssignment.count({ where: { dutyDefinitionId: req.params.id } });
      if (assignmentCount > 0) {
        // Duty has history -- deactivate instead of hard-deleting so past
        // assignments keep a valid reference.
        const definition = await prisma.dutyDefinition.update({
          where: { id: req.params.id },
          data: { isActive: false },
        });
        res.json(definition);
        return;
      }

      await prisma.dutyDefinition.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DUTY_DEFINITION",
        req.params.id,
        `Deleted duty definition`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting duty definition:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Duty Rosters ----
  app.get("/api/duty-rosters", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { status } = req.query;
      const where: any = {};
      if (status) where.status = { in: (status as string).split(",") };

      const rosters = await prisma.dutyRoster.findMany({
        where,
        orderBy: { startDate: "desc" },
        include: { _count: { select: { assignments: true } } },
      });
      res.json(rosters);
    } catch (error) {
      logger.error("Error fetching duty rosters:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/duty-rosters", authMiddleware, validate(schemas.dutyRosterCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, ...rest } = req.body;
      const roster = await prisma.dutyRoster.create({
        data: {
          ...rest,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          createdById: jwtUser.userId,
          createdByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DUTY_ROSTER",
        roster.id,
        `Created duty roster: ${roster.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(roster);
    } catch (error) {
      logger.error("Error creating duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/duty-rosters/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role) && jwtUser.role !== "STUDENT") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({
        where: { id: req.params.id },
        include: {
          assignments: {
            orderBy: { scheduledDate: "asc" },
            include: {
              dutyDefinition: true,
              student: { select: { id: true, studentCode: true, preferredName: true, boardingType: true, studentCouncilRole: true, status: true, user: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      });

      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }

      res.json(roster);
    } catch (error) {
      logger.error("Error fetching duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/duty-rosters/:id", authMiddleware, validate(schemas.dutyRosterUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, ...rest } = req.body;
      const roster = await prisma.dutyRoster.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: new Date(endDate) }),
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DUTY_ROSTER",
        roster.id,
        `Updated duty roster: ${roster.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(roster);
    } catch (error) {
      logger.error("Error updating duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/duty-rosters/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({ where: { id: req.params.id } });
      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }
      if (roster.status !== "DRAFT") {
        res.status(400).json({ error: "Only DRAFT rosters can be deleted -- archive it instead" });
        return;
      }

      await prisma.dutyRoster.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DUTY_ROSTER",
        req.params.id,
        `Deleted duty roster: ${roster.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Publish a roster so students can see their assignments.
  app.post("/api/duty-rosters/:id/publish", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({ where: { id: req.params.id } });
      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }

      const assignmentCount = await prisma.dutyAssignment.count({ where: { rosterId: req.params.id } });
      if (assignmentCount === 0) {
        res.status(400).json({ error: "Cannot publish a roster with no assignments -- add assignments or auto-assign first" });
        return;
      }

      const updated = await prisma.dutyRoster.update({
        where: { id: req.params.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedById: jwtUser.userId,
          publishedByName: jwtUser.email,
        },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DUTY_ROSTER_PUBLISHED",
        "DUTY_ROSTER",
        updated.id,
        `Published duty roster: ${updated.name}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(updated);
    } catch (error) {
      logger.error("Error publishing duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Auto-assign: fairly distribute the roster's duties across the selected
  // students for every day in [startDate, endDate]. Fairness rules:
  //  - a student is never double-booked on the same calendar day
  //  - a student never exceeds roster.maxWeeklyDuties within any 7-day
  //    window measured from the roster's startDate
  //  - among eligible students for a slot, whoever has the fewest duties
  //    assigned so far in this run is picked first (ties broken by a
  //    shuffled order so the same student doesn't always win ties)
  // This is a straightforward greedy fair-rotation, not a full constraint
  // solver -- if the numbers don't work out (too many duties, too few
  // students, cap too low) some slots are simply left unfilled and reported
  // back so a human can fill the rest manually.
  app.post("/api/duty-rosters/:id/auto-assign", authMiddleware, validate(schemas.dutyAutoAssign), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const roster = await prisma.dutyRoster.findUnique({ where: { id: req.params.id } });
      if (!roster) {
        res.status(404).json({ error: "Duty roster not found" });
        return;
      }
      if (roster.status !== "DRAFT") {
        res.status(400).json({ error: "Can only auto-assign a DRAFT roster" });
        return;
      }

      const { studentIds, dutyDefinitionIds } = req.body as { studentIds: string[]; dutyDefinitionIds: string[] };

      const definitions = await prisma.dutyDefinition.findMany({
        where: { id: { in: dutyDefinitionIds }, isActive: true },
      });
      if (definitions.length === 0) {
        res.status(400).json({ error: "No active duty definitions found for the given IDs" });
        return;
      }

      const students = await prisma.student.findMany({ where: { id: { in: studentIds } } });
      if (students.length === 0) {
        res.status(400).json({ error: "No students found for the given IDs" });
        return;
      }

      // Days in the roster's range, inclusive.
      const days: Date[] = [];
      const cursor = new Date(roster.startDate);
      const end = new Date(roster.endDate);
      while (cursor <= end) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      const totalAssignedCount = new Map<string, number>(students.map((s) => [s.id, 0]));
      const weekBucketCount = new Map<string, number>(); // key: `${studentId}_${weekIndex}`
      const dayAssigned = new Map<string, Set<string>>(); // key: dateKey -> Set<studentId>

      const weekIndexOf = (date: Date) =>
        Math.floor((date.getTime() - roster.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      const toCreate: { rosterId: string; dutyDefinitionId: string; studentId: string; scheduledDate: Date }[] = [];
      const unfilled: { dutyDefinitionId: string; date: string; missing: number }[] = [];

      for (const day of days) {
        const dateKey = day.toISOString().split("T")[0];
        const weekIdx = weekIndexOf(day);
        if (!dayAssigned.has(dateKey)) dayAssigned.set(dateKey, new Set());

        for (const definition of definitions) {
          let stillNeeded = definition.requiredStudents;

          // Rank students by fewest assignments so far, shuffling ties so
          // the same student doesn't always win.
          const shuffled = [...students].sort(() => Math.random() - 0.5);
          const ranked = shuffled.sort(
            (a, b) => (totalAssignedCount.get(a.id) || 0) - (totalAssignedCount.get(b.id) || 0)
          );

          for (const student of ranked) {
            if (stillNeeded <= 0) break;

            const alreadyToday = dayAssigned.get(dateKey)!.has(student.id);
            const weekKey = `${student.id}_${weekIdx}`;
            const weekCount = weekBucketCount.get(weekKey) || 0;
            if (alreadyToday || weekCount >= roster.maxWeeklyDuties) continue;

            toCreate.push({
              rosterId: roster.id,
              dutyDefinitionId: definition.id,
              studentId: student.id,
              scheduledDate: day,
            });
            dayAssigned.get(dateKey)!.add(student.id);
            weekBucketCount.set(weekKey, weekCount + 1);
            totalAssignedCount.set(student.id, (totalAssignedCount.get(student.id) || 0) + 1);
            stillNeeded -= 1;
          }

          if (stillNeeded > 0) {
            unfilled.push({ dutyDefinitionId: definition.id, date: dateKey, missing: stillNeeded });
          }
        }
      }

      if (toCreate.length > 0) {
        await prisma.dutyAssignment.createMany({ data: toCreate });
      }

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DUTY_ROSTER_AUTO_ASSIGNED",
        "DUTY_ROSTER",
        roster.id,
        `Auto-assigned ${toCreate.length} duty slots for roster: ${roster.name}${unfilled.length > 0 ? ` (${unfilled.length} slots left unfilled)` : ""}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({
        created: toCreate.length,
        unfilled,
        assignmentsPerStudent: Object.fromEntries(totalAssignedCount),
      });
    } catch (error) {
      logger.error("Error auto-assigning duty roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Duty Assignments ----
  app.get("/api/duty-assignments", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const { rosterId, studentId, status, startDate, endDate } = req.query;
      const where: any = {};

      if (jwtUser.role === "STUDENT") {
        // Students may only ever see their own assignments, regardless of
        // what studentId they pass.
        const me = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!me) {
          res.status(404).json({ error: "Student profile not found" });
          return;
        }
        where.studentId = me.id;
      } else if (!dutyCanView(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      } else if (studentId) {
        where.studentId = studentId;
      }

      if (rosterId) where.rosterId = rosterId;
      if (status) where.status = { in: (status as string).split(",") };
      if (startDate || endDate) {
        where.scheduledDate = {};
        if (startDate) where.scheduledDate.gte = new Date(startDate as string);
        if (endDate) where.scheduledDate.lte = new Date(endDate as string);
      }

      const assignments = await prisma.dutyAssignment.findMany({
        where,
        orderBy: { scheduledDate: "asc" },
        include: {
          dutyDefinition: true,
          roster: { select: { id: true, name: true, status: true } },
          student: { select: { id: true, studentCode: true, preferredName: true, boardingType: true, studentCouncilRole: true, status: true, user: { select: { firstName: true, lastName: true } } } },
        },
      });
      res.json(assignments);
    } catch (error) {
      logger.error("Error fetching duty assignments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/duty-assignments", authMiddleware, validate(schemas.dutyAssignmentCreate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { scheduledDate, ...rest } = req.body;
      const [roster, definition, student] = await Promise.all([
        prisma.dutyRoster.findUnique({ where: { id: rest.rosterId } }),
        prisma.dutyDefinition.findUnique({ where: { id: rest.dutyDefinitionId } }),
        prisma.student.findUnique({ where: { id: rest.studentId } }),
      ]);
      if (!roster || !definition || !student) {
        res.status(404).json({ error: "Roster, duty, or student was not found" });
        return;
      }
      if (roster.status !== "DRAFT") {
        res.status(400).json({ error: "Assignments can only be changed while the roster is in draft" });
        return;
      }
      if (!definition.isActive) {
        res.status(400).json({ error: "This duty type is inactive" });
        return;
      }
      if (!dutyDateIsWithinRoster(scheduledDate, roster.startDate, roster.endDate)) {
        res.status(400).json({ error: "Assignment date must be inside the roster period" });
        return;
      }
      const assignmentDate = new Date(scheduledDate);
      const conflict = await prisma.dutyAssignment.findFirst({
        where: { rosterId: roster.id, studentId: student.id, scheduledDate: assignmentDate },
      });
      if (conflict) {
        res.status(409).json({ error: "This student already has a duty on that date" });
        return;
      }
      const dutyTeamSize = await prisma.dutyAssignment.count({
        where: { rosterId: roster.id, dutyDefinitionId: definition.id, scheduledDate: assignmentDate },
      });
      if (dutyTeamSize >= definition.requiredStudents) {
        res.status(409).json({ error: "This duty team is already full for that date" });
        return;
      }
      const assignment = await prisma.dutyAssignment.create({
        data: {
          ...rest,
          scheduledDate: assignmentDate,
        },
        include: { dutyDefinition: true, student: true },
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "CREATE",
        "DUTY_ASSIGNMENT",
        assignment.id,
        `Assigned ${assignment.dutyDefinition.name} to student ${assignment.studentId}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.status(201).json(assignment);
    } catch (error) {
      logger.error("Error creating duty assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update status/rating -- staff/admin can update any assignment; a student
  // may only move their own assignment between ASSIGNED/IN_PROGRESS/COMPLETED
  // (they can't excuse, skip, fail, or rate themselves).
  app.put("/api/duty-assignments/:id", authMiddleware, validate(schemas.dutyAssignmentUpdate), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      const existing = await prisma.dutyAssignment.findUnique({
        where: { id: req.params.id },
        include: { roster: true },
      });
      if (!existing) {
        res.status(404).json({ error: "Duty assignment not found" });
        return;
      }

      const isManager = dutyCanManage(jwtUser.role);
      if (!isManager) {
        if (jwtUser.role !== "STUDENT") {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        const me = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!me || me.id !== existing.studentId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        const allowedSelfStatuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];
        if (req.body.status && !allowedSelfStatuses.includes(req.body.status)) {
          res.status(403).json({ error: "Students can only mark a duty in progress or completed" });
          return;
        }
        if (req.body.rating !== undefined) {
          res.status(403).json({ error: "Students cannot rate their own duty" });
          return;
        }
      }

      const { status, rating, scheduledDate, ...rest } = req.body;
      const data: any = { ...rest };
      if (status !== undefined) {
        data.status = status;
        if (status === "COMPLETED") {
          data.completedAt = new Date();
          if (data.pointsEarned === undefined) {
            const definition = await prisma.dutyDefinition.findUnique({ where: { id: existing.dutyDefinitionId } });
            data.pointsEarned = definition?.pointsAwarded ?? 0;
          }
        }
      }
      if (rating !== undefined) {
        data.rating = rating;
        data.ratedById = jwtUser.userId;
        data.ratedByName = jwtUser.email;
      }
      if (scheduledDate !== undefined) data.scheduledDate = new Date(scheduledDate);

      if (scheduledDate !== undefined) {
        if (!isManager) {
          res.status(403).json({ error: "Only duty managers can reschedule assignments" });
          return;
        }
        if (existing.roster.status !== "DRAFT") {
          res.status(400).json({ error: "Assignments can only be moved while the roster is in draft" });
          return;
        }
        if (!dutyDateIsWithinRoster(scheduledDate, existing.roster.startDate, existing.roster.endDate)) {
          res.status(400).json({ error: "Assignment date must be inside the roster period" });
          return;
        }
        const conflict = await prisma.dutyAssignment.findFirst({
          where: {
            rosterId: existing.rosterId,
            studentId: existing.studentId,
            scheduledDate: new Date(scheduledDate),
            id: { not: existing.id },
          },
        });
        if (conflict) {
          res.status(409).json({ error: "This student already has a duty on that date" });
          return;
        }
        const definition = await prisma.dutyDefinition.findUnique({ where: { id: existing.dutyDefinitionId } });
        const dutyTeamSize = await prisma.dutyAssignment.count({
          where: {
            rosterId: existing.rosterId,
            dutyDefinitionId: existing.dutyDefinitionId,
            scheduledDate: new Date(scheduledDate),
            id: { not: existing.id },
          },
        });
        if (definition && dutyTeamSize >= definition.requiredStudents) {
          res.status(409).json({ error: "This duty team is already full for that date" });
          return;
        }
      }

      const assignment = await prisma.dutyAssignment.update({
        where: { id: req.params.id },
        data,
      });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "UPDATE",
        "DUTY_ASSIGNMENT",
        assignment.id,
        `Updated duty assignment${status ? ` -> ${status}` : ""}`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json(assignment);
    } catch (error) {
      logger.error("Error updating duty assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/duty-assignments/:id", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanManage(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      await prisma.dutyAssignment.delete({ where: { id: req.params.id } });

      await createAuditLog(
        jwtUser.userId,
        jwtUser.email,
        "DELETE",
        "DUTY_ASSIGNMENT",
        req.params.id,
        `Deleted duty assignment`,
        req.ip,
        req.headers["user-agent"] || null
      );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting duty assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---- Duty Performance (computed live -- see schema.prisma note) ----
  app.get("/api/duty-performance/:studentId", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    try {
      let targetStudentId = req.params.studentId;
      if (jwtUser.role === "STUDENT") {
        const me = await prisma.student.findUnique({ where: { userId: jwtUser.userId } });
        if (!me || me.id !== targetStudentId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      } else if (!dutyCanView(jwtUser.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const assignments = await prisma.dutyAssignment.findMany({
        where: { studentId: targetStudentId },
        orderBy: { scheduledDate: "desc" },
        include: { dutyDefinition: true, roster: { select: { id: true, name: true } } },
      });

      const totalAssigned = assignments.length;
      const totalCompleted = assignments.filter((a) => a.status === "COMPLETED").length;
      const totalSkippedOrFailed = assignments.filter((a) => ["SKIPPED", "FAILED"].includes(a.status)).length;
      const rated = assignments.filter((a) => a.rating !== null);
      const averageRating = rated.length > 0 ? rated.reduce((sum, a) => sum + (a.rating || 0), 0) / rated.length : null;
      const totalPoints = assignments.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
      const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

      res.json({
        studentId: targetStudentId,
        statistics: {
          totalAssigned,
          totalCompleted,
          totalSkippedOrFailed,
          completionRate,
          averageRating,
          totalPoints,
        },
        history: assignments,
      });
    } catch (error) {
      logger.error("Error fetching duty performance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Leaderboard: top students by points/completion rate over an optional
  // date range (defaults to the last 90 days).
  app.get("/api/duty-performance/leaderboard", authMiddleware, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!dutyCanView(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    try {
      const { startDate, endDate, limit = "20" } = req.query;
      const gte = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const lte = endDate ? new Date(endDate as string) : new Date();

      const assignments = await prisma.dutyAssignment.findMany({
        where: { scheduledDate: { gte, lte } },
        include: { student: { select: { id: true, studentCode: true, preferredName: true, boardingType: true, studentCouncilRole: true, status: true, user: { select: { firstName: true, lastName: true } } } } },
      });

      const byStudent = new Map<string, { student: any; totalAssigned: number; totalCompleted: number; totalPoints: number; ratings: number[] }>();
      for (const a of assignments) {
        if (!byStudent.has(a.studentId)) {
          byStudent.set(a.studentId, { student: a.student, totalAssigned: 0, totalCompleted: 0, totalPoints: 0, ratings: [] });
        }
        const entry = byStudent.get(a.studentId)!;
        entry.totalAssigned += 1;
        if (a.status === "COMPLETED") entry.totalCompleted += 1;
        entry.totalPoints += a.pointsEarned || 0;
        if (a.rating !== null) entry.ratings.push(a.rating);
      }

      const leaderboard = Array.from(byStudent.values())
        .map((entry) => ({
          student: entry.student,
          totalAssigned: entry.totalAssigned,
          totalCompleted: entry.totalCompleted,
          completionRate: entry.totalAssigned > 0 ? (entry.totalCompleted / entry.totalAssigned) * 100 : 0,
          totalPoints: entry.totalPoints,
          averageRating: entry.ratings.length > 0 ? entry.ratings.reduce((s, r) => s + r, 0) / entry.ratings.length : null,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, parseInt(limit as string, 10));

      res.json({ period: { startDate: gte, endDate: lte }, leaderboard });
    } catch (error) {
      logger.error("Error building duty leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
