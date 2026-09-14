import type { Express, Request, RequestHandler, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  classworkResourceTarget,
  studentCanSeeClassworkExam,
  type ClassworkItem,
} from "./shared/classwork";

type Actor = { userId: string; role: string };
interface Dependencies {
  app: Express;
  prisma: PrismaClient;
  authMiddleware: RequestHandler;
  logger: { error: (...args: any[]) => void };
  canManageExamClass: (actor: any, classId: string) => Promise<boolean>;
}
class ClassworkError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const classSelect = {
  id: true,
  name: true,
  level: true,
  academicYear: true,
} as const;
const cleanText = (value: unknown, max: number, required = false) => {
  if (value != null && typeof value !== "string")
    throw new ClassworkError(400, "Text fields must be strings");
  const result = String(value ?? "").trim();
  if ((required && !result) || result.length > max)
    throw new ClassworkError(
      400,
      `Enter ${required ? "1" : "0"}–${max} characters`,
    );
  return result;
};

export function registerClassworkRoutes({
  app,
  prisma,
  authMiddleware,
  logger,
  canManageExamClass,
}: Dependencies) {
  const wrap =
    (handler: (req: Request, res: Response) => Promise<void>): RequestHandler =>
    async (req, res) => {
      try {
        await handler(req, res);
      } catch (error: any) {
        if (error instanceof ClassworkError) {
          res.status(error.status).json({ error: error.message });
          return;
        }
        if (error?.code === "P2002") {
          res
            .status(409)
            .json({ error: "A topic with this name already exists." });
          return;
        }
        if (["P2021", "P2022"].includes(error?.code)) {
          res.status(503).json({
            error:
              "Classwork needs its database update. Run the pending Prisma migrations before using this module.",
          });
          return;
        }
        logger.error("Classwork request failed", error);
        res.status(500).json({
          error: "Could not update or load classwork. Please try again.",
        });
      }
    };
  const actorFor = (req: Request): Actor => {
    const actor = (req as any).user as Actor;
    if (!actor || !["ADMIN", "TEACHER", "STUDENT"].includes(actor.role))
      throw new ClassworkError(
        403,
        "Classwork is available to teachers and students.",
      );
    return actor;
  };
  const access = async (req: Request, write = false) => {
    const actor = actorFor(req);
    const classId = String(req.params.classId);
    let studentId: string | null = null;
    if (actor.role === "STUDENT") {
      if (write)
        throw new ClassworkError(
          403,
          "Only class teachers can organize classwork.",
        );
      const student = await prisma.student.findUnique({
        where: { userId: actor.userId },
        select: { id: true, classId: true },
      });
      if (student?.classId !== classId)
        throw new ClassworkError(403, "This is not your class.");
      studentId = student.id;
    } else if (!(await canManageExamClass(actor, classId)))
      throw new ClassworkError(403, "This is not your class.");
    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: classSelect,
    });
    if (!klass) throw new ClassworkError(404, "Class not found.");
    return { actor, classId, studentId, klass };
  };
  const topicFor = async (classId: string, value: unknown) => {
    if (value == null || value === "") return null;
    if (
      typeof value !== "string" ||
      !(await prisma.classworkTopic.findFirst({
        where: { id: value, classId },
        select: { id: true },
      }))
    )
      throw new ClassworkError(400, "Choose a topic in this class.");
    return value;
  };
  const resourceAvailable = async (url: string) => {
    const target = classworkResourceTarget(url);
    if (!target) return false;
    if (target.type === "EBOOK")
      return !!(await prisma.ebook.findFirst({
        where: { id: target.id, visibility: { in: ["ALL", "STUDENTS"] } },
        select: { id: true },
      }));
    if (target.type === "COURSE")
      return !!(await prisma.languageQuestCourse.findFirst({
        where: {
          id: target.id,
          published: true,
          OR: [{ reviewRequired: false }, { reviewStatus: "APPROVED" }],
        },
        select: { id: true },
      }));
    if (target.type === "NEWS")
      return !!(await prisma.newsArticle.findUnique({
        where: { id: target.id },
        select: { id: true },
      }));
    return true;
  };

  app.get(
    "/api/classwork/classes",
    authMiddleware,
    wrap(async (req, res) => {
      const actor = actorFor(req);
      if (actor.role === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { userId: actor.userId },
          select: { class: { select: classSelect } },
        });
        res.json(student?.class ? [student.class] : []);
        return;
      }
      res.json(
        await prisma.class.findMany({
          where:
            actor.role === "ADMIN"
              ? {}
              : { teachers: { some: { teacher: { userId: actor.userId } } } },
          select: classSelect,
          orderBy: { name: "asc" },
        }),
      );
    }),
  );

  app.get(
    "/api/classwork/classes/:classId",
    authMiddleware,
    wrap(async (req, res) => {
      const { actor, classId, studentId, klass } = await access(req);
      const canManage = actor.role !== "STUDENT";
      const [topics, placements, resources, homework, exams] =
        await Promise.all([
          prisma.classworkTopic.findMany({
            where: { classId },
            select: { id: true, title: true },
            orderBy: { createdAt: "asc" },
          }),
          prisma.classworkPlacement.findMany({ where: { classId } }),
          prisma.classworkResource.findMany({
            where: { classId },
            orderBy: { createdAt: "desc" },
          }),
          prisma.homework.findMany({
            where: { classId },
            select: {
              id: true,
              title: true,
              instructions: true,
              dueDate: true,
              createdAt: true,
              status: true,
              subject: { select: { name: true } },
              submissions: {
                where: studentId ? { studentId } : {},
                select: { status: true },
              },
            },
          }),
          prisma.exam.findMany({
            where: {
              classId,
              status: canManage
                ? { not: "ARCHIVED" }
                : { in: ["PUBLISHED", "ACTIVE", "SCHEDULED", "CLOSED"] },
            },
            select: {
              id: true,
              title: true,
              status: true,
              date: true,
              createdAt: true,
              availableFrom: true,
              availableUntil: true,
              allowLateStart: true,
              attemptLimit: true,
              subject: { select: { name: true } },
              _count: {
                select: {
                  assignments: true,
                  attempts: {
                    where: {
                      studentId: studentId ?? "__no_student__",
                      state: { not: "INVALIDATED" },
                    },
                  },
                },
              },
              assignments: {
                where: { studentId: studentId ?? "__no_student__" },
                select: {
                  studentId: true,
                  availableFromOverride: true,
                  availableUntilOverride: true,
                  attemptLimitOverride: true,
                },
              },
              attempts: {
                where: {
                  studentId: studentId ?? "__no_student__",
                  state: { not: "INVALIDATED" },
                },
                orderBy: { attemptNumber: "desc" },
                take: 1,
                select: { id: true, isCompleted: true, state: true },
              },
            },
          }),
        ]);
      const placementMap = new Map(
        placements.map((p) => [`${p.sourceType}:${p.sourceId}`, p]),
      );
      const withPlacement = (
        item: Omit<ClassworkItem, "topicId" | "pinned">,
      ): ClassworkItem => ({
        ...item,
        topicId: placementMap.get(item.id)?.topicId ?? null,
        pinned: placementMap.get(item.id)?.pinned ?? false,
      });
      const items: ClassworkItem[] = homework.map((h) => {
        const submission = studentId ? h.submissions[0]?.status : null;
        const pending = h.submissions.filter(
          (s) => s.status === "SUBMITTED",
        ).length;
        return withPlacement({
          id: `HOMEWORK:${h.id}`,
          sourceType: "HOMEWORK",
          sourceId: h.id,
          kind: "HOMEWORK",
          title: h.title,
          description: h.instructions,
          subject: h.subject?.name ?? null,
          dueDate: h.dueDate.toISOString(),
          createdAt: h.createdAt.toISOString(),
          href: canManage
            ? `/teacher/homework/${h.id}`
            : `/student/homework?assignment=${encodeURIComponent(h.id)}`,
          status: canManage
            ? pending
              ? `${pending} to review`
              : h.status
            : submission === "MARKED" || submission === "SUBMITTED"
              ? submission
              : h.status === "CLOSED"
                ? "CLOSED"
                : (submission ?? h.status),
          actionable:
            !canManage &&
            h.status === "OPEN" &&
            (!submission || submission === "REDO"),
        });
      });
      for (const exam of exams) {
        const completed = !!exam.attempts[0]?.isCompleted;
        const assignment = exam.assignments[0];
        const availableFrom =
          assignment?.availableFromOverride ?? exam.availableFrom;
        const availableUntil =
          assignment?.availableUntilOverride ?? exam.availableUntil;
        const attemptLimit =
          assignment?.attemptLimitOverride ?? exam.attemptLimit;
        const inProgress = ["IN_PROGRESS", "PAUSED"].includes(
          exam.attempts[0]?.state,
        );
        const attemptsRemain = exam._count.attempts < attemptLimit;
        if (
          !canManage &&
          !studentCanSeeClassworkExam({
            status: exam.status,
            assignmentCount: exam._count.assignments,
            assignedToStudent: !!exam.assignments.length,
            completed,
          })
        )
          continue;
        const upcoming =
          !!availableFrom && availableFrom.getTime() > Date.now();
        const ended =
          !!availableUntil &&
          availableUntil.getTime() < Date.now() &&
          !exam.allowLateStart;
        const canAttempt =
          !upcoming &&
          !ended &&
          ["PUBLISHED", "ACTIVE", "SCHEDULED"].includes(exam.status) &&
          (inProgress || attemptsRemain);
        const showResult = completed && !canAttempt;
        items.push(
          withPlacement({
            id: `EXAM:${exam.id}`,
            sourceType: "EXAM",
            sourceId: exam.id,
            kind: "EXAM",
            title: exam.title,
            description: null,
            subject: exam.subject?.name ?? null,
            dueDate: availableUntil?.toISOString() ?? null,
            createdAt: exam.createdAt.toISOString(),
            href: canManage
              ? `/exams/${exam.id}`
              : showResult
                ? `/exam2/attempts/${exam.attempts[0].id}/result`
                : `/exam2/resume?exam=${encodeURIComponent(exam.id)}`,
            status: canManage
              ? exam.status
              : showResult
                ? "SUBMITTED"
                : upcoming
                  ? "UPCOMING"
                  : ended
                    ? "CLOSED"
                    : inProgress
                      ? "IN_PROGRESS"
                      : completed && canAttempt
                        ? "RETAKE_AVAILABLE"
                        : !attemptsRemain
                          ? "NO_ATTEMPTS"
                          : exam.status,
            actionable: !canManage && canAttempt,
          }),
        );
      }
      const available = await Promise.all(
        resources.map((r) => resourceAvailable(r.url)),
      );
      resources.forEach((r, index) => {
        if (!available[index] && !canManage) return;
        items.push(
          withPlacement({
            id: `RESOURCE:${r.id}`,
            sourceType: "RESOURCE",
            sourceId: r.id,
            kind: r.kind as "READING" | "ACTIVITY",
            title: r.title,
            description: r.description,
            subject: null,
            dueDate: null,
            createdAt: r.createdAt.toISOString(),
            href: available[index] ? r.url : "",
            status: available[index] ? "RESOURCE" : "UNAVAILABLE",
            actionable: false,
          }),
        );
      });
      res.json({ class: klass, canManage, topics, items });
    }),
  );

  app.post(
    "/api/classwork/classes/:classId/topics",
    authMiddleware,
    wrap(async (req, res) => {
      const { classId } = await access(req, true);
      const title = cleanText(req.body?.title, 100, true);
      res.status(201).json(
        await prisma.classworkTopic.create({
          data: { classId, title },
          select: { id: true, title: true },
        }),
      );
    }),
  );

  app.get(
    "/api/classwork/classes/:classId/catalog",
    authMiddleware,
    wrap(async (req, res) => {
      await access(req, true);
      const query = cleanText(req.query.q, 100);
      const filter = { contains: query, mode: "insensitive" as const };
      const [books, articles, courses] = await Promise.all([
        prisma.ebook.findMany({
          where: { title: filter, visibility: { in: ["ALL", "STUDENTS"] } },
          select: { id: true, title: true },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
        prisma.newsArticle.findMany({
          where: { title: filter },
          select: { id: true, title: true },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
        prisma.languageQuestCourse.findMany({
          where: {
            title: filter,
            published: true,
            OR: [{ reviewRequired: false }, { reviewStatus: "APPROVED" }],
          },
          select: { id: true, title: true },
          take: 20,
          orderBy: { title: "asc" },
        }),
      ]);
      res.json([
        ...books.map((b) => ({
          title: b.title,
          kind: "E-library",
          url: `/elibrary/${b.id}/read`,
        })),
        ...articles.map((a) => ({
          title: a.title,
          kind: "News",
          url: `/news/${a.id}`,
        })),
        ...courses.map((c) => ({
          title: c.title,
          kind: "Language Quest",
          url: `/games/language-quest/courses/${c.id}`,
        })),
      ]);
    }),
  );
  app.patch(
    "/api/classwork/classes/:classId/topics/:topicId",
    authMiddleware,
    wrap(async (req, res) => {
      const { classId } = await access(req, true);
      const topicId = await topicFor(classId, req.params.topicId);
      res.json(
        await prisma.classworkTopic.update({
          where: { id: topicId! },
          data: { title: cleanText(req.body?.title, 100, true) },
          select: { id: true, title: true },
        }),
      );
    }),
  );

  app.put(
    "/api/classwork/classes/:classId/placement",
    authMiddleware,
    wrap(async (req, res) => {
      const { classId } = await access(req, true);
      const { sourceType, sourceId, pinned } = req.body ?? {};
      if (
        !["HOMEWORK", "EXAM", "RESOURCE"].includes(sourceType) ||
        typeof sourceId !== "string" ||
        (pinned !== undefined && typeof pinned !== "boolean")
      )
        throw new ClassworkError(400, "Invalid classwork item.");
      const model =
        sourceType === "HOMEWORK"
          ? prisma.homework
          : sourceType === "EXAM"
            ? prisma.exam
            : prisma.classworkResource;
      const source = await (model as any).findFirst({
        where: { id: sourceId, classId },
        select: { id: true },
      });
      if (!source)
        throw new ClassworkError(
          404,
          "Classwork item not found in this class.",
        );
      const data: { topicId?: string | null; pinned?: boolean } = {};
      if (Object.hasOwn(req.body, "topicId"))
        data.topicId = await topicFor(classId, req.body.topicId);
      if (pinned !== undefined) data.pinned = pinned;
      res.json(
        await prisma.classworkPlacement.upsert({
          where: {
            classId_sourceType_sourceId: { classId, sourceType, sourceId },
          },
          create: { classId, sourceType, sourceId, ...data },
          update: data,
        }),
      );
    }),
  );

  app.post(
    "/api/classwork/classes/:classId/resources",
    authMiddleware,
    wrap(async (req, res) => {
      const { actor, classId } = await access(req, true);
      const title = cleanText(req.body?.title, 200, true);
      const description = cleanText(req.body?.description, 5000);
      const target = classworkResourceTarget(req.body?.url);
      if (!target || !(await resourceAvailable(target.url)))
        throw new ClassworkError(
          400,
          "Choose an available student reading, published Language Quest course, or HTTPS resource link.",
        );
      const kind = target.type === "COURSE" ? "ACTIVITY" : "READING";
      const topicId = await topicFor(classId, req.body?.topicId);
      const resource = await prisma.$transaction(async (tx) => {
        const resource = await tx.classworkResource.create({
          data: {
            classId,
            title,
            description: description || null,
            url: target.url,
            kind,
            createdById: actor.userId,
          },
        });
        if (topicId)
          await tx.classworkPlacement.create({
            data: {
              classId,
              sourceType: "RESOURCE",
              sourceId: resource.id,
              topicId,
            },
          });
        return resource;
      });
      res.status(201).json(resource);
    }),
  );
  app.delete(
    "/api/classwork/classes/:classId/resources/:resourceId",
    authMiddleware,
    wrap(async (req, res) => {
      const { classId } = await access(req, true);
      const resourceId = String(req.params.resourceId);
      if (
        !(await prisma.classworkResource.findFirst({
          where: { id: resourceId, classId },
          select: { id: true },
        }))
      )
        throw new ClassworkError(404, "Resource not found.");
      await prisma.$transaction([
        prisma.classworkPlacement.deleteMany({
          where: { classId, sourceType: "RESOURCE", sourceId: resourceId },
        }),
        prisma.classworkResource.delete({ where: { id: resourceId } }),
      ]);
      res.json({ success: true });
    }),
  );
}
