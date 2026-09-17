import type { Express, Request, RequestHandler, Response } from 'express';
import type { PrismaClient, VideoLesson } from '@prisma/client';
import { z } from 'zod';
import { videoLearningSchema, quizPassed } from './shared/videoLearning';
import { studentCanSeeClassworkExam } from './shared/classwork';
import { homeworkTeacherScope } from './shared/homeworkAccess';

export type VideoActor = { userId: string; role: string };
export async function canReadVideo(prisma: PrismaClient, actor: VideoActor, video: VideoLesson) {
  if (actor.role === 'ADMIN' || actor.role === 'TEACHER') return true;
  if (actor.role !== 'STUDENT' || video.status !== 'PUBLISHED' || !['ALL', 'STUDENTS'].includes(video.visibility)) return false;
  const student = await prisma.student.findUnique({ where: { userId: actor.userId }, select: { classId: true } });
  return !!student && (!video.classId || student.classId === video.classId);
}
class VideoError extends Error { constructor(public status: number, message: string) { super(message); } }
const playlistSchema = z.object({ title: z.string().trim().min(1).max(100), videoIds: z.array(z.string().min(1)).min(1).max(100).refine(ids => new Set(ids).size === ids.length, 'Do not repeat lessons.') });
const noteSchema = z.object({ seconds: z.number().int().min(0).max(86400), body: z.string().trim().min(1).max(3000), isQuestion: z.boolean().default(false) });

