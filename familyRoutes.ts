import type { Express, Request, RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

type SessionUser = { userId: string; role: string };

const messageInput = z.object({
  studentId: z.string().uuid(),
  topic: z.enum(["ATTENDANCE", "LEARNING", "FEES", "OTHER"]),
  body: z.string().trim().min(5).max(2000),
});
const replyInput = z.object({ reply: z.string().trim().min(2).max(2000) });

export function registerFamilyRoutes(app: Express, prisma: PrismaClient, authMiddleware: RequestHandler) {
  const sessionUser = (req: Request) => (req as any).user as SessionUser;

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

  const linkedStudent = async (guardianUserId: string, studentId: string) => {
    if (!z.string().uuid().safeParse(studentId).success) return null;
    const link = await prisma.guardianStudentLink.findUnique({
      where: { guardianUserId_studentId: { guardianUserId, studentId } },
      select: {
        student: {
          select: {
            id: true, studentCode: true, preferredName: true, classId: true,
            profilePhotoUrl: true, status: true,
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, level: true } },
          },
        },
      },
    });
    return link?.student ?? null;
  };

  app.get("/api/family/students", authMiddleware, guardianOnly, async (req, res) => {
    try {
      const links = await prisma.guardianStudentLink.findMany({
        where: { guardianUserId: sessionUser(req).userId },
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
      res.json(links.map(({ student }) => ({
        id: student.id,
        name: student.preferredName || [student.user?.firstName, student.user?.lastName].filter(Boolean).join(" ") || student.studentCode,
        className: student.class?.name ?? null,
        level: student.class?.level ?? null,
        profilePhotoUrl: student.profilePhotoUrl,
      })));
    } catch (error) {
      console.error("Family learners failed", error);
      res.status(500).json({ error: "Unable to load linked learners" });
    }
  });

  app.get("/api/family/students/:studentId/overview", authMiddleware, guardianOnly, async (req, res) => {
    try {
      const student = await linkedStudent(sessionUser(req).userId, req.params.studentId);
      if (!student) {
        res.status(404).json({ error: "Linked learner not found" });
        return;
      }
      const now = new Date();
      const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const [attendance, homework, grades, feePayments, openAssignments, announcements, openMessages, schoolProfile] = await Promise.all([
        prisma.attendance.findMany({
          where: { studentId: student.id, date: { gte: since } },
          select: { id: true, date: true, status: true, remarks: true },
          orderBy: { date: "desc" }, take: 60,
        }),
        student.classId ? prisma.homework.findMany({
          where: { classId: student.classId, dueDate: { gte: since } },
          select: {
            id: true, title: true, dueDate: true, status: true,
            subject: { select: { name: true } },
            submissions: { where: { studentId: student.id }, select: { status: true, score: true, feedback: true, markedAt: true }, take: 1 },
          },
          orderBy: { dueDate: "asc" }, take: 30,
        }) : Promise.resolve([]),
        prisma.grade.findMany({
          where: { studentId: student.id, marks: { not: null } },
          select: {
            id: true, marks: true, comment: true, createdAt: true,
            gradeItem: { select: { title: true, maxMarks: true, date: true, subject: { select: { name: true } } } },
          },
          orderBy: { createdAt: "desc" }, take: 8,
        }),
        prisma.feePayment.findMany({
          where: { studentId: student.id },
          select: { id: true, description: true, amount: true, paidAmount: true, status: true, dueDate: true, paidDate: true, receiptNumber: true, currency: true },
          orderBy: { dueDate: "desc" }, take: 50,
        }),
        prisma.feeAssignment.findMany({
          where: { studentId: student.id, feePaymentId: null, status: { not: "PAID" } },
          select: { id: true, totalAmount: true, outstandingAmount: true, status: true, dueDate: true, feeItem: { select: { name: true } } },
          orderBy: { dueDate: "asc" }, take: 30,
        }),
        prisma.announcement.findMany({
          where: { status: "ACTIVE", audience: "ALL", OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          select: { id: true, title: true, body: true, pinned: true, createdAt: true },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 8,
        }),
        prisma.familyMessage.count({ where: { guardianUserId: sessionUser(req).userId, studentId: student.id, status: "ANSWERED" } }),
        prisma.schoolProfile.findFirst({ select: { currency: true } }),
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
      res.json({
        student: {
          id: student.id,
          name: student.preferredName || [student.user?.firstName, student.user?.lastName].filter(Boolean).join(" ") || student.studentCode,
          className: student.class?.name ?? null, level: student.class?.level ?? null,
        },
        asOf: now.toISOString(),
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
        fees,
        announcements,
        answeredMessages: openMessages,
      });
    } catch (error) {
      console.error("Family overview failed", error);
      res.status(500).json({ error: "Unable to load family overview" });
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
      const staff = await prisma.user.findUnique({ where: { id: sessionUser(req).userId }, select: { firstName: true, lastName: true } });
      const message = await prisma.familyMessage.update({
        where: { id: req.params.id },
        data: {
          reply: parsed.data.reply, status: "ANSWERED", repliedAt: new Date(),
          repliedByName: [staff?.firstName, staff?.lastName].filter(Boolean).join(" ") || "MRLC staff",
        },
      });
      res.json(message);
    } catch (error: any) {
      if (error?.code === "P2025") { res.status(404).json({ error: "Message not found" }); return; }
      console.error("Family reply failed", error);
      res.status(500).json({ error: "Unable to send reply" });
    }
  });
}
