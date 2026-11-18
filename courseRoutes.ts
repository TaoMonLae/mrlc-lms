import type { Express, Request, RequestHandler, Response } from 'express';
import type { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { courseDraftSchema, courseReadiness, courseProgress, courseResourceHref, courseVideoEmbedUrl, studentCourseDraft, COURSE_KINDS, type CourseDraft, type CourseItem, type CourseKind } from './shared/courses';
import { courseQuizQuestionView, gradeCourseQuiz } from './shared/courseQuiz';
import { courseWithStudio } from './shared/gedChapterStudio';
import { makeMrlcGedCourse } from './shared/mrlcGedCourseContent';
import { studentCanSeeClassworkExam } from './shared/classwork';
import { registerCoursePackageRoutes, importedCourseResourcePrefix, isStagedCourseBook, isStagedCourseVideo } from './coursePackageRoutes';

type Actor = { userId: string; role: string; externalLearner?: boolean };
type StudentContext = { id: string; userId: string; classId: string };
export class CourseError extends Error { constructor(public status: number, message: string) { super(message); } }
const asJson = (value: CourseDraft) => value as unknown as Prisma.InputJsonValue;
const terminal = ['SUBMITTED', 'AUTO_SUBMITTED', 'FINALIZED', 'RELEASED'];
export function courseExamCompleted(attempt: { state: string; invalidatedAt?: unknown; gradingStatus?: string | null }, policy: { releaseMode: string; releaseAt: Date | null } | null, now = Date.now()) {
  if (attempt.invalidatedAt || !terminal.includes(attempt.state)) return false;
  const mode = policy?.releaseMode ?? 'IMMEDIATE';
  if (mode === 'HIDDEN') return false;
  if (mode === 'SCHEDULED') return !!policy?.releaseAt && policy.releaseAt.getTime() <= now;
  if (mode === 'AFTER_GRADING') return ['FINALIZED', 'RELEASED'].includes(attempt.state) || attempt.gradingStatus === 'COMPLETE';
  return mode === 'IMMEDIATE';
}

// One query per resource type, regardless of the number of lessons. Rechecked on
// student reads so unpublishing, class transfers and voided exams take effect.
export async function inspectCourseResources(prisma: PrismaClient, draft: CourseDraft, actor: Actor, canManageClass: (actor: Actor, classId: string) => Promise<boolean>, student?: StudentContext, assignedClassId?: string, importedDraft?: { id: string; ownerId: string }) {
  const items = draft.modules.flatMap(m => m.items);
  const ids = (kind: CourseKind) => [...new Set(items.filter(i => i.kind === kind && i.resourceId).map(i => i.resourceId))];
  const [videos, books, practice, homework, exams] = await Promise.all([
    ids('VIDEO').length ? prisma.videoLesson.findMany({ where: { id: { in: ids('VIDEO') } }, include: { progressRecords: { where: { userId: student?.userId ?? '__author__' } } } }) : [],
    ids('EBOOK').length ? prisma.ebook.findMany({ where: { id: { in: ids('EBOOK') } }, include: { progress: { where: { userId: student?.userId ?? '__author__' } } } }) : [],
    ids('PRACTICE').length ? prisma.languageQuestLesson.findMany({ where: { id: { in: ids('PRACTICE') } }, include: { unit: { include: { course: { select: { published: true } } } }, challenges: { include: { progress: { where: { userId: student?.userId ?? '__author__', completed: true } } } } } }) : [],
    ids('HOMEWORK').length ? prisma.homework.findMany({ where: { id: { in: ids('HOMEWORK') } }, include: { submissions: { where: { studentId: student?.id ?? '__author__' } } } }) : [],
    ids('EXAM').length ? prisma.exam.findMany({ where: { id: { in: ids('EXAM') } }, select: { id: true, classId: true, status: true, resultPolicy: { select: { releaseMode: true, releaseAt: true } }, assignments: { select: { studentId: true } }, attempts: { where: { studentId: student?.id ?? '__author__' }, select: { state: true, invalidatedAt: true, gradingStatus: true } } } }) : [],
  ]);
  const classIds = [...new Set([...videos, ...homework, ...exams].map(r => r.classId).filter((id): id is string => !!id))];
  const allowedClasses = new Set<string>();
  if (student) allowedClasses.add(student.classId);
  else await Promise.all(classIds.map(async classId => { if (await canManageClass(actor, classId)) allowedClasses.add(classId); }));
  const classAllowed = (classId: string | null) => !classId || allowedClasses.has(classId) && (!assignedClassId || classId === assignedClassId);
  const available = new Set<string>(), completed = new Set<string>();
  for (const item of items) {
    let visible = false, done = false;
    if (item.kind === 'TEXT') visible = true;
    if (item.kind === 'QUIZ' && (item.questions?.length ?? 0) >= 3) visible = true;
    if (item.kind === 'VIDEO_LINK') visible = !!courseVideoEmbedUrl(item.url);
    if (item.kind === 'LINK') visible = !!courseResourceHref(item);
    if (item.kind === 'VIDEO') {
      const row = videos.find(r => r.id === item.resourceId);
      visible = !!row && (row.status === 'PUBLISHED' && ['ALL', 'STUDENTS'].includes(row.visibility) || !student && !!importedDraft && isStagedCourseVideo(row, importedDraft)) && classAllowed(row.classId);
      done = !!row?.progressRecords.some(p => p.isCompleted);
    }
    if (item.kind === 'EBOOK') {
      const row = books.find(r => r.id === item.resourceId);
      visible = !!row && (['ALL', 'STUDENTS'].includes(row.visibility) || !student && !!importedDraft && isStagedCourseBook(row, importedDraft));
      done = !!row?.progress.some(p => p.completedAt);
    }
    if (item.kind === 'PRACTICE') {
      const row = practice.find(r => r.id === item.resourceId);
      visible = !!row?.unit.course.published && row.challenges.length > 0;
      done = !!row?.challenges.length && row.challenges.every(c => c.progress.length > 0);
    }
    if (item.kind === 'HOMEWORK') {
      const row = homework.find(r => r.id === item.resourceId);
      visible = !!row && classAllowed(row.classId);
      done = !!row?.submissions.some(s => ['SUBMITTED', 'MARKED'].includes(s.status));
    }
    if (item.kind === 'EXAM') {
      const row = exams.find(r => r.id === item.resourceId);
      visible = !!row && classAllowed(row.classId) && (student
        ? studentCanSeeClassworkExam({ status: row.status, assignmentCount: row.assignments.length, assignedToStudent: row.assignments.some(a => a.studentId === student.id), completed: row.attempts.some(a => terminal.includes(a.state) && !a.invalidatedAt) })
        : ['PUBLISHED', 'ACTIVE', 'SCHEDULED'].includes(row.status));
      done = !!row?.attempts.some(a => courseExamCompleted(a, row.resultPolicy));
    }
    if (visible) available.add(item.id);
    if (visible && done) completed.add(item.id);
  }
  return { available, completed };
}

export function registerCourseRoutes({ app, prisma, authMiddleware, canManageExamClass, logger, ebookDir, videoDir }: {
  app: Express; prisma: PrismaClient; authMiddleware: RequestHandler;
  canManageExamClass: (actor: Actor, classId: string) => Promise<boolean>;
  logger: { error: (...args: any[]) => void };
  ebookDir?: string; videoDir?: string;
}) {
  registerCoursePackageRoutes({ app, prisma, authMiddleware, canManageExamClass, logger, ebookDir, videoDir });
  const actorFor = (req: Request, staff = false) => {
    const actor = (req as any).user as Actor;
    if (!actor || actor.externalLearner || !(staff ? ['ADMIN', 'TEACHER'] : ['ADMIN', 'TEACHER', 'STUDENT']).includes(actor.role)) throw new CourseError(403, 'Use an authorized school account to access courses.');
    return actor;
  };
  const wrap = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try { await fn(req, res); }
    catch (error) {
      if (error instanceof CourseError) { res.status(error.status).json({ error: error.message }); return; }
      if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Check the course details.' }); return; }
      const code = (error as { code?: string })?.code;
      if (['P2002', 'P2034'].includes(code)) { res.status(409).json({ error: 'This course changed during your request. Reload it before trying again.' }); return; }
      if (['P2021', 'P2022'].includes(code)) { res.status(503).json({ error: 'Courses need the pending database update before they can be used.' }); return; }
      logger.error('Course request failed', error); res.status(500).json({ error: 'Could not load or save the course. Please try again.' });
    }
  };
  const ownedCourse = async (req: Request) => {
    const actor = actorFor(req, true);
    const course = await prisma.course.findUnique({ where: { id: String(req.params.id) } });
    if (!course || actor.role !== 'ADMIN' && course.ownerId !== actor.userId) throw new CourseError(404, 'Course not found or unavailable to your account.');
    return { actor, course };
  };
  const courseInclude = { owner: { select: { firstName: true, lastName: true } }, versions: { orderBy: { number: 'desc' as const }, take: 1, select: { number: true } }, _count: { select: { versions: true } } };
  const record = (course: any) => ({ id: course.id, ownerId: course.ownerId, ownerName: `${course.owner.firstName} ${course.owner.lastName}`.trim(), status: course.status, revision: course.revision, draft: courseWithStudio(courseDraftSchema.parse(course.draft)), reviewNote: course.reviewNote, updatedAt: course.updatedAt, publishedVersion: course.versions[0]?.number ?? null });
  const guardRevision = async (tx: Prisma.TransactionClient, course: { id: string; revision: number }, expected: number, data: Prisma.CourseUpdateManyMutationInput) => {
    if (course.revision !== expected) throw new CourseError(409, 'A newer draft was saved. Reload it before making changes.');
    const result = await tx.course.updateMany({ where: { id: course.id, revision: expected }, data: { ...data, revision: { increment: 1 } } });
    if (!result.count) throw new CourseError(409, 'This course changed during your request. Reload it before trying again.');
  };
  const revisionBody = z.object({ revision: z.number().int().positive() });
  const studentFor = async (actor: Actor) => {
    if (actor.role !== 'STUDENT') throw new CourseError(403, 'This is a student learning view.');
    const student = await prisma.student.findUnique({ where: { userId: actor.userId }, select: { id: true, userId: true, classId: true, status: true } });
    if (!student?.userId || !student.classId || student.status !== 'ACTIVE') throw new CourseError(403, 'An active student class enrollment is required.');
    return student as StudentContext;
  };
  const enrollmentFor = async (req: Request) => {
    const actor = actorFor(req), student = await studentFor(actor);
    const enrollment = await prisma.courseEnrollment.findFirst({ where: { id: String(req.params.enrollmentId), studentId: student.id, classId: student.classId, class: { status: 'ACTIVE' }, version: { course: { status: { not: 'ARCHIVED' } } } }, include: { version: true, class: { select: { name: true } }, progress: true } });
    if (!enrollment) throw new CourseError(404, 'This course assignment is unavailable.');
    return { actor, student, enrollment };
  };
  const quizFor = async (req: Request) => {
    const { enrollment } = await enrollmentFor(req);
    const syllabus = courseDraftSchema.parse(enrollment.version.syllabus);
    const item = syllabus.modules.flatMap(m => m.items).find(i => i.id === String(req.params.itemId));
    if (!item || item.kind !== 'QUIZ' || !item.questions?.length) throw new CourseError(404, 'This unit test is unavailable.');
    return { enrollment, item };
  };
  const quizView = (item: CourseItem, attempt?: { attemptNumber: number; startedAt: Date; submittedAt: Date | null; answers: unknown; score: number | null; total: number; passed: boolean | null }) => {
    if (!attempt) return { status: 'NOT_STARTED', timeLimitMinutes: item.minutes, questionCount: item.questions!.length };
    const deadline = new Date(attempt.startedAt.getTime() + item.minutes * 60_000);
    if (!attempt.submittedAt) return { status: 'IN_PROGRESS', attemptNumber: attempt.attemptNumber, deadline: deadline.toISOString(), questions: item.questions!.map(courseQuizQuestionView) };
    const answers = attempt.answers && typeof attempt.answers === 'object' && !Array.isArray(attempt.answers) ? attempt.answers as Record<string, string> : {};
    return { status: 'SUBMITTED', attemptNumber: attempt.attemptNumber, score: attempt.score, total: attempt.total, passed: attempt.passed, submittedAt: attempt.submittedAt.toISOString(), feedback: gradeCourseQuiz(item, answers).feedback };
  };
  const learningRecord = async (enrollment: any, student: StudentContext) => {
    const syllabus = courseDraftSchema.parse(enrollment.version.syllabus);
    const inspected = await inspectCourseResources(prisma, syllabus, { userId: student.userId, role: 'STUDENT' }, canManageExamClass, student);
    const manualIds = new Set(syllabus.modules.flatMap(m => m.items).filter(i => ['TEXT', 'LINK', 'VIDEO_LINK'].includes(i.kind)).map(i => i.id));
    const quizAttempts = syllabus.modules.some(module => module.items.some(item => item.kind === 'QUIZ')) ? await prisma.courseQuizAttempt.findMany({ where: { enrollmentId: enrollment.id, submittedAt: { not: null } }, select: { itemId: true, score: true, total: true, passed: true, submittedAt: true, attemptNumber: true }, orderBy: { attemptNumber: 'asc' } }) : [];
    const quizIds = new Set(syllabus.modules.flatMap(m => m.items).filter(i => i.kind === 'QUIZ').map(i => i.id));
    const quizResults = quizAttempts.filter(attempt => quizIds.has(attempt.itemId)).map(attempt => ({
      itemId: attempt.itemId, attemptNumber: attempt.attemptNumber, score: attempt.score!, total: attempt.total,
      passed: !!attempt.passed, submittedAt: attempt.submittedAt!.toISOString(),
    }));
    const completedIds = [...new Set([...enrollment.progress.filter((p: any) => manualIds.has(p.itemId) && inspected.available.has(p.itemId)).map((p: any) => p.itemId), ...inspected.completed, ...quizAttempts.filter(a => a.passed && quizIds.has(a.itemId)).map(a => a.itemId)])];
    return { id: enrollment.id, courseId: enrollment.version.courseId, className: enrollment.class.name, version: enrollment.version.number, syllabus: courseWithStudio(studentCourseDraft(syllabus)), assignedAt: enrollment.assignedAt, completedIds, quizResults, unavailableIds: syllabus.modules.flatMap(m => m.items).filter(i => !inspected.available.has(i.id)).map(i => i.id) };
  };

  app.get('/api/courses/options', authMiddleware, wrap(async (req, res) => {
    const actor = actorFor(req, true);
    const classes = await prisma.class.findMany({ where: { status: 'ACTIVE', ...(actor.role === 'ADMIN' ? {} : { teachers: { some: { teacher: { userId: actor.userId } } } }) }, select: { id: true, name: true, level: true }, orderBy: { name: 'asc' } });
    res.json({ classes });
  }));
  app.get('/api/courses/resources', authMiddleware, wrap(async (req, res) => {
    const actor = actorFor(req, true);
    const kind = z.enum(COURSE_KINDS).parse(req.query.kind);
    const q = z.string().max(160).parse(req.query.q ?? '').trim();
    const search = { contains: q, mode: 'insensitive' as const };
    const classScope = actor.role === 'ADMIN' ? {} : { teachers: { some: { teacher: { userId: actor.userId } } } };
    const classes = await prisma.class.findMany({ where: { status: 'ACTIVE', ...classScope }, select: { id: true } });
    const classIds = classes.map(c => c.id);
    const base = { take: 60, orderBy: { title: 'asc' as const } };
    let resources: { id: string; title: string; classId?: string | null }[] = [];
    if (kind === 'VIDEO') resources = await prisma.videoLesson.findMany({ ...base, where: { title: search, status: 'PUBLISHED', visibility: { in: ['ALL', 'STUDENTS'] }, OR: [{ classId: null }, { classId: { in: classIds } }] }, select: { id: true, title: true, classId: true } });
    if (kind === 'EBOOK') resources = await prisma.ebook.findMany({ ...base, where: { title: search, visibility: { in: ['ALL', 'STUDENTS'] } }, select: { id: true, title: true } });
    if (kind === 'PRACTICE') resources = await prisma.languageQuestLesson.findMany({ ...base, where: { title: search, unit: { course: { published: true } }, challenges: { some: {} } }, select: { id: true, title: true } });
    if (kind === 'HOMEWORK') resources = await prisma.homework.findMany({ ...base, where: { title: search, classId: { in: classIds } }, select: { id: true, title: true, classId: true } });
    if (kind === 'EXAM') resources = await prisma.exam.findMany({ ...base, where: { title: search, classId: { in: classIds }, status: { in: ['PUBLISHED', 'ACTIVE', 'SCHEDULED'] } }, select: { id: true, title: true, classId: true } });
    res.json(resources);
  }));
  app.get('/api/courses', authMiddleware, wrap(async (req, res) => {
    const actor = actorFor(req, true);
    const courses = await prisma.course.findMany({ where: actor.role === 'ADMIN' ? {} : { ownerId: actor.userId }, include: courseInclude, orderBy: { updatedAt: 'desc' }, take: 200 });
    const counts = courses.length ? await prisma.courseEnrollment.groupBy({ by: ['versionId'], where: { version: { courseId: { in: courses.map(c => c.id) } } }, _count: true }) : [];
    const versions = counts.length ? await prisma.courseVersion.findMany({ where: { id: { in: counts.map(c => c.versionId) } }, select: { id: true, courseId: true } }) : [];
    res.json(courses.map(c => ({ ...record(c), enrollmentCount: counts.filter(n => versions.some(v => v.id === n.versionId && v.courseId === c.id)).reduce((n, row) => n + row._count, 0) })));
  }));
  app.post('/api/courses', authMiddleware, wrap(async (req, res) => {
    const actor = actorFor(req, true), draft = courseDraftSchema.parse(req.body);
    const course = await prisma.course.create({ data: { ownerId: actor.userId, draft: asJson(draft) }, include: courseInclude });
    res.status(201).json({ ...record(course), enrollmentCount: 0 });
  }));
  app.post('/api/courses/mrlc-ged', authMiddleware, wrap(async (req, res) => {
    const actor = actorFor(req, true);
    const results: { id: string; subject: string; created: boolean }[] = [];
    for (const key of ['rla', 'math', 'social-studies', 'science']) {
      const digest = createHash('sha256').update(`mrlc-ged-v2:${actor.userId}:${key}`).digest('hex');
      const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
      const existing = await prisma.course.findUnique({ where: { id }, select: { id: true, draft: true, ownerId: true } });
      if (existing) {
        if (existing.ownerId !== actor.userId) throw new CourseError(409, 'A course ID collision was detected.');
        results.push({ id, subject: key, created: false });
        continue;
      }
      const draft = courseDraftSchema.parse(makeMrlcGedCourse(key));
      if (courseReadiness(draft).length) throw new CourseError(409, 'An MRLC course is missing instructional content.');
      try { await prisma.course.create({ data: { id, ownerId: actor.userId, draft: asJson(draft) } }); results.push({ id, subject: key, created: true }); }
      catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
        const concurrent = await prisma.course.findUnique({ where: { id }, select: { ownerId: true } });
        if (concurrent?.ownerId !== actor.userId) throw error;
        results.push({ id, subject: key, created: false });
      }
    }
    res.status(results.some(result => result.created) ? 201 : 200).json({ courses: results });
  }));
  app.get('/api/courses/:id', authMiddleware, wrap(async (req, res) => {
    await ownedCourse(req);
    const course = await prisma.course.findUniqueOrThrow({ where: { id: String(req.params.id) }, include: courseInclude });
    const enrollmentCount = await prisma.courseEnrollment.count({ where: { version: { courseId: course.id } } });
    res.json({ ...record(course), enrollmentCount });
  }));
  app.put('/api/courses/:id', authMiddleware, wrap(async (req, res) => {
    const { course } = await ownedCourse(req);
    if (course.status === 'ARCHIVED') throw new CourseError(409, 'Restore this course before editing it.');
    const { revision } = revisionBody.parse(req.body), draft = courseDraftSchema.parse(req.body.draft);
    await prisma.$transaction(tx => guardRevision(tx, course, revision, { draft: asJson(draft), status: 'DRAFT', reviewNote: null, reviewedById: null, reviewedAt: null }));
    res.json({ revision: revision + 1, status: 'DRAFT' });
  }));
  app.post('/api/courses/:id/submit', authMiddleware, wrap(async (req, res) => {
    const { actor, course } = await ownedCourse(req), { revision } = revisionBody.parse(req.body);
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(course.status)) throw new CourseError(409, 'Save a draft before submitting it for review.');
    const draft = courseDraftSchema.parse(course.draft), issues = courseReadiness(draft);
    if (issues.length) throw new CourseError(400, issues[0]);
    const resources = await inspectCourseResources(prisma, draft, actor, canManageExamClass, undefined, undefined, course);
    if (resources.available.size !== draft.modules.flatMap(m => m.items).length) throw new CourseError(400, 'One or more linked resources are unavailable to students. Replace them before review.');
    await prisma.$transaction(tx => guardRevision(tx, course, revision, { status: 'IN_REVIEW', reviewNote: null }));
    res.json({ revision: revision + 1, status: 'IN_REVIEW' });
  }));
  app.post('/api/courses/:id/review', authMiddleware, wrap(async (req, res) => {
    const { actor, course } = await ownedCourse(req);
    if (actor.role !== 'ADMIN') throw new CourseError(403, 'Only an administrator can approve courses.');
    const { revision, decision, note } = revisionBody.extend({ decision: z.enum(['APPROVE', 'REQUEST_CHANGES']), note: z.string().trim().max(2000).default('') }).parse(req.body);
    if (course.status !== 'IN_REVIEW') throw new CourseError(409, 'This draft is no longer awaiting review.');
    if (decision === 'REQUEST_CHANGES' && !note) throw new CourseError(400, 'Explain what the teacher needs to change.');
    const draft = courseDraftSchema.parse(course.draft);
    if (decision === 'APPROVE') {
      if (courseReadiness(draft).length) throw new CourseError(400, 'Complete the course before approving it.');
      const resources = await inspectCourseResources(prisma, draft, actor, canManageExamClass, undefined, undefined, course);
      if (resources.available.size !== draft.modules.flatMap(m => m.items).length) throw new CourseError(400, 'A linked resource is no longer available. Request changes before publishing.');
    }
    await prisma.$transaction(async tx => {
      await guardRevision(tx, course, revision, { status: decision === 'APPROVE' ? 'PUBLISHED' : 'CHANGES_REQUESTED', reviewNote: note || null, reviewedById: actor.userId, reviewedAt: new Date() });
      if (decision === 'APPROVE') {
        const items = draft.modules.flatMap(m => m.items), prefix = importedCourseResourcePrefix(course.id);
        const bookIds = items.filter(i => i.kind === 'EBOOK').map(i => i.resourceId), videoIds = items.filter(i => i.kind === 'VIDEO').map(i => i.resourceId);
        if (bookIds.length) await tx.ebook.updateMany({ where: { id: { in: bookIds }, uploadedById: course.ownerId, fileName: { startsWith: prefix }, visibility: 'TEACHERS_ONLY' }, data: { visibility: 'ALL' } });
        if (videoIds.length) await tx.videoLesson.updateMany({ where: { id: { in: videoIds }, uploadedById: course.ownerId, videoUrl: { startsWith: `/uploads/videos/${prefix}` }, status: 'DRAFT', visibility: 'TEACHERS_ONLY' }, data: { status: 'PUBLISHED', visibility: 'ALL' } });
        const live = await inspectCourseResources(tx as unknown as PrismaClient, draft, actor, canManageExamClass);
        if (live.available.size !== items.length) throw new CourseError(409, 'A resource changed during approval. Review the course again before publishing.');
        const latest = await tx.courseVersion.findFirst({ where: { courseId: course.id }, orderBy: { number: 'desc' } });
        await tx.courseVersion.create({ data: { courseId: course.id, number: (latest?.number ?? 0) + 1, syllabus: asJson(draft), publishedById: actor.userId } });
      }
    });
    res.json({ ok: true });
  }));
  app.post('/api/courses/:id/archive', authMiddleware, wrap(async (req, res) => {
    const { actor, course } = await ownedCourse(req), { revision, archived } = revisionBody.extend({ archived: z.boolean() }).parse(req.body);
    if (actor.role !== 'ADMIN') throw new CourseError(403, 'Only administrators can archive or restore courses.');
    await prisma.$transaction(tx => guardRevision(tx, course, revision, { status: archived ? 'ARCHIVED' : 'DRAFT' }));
    res.json({ ok: true });
  }));
  app.post('/api/courses/:id/assign', authMiddleware, wrap(async (req, res) => {
    const { actor, course } = await ownedCourse(req);
    const { revision, classId } = revisionBody.extend({ classId: z.string().min(1).max(100) }).parse(req.body);
    if (course.status === 'ARCHIVED') throw new CourseError(409, 'Archived courses cannot be assigned.');
    if (!await canManageExamClass(actor, classId)) throw new CourseError(403, 'You can only assign courses to your own classes.');
    const classroom = await prisma.class.findFirst({ where: { id: classId, status: 'ACTIVE' }, select: { id: true } });
    if (!classroom) throw new CourseError(400, 'Choose an active class.');
    const version = await prisma.courseVersion.findFirst({ where: { courseId: course.id }, orderBy: { number: 'desc' } });
    if (!version) throw new CourseError(400, 'Administrator approval is required before assigning this course.');
    const draft = courseDraftSchema.parse(version.syllabus);
    const resources = await inspectCourseResources(prisma, draft, actor, canManageExamClass, undefined, classId);
    if (resources.available.size !== draft.modules.flatMap(m => m.items).length) throw new CourseError(400, 'Some course resources belong to another class or are unavailable. Make a course version for this class.');
    const students = await prisma.student.findMany({ where: { classId, status: 'ACTIVE', userId: { not: null }, user: { isActive: true, isExternalLearner: false } }, select: { id: true } });
    if (!students.length) throw new CourseError(400, 'This class has no active students with school accounts.');
    const count = await prisma.$transaction(async tx => {
      // Lock the course so approval/archive cannot change the target version mid-assignment.
      await guardRevision(tx, course, revision, {});
      const transferred = await tx.courseEnrollment.updateMany({ where: { versionId: version.id, studentId: { in: students.map(s => s.id) }, classId: { not: classId } }, data: { classId, assignedById: actor.userId, assignedAt: new Date() } });
      const created = await tx.courseEnrollment.createMany({ data: students.map(student => ({ studentId: student.id, classId, versionId: version.id, assignedById: actor.userId })), skipDuplicates: true });
      return { count: transferred.count + created.count };
    });
    res.json({ assigned: count.count, version: version.number, revision: revision + 1 });
  }));
  app.get('/api/courses/:id/report', authMiddleware, wrap(async (req, res) => {
    const { actor, course } = await ownedCourse(req);
    const classes = await prisma.class.findMany({ where: actor.role === 'ADMIN' ? {} : { teachers: { some: { teacher: { userId: actor.userId } } } }, select: { id: true } });
    const rows = await prisma.courseEnrollment.findMany({ where: { version: { courseId: course.id }, classId: { in: classes.map(c => c.id) }, student: { status: 'ACTIVE' } }, include: { version: true, class: { select: { name: true } }, progress: true, student: { select: { id: true, classId: true, userId: true, studentCode: true, user: { select: { firstName: true, lastName: true } } } } }, orderBy: { assignedAt: 'desc' } });
    const report = [];
    for (const row of rows) {
      if (!row.student.userId || row.student.classId !== row.classId) continue;
      const learning = await learningRecord(row, row.student as StudentContext);
      report.push({ id: row.id, name: row.student.user ? `${row.student.user.firstName} ${row.student.user.lastName}`.trim() : row.student.studentCode, className: row.class.name, version: row.version.number, ...courseProgress(learning.syllabus, learning.completedIds),
        assessments: learning.quizResults.map(result => ({
          ...result, title: learning.syllabus.modules.flatMap(module => module.items).find(item => item.id === result.itemId)?.title ?? 'Unit test',
        })),
      });
    }
    res.json(report);
  }));
  app.get('/api/my-courses', authMiddleware, wrap(async (req, res) => {
    const actor = actorFor(req), student = await studentFor(actor);
    const rows = await prisma.courseEnrollment.findMany({ where: { studentId: student.id, classId: student.classId, class: { status: 'ACTIVE' }, version: { course: { status: { not: 'ARCHIVED' } } } }, include: { version: true, class: { select: { name: true } }, progress: true }, orderBy: { assignedAt: 'desc' } });
    const result = [];
    for (const row of rows) result.push(await learningRecord(row, student));
    res.json(result);
  }));
  app.get('/api/my-courses/:enrollmentId', authMiddleware, wrap(async (req, res) => {
    const { student, enrollment } = await enrollmentFor(req);
    res.json(await learningRecord(enrollment, student));
  }));
  app.get('/api/my-courses/:enrollmentId/quizzes/:itemId', authMiddleware, wrap(async (req, res) => {
    const { enrollment, item } = await quizFor(req);
    const attempt = await prisma.courseQuizAttempt.findFirst({ where: { enrollmentId: enrollment.id, itemId: item.id }, orderBy: { attemptNumber: 'desc' } });
    res.json(quizView(item, attempt ?? undefined));
  }));
  app.post('/api/my-courses/:enrollmentId/quizzes/:itemId/start', authMiddleware, wrap(async (req, res) => {
    const { enrollment, item } = await quizFor(req);
    const latest = await prisma.courseQuizAttempt.findFirst({ where: { enrollmentId: enrollment.id, itemId: item.id }, orderBy: { attemptNumber: 'desc' } });
    if (latest && !latest.submittedAt && latest.startedAt.getTime() + item.minutes * 60_000 > Date.now()) { res.json(quizView(item, latest)); return; }
    if (latest && !latest.submittedAt) await prisma.courseQuizAttempt.updateMany({ where: { id: latest.id, submittedAt: null }, data: { submittedAt: new Date(), answers: {}, score: 0, passed: false } });
    const attempt = await prisma.courseQuizAttempt.create({ data: { enrollmentId: enrollment.id, itemId: item.id, attemptNumber: (latest?.attemptNumber ?? 0) + 1, total: item.questions!.length } });
    res.status(201).json(quizView(item, attempt));
  }));
  app.post('/api/my-courses/:enrollmentId/quizzes/:itemId/submit', authMiddleware, wrap(async (req, res) => {
    const { enrollment, item } = await quizFor(req);
    const { answers, attemptNumber } = z.object({ attemptNumber: z.number().int().positive(), answers: z.record(z.string(), z.string().max(500)) }).parse(req.body);
    const questions = new Map(item.questions!.map(question => [question.id, question]));
    for (const [id, answer] of Object.entries(answers)) {
      const question = questions.get(id);
      if (!question || question.kind === 'CHOICE' && answer !== '' && !question.options.includes(answer) || question.kind === 'NUMERIC' && answer !== '' && !Number.isFinite(Number(answer))) throw new CourseError(400, 'One or more answers are invalid for this unit test.');
    }
    const attempt = await prisma.courseQuizAttempt.findFirst({ where: { enrollmentId: enrollment.id, itemId: item.id }, orderBy: { attemptNumber: 'desc' } });
    if (!attempt) throw new CourseError(409, 'Start the unit test before submitting answers.');
    if (attempt.attemptNumber !== attemptNumber) throw new CourseError(409, 'This submission belongs to an earlier attempt. Reopen the test to resume.');
    if (attempt.submittedAt) { res.json(quizView(item, attempt)); return; }
    const timedOut = Date.now() > attempt.startedAt.getTime() + item.minutes * 60_000 + 5_000;
    const finalAnswers = timedOut ? {} : answers;
    const result = gradeCourseQuiz(item, finalAnswers);
    const updated = await prisma.courseQuizAttempt.updateMany({ where: { id: attempt.id, submittedAt: null }, data: { answers: finalAnswers, score: result.score, passed: result.passed, submittedAt: new Date() } });
    const saved = updated.count ? { ...attempt, answers: finalAnswers, score: result.score, passed: result.passed, submittedAt: new Date() } : await prisma.courseQuizAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    res.json({ ...quizView(item, saved), timedOut });
  }));
  app.post('/api/my-courses/:enrollmentId/complete', authMiddleware, wrap(async (req, res) => {
    const { student, enrollment } = await enrollmentFor(req);
    const { itemId } = z.object({ itemId: z.string().min(1).max(100) }).parse(req.body);
    const syllabus = courseDraftSchema.parse(enrollment.version.syllabus), item = syllabus.modules.flatMap(m => m.items).find(i => i.id === itemId);
    if (!item) throw new CourseError(404, 'Lesson not found in your assigned course version.');
    if (!['TEXT', 'LINK', 'VIDEO_LINK'].includes(item.kind)) throw new CourseError(400, 'Complete the linked activity or unit test. Course progress uses its saved learning record.');
    await prisma.courseItemProgress.upsert({ where: { enrollmentId_itemId: { enrollmentId: enrollment.id, itemId } }, create: { enrollmentId: enrollment.id, itemId }, update: {} });
    enrollment.progress = await prisma.courseItemProgress.findMany({ where: { enrollmentId: enrollment.id } });
    res.json(await learningRecord(enrollment, student));
  }));
}
