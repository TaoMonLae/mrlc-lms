// Extracted from server.ts. Route order is preserved: registerReportRoutes is called where these routes used to be registered.
import type { registerFinanceRoutes } from "./financeRoutes";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import express from "express";
import { normalizeFeeMonth } from "./shared/feePeriods";
import type { JwtPayload, authMiddleware, logger } from "./server";

export type ReportRoutesContext = {
  authMiddleware: typeof authMiddleware;
  buildStudentFeeOverview: ReturnType<typeof registerFinanceRoutes>["buildStudentFeeOverview"];
  getTeacherClassIds: (userId: string) => Promise<string[]>;
  logger: typeof logger;
  prisma: PrismaClient;
};

export function registerReportRoutes(app: Express, ctx: ReportRoutesContext) {
  const { authMiddleware, buildStudentFeeOverview, getTeacherClassIds, logger, prisma } = ctx;

  // ── Reports API (aggregations) ───────────────────────────────────────────────
  const letterGrade = (pct: number): string => {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  };
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
    `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "Unknown";
  const monthRange = (month?: string): { start: Date; end: Date } | null => {
    if (!month) return null;
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return null;
    return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
  };
  const reportRole = (roles: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction): void => {
      const user = (req as any).user as JwtPayload | undefined;
      if (!user || !roles.includes(user.role)) {
        res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        return;
      }
      next();
    };

  // Lightweight KPI summary for the Reports dashboard
  app.get("/api/reports/summary", authMiddleware, reportRole(["ADMIN", "TEACHER", "ACCOUNTANT", "CASE_WORKER"]), async (_req, res) => {
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const [students, classes, exams, openCases, attendance, fees, monthlyFees] = await Promise.all([
        prisma.student.count(),
        prisma.class.count(),
        prisma.exam.count(),
        prisma.caseRecord.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.attendance.findMany({ where: { date: { gte: todayStart, lt: tomorrowStart } }, select: { status: true } }),
        prisma.feePayment.findMany({ select: { amount: true, status: true } }),
        prisma.feePayment.findMany({
          where: { status: "PAID", paidDate: { gte: todayStart, lt: tomorrowStart } },
          select: { amount: true },
        }),
      ]);
      const present = attendance.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
      const paid = fees.filter(f => f.status === "PAID").reduce((sum, f) => sum + f.amount, 0);
      const expected = fees.reduce((sum, f) => sum + f.amount, 0);
      res.json({
        students,
        classes,
        exams,
        openCases,
        attendanceRecords: attendance.length,
        attendanceRate: attendance.length ? Math.round((present / attendance.length) * 100) : null,
        feePayments: fees.length,
        feeCollectionRate: expected ? Math.round((paid / expected) * 100) : null,
        todaysFeeCollection: monthlyFees.reduce((sum, f) => sum + f.amount, 0),
      });
    } catch (err) {
      logger.error("Error building report summary:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Aggregated data for the main School Dashboard
  app.get("/api/dashboard", authMiddleware, reportRole(["ADMIN", "TEACHER", "STAFF", "ACCOUNTANT", "CASE_WORKER"]), async (req, res) => {
    try {
      const role = ((req as any).user as JwtPayload)?.role;
      const canSeeCases = role === "ADMIN" || role === "CASE_WORKER";
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

      const [students, classes, openCases, todayAttendance, announcements, todaySchedule, recentCases] = await Promise.all([
        prisma.student.count(),
        prisma.class.count(),
        prisma.caseRecord.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.attendance.findMany({ where: { date: { gte: todayStart, lt: tomorrowStart } }, select: { status: true } }),
        prisma.announcement.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
          take: 3,
        }),
        prisma.timetableEntry.findMany({ where: { dayOfWeek: dayName }, orderBy: { startTime: "asc" } }),
        canSeeCases
          ? prisma.caseRecord.findMany({
              orderBy: { createdAt: "desc" },
              take: 5,
              include: { student: { include: { user: true } } },
            })
          : Promise.resolve([] as any[]),
      ]);

      const presentCount = todayAttendance.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
      const attendanceRate = todayAttendance.length > 0
        ? Math.round((presentCount / todayAttendance.length) * 100)
        : null;

      res.json({
        stats: { students, classes, openCases, attendanceRate, attendanceRecords: todayAttendance.length },
        announcements: announcements.map(a => ({
          id: a.id, title: a.title, category: a.audience, pinned: a.pinned,
          date: a.createdAt,
        })),
        schedule: todaySchedule.map(t => ({
          time: t.startTime, subject: t.subjectName || "—", subjectColor: t.subjectColor || "bg-blue-500",
          class: t.className || "—", teacher: t.teacherName || "—", room: t.room || "—",
        })),
        recentCases: recentCases.map(c => ({
          id: c.id,
          name: c.student?.user ? `${c.student.user.firstName ?? ""} ${c.student.user.lastName ?? ""}`.trim() : "Unknown",
          detail: c.title,
          status: c.status,
          time: c.createdAt,
        })),
      });
    } catch (err) {
      logger.error("Error building dashboard:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Attendance report: per-student rates for a class/month
  app.get("/api/reports/attendance", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId, month } = req.query as { classId?: string; month?: string };
    try {
      const where: any = {};

      // For teachers, scope to their classes unless they're admins
      if (jwtUser.role === "TEACHER") {
        const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
        if (classId && classId !== "all") {
          // Verify teacher has access to requested class
          if (!teacherClassIds.includes(classId)) {
            res.status(403).json({ error: "Forbidden: Not your class" });
            return;
          }
          where.classId = classId;
        } else {
          // Scope to all teacher's classes
          where.classId = { in: teacherClassIds };
        }
      } else if (classId && classId !== "all") {
        where.classId = classId;
      }

      const range = monthRange(month);
      if (range) where.date = { gte: range.start, lt: range.end };

      const records = await prisma.attendance.findMany({
        where,
        include: { student: { include: { user: true } } },
      });

      const map = new Map<string, any>();
      for (const r of records) {
        if (!map.has(r.studentId)) {
          map.set(r.studentId, {
            studentId: r.studentId,
            name: fullName(r.student.user),
            code: r.student.studentCode,
            total: 0, present: 0, absent: 0, late: 0, excused: 0,
          });
        }
        const row = map.get(r.studentId);
        row.total += 1;
        if (r.status === "PRESENT") row.present += 1;
        else if (r.status === "ABSENT") row.absent += 1;
        else if (r.status === "LATE") row.late += 1;
        else if (r.status === "EXCUSED") row.excused += 1;
      }

      const rows = Array.from(map.values())
        .map((r) => ({ ...r, rate: r.total ? round1((r.present / r.total) * 100) : 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const classAverage = rows.length ? round1(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;
      res.json({
        rows,
        classAverage,
        perfectCount: rows.filter((r) => r.rate === 100).length,
        atRiskCount: rows.filter((r) => r.rate < 80).length,
      });
    } catch (err) {
      logger.error("Error building attendance report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Session-based attendance report: per-student, per-subject attendance
  app.get("/api/reports/session-attendance", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId, subjectId, month, startDate, endDate } = req.query as {
      classId?: string;
      subjectId?: string;
      month?: string;
      startDate?: string;
      endDate?: string;
    };

    try {
      const where: any = { timetableEntryId: { not: null } }; // Only session-based attendance

      // For teachers, scope to their sessions
      if (jwtUser.role === "TEACHER") {
        const teacherRecord = await prisma.teacher.findUnique({
          where: { userId: jwtUser.userId },
          select: { id: true }
        });

        if (!teacherRecord) {
          res.status(403).json({ error: "Forbidden: Teacher record not found" });
          return;
        }

        // Get timetable entries where this teacher is assigned
        const teacherSessions = await prisma.timetableEntry.findMany({
          where: {
            OR: [
              { teacherId: teacherRecord.id },
              { substituteTeacherId: teacherRecord.id }
            ],
            status: "ACTIVE"
          },
          select: { id: true, classId: true, subjectId: true }
        });

        if (classId && classId !== "all") {
          // Verify teacher has access to requested class via sessions
          const hasAccess = teacherSessions.some(s => s.classId === classId);
          if (!hasAccess) {
            res.status(403).json({ error: "Forbidden: No sessions for this class" });
            return;
          }
        }

        let filteredSessions = teacherSessions;
        if (classId && classId !== "all") {
          filteredSessions = filteredSessions.filter(s => s.classId === classId);
        }
        if (subjectId && subjectId !== "all") {
          filteredSessions = filteredSessions.filter(s => s.subjectId === subjectId);
        }

        where.timetableEntryId = { in: filteredSessions.map(s => s.id) };
      } else {
        // Admin can filter by class and/or subject
        const sessionFilters: any = { status: "ACTIVE" };
        if (classId && classId !== "all") {
          sessionFilters.classId = classId;
        }
        if (subjectId && subjectId !== "all") {
          sessionFilters.subjectId = subjectId;
        }

        if ((classId && classId !== "all") || (subjectId && subjectId !== "all")) {
          const classOrSubjectSessions = await prisma.timetableEntry.findMany({
            where: sessionFilters,
            select: { id: true }
          });
          where.timetableEntryId = { in: classOrSubjectSessions.map(s => s.id) };
        }
      }

      // Date range filtering
      if (month) {
        const range = monthRange(month);
        if (range) where.date = { gte: range.start, lt: range.end };
      } else if (startDate && endDate) {
        where.date = { gte: new Date(startDate), lte: new Date(endDate) };
      }

      const records = await prisma.attendance.findMany({
        where,
        include: {
          student: { include: { user: true, class: true } },
          timetableEntry: {
            select: {
              subjectId: true,
              subjectName: true,
              subjectColor: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true
            }
          }
        },
      });

      // Group by student and subject
      const studentSubjectMap = new Map<string, Map<string, any>>();

      for (const r of records) {
        if (!r.timetableEntry) continue;

        const studentKey = r.studentId;
        const subjectKey = r.timetableEntry.subjectId || "UNKNOWN";

        if (!studentSubjectMap.has(studentKey)) {
          studentSubjectMap.set(studentKey, new Map());
        }

        const subjectMap = studentSubjectMap.get(studentKey)!;

        if (!subjectMap.has(subjectKey)) {
          subjectMap.set(subjectKey, {
            studentId: r.studentId,
            studentName: fullName(r.student.user),
            studentCode: r.student.studentCode,
            className: r.student.class?.name || "N/A",
            subjectId: r.timetableEntry.subjectId,
            subjectName: r.timetableEntry.subjectName || "Unknown",
            subjectColor: r.timetableEntry.subjectColor || "bg-gray-500",
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          });
        }

        const row = subjectMap.get(subjectKey)!;
        row.total += 1;
        if (r.status === "PRESENT") row.present += 1;
        else if (r.status === "ABSENT") row.absent += 1;
        else if (r.status === "LATE") row.late += 1;
        else if (r.status === "EXCUSED") row.excused += 1;
      }

      // Flatten to array and calculate rates
      const rows: any[] = [];
      for (const [_, subjectMap] of studentSubjectMap) {
        for (const [_, row] of subjectMap) {
          rows.push({
            ...row,
            rate: row.total ? round1((row.present / row.total) * 100) : 0
          });
        }
      }

      rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

      // Calculate subject-level aggregates
      const subjectStats = new Map<string, any>();
      for (const row of rows) {
        const key = row.subjectId || "UNKNOWN";
        if (!subjectStats.has(key)) {
          subjectStats.set(key, {
            subjectId: row.subjectId,
            subjectName: row.subjectName,
            subjectColor: row.subjectColor,
            totalStudents: 0,
            avgRate: 0,
            totalSessions: 0
          });
        }
        const stat = subjectStats.get(key)!;
        stat.totalStudents += 1;
        stat.avgRate += row.rate;
        stat.totalSessions += row.total;
      }

      const subjectStatsArray = Array.from(subjectStats.values()).map(s => ({
        ...s,
        avgRate: s.totalStudents ? round1(s.avgRate / s.totalStudents) : 0
      }));

      // Overall stats
      const overallRate = rows.length ? round1(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;
      const totalRecords = rows.reduce((a, r) => a + r.total, 0);

      res.json({
        rows,
        subjectStats: subjectStatsArray,
        overall: {
          totalRecords,
          overallRate,
          studentSubjectPairs: rows.length,
          perfectCount: rows.filter(r => r.rate === 100).length,
          atRiskCount: rows.filter(r => r.rate < 80).length
        }
      });
    } catch (err) {
      logger.error("Error building session attendance report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Attendance analytics: overall statistics by subject/teacher
  app.get("/api/analytics/attendance", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { startDate, endDate, groupBy } = req.query as {
      startDate?: string;
      endDate?: string;
      groupBy?: "subject" | "teacher" | "both";
    };

    try {
      // Default to current month if no dates provided
      const defaultRange = monthRange(new Date().toISOString().slice(0, 7));
      const start = startDate ? new Date(startDate) : defaultRange?.start || new Date();
      const end = endDate ? new Date(endDate) : defaultRange?.end || new Date();

      const where: any = {
        date: { gte: start, lte: end }
      };

      // For teachers, scope to their data
      let teacherId: string | null = null;
      if (jwtUser.role === "TEACHER") {
        const teacherRecord = await prisma.teacher.findUnique({
          where: { userId: jwtUser.userId },
          select: { id: true }
        });

        if (!teacherRecord) {
          res.status(403).json({ error: "Forbidden: Teacher record not found" });
          return;
        }
        teacherId = teacherRecord.id;

        // Get teacher's sessions
        const teacherSessions = await prisma.timetableEntry.findMany({
          where: {
            OR: [
              { teacherId: teacherId },
              { substituteTeacherId: teacherId }
            ],
            status: "ACTIVE"
          },
          select: { id: true, subjectId: true }
        });

        where.timetableEntryId = { in: teacherSessions.map(s => s.id) };
      }

      const records = await prisma.attendance.findMany({
        where,
        include: {
          timetableEntry: {
            select: {
              subjectId: true,
              subjectName: true,
              subjectColor: true,
              teacherId: true,
              teacherName: true
            }
          }
        }
      });

      // Build analytics
      const bySubject = new Map<string, any>();
      const byTeacher = new Map<string, any>();

      for (const r of records) {
        // Daily (class-based) attendance has no timetable entry — count it under
        // a pseudo-subject so schools using daily attendance still see analytics.
        const te = r.timetableEntry;

        // By subject
        const subjKey = te ? (te.subjectId || "UNKNOWN") : "DAILY";
        if (!bySubject.has(subjKey)) {
          bySubject.set(subjKey, {
            subjectId: te?.subjectId ?? null,
            subjectName: te ? (te.subjectName || "Unknown") : "Daily Attendance",
            subjectColor: te ? (te.subjectColor || "bg-gray-500") : "bg-slate-500",
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            uniqueStudents: new Set()
          });
        }
        const subj = bySubject.get(subjKey)!;
        subj.total += 1;
        subj.uniqueStudents.add(r.studentId);
        if (r.status === "PRESENT") subj.present += 1;
        else if (r.status === "ABSENT") subj.absent += 1;
        else if (r.status === "LATE") subj.late += 1;
        else if (r.status === "EXCUSED") subj.excused += 1;

        // By teacher (if available and admin is viewing)
        if (jwtUser.role === "ADMIN" && te?.teacherId) {
          const teacherKey = te.teacherId;
          if (!byTeacher.has(teacherKey)) {
            byTeacher.set(teacherKey, {
              teacherId: te.teacherId,
              teacherName: te.teacherName || "Unknown",
              total: 0,
              present: 0,
              absent: 0,
              late: 0,
              excused: 0
            });
          }
          const teach = byTeacher.get(teacherKey)!;
          teach.total += 1;
          if (r.status === "PRESENT") teach.present += 1;
          else if (r.status === "ABSENT") teach.absent += 1;
          else if (r.status === "LATE") teach.late += 1;
          else if (r.status === "EXCUSED") teach.excused += 1;
        }
      }

      // Convert Sets to counts and calculate rates
      const subjectStats = Array.from(bySubject.values()).map(s => ({
        ...s,
        uniqueStudents: s.uniqueStudents.size,
        rate: s.total ? round1((s.present / s.total) * 100) : 0
      }));

      const teacherStats = Array.from(byTeacher.values()).map(t => ({
        ...t,
        rate: t.total ? round1((t.present / t.total) * 100) : 0
      }));

      // Overall stats
      const totalRecords = records.length;
      const overallPresent = records.filter(r => r.status === "PRESENT").length;
      const overallAbsent = records.filter(r => r.status === "ABSENT").length;
      const overallLate = records.filter(r => r.status === "LATE").length;
      const overallExcused = records.filter(r => r.status === "EXCUSED").length;
      const overallRate = totalRecords ? round1((overallPresent / totalRecords) * 100) : 0;

      res.json({
        period: { start, end },
        overall: {
          totalRecords,
          present: overallPresent,
          absent: overallAbsent,
          late: overallLate,
          excused: overallExcused,
          rate: overallRate
        },
        bySubject: jwtUser.role === "ADMIN" || groupBy === "subject" || groupBy === "both" ? subjectStats : undefined,
        byTeacher: jwtUser.role === "ADMIN" && (groupBy === "teacher" || groupBy === "both") ? teacherStats : undefined
      });
    } catch (err) {
      logger.error("Error building attendance analytics:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fees report: per-student expected/paid/balance + totals
  app.get("/api/reports/fees", authMiddleware, reportRole(["ADMIN", "ACCOUNTANT"]), async (req, res) => {
    const { classId, status, month: requestedMonth } = req.query as { classId?: string; status?: string; month?: string };
    try {
      // Same combined source as GET /api/fees: structured FeeAssignment
      // obligations (which stay unpaid until actually paid) plus ad-hoc
      // FeePayment records with no assignment. This used to only look at
      // FeePayment, which meant an assigned-but-unpaid fee never showed up
      // here at all -- "expected" was silently reconstructed from whatever
      // had already been paid, so this report could never show a real
      // outstanding balance.
      const month = requestedMonth == null || requestedMonth === "all" ? undefined : normalizeFeeMonth(requestedMonth);
      if (requestedMonth != null && requestedMonth !== "all" && !month) {
        res.status(400).json({ error: "month must use YYYY-MM format" });
        return;
      }
      const overview = await buildStudentFeeOverview(month ? { month } : {});
      const profile = await prisma.schoolProfile.findFirst();

      let rows = overview
        .filter((r) => !classId || classId === "all" || r.student.classId === classId)
        .map((r) => ({
          studentName: fullName(r.student.user),
          className: r.student.class?.name || "Unassigned",
          expected: r.expected,
          paid: r.paid,
          balance: r.balance,
          status: r.status,
        }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName));

      if (status && status !== "all") rows = rows.filter((r) => r.status === status);

      const totalExpected = rows.reduce((a, r) => a + r.expected, 0);
      const totalCollected = rows.reduce((a, r) => a + r.paid, 0);
      res.json({
        rows,
        totalExpected,
        totalCollected,
        outstanding: totalExpected - totalCollected,
        currency: profile?.currency || "MYR",
      });
    } catch (err) {
      logger.error("Error building fees report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Exam results: per-student subject averages for a class
  app.get("/api/reports/exams", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId } = req.query as { classId?: string };
    try {
      const where: any = {};

      // For teachers, scope to their classes unless they're admins
      if (jwtUser.role === "TEACHER") {
        const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
        if (classId && classId !== "all") {
          // Verify teacher has access to requested class
          if (!teacherClassIds.includes(classId)) {
            res.status(403).json({ error: "Forbidden: Not your class" });
            return;
          }
          where.classId = classId;
        } else {
          // Scope to all teacher's classes
          where.classId = { in: teacherClassIds };
        }
      } else if (classId && classId !== "all") {
        where.classId = classId;
      }
      const exams = await prisma.exam.findMany({
        where,
        include: { subject: true, attempts: { include: { student: { include: { user: true } } } } },
      });

      const subjectSet = new Set<string>();
      const students = new Map<string, { name: string; subj: Map<string, number[]> }>();
      for (const e of exams) {
        const subj = e.subject?.name || "General";
        subjectSet.add(subj);
        const tm = e.totalMarks || 100;
        for (const at of e.attempts) {
          if (at.score == null) continue;
          if (!students.has(at.studentId)) students.set(at.studentId, { name: fullName(at.student.user), subj: new Map() });
          const rec = students.get(at.studentId)!;
          if (!rec.subj.has(subj)) rec.subj.set(subj, []);
          rec.subj.get(subj)!.push((at.score / tm) * 100);
        }
      }

      const rows = Array.from(students.values()).map((s) => {
        const scores: Record<string, number> = {};
        const all: number[] = [];
        for (const [subj, arr] of s.subj) {
          scores[subj] = round1(arr.reduce((a, b) => a + b, 0) / arr.length);
          all.push(...arr);
        }
        const average = all.length ? round1(all.reduce((a, b) => a + b, 0) / all.length) : 0;
        return { studentName: s.name, scores, average, grade: letterGrade(average) };
      }).sort((a, b) => a.studentName.localeCompare(b.studentName));

      res.json({ subjects: Array.from(subjectSet).sort(), rows });
    } catch (err) {
      logger.error("Error building exam results report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Class performance: subject averages per class + school averages
  app.get("/api/reports/classes", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (_req, res) => {
    try {
      const classes = await prisma.class.findMany({
        include: { students: true, exams: { include: { subject: true, attempts: true } } },
      });

      const subjectSet = new Set<string>();
      const rows = classes.map((c) => {
        const subjMap = new Map<string, number[]>();
        for (const e of c.exams) {
          const subj = e.subject?.name || "General";
          subjectSet.add(subj);
          const tm = e.totalMarks || 100;
          for (const at of e.attempts) {
            if (at.score == null) continue;
            if (!subjMap.has(subj)) subjMap.set(subj, []);
            subjMap.get(subj)!.push((at.score / tm) * 100);
          }
        }
        const subjectAverages: Record<string, number> = {};
        const all: number[] = [];
        for (const [subj, arr] of subjMap) {
          subjectAverages[subj] = round1(arr.reduce((a, b) => a + b, 0) / arr.length);
          all.push(...arr);
        }
        return {
          className: c.name,
          totalStudents: c.students.length,
          subjectAverages,
          overall: all.length ? round1(all.reduce((a, b) => a + b, 0) / all.length) : 0,
        };
      }).sort((a, b) => a.className.localeCompare(b.className));

      const subjects = Array.from(subjectSet).sort();
      const schoolAverages: Record<string, number> = {};
      for (const subj of subjects) {
        const vals = rows.map((r) => r.subjectAverages[subj]).filter((v) => v != null) as number[];
        schoolAverages[subj] = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }
      const overalls = rows.map((r) => r.overall).filter((v) => v > 0);
      const schoolOverall = overalls.length ? round1(overalls.reduce((a, b) => a + b, 0) / overalls.length) : 0;

      res.json({ subjects, rows, schoolAverages, schoolOverall });
    } catch (err) {
      logger.error("Error building class performance report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Monthly summary: KPIs + case breakdown
  app.get("/api/reports/monthly-summary", authMiddleware, reportRole(["ADMIN"]), async (req, res) => {
    const { month } = req.query as { month?: string };
    try {
      const range = monthRange(month);
      const [activeStudents, activeTeachers, openCases, profile, cases] = await Promise.all([
        prisma.student.count({ where: { status: "ACTIVE" } }),
        prisma.teacher.count(),
        prisma.caseRecord.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.schoolProfile.findFirst(),
        prisma.caseRecord.findMany(),
      ]);

      const attWhere: any = {};
      if (range) attWhere.date = { gte: range.start, lt: range.end };
      const att = await prisma.attendance.findMany({ where: attWhere });
      const avgAttendance = att.length ? round1((att.filter((a) => a.status === "PRESENT").length / att.length) * 100) : 0;

      const feeWhere: any = { status: "PAID" };
      if (range) feeWhere.paidDate = { gte: range.start, lt: range.end };
      const paidFees = await prisma.feePayment.findMany({ where: feeWhere });
      const feeCollection = paidFees.reduce((a, f) => a + f.amount, 0);

      const catMap = new Map<string, any>();
      for (const c of cases) {
        const cat = c.category || "General";
        if (!catMap.has(cat)) catMap.set(cat, { category: cat, newCases: 0, resolved: 0, open: 0 });
        const row = catMap.get(cat);
        if (!range || (c.createdAt >= range.start && c.createdAt < range.end)) row.newCases += 1;
        if (c.status === "RESOLVED" || c.status === "CLOSED") row.resolved += 1;
        if (c.status === "OPEN" || c.status === "IN_PROGRESS") row.open += 1;
      }

      res.json({
        activeStudents,
        activeTeachers,
        avgAttendance,
        openCases,
        feeCollection,
        currency: profile?.currency || "MYR",
        casesByCategory: Array.from(catMap.values()),
      });
    } catch (err) {
      logger.error("Error building monthly summary report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Student profile export for a class
  app.get("/api/reports/students", authMiddleware, reportRole(["ADMIN", "TEACHER"]), async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { classId } = req.query as { classId?: string };
    try {
      const where: any = {};

      // For teachers, scope to their classes unless they're admins
      if (jwtUser.role === "TEACHER") {
        const teacherClassIds = await getTeacherClassIds(jwtUser.userId);
        if (classId && classId !== "all") {
          // Verify teacher has access to requested class
          if (!teacherClassIds.includes(classId)) {
            res.status(403).json({ error: "Forbidden: Not your class" });
            return;
          }
          where.classId = classId;
        } else {
          // Scope to all teacher's classes
          where.classId = { in: teacherClassIds };
        }
      } else if (classId && classId !== "all") {
        where.classId = classId;
      }
      const students = await prisma.student.findMany({ where, include: { user: true, class: true } });
      const rows = students.map((s) => ({
        code: s.studentCode,
        name: fullName(s.user),
        gender: s.gender || "—",
        country: s.country || "—",
        identityType: s.identityType || "",
        identityNumber: s.identityNumber || "",
        contactNumber: s.contactNumber || "",
        dob: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : "—",
        guardianName: s.guardianName || "—",
        guardianPhone: s.guardianPhone || "—",
        className: s.class?.name || "Unassigned",
      })).sort((a, b) => a.name.localeCompare(b.name));
      res.json({ rows });
    } catch (err) {
      logger.error("Error building student profile report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return { round1, letterGrade, fullName, reportRole, monthRange };
}