export function registerVideoLearningRoutes({ app, prisma, authMiddleware, canManageExamClass, logger }: {
  app: Express; prisma: PrismaClient; authMiddleware: RequestHandler;
  canManageExamClass: (actor: any, classId: string) => Promise<boolean>;
  logger: { error: (...args: any[]) => void };
}) {
  const actor = (req: Request) => (req as any).user as VideoActor;
  const wrap = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => async (req, res) => {
    try { await fn(req, res); } catch (error: any) {
      if (error instanceof VideoError) { res.status(error.status).json({ error: error.message }); return; }
      if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' }); return; }
      if (['P2021', 'P2022'].includes(error?.code)) { res.status(503).json({ error: 'Video learning needs its database update. Deploy the pending Prisma migrations.' }); return; }
      logger.error('Video learning request failed', error); res.status(500).json({ error: 'Could not load or save video learning. Please retry.' });
    }
  };
  const lessonFor = async (req: Request, manage = false) => {
    const video = await prisma.videoLesson.findUnique({ where: { id: String(req.params.id) } });
    if (!video || !await canReadVideo(prisma, actor(req), video)) throw new VideoError(404, 'Video lesson not found');
    if (manage && actor(req).role !== 'ADMIN' && !(actor(req).role === 'TEACHER' && video.uploadedById === actor(req).userId)) throw new VideoError(403, 'Only the lesson owner or admin can manage this lesson.');
    if (manage && video.classId && !await canManageExamClass(actor(req), video.classId)) throw new VideoError(403, 'This class is not assigned to you.');
    return video;
  };
  const configFor = async (id: string) => {
    const stored = await prisma.videoLearning.findUnique({ where: { videoId: id } });
    return videoLearningSchema.parse(stored || {});
  };
  app.get('/api/videos/:id/learning/options', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req, true);
    if (!video.classId) { res.json({ exams: [], homeworks: [] }); return; }
    const [exams, homeworks] = await Promise.all([
      prisma.exam.findMany({ where: { classId: video.classId, type: 'QUIZ', status: { not: 'ARCHIVED' } }, select: { id: true, title: true, status: true, passMark: true }, orderBy: { title: 'asc' } }),
      prisma.homework.findMany({ where: { classId: video.classId, ...homeworkTeacherScope(actor(req)) }, select: { id: true, title: true, status: true }, orderBy: { dueDate: 'desc' } }),
    ]);
    res.json({ exams, homeworks });
  }));
  app.put('/api/videos/:id/learning', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req, true);
    const config = videoLearningSchema.parse(req.body);
    if ((config.examId || config.homeworkId) && !video.classId) throw new VideoError(400, 'Assign the video to a class before attaching activities.');
    if (config.examId) {
      const exam = await prisma.exam.findUnique({ where: { id: config.examId } });
      if (!exam || exam.classId !== video.classId || exam.type !== 'QUIZ' || exam.status === 'ARCHIVED') throw new VideoError(400, 'Choose an available quiz for the same class.');
      if (config.requireQuiz && exam.passMark == null) throw new VideoError(400, 'Set a pass mark in the quiz settings before requiring a passing score.');
    }
    if (config.homeworkId) {
      const homework = await prisma.homework.findFirst({ where: { id: config.homeworkId, ...homeworkTeacherScope(actor(req)) } });
      if (!homework || homework.classId !== video.classId) throw new VideoError(400, 'Choose homework for the same class.');
    }
    if (video.duration && config.chapters.some(c => c.seconds >= video.duration!)) throw new VideoError(400, 'Chapter timestamps must be before the end of the video.');
    await prisma.videoLearning.upsert({ where: { videoId: video.id }, create: { videoId: video.id, ...config }, update: config });
    res.json(config);
  }));
  app.get('/api/videos/:id/learning', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req);
    const config = await configFor(video.id);
    const isStudent = actor(req).role === 'STUDENT';
    const student = isStudent ? await prisma.student.findUnique({ where: { userId: actor(req).userId }, select: { id: true, classId: true } }) : null;
    const exam = config.examId ? await prisma.exam.findUnique({ where: { id: config.examId }, select: { id: true, title: true, classId: true, status: true, passMark: true, _count: { select: { assignments: true } }, assignments: { where: { studentId: student?.id ?? '__none__' }, select: { id: true } } } }) : null;
    const homework = config.homeworkId ? await prisma.homework.findFirst({ where: { id: config.homeworkId, ...homeworkTeacherScope(actor(req)) }, select: { id: true, title: true, classId: true, status: true, dueDate: true } }) : null;
    const completedAttempt = student && exam ? await prisma.examAttempt.findFirst({ where: { examId: exam.id, studentId: student.id, isCompleted: true, invalidatedAt: null, state: { not: 'INVALIDATED' } }, select: { id: true } }) : null;
    const availableExam = exam && exam.classId === video.classId && (!isStudent || (exam.classId === student?.classId && studentCanSeeClassworkExam({ status: exam.status, assignmentCount: exam._count.assignments, assignedToStudent: !!exam.assignments.length, completed: !!completedAttempt }))) ? exam : null;
    const availableHomework = homework && homework.classId === video.classId && (!isStudent || homework.classId === student?.classId) ? homework : null;
    const attempts = student && availableExam ? await prisma.examAttempt.findMany({ where: { examId: availableExam.id, studentId: student.id, invalidatedAt: null, state: { not: 'INVALIDATED' } }, orderBy: { attemptNumber: 'desc' } }) : [];
    const releasedPass = attempts.some(a => (a.releasedAt || a.state === 'RELEASED') && quizPassed(a, exam?.passMark ?? null));
    const quizStatus = releasedPass ? 'passed' : attempts.some(a => a.isCompleted) ? 'submitted' : attempts.length ? 'in_progress' : 'not_started';
    const submission = student && availableHomework ? await prisma.homeworkSubmission.findUnique({ where: { homeworkId_studentId: { homeworkId: availableHomework.id, studentId: student.id } }, select: { status: true } }) : null;
    const watch = await prisma.videoProgress.findUnique({ where: { userId_videoId: { userId: actor(req).userId, videoId: video.id } } });
    res.json({ ...config, homeworkId: availableHomework?.id ?? null,
      quiz: availableExam ? { id: availableExam.id, title: availableExam.title, status: quizStatus, href: isStudent ? `/exams/${availableExam.id}/take` : `/exams/${availableExam.id}` } : null,
      homework: availableHomework ? { id: availableHomework.id, title: availableHomework.title, status: submission?.status ?? 'not_submitted', href: isStudent ? `/student/homework?assignment=${availableHomework.id}` : `/teacher/homework/${availableHomework.id}` } : null,
      learningComplete: !!watch?.isCompleted && (!config.requireQuiz || releasedPass),
    });
  }));
  app.get('/api/videos/:id/notes', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req);
    const manager = actor(req).role === 'ADMIN' || actor(req).role === 'TEACHER' && video.uploadedById === actor(req).userId && (!video.classId || await canManageExamClass(actor(req), video.classId));
    const notes = await prisma.videoNote.findMany({ where: { videoId: video.id, OR: [{ userId: actor(req).userId }, ...(manager ? [{ isQuestion: true }] : [])] }, orderBy: { createdAt: 'desc' }, take: 100 });
    const authors = await prisma.user.findMany({ where: { id: { in: [...new Set(notes.filter(n => n.isQuestion).map(n => n.userId))] } }, select: { id: true, firstName: true, lastName: true } });
    res.json(notes.map(n => ({ ...n, author: n.isQuestion ? authors.find(a => a.id === n.userId)?.firstName || 'Student' : 'You' })));
  }));
  app.post('/api/videos/:id/notes', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req); const input = noteSchema.parse(req.body);
    if (video.duration && input.seconds > video.duration) throw new VideoError(400, 'Timestamp is outside the lesson.');
    res.status(201).json(await prisma.videoNote.create({ data: { ...input, videoId: video.id, userId: actor(req).userId } }));
  }));
  app.put('/api/videos/:id/notes/:noteId/reply', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req, true);
    const { reply } = z.object({ reply: z.string().trim().min(1).max(3000) }).parse(req.body);
    const note = await prisma.videoNote.findUnique({ where: { id: String(req.params.noteId) } });
    if (!note || note.videoId !== video.id || !note.isQuestion) throw new VideoError(404, 'Question not found.');
    res.json(await prisma.videoNote.update({ where: { id: note.id }, data: { reply, repliedById: actor(req).userId } }));
  }));
  app.delete('/api/videos/:id/notes/:noteId', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req); const note = await prisma.videoNote.findUnique({ where: { id: String(req.params.noteId) } });
    if (!note || note.videoId !== video.id || note.userId !== actor(req).userId) throw new VideoError(404, 'Note not found.');
    await prisma.videoNote.delete({ where: { id: note.id } }); res.json({ ok: true });
  }));
  app.get('/api/video-playlists', authMiddleware, wrap(async (req, res) => {
    if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(actor(req).role)) throw new VideoError(403, 'Video playlists are for teachers and students.');
    const rows = await prisma.videoPlaylist.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 });
    const student = actor(req).role === 'STUDENT' ? await prisma.student.findUnique({ where: { userId: actor(req).userId }, select: { classId: true } }) : null;
    if (actor(req).role === 'STUDENT' && !student) { res.json([]); return; }
    const visibleVideos = await prisma.videoLesson.findMany({ where: { id: { in: [...new Set(rows.flatMap(row => row.videoIds))] }, ...(student ? { status: 'PUBLISHED', visibility: { in: ['ALL', 'STUDENTS'] }, OR: [{ classId: null }, { classId: student.classId }] } : {}) }, select: { id: true, title: true } });
    const byId = new Map(visibleVideos.map(v => [v.id, v]));
    const result = [];
    for (const row of rows) {
      const visible = row.videoIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
      if (visible.length) result.push({ ...row, videoIds: visible.map(v => v.id), lessons: visible, canManage: actor(req).role === 'ADMIN' || row.ownerId === actor(req).userId });
    }
    res.json(result);
  }));
  app.post('/api/video-playlists', authMiddleware, wrap(async (req, res) => {
    if (!['ADMIN', 'TEACHER'].includes(actor(req).role)) throw new VideoError(403, 'Only teachers/admins organize playlists.');
    const input = playlistSchema.parse(req.body);
    const videos = await prisma.videoLesson.findMany({ where: { id: { in: input.videoIds } } });
    if (videos.length !== input.videoIds.length || actor(req).role === 'TEACHER' && videos.some(v => v.uploadedById !== actor(req).userId)) throw new VideoError(403, 'Choose lessons you manage.');
    res.status(201).json(await prisma.videoPlaylist.create({ data: { ...input, ownerId: actor(req).userId } }));
  }));
  app.put('/api/video-playlists/:playlistId', authMiddleware, wrap(async (req, res) => {
    const row = await prisma.videoPlaylist.findUnique({ where: { id: String(req.params.playlistId) } });
    if (!row) throw new VideoError(404, 'Playlist not found.');
    if (!['ADMIN', 'TEACHER'].includes(actor(req).role) || actor(req).role !== 'ADMIN' && row.ownerId !== actor(req).userId) throw new VideoError(403, 'Only the playlist owner/admin can edit.');
    const input = playlistSchema.parse(req.body);
    const videos = await prisma.videoLesson.findMany({ where: { id: { in: input.videoIds } } });
    if (videos.length !== input.videoIds.length || actor(req).role === 'TEACHER' && videos.some(v => v.uploadedById !== actor(req).userId)) throw new VideoError(403, 'Choose lessons you manage.');
    res.json(await prisma.videoPlaylist.update({ where: { id: row.id }, data: input }));
  }));
  app.delete('/api/video-playlists/:playlistId', authMiddleware, wrap(async (req, res) => {
    const row = await prisma.videoPlaylist.findUnique({ where: { id: String(req.params.playlistId) } });
    if (!row) throw new VideoError(404, 'Playlist not found.');
    if (!['ADMIN', 'TEACHER'].includes(actor(req).role) || actor(req).role !== 'ADMIN' && row.ownerId !== actor(req).userId) throw new VideoError(403, 'Only the playlist owner/admin can delete.');
    await prisma.videoPlaylist.delete({ where: { id: row.id } }); res.json({ ok: true });
  }));
  const reportFor = async (video: VideoLesson, viewer: VideoActor) => {
    const config = await configFor(video.id);
    const attachedExam = config.examId ? await prisma.exam.findUnique({ where: { id: config.examId } }) : null;
    const attachedHomework = config.homeworkId ? await prisma.homework.findFirst({ where: { id: config.homeworkId, ...homeworkTeacherScope(viewer) } }) : null;
    if (attachedExam?.classId !== video.classId) config.examId = null;
    if (attachedHomework?.classId !== video.classId) config.homeworkId = null;
    if (video.visibility === 'TEACHERS_ONLY') return [];
    const students = await prisma.student.findMany({ where: { status: 'ACTIVE', userId: { not: null }, ...(video.classId ? { classId: video.classId } : {}) }, select: { id: true, userId: true, studentCode: true, user: { select: { firstName: true, lastName: true } } } });
    const [watch, attempts, submissions, exam] = await Promise.all([
      prisma.videoProgress.findMany({ where: { videoId: video.id } }),
      config.examId ? prisma.examAttempt.findMany({ where: { examId: config.examId, studentId: { in: students.map(s => s.id) }, invalidatedAt: null, state: { not: 'INVALIDATED' } } }) : [],
      config.homeworkId ? prisma.homeworkSubmission.findMany({ where: { homeworkId: config.homeworkId, studentId: { in: students.map(s => s.id) } } }) : [],
      config.examId ? prisma.exam.findUnique({ where: { id: config.examId }, select: { passMark: true } }) : null,
    ]);
    const assignments = config.examId ? await prisma.examAssignment.findMany({ where: { examId: config.examId }, select: { studentId: true } }) : [];
    return students.map(s => {
      const p = watch.find(p => p.userId === s.userId); const a = attempts.filter(a => a.studentId === s.id);
      const passed = a.some(a => quizPassed(a, exam?.passMark ?? null));
      return { studentId: s.id, userId: s.userId!, name: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || s.studentCode,
        watched: !!p?.isCompleted, quiz: !config.examId || assignments.length > 0 && !assignments.some(x => x.studentId === s.id) ? 'not_assigned' : passed ? 'passed' : a.some(a => a.isCompleted) ? 'submitted' : a.length ? 'in_progress' : 'not_started',
        homework: !config.homeworkId ? 'not_assigned' : submissions.find(x => x.studentId === s.id)?.status ?? 'not_submitted',
        learningComplete: !!p?.isCompleted && (!config.requireQuiz || passed),
      };
    });
  };
  app.get('/api/videos/:id/learning/report', authMiddleware, wrap(async (req, res) => { const video = await lessonFor(req, true); res.json(await reportFor(video, actor(req))); }));
  app.post('/api/videos/:id/learning/reminders', authMiddleware, wrap(async (req, res) => {
    const video = await lessonFor(req, true);
    if (video.status !== 'PUBLISHED') throw new VideoError(400, 'Publish this lesson before sending reminders.');
    const { target } = z.object({ target: z.enum(['watch', 'quiz', 'homework']) }).parse(req.body);
    const config = await configFor(video.id);
    if (target === 'quiz' && !config.examId || target === 'homework' && !config.homeworkId) throw new VideoError(400, 'Attach the activity first.');
    if (target === 'quiz') {
      const exam = await prisma.exam.findUnique({ where: { id: config.examId! }, select: { classId: true, status: true } });
      if (!exam || exam.classId !== video.classId || !['PUBLISHED', 'ACTIVE', 'SCHEDULED'].includes(exam.status)) throw new VideoError(400, 'The quiz must be available before sending reminders.');
    }
    if (target === 'homework') {
      const homework = await prisma.homework.findFirst({ where: { id: config.homeworkId!, ...homeworkTeacherScope(actor(req)) }, select: { classId: true, status: true } });
      if (!homework || homework.classId !== video.classId || homework.status !== 'OPEN') throw new VideoError(400, 'The homework must be open before sending reminders.');
    }
    const rows = (await reportFor(video, actor(req))).filter(r => target === 'watch' ? !r.watched : target === 'quiz' ? !['passed', 'not_assigned'].includes(r.quiz) : ['not_submitted', 'REDO'].includes(r.homework));
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
    const result = await prisma.notification.createMany({ data: rows.map(r => ({ userId: r.userId, type: 'VIDEO_LESSON', title: 'Video lesson reminder', message: `Please ${target === 'watch' ? 'watch' : target === 'quiz' ? 'complete the quiz for' : 'submit the homework for'} “${video.title}”.`, href: `/videos/${video.id}`, sourceId: `video:${video.id}:${target}:${day}` })), skipDuplicates: true });
    res.json({ sent: result.count });
  }));
}
