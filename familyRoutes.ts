import type { Express, Request, RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { notificationService } from "./lib/notifications";

type SessionUser = { userId: string; role: string };
type Scope = "LEARNING" | "ATTENDANCE" | "FEES";
type AccessBasis = "MINOR" | "AGE_UNKNOWN" | "ADULT_CONSENT" | "ADULT_NO_CONSENT";

const DAY_MS = 24 * 60 * 60 * 1000;
const ADULT_AGE = 18;
const ABSENCE_EMAIL_HOLD_MS = 30 * 60 * 1000;
const ALL_SCOPES: Scope[] = ["LEARNING", "ATTENDANCE", "FEES"];
const APP_URL = (process.env.APP_URL || "http://localhost:8000").replace(/\/$/, "");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const messageInput = z.object({
  studentId: z.string().uuid(),
  topic: z.enum(["ATTENDANCE", "LEARNING", "FEES", "WELLBEING", "OTHER"]),
  body: z.string().trim().min(5).max(2000),
});
const replyInput = z.object({ reply: z.string().trim().min(2).max(2000) });
const readInput = z.object({ studentId: z.string().uuid() });
const absenceInput = z.object({
  studentId: z.string().uuid(),
  type: z.enum(["ILLNESS", "MEDICAL", "FAMILY", "TRAVEL", "HOME_VISIT", "OTHER"]),
  startDate: isoDate,
  endDate: isoDate,
  reason: z.string().trim().min(3).max(1000),
});
const acknowledgeInput = z.object({ staffNote: z.string().trim().max(1000).optional(), markExcused: z.boolean().optional() });
const consentInput = z.object({ scopes: z.array(z.enum(["LEARNING", "ATTENDANCE", "FEES"])).max(3), note: z.string().trim().min(3).max(500) });
const preferenceInput = z.object({ emailEnabled: z.boolean() });

const klDayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const utcDay = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
};
const todayUtc = () => utcDay(klDayKey(new Date()))!;
const typeLabel: Record<string, string> = { ILLNESS: "illness", MEDICAL: "medical appointment", FAMILY: "family matter", TRAVEL: "travel", HOME_VISIT: "home visit", OTHER: "other reason" };
const shortDate = (date: Date) => new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", day: "numeric", month: "short" }).format(date);

