import type express from 'express';
import type { FocusSession, Prisma, PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { z } from 'zod';
import { asyncHandler } from './lib/asyncHandler';

type Identity = { userId: string; role: string; sessionId?: string; externalLearner?: boolean };
const identity = (req: express.Request) => (req as any).user as Identity;
const heartbeatBody = z.object({
  focused: z.boolean(),
  fullscreen: z.boolean(),
  presentationMode: z.enum(['KIOSK', 'FULLSCREEN', 'WEB_APP', 'BROWSER']).optional(),
});
const durationBody = z.object({ minutesRemaining: z.number().int().min(0).max(480) });
const watchBody = z.object({ sessionId: z.string().min(1).max(100), token: z.string().length(64).regex(/^[a-f0-9]+$/) });

export function registerFocusRoutes(app: express.Express, prisma: PrismaClient, auth: express.RequestHandler, watchSecret: string) {
  const db = prisma;
  const watchToken = (id: string) => crypto.createHmac('sha256', watchSecret).update(`mrlc-focus-watch:v1:${id}`).digest('hex');

  const studentOnly: express.RequestHandler = (req, res, next) => {
    const user = identity(req);
    if (user.role !== 'STUDENT' || user.externalLearner) return res.status(403).json({ error: 'School student account required' });
    if (!user.sessionId) return res.status(403).json({ error: 'Please sign in again to start a focus session' });
    next();
  };
  const staffOnly: express.RequestHandler = (req, res, next) => {
    if (!['TEACHER', 'ADMIN'].includes(identity(req).role)) return res.status(403).json({ error: 'Teacher or administrator required' });
    next();
  };
  async function canManage(user: Identity, studentUserId: string): Promise<boolean> {
    if (user.role === 'ADMIN') return true;
    if (user.role !== 'TEACHER') return false;
    const student = await prisma.student.findUnique({ where: { userId: studentUserId }, select: { classId: true } });
    if (!student?.classId) return false;
    return Boolean(await prisma.classTeacher.findFirst({ where: { classId: student.classId, teacher: { userId: user.userId } }, select: { classId: true } }));
  }
  async function warnStaff(row: FocusSession, type: 'LMS_LOST_FOCUS' | 'FULLSCREEN_EXITED' | 'RELEASE_REQUESTED') {
    const learner = await prisma.student.findUnique({ where: { userId: row.studentUserId },
      select: { user: { select: { firstName: true, lastName: true } }, class: { select: { teachers: { select: { teacher: { select: { userId: true } } } } } } },
    });
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    const recipients = new Set([...admins.map((admin) => admin.id), ...(learner?.class?.teachers || []).map((link) => link.teacher.userId).filter((id): id is string => !!id)]);
    const name = [learner?.user?.firstName, learner?.user?.lastName].filter(Boolean).join(' ') || 'A student';
    const message = type === 'LMS_LOST_FOCUS' ? `${name}: LMS page lost focus.` : type === 'FULLSCREEN_EXITED' ? `${name} exited full screen.` : `${name} requested release.`;
    const bucket = Math.floor(Date.now() / (5 * 60_000));
    if (recipients.size) await prisma.notification.createMany({
      data: [...recipients].map((userId) => ({ userId, type: 'FOCUS_WARNING', title: 'Student focus alert', message: `${message} Review the focus monitor.`, href: '/focus-monitor', sourceId: `focus:${row.id}:${type}:${bucket}` })),
      skipDuplicates: true,
    });
  }
  const serialise = (row: FocusSession) => ({
    id: row.id, startedAt: row.startedAt, endsAt: row.endsAt,
    lastHeartbeatAt: row.lastHeartbeatAt, isFocused: row.isFocused,
    isFullscreen: row.isFullscreen, presentationMode: row.presentationMode,
    releaseRequestedAt: row.releaseRequestedAt,
    releasedAt: row.releasedAt,
    status: row.releasedAt ? 'RELEASED' : row.endsAt <= new Date() ? 'COMPLETED' : 'ACTIVE',
  });
  async function current(req: express.Request) {
    const user = identity(req);
    return db.focusSession.findUnique({ where: { authSessionId: user.sessionId } });
  }

  app.post('/api/focus/session', auth, studentOnly, asyncHandler(async (req, res) => {
    const user = identity(req);
    const now = new Date();
    let row = await db.focusSession.findUnique({ where: { authSessionId: user.sessionId } });
    if (!row) {
      // Re-signing in resumes the same assigned period instead of resetting its clock.
      const existing = await db.focusSession.findFirst({ where: { studentUserId: user.userId, releasedAt: null, endsAt: { gt: now } }, orderBy: { startedAt: 'desc' } });
      row = existing
        ? await db.focusSession.update({ where: { id: existing.id }, data: { authSessionId: user.sessionId } })
        : await db.focusSession.create({ data: { authSessionId: user.sessionId, studentUserId: user.userId, startedAt: now, endsAt: new Date(now.getTime() + 60 * 60_000), lastHeartbeatAt: now } });
    }
    res.json({ ...serialise(row), watchToken: watchToken(row.id) });
  }));

  app.get('/api/focus/session', auth, studentOnly, asyncHandler(async (req, res) => {
    const row = await current(req);
    res.json(row ? { ...serialise(row), watchToken: watchToken(row.id) } : null);
  }));

  // Read-only bearer capability for a kiosk that has already authenticated the
  // student's session. It remains usable if the LMS page later clears its login.
  app.post('/api/focus/watch', asyncHandler(async (req, res) => {
    const parsed = watchBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid watch request' });
    const expected = Buffer.from(watchToken(parsed.data.sessionId), 'hex');
    const supplied = Buffer.from(parsed.data.token, 'hex');
    if (!crypto.timingSafeEqual(expected, supplied)) return res.status(403).json({ error: 'Invalid watch token' });
    const row = await db.focusSession.findUnique({ where: { id: parsed.data.sessionId } });
    if (!row || row.startedAt < new Date(Date.now() - 24 * 60 * 60_000)) return res.status(404).json({ error: 'Focus session not found' });
    res.json({ status: serialise(row).status });
  }));

  app.post('/api/focus/heartbeat', auth, studentOnly, asyncHandler(async (req, res) => {
    const parsed = heartbeatBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid focus status' });
    const row = await current(req);
    if (!row) return res.status(404).json({ error: 'Focus session not found' });
    if (row.releasedAt || row.endsAt <= new Date()) return res.json(serialise(row));
    const now = new Date();
    const { focused } = parsed.data;
    // Older clients only send fullscreen. Keep accepting them during rollout.
    const presentationMode = parsed.data.presentationMode || (parsed.data.fullscreen ? 'FULLSCREEN' : 'BROWSER');
    const fullscreen = presentationMode === 'KIOSK' || presentationMode === 'FULLSCREEN';
    const events: string[] = [];
    // A state transition is evidence of a focus change, not proof of another tab.
    if (row.isFocused !== focused) events.push(focused ? 'FOCUS_RETURNED' : 'LMS_LOST_FOCUS');
    if (row.isFullscreen !== fullscreen) events.push(fullscreen ? 'FULLSCREEN_ENTERED' : 'FULLSCREEN_EXITED');
    const updated = await db.focusSession.update({ where: { id: row.id }, data: { lastHeartbeatAt: now, isFocused: focused, isFullscreen: fullscreen, presentationMode } });
    if (events.length) await db.focusEvent.createMany({ data: events.map((type) => ({ sessionId: row.id, type })) });
    for (const type of events) if (type === 'LMS_LOST_FOCUS' || type === 'FULLSCREEN_EXITED') await warnStaff(row, type).catch(() => {});
    res.json(serialise(updated));
  }));

  app.post('/api/focus/release-request', auth, studentOnly, asyncHandler(async (req, res) => {
    const row = await current(req);
    if (!row) return res.status(404).json({ error: 'Focus session not found' });
    if (row.releasedAt || row.endsAt <= new Date()) return res.json(serialise(row));
    const firstRequest = !row.releaseRequestedAt;
    const updated = await db.focusSession.update({ where: { id: row.id }, data: { releaseRequestedAt: row.releaseRequestedAt || new Date() } });
    if (firstRequest) {
      await db.focusEvent.create({ data: { sessionId: row.id, type: 'RELEASE_REQUESTED' } });
      await warnStaff(row, 'RELEASE_REQUESTED').catch(() => {});
    }
    res.json(serialise(updated));
  }));

  app.get('/api/focus/monitor', auth, staffOnly, asyncHandler(async (req, res) => {
    const user = identity(req);
    const where: Prisma.FocusSessionWhereInput = { releasedAt: null, endsAt: { gt: new Date() }, student: { role: 'STUDENT', isExternalLearner: false } };
    if (user.role === 'TEACHER') {
      const links = await prisma.classTeacher.findMany({ where: { teacher: { userId: user.userId } }, select: { classId: true } });
      const students = await prisma.student.findMany({ where: { classId: { in: links.map((link) => link.classId) } }, select: { userId: true } });
      where.studentUserId = { in: students.map((student) => student.userId).filter((id): id is string => !!id) };
    }
    const rows = await db.focusSession.findMany({ where, orderBy: { startedAt: 'desc' }, take: 250,
      include: { student: { select: { firstName: true, lastName: true, studentProfile: { select: { class: { select: { name: true } } } } } }, events: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    res.json(rows.map((row) => ({ ...serialise(row), studentName: `${row.student.firstName} ${row.student.lastName}`.trim(), className: row.student.studentProfile?.class?.name || 'Unassigned', events: row.events })));
  }));

  app.patch('/api/focus/sessions/:id/time', auth, staffOnly, asyncHandler(async (req, res) => {
    const parsed = durationBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Minutes remaining must be between 0 and 480' });
    const row = await db.focusSession.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Focus session not found' });
    if (!await canManage(identity(req), row.studentUserId)) return res.status(403).json({ error: 'This student is outside your classes' });
    if (row.releasedAt || row.endsAt <= new Date()) return res.status(409).json({ error: 'Session has ended' });
    const updated = await db.focusSession.update({ where: { id: row.id }, data: { endsAt: new Date(Date.now() + parsed.data.minutesRemaining * 60_000) } });
    await db.focusEvent.create({ data: { sessionId: row.id, type: 'TIME_CHANGED' } });
    res.json(serialise(updated));
  }));

  app.post('/api/focus/sessions/:id/release', auth, staffOnly, asyncHandler(async (req, res) => {
    const row = await db.focusSession.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Focus session not found' });
    if (!await canManage(identity(req), row.studentUserId)) return res.status(403).json({ error: 'This student is outside your classes' });
    if (row.releasedAt || row.endsAt <= new Date()) return res.status(409).json({ error: 'Session has ended' });
    const updated = await db.focusSession.update({ where: { id: row.id }, data: { releasedAt: new Date(), approvedById: identity(req).userId, releaseRequestedAt: null } });
    await db.focusEvent.create({ data: { sessionId: row.id, type: 'RELEASE_APPROVED' } });
    res.json(serialise(updated));
  }));

  app.post('/api/focus/sessions/:id/deny', auth, staffOnly, asyncHandler(async (req, res) => {
    const row = await db.focusSession.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Focus session not found' });
    if (!await canManage(identity(req), row.studentUserId)) return res.status(403).json({ error: 'This student is outside your classes' });
    if (row.releasedAt || row.endsAt <= new Date()) return res.status(409).json({ error: 'Session has ended' });
    if (!row.releaseRequestedAt) return res.status(409).json({ error: 'No pending release request' });
    const updated = await db.focusSession.update({ where: { id: row.id }, data: { releaseRequestedAt: null } });
    await db.focusEvent.create({ data: { sessionId: row.id, type: 'RELEASE_DENIED' } });
    res.json(serialise(updated));
  }));
}