export function ageOn(dateOfBirth: Date | null | undefined, onKey = klDayKey(new Date())) {
  if (!dateOfBirth) return null;
  const [by, bm, bd] = dateOfBirth.toISOString().slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = onKey.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export function familyAccess(dateOfBirth: Date | null | undefined, link: { learnerConsentScopes: string[]; learnerConsentAt: Date | null }) {
  const age = ageOn(dateOfBirth);
  const adultFrom = dateOfBirth ? new Date(Date.UTC(dateOfBirth.getUTCFullYear() + ADULT_AGE, dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate())) : null;
  let basis: AccessBasis;
  let scopes: Scope[];
  if (age == null) { basis = "AGE_UNKNOWN"; scopes = ALL_SCOPES; }
  else if (age < ADULT_AGE) { basis = "MINOR"; scopes = ALL_SCOPES; }
  else if (link.learnerConsentAt) { basis = "ADULT_CONSENT"; scopes = ALL_SCOPES.filter((scope) => link.learnerConsentScopes.includes(scope)); }
  else { basis = "ADULT_NO_CONSENT"; scopes = []; }
  return { basis, scopes, age, adultFrom };
}

function isResultReleased(attempt: { state: string; isCompleted: boolean }, policy: { releaseMode: string; releaseAt: Date | null } | null) {
  const mode = policy?.releaseMode || "IMMEDIATE";
  if (mode === "IMMEDIATE") return ["SUBMITTED", "AUTO_SUBMITTED", "FINALIZED", "RELEASED"].includes(attempt.state);
  if (mode === "SCHEDULED") return !!(policy?.releaseAt && attempt.isCompleted && Date.now() >= new Date(policy.releaseAt).getTime());
  if (mode === "AFTER_GRADING") return ["FINALIZED", "RELEASED"].includes(attempt.state);
  return false;
}

const learnerName = (student: { preferredName: string | null; studentCode: string; user: { firstName: string; lastName: string } | null }) =>
  student.preferredName || [student.user?.firstName, student.user?.lastName].filter(Boolean).join(" ") || student.studentCode;

export async function notifyFamiliesOfAbsences(prisma: PrismaClient, records: { studentId: string; status: string }[], dateKey: string) {
  if (!records.length || dateKey !== klDayKey(new Date())) return;
  const day = utcDay(dateKey);
  if (!day) return;
  const absentIds = [...new Set(records.filter((rec) => rec.status === "ABSENT").map((rec) => rec.studentId))];
  const otherIds = [...new Set(records.filter((rec) => rec.status !== "ABSENT").map((rec) => rec.studentId))].filter((id) => !absentIds.includes(id));
  if (otherIds.length) {
    const stillAbsent = await prisma.attendance.findMany({
      where: { studentId: { in: otherIds }, status: "ABSENT", date: { gte: new Date(day.getTime() - 12 * 60 * 60 * 1000), lt: new Date(day.getTime() + 36 * 60 * 60 * 1000) } },
      select: { studentId: true },
    });
    const keep = new Set(stillAbsent.map((row) => row.studentId));
    const retract = otherIds.filter((id) => !keep.has(id)).map((id) => `family-absence:${id}:${dateKey}`);
    if (retract.length) {
      const sent = await prisma.notification.findMany({ where: { sourceId: { in: retract } }, select: { id: true } });
      if (sent.length) {
        await prisma.emailOutbox.deleteMany({ where: { status: "QUEUED", dedupeKey: { in: sent.map((row) => `notification:${row.id}`) } } });
        await prisma.notification.deleteMany({ where: { id: { in: sent.map((row) => row.id) } } });
      }
    }
  }
  if (!absentIds.length) return;
  const links = await prisma.guardianStudentLink.findMany({
    where: { studentId: { in: absentIds } },
    select: {
      guardianUserId: true, studentId: true, learnerConsentScopes: true, learnerConsentAt: true,
      student: { select: { dateOfBirth: true, preferredName: true, studentCode: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!links.length) return;
  const covered = await prisma.familyAbsenceNotice.findMany({
    where: { studentId: { in: absentIds }, status: { not: "CANCELLED" }, startDate: { lte: day }, endDate: { gte: day } },
    select: { studentId: true },
  });
  const explained = new Set(covered.map((row) => row.studentId));
  const service = notificationService(prisma as any, APP_URL);
  for (const link of links) {
    if (explained.has(link.studentId)) continue;
    if (!familyAccess(link.student.dateOfBirth, link).scopes.includes("ATTENDANCE")) continue;
    const notification = await service.ensure({
      userId: link.guardianUserId, type: "FAMILY_ABSENCE_RECORDED",
      title: `${learnerName(link.student)} was marked absent today`,
      message: `Attendance for ${shortDate(day)} shows ${learnerName(link.student)} as absent. If you know the reason, report it in the Family Portal.`,
      href: `/family?student=${link.studentId}&view=attendance`,
      sourceId: `family-absence:${link.studentId}:${dateKey}`,
    });
    if (notification) {
      await prisma.emailOutbox.updateMany({
        where: { dedupeKey: `notification:${notification.id}`, status: "QUEUED", attempts: 0 },
        data: { nextAttemptAt: new Date(Date.now() + ABSENCE_EMAIL_HOLD_MS) },
      });
    }
  }
}

export function registerFamilyRoutes(app: Express, prisma: PrismaClient, authMiddleware: RequestHandler) {
  const sessionUser = (req: Request) => (req as any).user as SessionUser;
  const notify = () => notificationService(prisma as any, APP_URL);

  const guardianOnly: RequestHandler = async (req, res, next) => {
    const jwtUser = sessionUser(req);
    if (jwtUser.role !== "GUARDIAN") {
      res.status(403).json({ error: "Family Portal access only" });
      return;
    }
    try {
      const user = await prisma.user.findUnique({ where: { id: jwtUser.userId }, select: { role: true, isActive: true } });
      if (!user?.isActive || user.role !== "GUARDIAN") {
        res.status(403).json({ error: "Guardian account is unavailable" });
        return;
      }
      next();
    } catch (error) {
      console.error("Family account verification failed", error);
      res.status(500).json({ error: "Unable to verify family account" });
    }
  };

  const staffOnly: RequestHandler = async (req, res, next) => {
    const jwtUser = sessionUser(req);
    if (!["ADMIN", "STAFF"].includes(jwtUser.role)) {
      res.status(403).json({ error: "School staff access only" });
      return;
    }
    try {
      const user = await prisma.user.findUnique({ where: { id: jwtUser.userId }, select: { role: true, isActive: true } });
      if (!user?.isActive || !["ADMIN", "STAFF"].includes(user.role)) {
        res.status(403).json({ error: "School staff access only" });
        return;
      }
      next();
    } catch (error) {
      console.error("Family inbox verification failed", error);
      res.status(500).json({ error: "Unable to verify staff account" });
    }
  };

  const staffName = async (userId: string) => {
    const staff = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    return [staff?.firstName, staff?.lastName].filter(Boolean).join(" ") || "MRLC staff";
  };

  const linkedStudent = async (guardianUserId: string, studentId: string) => {
    if (!z.string().uuid().safeParse(studentId).success) return null;
    const link = await prisma.guardianStudentLink.findUnique({
      where: { guardianUserId_studentId: { guardianUserId, studentId } },
      select: {
        learnerConsentScopes: true, learnerConsentAt: true,
        student: {
          select: {
            id: true, userId: true, studentCode: true, preferredName: true, classId: true, dateOfBirth: true,
            profilePhotoUrl: true, status: true, boardingType: true,
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, level: true } },
          },
        },
      },
    });
    if (!link) return null;
    return { ...link.student, access: familyAccess(link.student.dateOfBirth, link) };
  };

  const canSeeClass = async (user: SessionUser, classId: string) => {
    if (["ADMIN", "STAFF"].includes(user.role)) return true;
    if (user.role !== "TEACHER") return false;
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId }, select: { id: true } });
    if (!teacher) return false;
    const [assigned, scheduled] = await Promise.all([
      prisma.classTeacher.count({ where: { classId, teacherId: teacher.id } }),
      prisma.timetableEntry.count({ where: { classId, OR: [{ teacherId: teacher.id }, { substituteTeacherId: teacher.id }] } }),
    ]);
    return assigned + scheduled > 0;
  };

  app.get("/api/family/students", authMiddleware, guardianOnly, async (req, res) => {
    try {
      const guardianUserId = sessionUser(req).userId;
      const links = await prisma.guardianStudentLink.findMany({
        where: { guardianUserId },
        select: {
          student: {
            select: {
              id: true, studentCode: true, preferredName: true, profilePhotoUrl: true,
              class: { select: { name: true, level: true } },
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      const unread = await prisma.familyMessage.groupBy({
        by: ["studentId"],
        where: { guardianUserId, status: "ANSWERED", guardianReadAt: null },
        _count: { _all: true },
      });
      const unreadBy = new Map(unread.map((row) => [row.studentId, row._count._all]));
      res.json(links.map(({ student }) => ({
        id: student.id,
        name: learnerName(student),
        className: student.class?.name ?? null,
        level: student.class?.level ?? null,
        profilePhotoUrl: student.profilePhotoUrl,
        unreadReplies: unreadBy.get(student.id) ?? 0,
      })));
    } catch (error) {
      console.error("Family learners failed", error);
      res.status(500).json({ error: "Unable to load linked learners" });
    }
  });

  app.get("/api/family/students/:studentId/overview", authMiddleware, guardianOnly, async (req, res) => {
    try {
      const guardianUserId = sessionUser(req).userId;
      const student = await linkedStudent(guardianUserId, req.params.studentId);
      if (!student) {
        res.status(404).json({ error: "Linked learner not found" });
        return;
      }
      const { scopes } = student.access;
      const learning = scopes.includes("LEARNING");
      const attendanceOk = scopes.includes("ATTENDANCE");
      const feesOk = scopes.includes("FEES");
      const now = new Date();
      const today = todayUtc();
      const attendanceSince = new Date(now.getTime() - 92 * DAY_MS);
      const workSince = new Date(now.getTime() - 30 * DAY_MS);
      const activitySince = new Date(now.getTime() - 14 * DAY_MS);
      const eventsUntil = new Date(today.getTime() + 60 * DAY_MS);
      const [
        attendance, homework, grades, feePayments, openAssignments, announcements, unreadReplies, schoolProfile,
        readiness, attempts, timetable, events, classTeachers, xpEvents, videoEvents, submissions, absences, preference, account,
      ] = await Promise.all([
        attendanceOk ? prisma.attendance.findMany({
          where: { studentId: student.id, date: { gte: attendanceSince } },
          select: { id: true, date: true, status: true, remarks: true },
          orderBy: { date: "desc" }, take: 200,
        }) : Promise.resolve([]),
        learning && student.classId ? prisma.homework.findMany({
          where: { classId: student.classId, dueDate: { gte: workSince } },
          select: {
            id: true, title: true, dueDate: true, status: true,
            subject: { select: { name: true } },
            submissions: { where: { studentId: student.id }, select: { status: true, score: true, feedback: true, markedAt: true }, take: 1 },
          },
          orderBy: { dueDate: "asc" }, take: 40,
        }) : Promise.resolve([]),
        learning ? prisma.grade.findMany({
          where: { studentId: student.id, marks: { not: null } },
          select: {
            id: true, marks: true, comment: true, createdAt: true,
            gradeItem: { select: { title: true, maxMarks: true, date: true, subject: { select: { name: true } } } },
          },
          orderBy: { createdAt: "desc" }, take: 12,
        }) : Promise.resolve([]),
        feesOk ? prisma.feePayment.findMany({
          where: { studentId: student.id },
          select: { id: true, description: true, amount: true, paidAmount: true, status: true, dueDate: true, paidDate: true, receiptNumber: true, currency: true },
          orderBy: { dueDate: "desc" }, take: 50,
        }) : Promise.resolve([]),
        feesOk ? prisma.feeAssignment.findMany({
          where: { studentId: student.id, feePaymentId: null, status: { not: "PAID" } },
          select: { id: true, totalAmount: true, outstandingAmount: true, status: true, dueDate: true, feeItem: { select: { name: true } } },
          orderBy: { dueDate: "asc" }, take: 30,
        }) : Promise.resolve([]),
        prisma.announcement.findMany({
          where: {
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
            AND: [{ OR: [{ audience: "ALL" }, ...(student.classId ? [{ audience: "CLASS", classId: student.classId }] : [])] }],
          },
          select: { id: true, title: true, body: true, pinned: true, createdAt: true, audience: true, className: true },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 10,
        }),
        prisma.familyMessage.count({ where: { guardianUserId, studentId: student.id, status: "ANSWERED", guardianReadAt: null } }),
        prisma.schoolProfile.findFirst({ select: { currency: true } }),
        learning ? prisma.gedReadiness.findMany({
          where: { studentId: student.id },
          select: { subject: true, status: true, note: true, updatedAt: true },
        }) : Promise.resolve([]),
        learning ? prisma.examAttempt.findMany({
          where: { studentId: student.id, isCompleted: true, score: { not: null } },
          select: {
            id: true, score: true, state: true, isCompleted: true, completedAt: true, submittedAt: true,
            exam: {
              select: {
                title: true, type: true, totalMarks: true, passMark: true,
                subject: { select: { name: true } },
                resultPolicy: { select: { releaseMode: true, releaseAt: true, showScore: true, showPassFail: true } },
              },
            },
          },
          orderBy: { completedAt: "desc" }, take: 30,
        }) : Promise.resolve([]),
        student.classId ? prisma.timetableEntry.findMany({
          where: { classId: student.classId, scheduleType: "CLASS", status: { not: "CANCELLED" }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }] },
          select: { id: true, dayOfWeek: true, startTime: true, endTime: true, subjectName: true, teacherName: true, substituteTeacherName: true, room: true, status: true },
          orderBy: [{ startTime: "asc" }], take: 80,
        }) : Promise.resolve([]),
        prisma.academicCalendarEvent.findMany({
          where: {
            audience: { in: ["ALL", "STUDENTS"] },
            OR: [{ startDate: { gte: today, lte: eventsUntil } }, { startDate: { lt: today }, endDate: { gte: today } }],
          },
          select: { id: true, title: true, eventType: true, startDate: true, endDate: true, location: true, notes: true },
          orderBy: { startDate: "asc" }, take: 12,
        }),
        student.classId ? prisma.classTeacher.findMany({
          where: { classId: student.classId },
          select: { teacher: { select: { id: true, specialization: true, user: { select: { firstName: true, lastName: true, isActive: true } } } } },
        }) : Promise.resolve([]),
        learning && student.userId ? prisma.languageQuestXpEvent.findMany({
          where: { userId: student.userId, occurredAt: { gte: activitySince } },
          select: { occurredAt: true }, take: 500,
        }) : Promise.resolve([]),
        learning && student.userId ? prisma.videoProgress.findMany({
          where: { userId: student.userId, lastWatchedAt: { gte: activitySince } },
          select: { lastWatchedAt: true }, take: 200,
        }) : Promise.resolve([]),
        learning ? prisma.homeworkSubmission.findMany({
          where: { studentId: student.id, submittedAt: { gte: activitySince } },
          select: { submittedAt: true }, take: 200,
        }) : Promise.resolve([]),
        prisma.familyAbsenceNotice.findMany({
          where: { guardianUserId, studentId: student.id, endDate: { gte: new Date(today.getTime() - 60 * DAY_MS) } },
          orderBy: { startDate: "desc" }, take: 20,
        }),
        prisma.notificationPreference.findUnique({ where: { userId: guardianUserId }, select: { emailEnabled: true } }),
        prisma.user.findUnique({ where: { id: guardianUserId }, select: { email: true } }),
      ]);

      const fees = [
        ...feePayments.map((fee) => ({
          id: fee.id, description: fee.description || "School fee", amount: fee.amount,
          paidAmount: fee.status === "WAIVED" ? 0 : fee.paidAmount,
          balance: fee.status === "WAIVED" ? 0 : Math.max(0, fee.amount - fee.paidAmount),
          status: fee.status, dueDate: fee.dueDate, paidDate: fee.paidDate,
          receiptNumber: fee.receiptNumber, currency: fee.currency,
        })),
        ...openAssignments.map((fee) => ({
          id: `assignment-${fee.id}`, description: fee.feeItem.name, amount: fee.totalAmount,
          paidAmount: fee.totalAmount - fee.outstandingAmount, balance: fee.outstandingAmount,
          status: fee.status, dueDate: fee.dueDate, paidDate: null,
          receiptNumber: null, currency: schoolProfile?.currency || "MYR",
        })),
      ];

      const examResults = attempts
        .filter((attempt) => isResultReleased(attempt, attempt.exam.resultPolicy) && attempt.exam.resultPolicy?.showScore !== false)
        .slice(0, 12)
        .map((attempt) => {
          const total = attempt.exam.totalMarks || 100;
          const percent = Math.round(((attempt.score || 0) / total) * 1000) / 10;
          const showPassFail = attempt.exam.resultPolicy?.showPassFail !== false && attempt.exam.passMark != null;
          return {
            id: attempt.id, title: attempt.exam.title, type: attempt.exam.type,
            subject: attempt.exam.subject?.name ?? null,
            score: attempt.score, totalMarks: total, percent,
            passed: showPassFail ? (attempt.score || 0) >= (attempt.exam.passMark as number) : null,
            completedAt: attempt.completedAt || attempt.submittedAt,
          };
        });

      const studyDays = new Map<string, { lessons: number; videos: number; homework: number }>();
      const bump = (date: Date | null, key: "lessons" | "videos" | "homework") => {
        if (!date) return;
        const day = klDayKey(date);
        const entry = studyDays.get(day) || { lessons: 0, videos: 0, homework: 0 };
        entry[key] += 1;
        studyDays.set(day, entry);
      };
      xpEvents.forEach((event) => bump(event.occurredAt, "lessons"));
      videoEvents.forEach((event) => bump(event.lastWatchedAt, "videos"));
      submissions.forEach((submission) => bump(submission.submittedAt, "homework"));

      const teacherMap = new Map<string, { id: string; name: string; subjects: Set<string> }>();
      classTeachers.forEach(({ teacher }) => {
        if (teacher.user && teacher.user.isActive === false) return;
        const name = [teacher.user?.firstName, teacher.user?.lastName].filter(Boolean).join(" ");
        if (!name) return;
        teacherMap.set(name, { id: teacher.id, name, subjects: new Set(teacher.specialization ? [teacher.specialization] : []) });
      });
      timetable.forEach((entry) => {
        const name = entry.teacherName;
        if (!name) return;
        const existing = teacherMap.get(name) || { id: name, name, subjects: new Set<string>() };
        if (entry.subjectName) existing.subjects.add(entry.subjectName);
        teacherMap.set(name, existing);
      });

      res.json({
        student: {
          id: student.id,
          name: learnerName(student),
          studentCode: student.studentCode,
          className: student.class?.name ?? null, level: student.class?.level ?? null,
          boarding: student.boardingType === "BOARDING",
          hasLmsAccount: Boolean(student.userId),
        },
        access: { basis: student.access.basis, scopes, adultFrom: student.access.adultFrom },
        alerts: { emailEnabled: Boolean(preference?.emailEnabled), email: account?.email ?? null },
        asOf: now.toISOString(),
        today: klDayKey(now),
        attendance,
        homework: homework.map((item) => ({
          id: item.id, title: item.title, dueDate: item.dueDate, status: item.status,
          subject: item.subject?.name ?? null, submission: item.submissions[0] ?? null,
        })),
        grades: grades.map((grade) => ({
          id: grade.id, title: grade.gradeItem.title, subject: grade.gradeItem.subject?.name ?? null,
          marks: grade.marks, maxMarks: grade.gradeItem.maxMarks, comment: grade.comment,
          date: grade.gradeItem.date,
        })),
        readiness,
        examResults,
        timetable: timetable.map((entry) => ({
          id: entry.id, day: entry.dayOfWeek, start: entry.startTime, end: entry.endTime,
          subject: entry.subjectName, teacher: entry.status === "SUBSTITUTED" && entry.substituteTeacherName ? entry.substituteTeacherName : entry.teacherName,
          substituted: entry.status === "SUBSTITUTED", room: entry.room,
        })),
        events,
        teachers: [...teacherMap.values()].map((teacher) => ({ id: teacher.id, name: teacher.name, subjects: [...teacher.subjects] })),
        studyDays: [...studyDays.entries()].map(([day, counts]) => ({ day, ...counts })).sort((a, b) => a.day.localeCompare(b.day)),
        absences,
        fees,
        announcements,
        unreadReplies,
      });
    } catch (error) {
      console.error("Family overview failed", error);
      res.status(500).json({ error: "Unable to load family overview" });
    }
  });

  app.put("/api/family/preferences", authMiddleware, guardianOnly, async (req, res) => {
    const parsed = preferenceInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose whether to receive email alerts" });
      return;
    }
    try {
      const userId = sessionUser(req).userId;
      const preference = await prisma.notificationPreference.upsert({
        where: { userId },
        update: { emailEnabled: parsed.data.emailEnabled, inAppEnabled: true },
        create: { userId, emailEnabled: parsed.data.emailEnabled, inAppEnabled: true },
        select: { emailEnabled: true },
      });
      res.json(preference);
    } catch (error) {
      console.error("Family preferences failed", error);
      res.status(500).json({ error: "Unable to save alert settings" });
    }
  });

  app.get("/api/family/messages", authMiddleware, guardianOnly, async (req, res) => {
    try {
      const studentId = String(req.query.studentId || "");
      const student = await linkedStudent(sessionUser(req).userId, studentId);
      if (!student) {
        res.status(404).json({ error: "Linked learner not found" });
        return;
      }
      const messages = await prisma.familyMessage.findMany({
        where: { guardianUserId: sessionUser(req).userId, studentId },
        orderBy: { createdAt: "desc" }, take: 100,
      });
      res.json(messages);
    } catch (error) {
      console.error("Family messages failed", error);
      res.status(500).json({ error: "Unable to load messages" });
    }
  });

  app.post("/api/family/messages", authMiddleware, guardianOnly, async (req, res) => {
    const parsed = messageInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose a topic and enter a message of 5 to 2000 characters" });
      return;
    }
    try {
      const student = await linkedStudent(sessionUser(req).userId, parsed.data.studentId);
      if (!student) {
        res.status(404).json({ error: "Linked learner not found" });
        return;
      }
      const message = await prisma.familyMessage.create({ data: { ...parsed.data, guardianUserId: sessionUser(req).userId } });
      res.status(201).json(message);
    } catch (error) {
      console.error("Family message send failed", error);
      res.status(500).json({ error: "Unable to send message" });
    }
  });

  app.post("/api/family/messages/read", authMiddleware, guardianOnly, async (req, res) => {
    const parsed = readInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose a learner" });
      return;
    }
    try {
      const guardianUserId = sessionUser(req).userId;
      const student = await linkedStudent(guardianUserId, parsed.data.studentId);
      if (!student) {
        res.status(404).json({ error: "Linked learner not found" });
        return;
      }
      const result = await prisma.familyMessage.updateMany({
        where: { guardianUserId, studentId: student.id, status: "ANSWERED", guardianReadAt: null },
        data: { guardianReadAt: new Date() },
      });
      res.json({ updated: result.count });
    } catch (error) {
      console.error("Family message read failed", error);
      res.status(500).json({ error: "Unable to update messages" });
    }
  });

  app.post("/api/family/absences", authMiddleware, guardianOnly, async (req, res) => {
    const parsed = absenceInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose a reason, the first and last day, and add a short note" });
      return;
    }
    const startDate = utcDay(parsed.data.startDate);
    const endDate = utcDay(parsed.data.endDate);
    const today = todayUtc();
    if (!startDate || !endDate) {
      res.status(400).json({ error: "Enter valid dates" });
      return;
    }
    if (endDate < startDate) {
      res.status(400).json({ error: "The last day must be on or after the first day" });
      return;
    }
    if (startDate.getTime() < today.getTime() - 14 * DAY_MS) {
      res.status(400).json({ error: "Absences older than 14 days must be explained to the office directly" });
      return;
    }
    if (startDate.getTime() > today.getTime() + 120 * DAY_MS || endDate.getTime() - startDate.getTime() > 60 * DAY_MS) {
      res.status(400).json({ error: "Notices can cover up to 60 days and start within the next 4 months" });
      return;
    }
    try {
      const guardianUserId = sessionUser(req).userId;
      const student = await linkedStudent(guardianUserId, parsed.data.studentId);
      if (!student) {
        res.status(404).json({ error: "Linked learner not found" });
        return;
      }
      const overlap = await prisma.familyAbsenceNotice.findFirst({
        where: { studentId: student.id, status: { not: "CANCELLED" }, startDate: { lte: endDate }, endDate: { gte: startDate } },
        select: { id: true },
      });
      if (overlap) {
        res.status(409).json({ error: "A notice already covers some of these days. Cancel it first or message the office." });
        return;
      }
      const notice = await prisma.familyAbsenceNotice.create({
        data: { guardianUserId, studentId: student.id, type: parsed.data.type, startDate, endDate, reason: parsed.data.reason },
      });
      if (student.classId) {
        const teachers = await prisma.classTeacher.findMany({
          where: { classId: student.classId },
          select: { teacher: { select: { userId: true } } },
        });
        const range = startDate.getTime() === endDate.getTime() ? shortDate(startDate) : `${shortDate(startDate)} to ${shortDate(endDate)}`;
        for (const userId of new Set(teachers.map((row) => row.teacher.userId).filter((id): id is string => !!id))) {
          await notify().ensure({
            userId, type: "CLASS_FAMILY_NOTICE",
            title: `Absence notice: ${learnerName(student)}`,
            message: `${learnerName(student)} (${student.class?.name || "your class"}) will be away ${range} for ${typeLabel[notice.type]}. It shows next to their name when you take attendance.`,
            href: "/teacher/attendance", sourceId: `family-notice:${notice.id}`,
          }).catch((error) => console.error("Teacher notice alert failed", error));
        }
      }
      res.status(201).json(notice);
    } catch (error) {
      console.error("Family absence notice failed", error);
      res.status(500).json({ error: "Unable to send absence notice" });
    }
  });

  app.post("/api/family/absences/:id/cancel", authMiddleware, guardianOnly, async (req, res) => {
    try {
      const guardianUserId = sessionUser(req).userId;
      const notice = await prisma.familyAbsenceNotice.findFirst({ where: { id: String(req.params.id), guardianUserId } });
      if (!notice) {
        res.status(404).json({ error: "Notice not found" });
        return;
      }
      if (notice.status !== "SUBMITTED" || notice.startDate < todayUtc()) {
        res.status(409).json({ error: "This notice can no longer be cancelled here. Please message the office." });
        return;
      }
      const updated = await prisma.familyAbsenceNotice.update({ where: { id: notice.id }, data: { status: "CANCELLED" } });
      res.json(updated);
    } catch (error) {
      console.error("Family absence cancel failed", error);
      res.status(500).json({ error: "Unable to cancel notice" });
    }
  });

  app.get("/api/family/absences/for-class", authMiddleware, async (req, res) => {
    const classId = String(req.query.classId || "");
    const day = utcDay(String(req.query.date || ""));
    if (!z.string().uuid().safeParse(classId).success || !day) {
      res.status(400).json({ error: "classId and date are required" });
      return;
    }
    try {
      if (!(await canSeeClass(sessionUser(req), classId))) {
        res.status(403).json({ error: "Not your class" });
        return;
      }
      const notices = await prisma.familyAbsenceNotice.findMany({
        where: { student: { classId }, status: { not: "CANCELLED" }, startDate: { lte: day }, endDate: { gte: day } },
        select: { id: true, studentId: true, type: true, startDate: true, endDate: true, status: true },
      });
      res.json(notices);
    } catch (error) {
      console.error("Class absence notices failed", error);
      res.status(500).json({ error: "Unable to load family notices" });
    }
  });

  app.get("/api/family/inbox", authMiddleware, staffOnly, async (_req, res) => {
    try {
      const messages = await prisma.familyMessage.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200,
        include: {
          guardian: { select: { firstName: true, lastName: true, email: true } },
          student: { select: { preferredName: true, studentCode: true, user: { select: { firstName: true, lastName: true } } } },
        },
      });
      res.json(messages);
    } catch (error) {
      console.error("Family inbox failed", error);
      res.status(500).json({ error: "Unable to load family inbox" });
    }
  });

  app.patch("/api/family/inbox/:id", authMiddleware, staffOnly, async (req, res) => {
    const parsed = replyInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Reply must be 2 to 2000 characters" });
      return;
    }
    try {
      const message = await prisma.familyMessage.update({
        where: { id: req.params.id },
        data: {
          reply: parsed.data.reply, status: "ANSWERED", repliedAt: new Date(), guardianReadAt: null,
          repliedByName: await staffName(sessionUser(req).userId),
        },
        include: { student: { select: { preferredName: true, studentCode: true, user: { select: { firstName: true, lastName: true } } } } },
      });
      await notify().ensure({
        userId: message.guardianUserId, type: "FAMILY_REPLY",
        title: `Reply about ${learnerName(message.student)}`,
        message: parsed.data.reply.length > 280 ? `${parsed.data.reply.slice(0, 277)}…` : parsed.data.reply,
        href: `/family?student=${message.studentId}&view=messages`,
        sourceId: `family-reply:${message.id}:${message.repliedAt?.getTime()}`,
      }).catch((error) => console.error("Family reply alert failed", error));
      res.json(message);
    } catch (error: any) {
      if (error?.code === "P2025") { res.status(404).json({ error: "Message not found" }); return; }
      console.error("Family reply failed", error);
      res.status(500).json({ error: "Unable to send reply" });
    }
  });

  app.get("/api/family/absences/inbox", authMiddleware, staffOnly, async (_req, res) => {
    try {
      const since = new Date(todayUtc().getTime() - 30 * DAY_MS);
      const notices = await prisma.familyAbsenceNotice.findMany({
        where: { endDate: { gte: since } },
        orderBy: [{ status: "desc" }, { startDate: "asc" }], take: 200,
        include: {
          guardian: { select: { firstName: true, lastName: true, email: true } },
          student: { select: { preferredName: true, studentCode: true, class: { select: { name: true } }, user: { select: { firstName: true, lastName: true } } } },
        },
      });
      res.json(notices);
    } catch (error) {
      console.error("Family absence inbox failed", error);
      res.status(500).json({ error: "Unable to load absence notices" });
    }
  });

  app.patch("/api/family/absences/:id/acknowledge", authMiddleware, staffOnly, async (req, res) => {
    const parsed = acknowledgeInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Note must be 1000 characters or fewer" });
      return;
    }
    try {
      const notice = await prisma.familyAbsenceNotice.findUnique({
        where: { id: String(req.params.id) },
        include: { student: { select: { preferredName: true, studentCode: true, user: { select: { firstName: true, lastName: true } } } } },
      });
      if (!notice) { res.status(404).json({ error: "Notice not found" }); return; }
      if (notice.status === "CANCELLED") { res.status(409).json({ error: "The family cancelled this notice" }); return; }
      const byName = await staffName(sessionUser(req).userId);
      const updated = await prisma.familyAbsenceNotice.update({
        where: { id: notice.id },
        data: { status: "ACKNOWLEDGED", staffNote: parsed.data.staffNote || null, acknowledgedAt: new Date(), acknowledgedByName: byName },
      });
      let excusedRecords = 0;
      if (parsed.data.markExcused !== false) {
        const result = await prisma.attendance.updateMany({
          where: {
            studentId: notice.studentId, status: "ABSENT",
            date: { gte: new Date(notice.startDate.getTime() - 12 * 60 * 60 * 1000), lt: new Date(notice.endDate.getTime() + 36 * 60 * 60 * 1000) },
          },
          data: { status: "EXCUSED", remarks: `Family notice: ${typeLabel[notice.type] || "absence"}` },
        });
        excusedRecords = result.count;
      }
      await notify().ensure({
        userId: notice.guardianUserId, type: "FAMILY_NOTICE_ACK",
        title: `Absence notice received for ${learnerName(notice.student)}`,
        message: parsed.data.staffNote ? `${byName}: ${parsed.data.staffNote}` : `${byName} at the MRLC office has received your notice for ${shortDate(notice.startDate)}${notice.endDate.getTime() !== notice.startDate.getTime() ? ` to ${shortDate(notice.endDate)}` : ""}.`,
        href: `/family?student=${notice.studentId}&view=attendance`,
        sourceId: `family-notice-ack:${notice.id}`,
      }).catch((error) => console.error("Family notice alert failed", error));
      res.json({ ...updated, excusedRecords });
    } catch (error) {
      console.error("Family absence acknowledge failed", error);
      res.status(500).json({ error: "Unable to acknowledge notice" });
    }
  });

  app.get("/api/family/links", authMiddleware, staffOnly, async (_req, res) => {
    try {
      const links = await prisma.guardianStudentLink.findMany({
        orderBy: { createdAt: "desc" }, take: 500,
        select: {
          id: true, learnerConsentScopes: true, learnerConsentAt: true, learnerConsentByName: true, learnerConsentNote: true,
          guardian: { select: { firstName: true, lastName: true, email: true, isActive: true } },
          student: { select: { id: true, dateOfBirth: true, preferredName: true, studentCode: true, class: { select: { name: true } }, user: { select: { firstName: true, lastName: true } } } },
        },
      });
      res.json(links.map((link) => {
        const access = familyAccess(link.student.dateOfBirth, link);
        return {
          id: link.id,
          guardian: { name: [link.guardian.firstName, link.guardian.lastName].filter(Boolean).join(" "), email: link.guardian.email, active: link.guardian.isActive },
          student: { id: link.student.id, name: learnerName(link.student), code: link.student.studentCode, className: link.student.class?.name ?? null },
          age: access.age, adultFrom: access.adultFrom, basis: access.basis, scopes: access.scopes,
          consent: { scopes: link.learnerConsentScopes, at: link.learnerConsentAt, byName: link.learnerConsentByName, note: link.learnerConsentNote },
        };
      }));
    } catch (error) {
      console.error("Family links failed", error);
      res.status(500).json({ error: "Unable to load family links" });
    }
  });

  app.put("/api/family/links/:id/consent", authMiddleware, staffOnly, async (req, res) => {
    const parsed = consentInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose what the learner agrees to share and note how they agreed" });
      return;
    }
    try {
      const byName = await staffName(sessionUser(req).userId);
      const link = await prisma.guardianStudentLink.update({
        where: { id: String(req.params.id) },
        data: { learnerConsentScopes: parsed.data.scopes, learnerConsentAt: new Date(), learnerConsentByName: byName, learnerConsentNote: parsed.data.note },
        select: { id: true, learnerConsentScopes: true, learnerConsentAt: true },
      });
      res.json(link);
    } catch (error: any) {
      if (error?.code === "P2025") { res.status(404).json({ error: "Family link not found" }); return; }
      console.error("Family consent failed", error);
      res.status(500).json({ error: "Unable to save the learner's choice" });
    }
  });
}
